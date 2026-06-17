// Offline Queue Manager with Exponential Backoff
import browser from 'webextension-polyfill';
import { storage } from './storage-service';
import { NotionClient } from './notion-client';
import { QueueEntry, QueueStatusResponse, SaveProblemPayload } from '../shared/types';
import { MAX_RETRY_ATTEMPTS } from '../shared/constants';

export class QueueManager {
  private notionClient: NotionClient | null = null;
  private isProcessing = false;

  constructor() {}

  // Sets or updates the active notion client instance
  public setNotionClient(client: NotionClient | null) {
    this.notionClient = client;
  }

  // Enqueues a payload for saving
  public async enqueue(payload: SaveProblemPayload): Promise<string> {
    const entryId = crypto.randomUUID();
    const entry: QueueEntry = {
      id: entryId,
      payload,
      attempts: 0,
      createdAt: Date.now(),
      lastAttemptAt: null,
      status: 'pending',
      lastError: null,
    };

    await storage.enqueue(entry);
    await this.updateBadge();
    return entryId;
  }

  // Processes the sync queue with exponential backoff delays
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queue = await storage.getQueue();
      const pending = queue.filter(
        (entry) => entry.status === 'pending' && entry.attempts < MAX_RETRY_ATTEMPTS
      );

      for (const entry of pending) {
        if (!this.notionClient) {
          console.warn('Queue processing skipped: Notion client not initialized.');
          break;
        }

        // Calculate backoff delay
        // 429 rate limits get a minimum 10-second delay
        let delay = Math.pow(2, entry.attempts) * 1000;
        if (entry.lastError?.includes('rate limit') || entry.lastError?.includes('300')) {
          delay = Math.max(delay, 10000);
        }

        const timeSinceLastAttempt = entry.lastAttemptAt ? Date.now() - entry.lastAttemptAt : Infinity;
        if (timeSinceLastAttempt < delay) {
          // Skip for this run to respect the backoff delay
          continue;
        }

        try {
          await this.notionClient.upsertProblem(entry.payload);
          
          // Successful save
          await storage.updateQueueEntry(entry.id, { status: 'synced' });
          await storage.dequeue(entry.id);
          
          this.sendNotification(
            'Saved to Notion',
            `${entry.payload.metadata.title} (#${entry.payload.metadata.number}) has been synced successfully.`
          );
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error);
          const nextAttempts = entry.attempts + 1;
          const status = nextAttempts >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending';

          await storage.updateQueueEntry(entry.id, {
            attempts: nextAttempts,
            lastAttemptAt: Date.now(),
            status,
            lastError: errMessage,
          });

          if (status === 'failed') {
            this.sendNotification(
              'Sync Failed',
              `Failed to sync ${entry.payload.metadata.title} after ${MAX_RETRY_ATTEMPTS} attempts.`
            );
          }
        }
      }
    } finally {
      this.isProcessing = false;
      await this.updateBadge();
    }
  }

  // Retries all failed queue items
  public async retryAll(): Promise<void> {
    const queue = await storage.getQueue();
    for (const entry of queue) {
      if (entry.status === 'failed') {
        await storage.updateQueueEntry(entry.id, { status: 'pending', attempts: 0, lastError: null });
      }
    }
    await this.processQueue();
  }

  // Retries a single entry
  public async retryOne(entryId: string): Promise<void> {
    await storage.updateQueueEntry(entryId, { status: 'pending', attempts: 0, lastError: null });
    await this.processQueue();
  }

  // Clears an entry from the queue
  public async clearEntry(entryId: string): Promise<void> {
    await storage.dequeue(entryId);
    await this.updateBadge();
  }

  // Returns queue status details for the UI
  public async getStatus(): Promise<QueueStatusResponse> {
    const queue = await storage.getQueue();
    const totalPending = queue.filter((e) => e.status === 'pending').length;
    const totalFailed = queue.filter((e) => e.status === 'failed').length;
    
    const entries = queue.map((e) => ({
      id: e.id,
      problemTitle: e.payload.metadata.title,
      problemNumber: e.payload.metadata.number,
      createdAt: e.createdAt,
      attempts: e.attempts,
      status: e.status as 'pending' | 'failed',
      lastError: e.lastError,
    }));

    return {
      totalPending,
      totalFailed,
      entries,
    };
  }

  // Updates the browser extension badge based on queue counts
  public async updateBadge(): Promise<void> {
    try {
      const queue = await storage.getQueue();
      const pendingCount = queue.filter((e) => e.status === 'pending').length;
      const failedCount = queue.filter((e) => e.status === 'failed').length;

      if (pendingCount > 0) {
        await browser.action.setBadgeText({ text: String(pendingCount) });
        await browser.action.setBadgeBackgroundColor({ color: '#B8843A' }); // Yellow
      } else if (failedCount > 0) {
        await browser.action.setBadgeText({ text: '!' });
        await browser.action.setBadgeBackgroundColor({ color: '#A85858' }); // Red
      } else {
        await browser.action.setBadgeText({ text: '' });
      }
    } catch {
      // Ignore badge errors (e.g. if badge API is unavailable in some contexts)
    }
  }

  // Helper to trigger system desktop notifications
  private sendNotification(title: string, message: string) {
    try {
      browser.notifications.create(crypto.randomUUID(), {
        type: 'basic',
        iconUrl: 'assets/icon-96.png',
        title,
        message,
      });
    } catch {
      // Fallback if browser.notifications is not available
    }
  }
}

export const queueManager = new QueueManager();

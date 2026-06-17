// Storage Service wrapping browser.storage.local
import browser from 'webextension-polyfill';
import { StorageKey, QueueEntry, AppError } from '../shared/types';
import { MAX_QUEUE_ENTRIES } from '../shared/constants';
import { encryptToken, decryptToken } from '../shared/crypto';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Basic typed get
  public async get<T>(key: StorageKey): Promise<T | null> {
    try {
      const result = await browser.storage.local.get(key);
      const val = result[key];
      if (val === undefined) return null;
      
      // If stored value is stringified JSON, parse it (safe fallback)
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as T;
        } catch {
          return val as unknown as T;
        }
      }
      return val as T;
    } catch (err) {
      throw new AppError('LN_600', `Failed to read from storage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Basic typed set
  public async set<T>(key: StorageKey, value: T): Promise<void> {
    try {
      // Store object/array as stringified JSON to prevent storage issues, primitives as is
      const serialized = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
      await browser.storage.local.set({ [key]: serialized });
    } catch (err) {
      throw new AppError('LN_600', `Failed to write to storage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Delete key
  public async delete(key: StorageKey): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (err) {
      throw new AppError('LN_600', `Failed to delete from storage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Clear all LeetNote keys
  public async clear(): Promise<void> {
    try {
      const keys = Object.values(StorageKey);
      await browser.storage.local.remove(keys);
    } catch (err) {
      throw new AppError('LN_600', `Failed to clear storage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Encrypted token get
  public async getEncrypted(key: StorageKey): Promise<string | null> {
    const encrypted = await this.get<string>(key);
    if (!encrypted) return null;
    try {
      return await decryptToken(encrypted);
    } catch (err) {
      console.error('Decryption failed for key:', key, err);
      return null;
    }
  }

  // Encrypted token set
  public async setEncrypted(key: StorageKey, value: string): Promise<void> {
    const encrypted = await encryptToken(value);
    await this.set(key, encrypted);
  }

  // Sync Queue management methods
  public async getQueue(): Promise<QueueEntry[]> {
    const queue = await this.get<QueueEntry[]>(StorageKey.SYNC_QUEUE);
    return queue || [];
  }

  public async enqueue(entry: QueueEntry): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length >= MAX_QUEUE_ENTRIES) {
      throw new AppError('LN_500', 'Offline synchronization queue is full (limit: 100 entries).');
    }
    queue.push(entry);
    await this.set(StorageKey.SYNC_QUEUE, queue);
  }

  public async dequeue(entryId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== entryId);
    await this.set(StorageKey.SYNC_QUEUE, filtered);
  }

  public async updateQueueEntry(entryId: string, update: Partial<QueueEntry>): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.map((item) => {
      if (item.id === entryId) {
        return { ...item, ...update };
      }
      return item;
    });
    await this.set(StorageKey.SYNC_QUEUE, updated);
  }
}

export const storage = StorageService.getInstance();

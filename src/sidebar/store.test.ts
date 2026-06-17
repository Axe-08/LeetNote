import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock browser.runtime.sendMessage
vi.mock('webextension-polyfill', () => {
  return {
    default: {
      runtime: {
        sendMessage: vi.fn(),
      },
    },
  };
});

// Mock scraper
vi.mock('../content/scraper', () => {
  return {
    scrape: vi.fn(() => Promise.resolve({ code: 'const x = 1;', language: 'javascript' })),
  };
});

import { useSidebarStore } from './store';
import browser from 'webextension-polyfill';

describe('Sidebar Zustand Store', () => {
  beforeEach(() => {
    // Reset state before each test
    const { reset } = useSidebarStore.getState();
    reset();
    vi.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const state = useSidebarStore.getState();
    expect(state.problemMetadata).toBeNull();
    expect(state.isExistingProblem).toBe(false);
    expect(state.notes).toBe('');
    expect(state.capturedCode).toBeNull();
    expect(state.clips).toEqual([]);
    expect(state.saveStatus).toBe('idle');
  });

  it('should update problem context correctly', () => {
    const store = useSidebarStore.getState();
    const mockMeta = {
      title: 'Two Sum',
      number: 1,
      difficulty: 'Easy' as const,
      tags: ['Array', 'Hash Table'],
      url: 'https://leetcode.com/problems/two-sum/',
      acceptanceRate: 50.5,
    };

    store.setProblemContext(mockMeta, {
      exists: true,
      attemptCount: 2,
      confidenceHistory: [
        { attemptNumber: 1, rating: 3, date: '2026-06-15T00:00:00Z' },
        { attemptNumber: 2, rating: 5, date: '2026-06-16T00:00:00Z' },
      ],
    });

    const updated = useSidebarStore.getState();
    expect(updated.problemMetadata).toEqual(mockMeta);
    expect(updated.isExistingProblem).toBe(true);
    expect(updated.existingAttemptCount).toBe(2);
    expect(updated.confidenceHistory).toHaveLength(2);
    expect(updated.hasUnsavedChanges).toBe(false);
  });

  it('should flag unsaved changes when notes or code are added', () => {
    const store = useSidebarStore.getState();
    expect(store.hasUnsavedChanges).toBe(false);

    store.setNotes('Learning DP patterns...');
    expect(useSidebarStore.getState().hasUnsavedChanges).toBe(true);

    // Resetting note should turn it false if code is empty too
    store.setNotes('');
    expect(useSidebarStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('should update complexities and confidence ratings', () => {
    const store = useSidebarStore.getState();
    store.setTimeComplexity('O(N)');
    store.setSpaceComplexity('O(1)');
    store.setConfidenceRating(4);

    const updated = useSidebarStore.getState();
    expect(updated.timeComplexity).toBe('O(N)');
    expect(updated.spaceComplexity).toBe('O(1)');
    expect(updated.confidenceRating).toBe(4);
  });

  it('should support clipping list additions and removals', () => {
    const store = useSidebarStore.getState();
    const clip1 = {
      id: 'clip-1',
      text: 'First code clip',
      isCode: true,
      authorHandle: 'coder123',
      sourceUrl: 'url-1',
      clippedAt: 123456789,
    };
    const clip2 = {
      id: 'clip-2',
      text: 'Second text clip',
      isCode: false,
      authorHandle: 'pro_dev',
      sourceUrl: 'url-2',
      clippedAt: 123456789,
    };

    store.addClip(clip1);
    store.addClip(clip2);
    expect(useSidebarStore.getState().clips).toHaveLength(2);

    store.removeClip('clip-1');
    expect(useSidebarStore.getState().clips).toHaveLength(1);
    expect(useSidebarStore.getState().clips[0].id).toBe('clip-2');

    store.clearClips();
    expect(useSidebarStore.getState().clips).toEqual([]);
  });

  it('should trigger Notion save messaging successfully', async () => {
    const mockMeta = {
      title: 'Two Sum',
      number: 1,
      difficulty: 'Easy' as const,
      tags: ['Array'],
      url: 'https://leetcode.com/problems/two-sum/',
      acceptanceRate: 50.5,
    };

    // Prepare store state
    useSidebarStore.setState({
      problemMetadata: mockMeta,
      notes: 'O(N) search using map',
      capturedCode: 'const map = new Map();',
      capturedLanguage: 'javascript',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      confidenceRating: 5,
    });

    // Mock resolve response for background API messaging
    vi.mocked(browser.runtime.sendMessage).mockResolvedValueOnce({
      success: true,
      data: { status: 'synced' },
    });

    const store = useSidebarStore.getState();
    await store.save();

    const updated = useSidebarStore.getState();
    expect(updated.saveStatus).toBe('success');
    expect(browser.runtime.sendMessage).toHaveBeenCalled();
  });

  it('should trigger save queuing if background reports offline / sync queue', async () => {
    const mockMeta = {
      title: 'Two Sum',
      number: 1,
      difficulty: 'Easy' as const,
      tags: ['Array'],
      url: 'https://leetcode.com/problems/two-sum/',
      acceptanceRate: 50.5,
    };

    useSidebarStore.setState({
      problemMetadata: mockMeta,
      notes: 'offline note draft',
    });

    // Mock response representing background queue enqueueing
    vi.mocked(browser.runtime.sendMessage).mockResolvedValueOnce({
      success: true,
      data: { status: 'queued' },
    });

    const store = useSidebarStore.getState();
    await store.save();

    const updated = useSidebarStore.getState();
    expect(updated.saveStatus).toBe('queued');
  });

  it('should handle save error responses and show status accordingly', async () => {
    const mockMeta = {
      title: 'Two Sum',
      number: 1,
      difficulty: 'Easy' as const,
      tags: ['Array'],
      url: 'https://leetcode.com/problems/two-sum/',
      acceptanceRate: 50.5,
    };

    useSidebarStore.setState({
      problemMetadata: mockMeta,
      notes: 'error case notes',
    });

    // Mock response representing failure
    vi.mocked(browser.runtime.sendMessage).mockResolvedValueOnce({
      success: false,
      error: { code: 'LN_NOTION_AUTH_FAILED', message: 'Unauthorized' },
    });

    const store = useSidebarStore.getState();
    await store.save();

    const updated = useSidebarStore.getState();
    expect(updated.saveStatus).toBe('error');
    expect(updated.saveError).toBe('Unauthorized');
  });
});

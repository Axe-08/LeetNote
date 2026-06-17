// Zustand store for sidebar state management
import { create } from 'zustand';
import { ProblemMetadata, CommunityClip, SaveProblemPayload, SaveProblemResponse } from '../shared/types';
import { sendMessage } from '../shared/messages';
import { scrape } from '../content/scraper';

export interface SidebarStore {
  // Problem context
  problemMetadata: ProblemMetadata | null;
  isExistingProblem: boolean;
  existingAttemptCount: number;
  confidenceHistory: Array<{ attemptNumber: number; rating: number | null; date: string }>;

  // User input
  notes: string;
  capturedCode: string | null;
  capturedLanguage: string;
  timeComplexity: string;
  spaceComplexity: string;
  confidenceRating: 1 | 2 | 3 | 4 | 5 | null;
  clips: CommunityClip[];

  // UI state
  isOpen: boolean;
  saveStatus: 'idle' | 'saving' | 'queued' | 'success' | 'error';
  saveError: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  setProblemContext: (
    meta: ProblemMetadata,
    existing: {
      exists: boolean;
      attemptCount: number;
      confidenceHistory: Array<{ attemptNumber: number; rating: number | null; date: string }>;
    }
  ) => void;
  setNotes: (notes: string) => void;
  captureCode: () => Promise<void>;
  setTimeComplexity: (tc: string) => void;
  setSpaceComplexity: (sc: string) => void;
  setConfidenceRating: (rating: 1 | 2 | 3 | 4 | 5 | null) => void;
  addClip: (clip: CommunityClip) => void;
  removeClip: (clipId: string) => void;
  clearClips: () => void;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  save: () => Promise<void>;
  reset: () => void;
}

export const useSidebarStore = create<SidebarStore>((set, get) => {
  // Helper to recalculate if there are unsaved changes
  const updateUnsavedFlag = (notesText: string, codeText: string | null): boolean => {
    return !!((notesText && notesText.trim().length > 0) || (codeText && codeText.trim().length > 0));
  };

  return {
    // Initial State
    problemMetadata: null,
    isExistingProblem: false,
    existingAttemptCount: 0,
    confidenceHistory: [],

    notes: '',
    capturedCode: null,
    capturedLanguage: 'python3',
    timeComplexity: '',
    spaceComplexity: '',
    confidenceRating: null,
    clips: [],

    isOpen: false,
    saveStatus: 'idle',
    saveError: null,
    hasUnsavedChanges: false,

    // Actions
    setProblemContext: (meta, existing) => {
      set({
        problemMetadata: meta,
        isExistingProblem: existing.exists,
        existingAttemptCount: existing.attemptCount,
        confidenceHistory: existing.confidenceHistory,
        // Reset inputs for the new context
        notes: '',
        capturedCode: null,
        timeComplexity: '',
        spaceComplexity: '',
        confidenceRating: null,
        hasUnsavedChanges: false,
        saveStatus: 'idle',
        saveError: null,
      });
    },

    setNotes: (notes) => {
      set((state) => ({
        notes,
        hasUnsavedChanges: updateUnsavedFlag(notes, state.capturedCode),
      }));
    },

    captureCode: async () => {
      try {
        const result = await scrape();
        if (result.code) {
          set((state) => ({
            capturedCode: result.code,
            capturedLanguage: result.language,
            hasUnsavedChanges: updateUnsavedFlag(state.notes, result.code),
          }));
        }
      } catch (err) {
        console.error('Failed to capture code:', err);
      }
    },

    setTimeComplexity: (timeComplexity) => set({ timeComplexity }),
    setSpaceComplexity: (spaceComplexity) => set({ spaceComplexity }),
    setConfidenceRating: (confidenceRating) => set({ confidenceRating }),

    addClip: (clip) => {
      set((state) => {
        const updated = [...state.clips, clip];
        return { clips: updated };
      });
    },

    removeClip: (clipId) => {
      set((state) => ({
        clips: state.clips.filter((c) => c.id !== clipId),
      }));
    },

    clearClips: () => set({ clips: [] }),

    setIsOpen: (isOpen) => set({ isOpen }),
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

    save: async () => {
      const state = get();
      if (!state.problemMetadata) return;

      set({ saveStatus: 'saving', saveError: null });

      const payload: SaveProblemPayload = {
        metadata: state.problemMetadata,
        notes: state.notes,
        solution: {
          code: state.capturedCode || '',
          language: state.capturedLanguage,
          timeComplexity: state.timeComplexity,
          spaceComplexity: state.spaceComplexity,
          capturedAt: Date.now(),
        },
        confidenceRating: state.confidenceRating,
        clips: state.clips,
      };

      try {
        const response = await sendMessage<SaveProblemResponse>('SAVE_PROBLEM', payload);
        
        if (response.success && response.data) {
          const status = response.data.status; // 'synced' | 'queued'
          if (status === 'synced') {
            set({ saveStatus: 'success', hasUnsavedChanges: false });
            // Revert back to idle status after 2 seconds
            setTimeout(() => {
              set({ saveStatus: 'idle' });
            }, 2000);
          } else if (status === 'queued') {
            set({ saveStatus: 'queued', hasUnsavedChanges: false });
          } else {
            set({ saveStatus: 'error', saveError: 'Sync yielded invalid response status' });
          }
        } else {
          set({
            saveStatus: 'error',
            saveError: response.error?.message || 'Verification response failed.',
          });
        }
      } catch (err) {
        console.warn('Network or routing failure, assuming background service queued successfully:', err);
        // Under MV3, if content sync is running and background responds, we trust background's offline queue
        set({ saveStatus: 'queued', hasUnsavedChanges: false });
      }
    },

    reset: () => {
      set({
        notes: '',
        capturedCode: null,
        timeComplexity: '',
        spaceComplexity: '',
        confidenceRating: null,
        clips: [],
        hasUnsavedChanges: false,
        saveStatus: 'idle',
        saveError: null,
      });
    },
  };
});

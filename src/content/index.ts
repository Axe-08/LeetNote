// Content script main entry point for LeetCode problem pages
import browser from 'webextension-polyfill';
import { scrape } from './scraper';
import { injectSidebar, toggleSidebar } from './sidebar-injector';
import { useSidebarStore } from '../sidebar/store';
import { sendMessage } from '../shared/messages';
import { FullSettingsObject } from '../shared/types';
import { setupClippingListener } from './clipping-helpers';

let currentProblemSlug: string | null = null;
let navigationTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Extracts the problem slug from the URL path.
 * e.g., /problems/two-sum/ -> 'two-sum'
 */
function getProblemSlug(): string | null {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('problems');
  if (idx !== -1 && parts[idx + 1]) {
    // Avoid tabs like /problems/two-sum/submissions/
    return parts[idx + 1];
  }
  return null;
}

/**
 * Detects URL navigations on LeetCode's client-side SPA.
 */
function detectNavigation(): void {
  const slug = getProblemSlug();
  if (slug && slug !== currentProblemSlug) {
    currentProblemSlug = slug;
    onProblemChanged(slug);
  }
}

/**
 * Triggered whenever the active problem route changes.
 * Scrapes metadata and pulls synchronization status from Notion database.
 */
async function onProblemChanged(_slug: string): Promise<void> {
  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
  }

  // 1. Wait 500ms for LeetCode dynamically-loaded elements to render
  navigationTimeout = setTimeout(async () => {
    try {
      const scraped = await scrape();
      if (!scraped.metadata) {
        console.warn('LeetNote Scraper: Critical metadata missing. Aborting Notion check.');
        return;
      }

      // 2. Fetch existing Notion sync stats
      const checkResp = await sendMessage<{
        exists: boolean;
        notionPageId: string | null;
        attemptCount: number;
        lastAttemptDate: string | null;
        confidenceHistory: Array<{ attemptNumber: number; rating: number | null; date: string }>;
      }>('CHECK_EXISTING_ENTRY', { problemNumber: scraped.metadata.number });

      const existingData = checkResp.success && checkResp.data
        ? {
            exists: checkResp.data.exists,
            attemptCount: checkResp.data.attemptCount,
            confidenceHistory: checkResp.data.confidenceHistory || [],
          }
        : {
            exists: false,
            attemptCount: 0,
            confidenceHistory: [],
          };

      // 3. Update Zustand Store with Scraped Context & Notion History
      const store = useSidebarStore.getState();
      
      // Warn if user has unsaved draft changes before replacing context
      if (store.hasUnsavedChanges) {
        const confirmDiscard = window.confirm(
          'LeetNote: You have unsaved solution/notes drafts. Discard them and switch to the new problem?'
        );
        if (!confirmDiscard) {
          return;
        }
      }

      store.setProblemContext(scraped.metadata, existingData);
      console.log(`LeetNote context updated for problem: #${scraped.metadata.number} - ${scraped.metadata.title}`);
    } catch (err) {
      console.error('LeetNote: Failed to orchestrate problem navigation context update:', err);
    }
  }, 500);
}

/**
 * Registers keyboard shortcut listeners mapping to configured hotkeys.
 */
async function setupKeyboardShortcut(): Promise<void> {
  let shortcut = 'Ctrl+Shift+N'; // Default fallback

  try {
    const response = await sendMessage<FullSettingsObject>('GET_SETTINGS', {});
    if (response.success && response.data?.keyboardShortcut) {
      shortcut = response.data.keyboardShortcut;
    }
  } catch (err) {
    console.warn('Failed to retrieve settings from background. Using default shortcut.', err);
  }

  // Parse shortcut: assume formats like 'Ctrl+Shift+N' or 'Ctrl+Alt+S'
  const keys = shortcut.toLowerCase().split('+');
  const needsCtrl = keys.includes('ctrl');
  const needsShift = keys.includes('shift');
  const needsAlt = keys.includes('alt');
  const targetKey = keys.find(k => k !== 'ctrl' && k !== 'shift' && k !== 'alt') || 'n';

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const keyMatch = e.key.toLowerCase() === targetKey;
    const ctrlMatch = !needsCtrl || e.ctrlKey;
    const shiftMatch = !needsShift || e.shiftKey;
    const altMatch = !needsAlt || e.altKey;

    if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
      e.preventDefault();
      toggleSidebar();
    }
  });
}

// Listen for commands from the extension popup
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOGGLE_SIDEBAR') {
    toggleSidebar();
    return Promise.resolve({ success: true });
  }
  if (message.type === 'GET_SCRAPED_INFO') {
    const store = useSidebarStore.getState();
    return Promise.resolve({
      success: true,
      data: {
        metadata: store.problemMetadata,
        isExistingProblem: store.isExistingProblem,
        existingAttemptCount: store.existingAttemptCount,
      }
    });
  }
});

/**
 * Monitors the browser tab document state to run initialization routines.
 */
function init(): void {
  // Check if we are on a valid problems route before injection
  const slug = getProblemSlug();
  if (!slug) return;

  // 1. Inject sidebar Shadow DOM
  injectSidebar();

  // 2. Perform initial navigation detection
  detectNavigation();

  // 3. Register hotkeys
  setupKeyboardShortcut();

  // 4. Hook navigation events (PopState and monkey-patch pushState)
  window.addEventListener('popstate', () => detectNavigation());

  const originalPushState = window.history.pushState;
  window.history.pushState = function(state, ...args) {
    const result = originalPushState.apply(this, [state, ...args]);
    // Dispatch navigation detection immediately after state mutation
    detectNavigation();
    return result;
  };

  // 5. Setup MutationObserver on title to capture SPA title swaps
  const titleEl = document.querySelector('title');
  if (titleEl) {
    const observer = new MutationObserver(() => detectNavigation());
    observer.observe(titleEl, { childList: true, characterData: true });
  }

  // 6. Setup selection clipping listeners
  setupClippingListener();
}

// Kickoff content script execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}

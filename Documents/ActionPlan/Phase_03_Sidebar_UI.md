# Phase 03 — Content Scripts & Sidebar UI
## LeetNote Firefox Extension

---

**Duration:** Week 4–6  
**Priority:** P0 — The primary user-facing interface  
**Depends on:** Phase 2 (message bus, storage, Notion client)  
**Parallel with:** Phase 4 (Popup & Onboarding)  
**Agent Strategy:** 2 agents in parallel

- **Agent A:** Content scripts — scraper, SPA nav handler, sidebar injector (Tasks 3.1–3.3)
- **Agent B:** Sidebar React components + Zustand store (Tasks 3.4–3.6)

---

## Task Breakdown

### Task 3.1 — DOM Scraper (`src/content/scraper.ts`)

**AI Instruction:**
```
Implement the DOM metadata scraper from TRD Section 4.1 and API Spec Section 6.

Import selector chains from src/shared/selectors.json.

Main export: async function scrape(): Promise<ScrapeResult>

Implementation:

1. For each metadata field (title, number, difficulty, tags, acceptanceRate, language):
   - Iterate through the selector fallback chain for that field
   - Try each selector with document.querySelector / querySelectorAll
   - On first match, extract the value and break
   - If all selectors fail, add a ScrapeWarning to the warnings array
   - If title fails (critical), set metadata to null and add high-severity warning

2. Title extraction:
   - Query using SELECTOR_CHAINS.title
   - Parse "1. Two Sum" → title="Two Sum"
   - If element contains both number and title, split them

3. Number extraction:
   - Parse from URL pattern: /problems/<slug>/ → not direct
   - Parse from title text: "1. Two Sum" → number=1
   - Fallback: parse from DOM element matching SELECTOR_CHAINS.number

4. Difficulty:
   - Check for difficulty-specific class names or [diff] attribute
   - Map to 'Easy' | 'Medium' | 'Hard'
   - If text content contains "easy"/"medium"/"hard" (case insensitive), use that

5. Tags:
   - querySelectorAll with SELECTOR_CHAINS.tags
   - Map each element to its textContent.trim()
   - Filter out empty strings

6. Acceptance Rate:
   - Find element containing "%" text
   - Parse float from the text content
   - Return null if not found (non-critical)

7. Code extraction (from TRD Section 4.1):
   function extractCode(): { code: string, language: string }
   Priority chain:
     a. Monaco editor: (window as any).monaco?.editor?.getModels()?.[0]?.getValue()
     b. CodeMirror: document.querySelector('.CodeMirror')?.CodeMirror?.getValue()
     c. Textarea fallback: document.querySelector('textarea.inputarea')?.value
     d. If all fail: return empty string + add warning

8. Language detection:
   - Query SELECTOR_CHAINS.language for the active language dropdown
   - Parse the text content to get language key
   - Map through LANGUAGE_MAP constant

Return ScrapeResult:
  { metadata, code, language, warnings, scrapedAt: Date.now() }

CRITICAL: Every field extraction must be wrapped in try/catch.
A single field failure must NOT abort the entire scrape.
```

### Task 3.2 — SPA Navigation Handler (`src/content/index.ts`)

**AI Instruction:**
```
Implement the content script entry point for problem pages.
This handles LeetCode's SPA navigation and coordinates scraping + sidebar.

From TRD Section 8.2 and App Flow Section 8:

let currentProblemSlug: string | null = null;

function detectNavigation():
  - Extract slug from location.pathname: /problems/<slug>/
  - If slug !== currentProblemSlug:
    - currentProblemSlug = slug
    - Call onProblemChanged(slug)

onProblemChanged(slug):
  1. Wait 500ms for DOM to settle (LeetCode renders asynchronously)
  2. Run scrape() to get metadata
  3. Send CHECK_EXISTING_ENTRY message to background with problem number
  4. If sidebar is mounted:
    a. Check if there's unsaved content in sidebar
    b. If yes: show inline prompt "Save before leaving?" [Save] [Discard]
    c. If user saves or discards: reset sidebar state for new problem
    d. If no unsaved content: silently reset sidebar
  5. Update sidebar with new problem metadata and existing entry info

Navigation detection (3 methods per TRD 8.2):
  a. MutationObserver on <title> element (characterData + childList)
  b. Intercept history.pushState — monkey-patch and call detectNavigation after
  c. Listen to 'popstate' event

On initial load:
  1. detectNavigation()
  2. Inject sidebar (call sidebar-injector.ts)
  3. Register keyboard shortcut listener:
     document.addEventListener('keydown', (e) => {
       if (e.ctrlKey && e.shiftKey && e.key === 'N') toggleSidebar()
     })

IMPORTANT: Read the user's configured shortcut from storage before registering.
Default is Ctrl+Shift+N but it's configurable.
```

### Task 3.3 — Sidebar Injector (`src/content/sidebar-injector.ts`)

**AI Instruction:**
```
Implement the Shadow DOM sidebar injector from TRD Section 4.5.

Export: function injectSidebar(): void
Export: function toggleSidebar(): void
Export: function isSidebarOpen(): boolean

injectSidebar():
  1. Check if already injected (getElementById 'leetnote-sidebar-host')
  2. Create host element: <div id="leetnote-sidebar-host">
  3. Style the host:
     - position: fixed
     - top: 0, right: 0
     - height: 100vh
     - z-index: 99990 (from UI/UX Guide Section 5.3)
     - width: 0 (collapsed by default)
     - transition: width 180ms ease-out
  4. Create Shadow DOM: host.attachShadow({ mode: 'closed' })
     CLOSED mode to prevent LeetCode scripts from accessing our DOM.
  5. Inject sidebar CSS into shadow root:
     - Create <link rel="stylesheet" href={chrome.runtime.getURL('assets/sidebar.css')}>
     - Also inject font imports (Inter from Google Fonts, JetBrains Mono)
  6. Create React mount container: <div id="leetnote-sidebar-root">
  7. Append stylesheet + container to shadow root
  8. Append host to document.body
  9. Mount React: createRoot(container).render(<Sidebar />)

toggleSidebar():
  - If closed: set host width to 360px (SIDEBAR_WIDTH_DEFAULT), animate in
  - If open: set host width to 0, animate out
  - Dispatch custom event 'leetnote:sidebar-toggle' for content script coordination

isSidebarOpen():
  - Check host element width > 0

Also create the docked trigger icon:
  - A small fixed-position button on the right edge of viewport
  - Vertically centered
  - Shows the LeetNote icon (code bracket + square glyph)
  - On click: toggleSidebar()
  - States (from UI/UX Guide 2.1):
    - Idle (on LeetCode): electric indigo fill
    - Has clips: show small badge with clip count
    - Queue pending: yellow dot
    - Error: red dot

DARK MODE DETECTION (from UI/UX Guide Section 9):
  const isDark = document.documentElement.classList.contains('dark')
  Fallback: window.matchMedia('(prefers-color-scheme: dark)').matches
  Set data-theme attribute on sidebar host element: 'light' or 'dark'
  Listen for changes with MutationObserver on documentElement class changes.
```

### Task 3.4 — Zustand Store (`src/sidebar/store.ts`)

**AI Instruction:**
```
Implement the sidebar Zustand store from TRD Section 8.1.

import { create } from 'zustand'

interface SidebarStore {
  // Problem context
  problemMetadata: ProblemMetadata | null;
  isExistingProblem: boolean;
  existingAttemptCount: number;
  confidenceHistory: Array<{attemptNumber: number, rating: number|null, date: string}>;

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
  setProblemContext: (meta: ProblemMetadata, existing: CheckExistingResponse) => void;
  setNotes: (notes: string) => void;
  captureCode: () => void;  // triggers code extraction from page
  setTimeComplexity: (tc: string) => void;
  setSpaceComplexity: (sc: string) => void;
  setConfidenceRating: (rating: 1|2|3|4|5|null) => void;
  addClip: (clip: CommunityClip) => void;
  removeClip: (clipId: string) => void;
  clearClips: () => void;
  toggleOpen: () => void;
  save: () => Promise<void>;
  reset: () => void;
}

save() implementation:
  1. Set saveStatus = 'saving'
  2. Build SaveProblemPayload from current store state
  3. Send SAVE_PROBLEM message to background
  4. On response:
     - If status 'synced': set saveStatus = 'success', show success toast
       after 2s set back to 'idle'
     - If status 'queued': set saveStatus = 'queued'
     - If status 'failed': set saveStatus = 'error', set saveError
  5. On network error: set saveStatus = 'queued'

hasUnsavedChanges: computed from notes.length > 0 || capturedCode !== null

Persist draft to storage on every state change (debounced 1s):
  Use storage session.draft key to save Partial<SavePayload>
  On sidebar open, restore draft if it exists for the same problem
```

### Task 3.5 — Sidebar React Components

**AI Instruction:**
```
Implement ALL sidebar React components following the UI/UX Design Guide (Doc 03)
and the wireframes in Doc 06. Use CSS Modules for styling.

The design system uses these CSS custom properties (define in sidebar.module.css):
  Dark mode (default): --ln-bg-base: #1A1B26, --ln-bg-surface: #24253A, etc.
  (Full palette from UI/UX Guide Section 3)
  Light mode: override via [data-theme="light"] selector

FONTS: Import Inter (400, 500, 600, 700) and JetBrains Mono (400) from Google Fonts.

Components to implement:

1. Sidebar.tsx — Root container
   - Renders all sub-components in order
   - Handles keyboard shortcuts (Ctrl+Enter = save, Escape = close)
   - Responsive width 280-480px

2. SidebarHeader.tsx (UI/UX Guide 6.1)
   - Left: collapse arrow (◀) toggles sidebar
   - "LeetNote" brand text in --ln-accent color
   - Right: problem title (truncated 22 chars) + difficulty badge (Easy/Medium/Hard with semantic colors)
   - Close button (✕) appears on hover only
   
3. AttemptRail.tsx (UI/UX Guide 6.2)
   - Only shown when isExistingProblem is true
   - Thin 2px vertical line
   - Filled circles for past attempts, colored by confidence (red=1-2, yellow=3, green=4-5)
   - Current session as outlined circle (◉)
   - Shows attempt number, date, and rating for each past attempt
   - Also renders the revisit info banner: "You've solved this before — saving as Attempt N"

4. NotesPanel.tsx (UI/UX Guide 6.3)
   - Section header: "MY NOTES" (uppercase, 9px, 0.12em letter-spacing)
   - Textarea with placeholder: "What's the key insight? Any 'aha' moments?"
   - Auto-resizes from 80px to 240px with content
   - Character counter appears at >1500 chars: "N / 2000"
   - Ruled notebook texture background (repeating gradient lines)
   - Subtle inner shadow on focus
   - Border-left turns --ln-accent on focus-within

5. CodePreview.tsx (UI/UX Guide 6.4)
   - Section header: "MY SOLUTION"
   - Code display: read-only, scrollable, JetBrains Mono 11px, max-height 88px
   - Gradient fade at bottom when content overflows
   - Top bar: language label (left), "auto · N min ago" timestamp (center), CAPTURE button (right)
   - CAPTURE button: click triggers captureCode() from store
   - Language auto-detected from LeetCode's active language dropdown

6. ComplexityInputs.tsx (UI/UX Guide 6.5)
   - Two side-by-side boxes: TIME COMPLEXITY / SPACE COMPLEXITY
   - Input fields in JetBrains Mono
   - Quick-pick dropdown on typing "O(": shows O(1), O(n), O(n²), O(log n), O(n log n)
   - Dropdown is a simple positioned div, not a full select element

7. ConfidenceRating.tsx (UI/UX Guide 6.6)
   - 5 circular nodes (20px diameter) with numbers 1-5
   - Click to select: fills left-to-right
   - Colors: 1-2 = --ln-error (red), 3 = --ln-warning (yellow), 4-5 = --ln-success (green)
   - Unselected: gray border, no fill
   - Label text updates: "Need more practice" (1) → "Crystal clear" (5)
   - Shows spaced rep interval: "review in N days"
   - Tooltip on hover shows label

8. ClipQueue.tsx (UI/UX Guide 6.7)
   - Section header: "CLIPS (N)" with CLEAR ALL button (red, only shown when clips > 0)
   - List of clip rows:
     - Paper-clip icon for text clips, { } icon for code clips
     - Clip text truncated with ellipsis
     - Source URL below in mono font
     - Dismiss (✕) button per clip, turns red on hover
   - Max 10 clips shown (from constants)

9. SaveButton.tsx (UI/UX Guide 6.8)
   - Multi-state button from the wireframes:
     - Idle: solid with --ln-accent border, icon + "Save to Notion"
     - Saving: spinning icon, dimmed, "Saving..."
     - Success: green flash, "Saved ✓" (fades to idle after 2s)
     - Queued: yellow, "Queued — will sync soon"
     - Error: red, "Retry Save"
   - If existing problem: "Save as Attempt N" instead of "Save to Notion"
   - Ctrl+Enter keyboard shortcut support

10. Toast.tsx (UI/UX Guide 6.9)
    - Position: fixed bottom-right, 16px from edges
    - Three variants: success (green left border), warning (yellow), error (red)
    - Structure: icon + title + subtitle + optional action buttons + close
    - Auto-dismiss after 4s for success/warning; errors persist
    - Max 3 stacked; oldest dismissed when new arrives
    - Use a ToastProvider context + useToast() hook

CRITICAL DESIGN RULES (from UI/UX Guide Section 12):
  - Use Shadow DOM styles only — never inject global styles
  - All code content in JetBrains Mono
  - No text smaller than 11px
  - Section headers: 9px, 700 weight, 0.12em letter-spacing, uppercase, --ln-text-secondary color
  - Animations complete in ≤200ms
  - Respect prefers-reduced-motion: disable slide animations, use instant appear/disappear
```

### Task 3.6 — Sidebar Stylesheet (`src/sidebar/styles/sidebar.module.css`)

**AI Instruction:**
```
Create the complete sidebar CSS module implementing the full design system
from the UI/UX Design Guide (Doc 03) and the wireframe CSS (Doc 06).

Structure the CSS in this order:

1. @font-face / @import for Inter and JetBrains Mono
2. CSS Custom Properties (all design tokens from UI/UX Guide Section 3):
   :root (dark mode default):
     All --ln-* variables from sections 3.1, 3.2, 3.3
     All --ln-space-* variables from section 5.1
     All --ln-z-* variables from section 5.3
   [data-theme="light"]:
     Override variables from section 3.4

3. Base styles for the sidebar container
4. Component-specific styles matching the wireframe CSS exactly
5. Animation keyframes (slide-in, fade, pulse for syncing)
6. @media (prefers-reduced-motion: reduce) overrides

MATCH THE WIREFRAME CSS (Doc 06) FOR:
  - .sb-head, .sb-logo, .sb-prob, .diff.e/.m/.h
  - .sb-banner, .sb-banner-action
  - .rail, .rail-track, .rail-node, .rail-seg
  - .sb-sec, .sb-sh (section headers)
  - .nb-area (notes textarea with ruled lines)
  - .code-wrap, .code-bar, .code-lines, .cap-btn
  - .cplx-row, .cplx-box, .cplx-val
  - .conf-row, .cnode (confidence rating)
  - .clips-list, .clip-row, .clip-ico, .clip-txt
  - .save-btn and all state variants (.saving, .ok, .queued, .err)
  - .toast variants

Use the wireframe's warm color palette (Doc 06):
  --bg: #111110, --ink: #C4A96A, --easy: #6A9E7A, --medium: #B8843A, --hard: #A85858
  
This is the ACTUAL design from the wireframes — use these colors, NOT the colors from 
the UI/UX design guide section 3 (those are an earlier draft). The wireframe is the 
final approved design.
```

---

## Completion Criteria

- [ ] Scraper extracts all 7 metadata fields from a real LeetCode problem page
- [ ] SPA navigation detection works when clicking between problems without reload
- [ ] Sidebar injects into LeetCode via Shadow DOM without breaking the page layout
- [ ] Sidebar renders correctly in both light and dark LeetCode modes
- [ ] All sidebar components match the wireframe designs
- [ ] Notes persist across sidebar collapse/reopen
- [ ] Code capture snapshots the current editor content
- [ ] Complexity quick-pick dropdown works
- [ ] Confidence rating fills correctly with semantic colors
- [ ] Save button cycles through all states correctly
- [ ] Toast notifications stack and auto-dismiss correctly
- [ ] Keyboard shortcuts work: Ctrl+Shift+N (toggle), Ctrl+Enter (save), Escape (close)

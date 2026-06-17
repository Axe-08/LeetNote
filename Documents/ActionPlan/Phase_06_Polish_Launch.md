# Phase 06 — Polish & Launch
## LeetNote Firefox Extension

---

**Duration:** Week 9–12  
**Priority:** P0 for launch  
**Depends on:** All previous phases complete  
**Agent Strategy:** 3 agents in parallel

- **Agent A:** Theming & Accessibility (Tasks 6.1–6.2)
- **Agent B:** Testing Suite (Tasks 6.3–6.5)
- **Agent C:** Error Recovery & Hardening + AMO Prep (Tasks 6.6–6.8)

---

## Task Breakdown

### Task 6.1 — Dark/Light Mode Theming

**AI Instruction:**
```
Finalize the dual-theme support across sidebar and popup.

From UI/UX Guide Section 9:

1. Detection mechanism in sidebar-injector.ts:
   const isDark = document.documentElement.classList.contains('dark');
   Fallback: window.matchMedia('(prefers-color-scheme: dark)').matches
   
   Set data-theme="light" or data-theme="dark" on the sidebar host element.
   
   Watch for changes:
   - MutationObserver on document.documentElement for class attribute changes
   - matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)

2. CSS variable overrides in sidebar.module.css:
   [data-theme="light"] scope must override ALL background, text, and border variables.
   Light mode values from UI/UX Guide Section 3.4:
     --ln-bg-base: #F8F9FF
     --ln-bg-surface: #FFFFFF
     --ln-bg-overlay: #F0F1FB
     --ln-border: #E2E3F0
     --ln-text-primary: #1A1B26
     --ln-text-secondary: #6B6C8A
     --ln-text-code: #4F46E5

   For the wireframe palette, create equivalent light overrides:
     --bg: #F5F4F0, --s1: #FFFFFF, --s2: #FAFAF8, --s3: #F0EFED
     --ink: #8B7635, --txt: #1A1917, --txt2: #6B6560, --txt3: #9B958D

3. Test every component in BOTH modes:
   - Sidebar: all sections, all button states, toasts
   - Popup: all 3 dashboard states, all 4 settings tabs
   - Onboarding: all 5 steps
   - Context menu toast
   
4. Difficulty colors remain the same in both modes (they're semantic).

5. Popup theming:
   - Popup doesn't have access to LeetCode's DOM
   - Use prefers-color-scheme media query for popup
   - OR: read a theme preference from storage
```

### Task 6.2 — Accessibility Audit & Fixes

**AI Instruction:**
```
Ensure full WCAG 2.1 AA compliance per PRD Section 6.5 and UI/UX Guide Section 10.

1. Contrast ratios:
   - Audit every text/background combination in both themes
   - All text must meet 4.5:1 ratio (normal text) or 3:1 (large text)
   - Use a contrast checker tool or manual calculation
   - Fix any violations by adjusting text or background colors

2. Focus management:
   - Every interactive element must have a visible focus ring
   - Focus ring: 2px solid --ln-border-focus (#6366F1), 2px offset
   - Tab order must be logical within sidebar (top to bottom)
   - Trap focus inside sidebar when open (Tab cycles through sidebar elements)
   - Escape key closes sidebar and returns focus to the page

3. ARIA labels (from UI/UX Guide Section 10.2):
   - Sidebar toggle: aria-label="Open/Close LeetNote sidebar", aria-expanded
   - Confidence rating: role="radiogroup", aria-label="Confidence rating (1 to 5)"
     Each circle: type="radio", aria-label="1 — Needs practice" etc.
   - Save button during save: aria-busy="true", aria-label="Saving to Notion"
   - Queue status: role="status", aria-live="polite"
   - Toast notifications: role="alert" for errors, role="status" for success
   - All icon-only buttons: aria-label describing the action

4. Screen reader compatibility:
   - All icons must be aria-hidden="true" (decorative) OR have aria-label (functional)
   - Status changes announced via aria-live regions
   - Form fields have associated labels (explicit <label> or aria-labelledby)

5. Keyboard navigation (from UI/UX Guide Section 7.4):
   - Ctrl+Shift+N: toggle sidebar
   - Tab / Shift+Tab: navigate between sidebar fields
   - Ctrl+Enter: save to Notion
   - Escape: collapse sidebar
   - Ctrl+Shift+C: capture code snapshot
   
   All shortcuts must be documented in aria-keyshortcuts attributes.

6. Reduced motion:
   @media (prefers-reduced-motion: reduce) {
     * { animation: none !important; transition: none !important; }
   }
   Sidebar appears/disappears instantly instead of sliding.

7. Color independence:
   - No status conveyed by color alone
   - Save button states: color + icon + text label
   - Difficulty: color + text label
   - Confidence: color + number
   - Queue status: color + icon + text
```

### Task 6.3 — Unit Tests (Vitest)

**AI Instruction:**
```
Write comprehensive unit tests using Vitest for all core modules.
Coverage target: ≥90% branch coverage on critical modules.

Test files follow the pattern: src/<module>/__tests__/<file>.test.ts

1. src/shared/__tests__/crypto.test.ts
   - encrypt → decrypt round-trip returns original token
   - Different tokens produce different ciphertexts
   - Corrupted ciphertext throws LN_700 error
   - Key derivation is deterministic (same inputs → same key)

2. src/background/__tests__/storage-service.test.ts
   - get/set/delete with various value types
   - getEncrypted/setEncrypted round-trip
   - enqueue adds to queue array
   - dequeue removes by ID
   - Queue limit (100) throws LN_500
   - clear removes only LeetNote keys
   Mock: browser.storage.local using a Map

3. src/background/__tests__/notion-client.test.ts
   - findProblem returns null when not found
   - findProblem returns pageId and metadata when found
   - createProblemPage sends correct Notion API payload
   - appendAttempt sends correct block children
   - upsertProblem routes to create vs append correctly
   - buildPageBody produces correct block structure
   - Language mapping (python3 → python, cpp → c++, etc.)
   - API error handling: 401 → LN_100, 429 → LN_300, etc.
   Mock: global fetch

4. src/background/__tests__/queue-manager.test.ts
   - enqueue creates entry with correct initial state
   - processQueue retries pending entries
   - Exponential backoff delays are correct: 1s, 2s, 4s, 8s, 16s
   - Entry marked 'failed' after 5 attempts
   - retryAll resets failed entries
   - Badge updates correctly for pending/failed/clear states
   Mock: StorageService, NotionClient, chrome.alarms

5. src/content/__tests__/scraper.test.ts
   - Test against 5 saved DOM snapshots (create fixtures)
   - Fixture 1: standard problem page with all elements
   - Fixture 2: problem with missing tags
   - Fixture 3: problem with missing acceptance rate
   - Fixture 4: problem in dark mode
   - Fixture 5: problem with unusual title format
   - Each fixture: verify all 7 fields extracted correctly
   - Test fallback selector chain (first selector fails, second works)
   - Test code extraction from Monaco model mock

6. src/shared/__tests__/spaced-rep.test.ts
   - Rating 1 → tomorrow
   - Rating 2 → 3 days
   - Rating 3 → 7 days
   - Rating 4, attempt 1 → 12 days
   - Rating 5, attempt 1 → 15 days
   - Rating 4, attempt 2, prev 7 days → 7 * 2.3 ≈ 16 days
   - Rating 5, attempt 3, prev 16 days → 16 * 2.55 ≈ 41 days

Configure vitest.config.ts:
  - Environment: jsdom (for DOM tests)
  - Coverage: v8 provider
  - Setup: mock chrome/browser API globals
```

### Task 6.4 — Integration Tests

**AI Instruction:**
```
Write integration tests for message-passing flows.

1. src/__tests__/integration/save-flow.test.ts
   - Simulate: SAVE_PROBLEM message → background handler → NotionClient call
   - Verify: queue entry created, API called, response returned
   - Verify: offline scenario queues and returns 'queued' status

2. src/__tests__/integration/clip-flow.test.ts
   - Simulate: CLIP_ADD → storage → CLIP_LIST → verify clips returned
   - Verify: 10 clip limit enforced

3. src/__tests__/integration/auth-flow.test.ts
   - Simulate: NOTION_AUTH_START → NOTION_AUTH_COMPLETE
   - Verify: token encrypted and stored
   - Verify: subsequent API calls use decrypted token

Use chrome-mock or a custom mock layer for chrome.runtime.sendMessage.
```

### Task 6.5 — E2E Tests (Playwright)

**AI Instruction:**
```
Write end-to-end tests using Playwright with Firefox.
From TRD Section 10.3.

Configure playwright.config.ts:
  - Browser: firefox
  - Extension loading: use --load-extension flag or Firefox profile with extension
  - Base URL: https://leetcode.com

Test files in tests/e2e/:

1. tests/e2e/sidebar.spec.ts
   - Navigate to leetcode.com/problems/two-sum/
   - Press Ctrl+Shift+N → verify sidebar opens
   - Type in notes textarea → verify text appears
   - Click "Capture" → verify code preview updates
   - Set confidence to 4 → verify label shows "Good"
   - Press Escape → verify sidebar closes
   - Press Ctrl+Shift+N again → verify notes persisted

2. tests/e2e/save-flow.spec.ts (requires Notion sandbox)
   - Open sidebar on a problem
   - Fill notes, capture code, set complexity, set confidence
   - Click "Save to Notion"
   - Verify success toast appears
   - Verify badge clears

3. tests/e2e/onboarding.spec.ts
   - Load extension fresh (no stored token)
   - Click extension icon → verify onboarding wizard opens
   - Navigate through all 5 steps
   - Verify "Skip" works on Step 5

4. tests/e2e/navigation.spec.ts
   - Navigate from Two Sum to Add Two Numbers
   - Verify sidebar detects navigation
   - Verify metadata updates to new problem

Note: Some tests may need recorded HTTP fixtures (MSW or similar)
to avoid hitting real Notion API in CI.
```

### Task 6.6 — Error Recovery Flows

**AI Instruction:**
```
Implement the error recovery flows from App Flow Section 9.

1. Notion Auth Expiry (Section 9.1):
   - When any Notion API call returns 401:
     a. Background marks token as expired in storage
     b. Payload is queued (not lost)
     c. Send message to content script / popup: NOTION_AUTH_EXPIRED
     d. Sidebar shows red banner: "Notion session expired"
        with "Reconnect Notion" button
     e. Popup shows disconnected state
     f. After re-auth: auto-process queue

2. DOM Selector Failure (Section 9.2):
   - When scraper fails to extract title (critical field):
     a. Sidebar shows warning banner (yellow):
        "⚠ Couldn't read problem title. Please type it below:"
     b. Title field becomes an editable input
     c. User fills in manually
     d. Save proceeds with manually entered data
     e. Error logged to debug.error_log
   - For non-critical fields (tags, acceptance rate):
     a. Small inline warning icon next to the field
     b. Tooltip: "Couldn't auto-detect. You can edit manually."
     c. Save still works with null values

3. Database Schema Mismatch (Section 9.3):
   - When Notion returns 400 "property not found":
     a. Sidebar shows: "Your Notion database is missing required properties."
     b. Two buttons: [Auto-Fix] [Open Settings]
     c. Auto-Fix: PATCH /databases/{id} adding missing properties
     d. After fix: retry the save automatically
     e. Log which properties were missing

4. Generic error handling:
   - All background message handlers wrapped in try/catch
   - Errors classified using the error code table (API Spec Section 7)
   - Error logged to ring buffer (max 50 entries)
   - Each log entry: timestamp, error code, message, stack, extension version, problem URL

5. Error log export:
   - Settings About tab → "Export Debug Log" button
   - Reads debug.error_log from storage
   - Formats as JSON with metadata header
   - Triggers browser download of .json file
```

### Task 6.7 — Performance Optimization

**AI Instruction:**
```
Ensure all performance NFRs from PRD Section 6.1 are met.

NFR-P1: Sidebar animation < 250ms
  - Current: 180ms ease-out. Verified ✓
  - Test with performance.now() measurements

NFR-P2: Metadata extraction DOM scan < 50ms
  - Optimize selector queries: use getElementById where possible
  - Cache DOM references within a single scrape() call
  - Measure with performance.now() around scrape()

NFR-P3: Extension startup overhead on leetcode.com < 100ms
  - Content script should defer non-critical work
  - Sidebar injection: defer until first user interaction (idle callback)
  - Scraper: run on requestIdleCallback, not synchronously

NFR-P4: Notion API call initiated within 500ms of clicking "Save"
  - Ensure message passing + queue write happens < 500ms
  - The actual API call can take longer (network)

Bundle size targets (from TRD 11.2):
  - background.js < 200KB — avoid importing React here
  - content.js < 100KB — minimal, no React
  - clip-content.js < 30KB — vanilla JS only
  - sidebar.js + sidebar.css < 300KB — React + components
  - popup.js + popup.css < 200KB — React + pages

Optimizations:
  - Tree-shake unused code in Vite build
  - Ensure no duplicate React copies (check bundle analysis)
  - Lazy-load sidebar components that aren't immediately visible
  - Use dynamic import() for ClipQueue (only needed when clips > 0)
```

### Task 6.8 — AMO Submission Preparation

**AI Instruction:**
```
Prepare the extension for Firefox Add-ons (AMO) submission.

1. Manifest compliance:
   - Verify all permissions are justified (TRD Section 7.3)
   - Ensure no overly broad host_permissions
   - Verify CSP is strict: "script-src 'self'; object-src 'self'"
   - No eval(), no inline scripts, no remote code loading
   - browser_specific_settings.gecko.id is set
   - strict_min_version is "109.0"

2. Source code submission:
   - AMO requires source for review when using build tools
   - pnpm package:source creates a zip of src/ + build config
   - Include README with build instructions
   - Include a BUILDING.md:
     "Prerequisites: Node.js 20+, pnpm 9+
      Install: pnpm install
      Build: pnpm build
      Output: dist/"

3. Privacy policy:
   - Create a PRIVACY.md:
     "LeetNote connects to two services only:
      1. leetcode.com — read-only DOM access for metadata extraction
      2. api.notion.com — to save data to your Notion workspace
      No data is sent to any other server. No analytics. No telemetry.
      Your Notion API token is encrypted with AES-256 on your device.
      All data is stored locally in browser.storage.local."

4. AMO listing assets:
   - Extension description (under 250 chars for summary)
   - Screenshots: sidebar (dark mode), popup, onboarding, Notion output
   - Icon: 128x128 PNG

5. Version and changelog:
   - Set version in manifest.json and package.json to "1.0.0"
   - Create CHANGELOG.md with v1.0.0 release notes

6. Final build:
   - pnpm build (production, no source maps)
   - pnpm package → creates releases/leetnote-v1.0.0.zip
   - Verify the zip loads in Firefox via about:debugging
   - Verify all features work in the built version
```

---

## Completion Criteria

- [ ] Extension works correctly in both LeetCode light and dark modes
- [ ] All WCAG 2.1 AA contrast ratios pass
- [ ] Full keyboard navigation works (Tab, Escape, Ctrl+Enter, shortcuts)
- [ ] Screen reader announces all status changes
- [ ] prefers-reduced-motion disables all animations
- [ ] Unit test coverage ≥ 90% on critical modules
- [ ] All E2E tests pass in Firefox
- [ ] Auth expiry recovery works end-to-end
- [ ] DOM selector failure shows manual input fallback
- [ ] Database schema auto-fix works
- [ ] Error log captures all error types with correct codes
- [ ] All bundle sizes within targets
- [ ] Extension loads cleanly from the dist/ zip
- [ ] AMO submission package ready with source + privacy policy

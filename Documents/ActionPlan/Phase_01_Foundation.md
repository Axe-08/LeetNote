# Phase 01 — Foundation & Scaffold
## LeetNote Firefox Extension

---

**Duration:** Week 1–2  
**Priority:** P0 — Blocks everything  
**Agent Strategy:** Single agent (sequential — creates the base all other work depends on)

---

## Objectives

1. Initialize the project with Vite + React 18 + TypeScript
2. Configure the build to output a valid Firefox Manifest V3 extension
3. Define all shared TypeScript types and constants
4. Set up the type-safe message passing contract
5. Establish linting, formatting, and CI pipeline

---

## Task Breakdown

### Task 1.1 — Project Initialization

**AI Instruction:**
```
Initialize a new Vite project in the LeetNote repository root using React and TypeScript.
Run: npx -y create-vite@latest ./ --template react-ts
Then install these exact dependencies:

Production:
  - react@18, react-dom@18
  - zustand (latest)
  - webextension-polyfill (for browser.* API compatibility)

Dev:
  - @types/webextension-polyfill
  - @crxjs/vite-plugin (or vite-plugin-web-extension for Firefox MV3)
  - vitest, @testing-library/react
  - eslint, prettier, eslint-config-prettier
  - typescript (strict mode)

Configure tsconfig.json:
  - strict: true
  - target: ES2022
  - module: ES2022
  - moduleResolution: bundler
  - paths: { "@shared/*": ["./src/shared/*"], "@background/*": ["./src/background/*"], etc. }

IMPORTANT: Do NOT use Tailwind. Use CSS Modules + CSS Custom Properties per the design spec.
```

### Task 1.2 — Vite Build Configuration for Firefox MV3

**AI Instruction:**
```
Configure vite.config.ts to produce a valid Firefox Manifest V3 extension bundle.

The build must output these separate entry points (NOT a single SPA bundle):
  1. background.js    — from src/background/index.ts (service worker)
  2. content.js       — from src/content/index.ts (problem page content script)
  3. clip-content.js  — from src/content/clip-content.ts (discussion page content script)
  4. sidebar.js + sidebar.css — from src/sidebar/main.tsx (React app injected into page)
  5. popup.html + popup.js + popup.css — from src/popup/main.tsx (extension popup)

Use Vite's build.rollupOptions.input for multi-entry.
Set build.outDir to "dist/".

Configure the build to:
  - Copy manifest.json to dist/
  - Copy the assets/ directory (icons, fonts) to dist/assets/
  - NOT use code splitting for content scripts (they must be single files)
  - Enable source maps in dev mode only

Create a dev script that:
  - Watches for changes and rebuilds
  - Outputs to dist/ so Firefox can load the extension from dist/ via about:debugging

Reference the TRD Section 11 for bundle size targets:
  - background.js < 200KB
  - content.js < 100KB  
  - clip-content.js < 30KB
  - sidebar.js + sidebar.css < 300KB
  - popup.js + popup.css < 200KB
```

### Task 1.3 — Manifest V3 File

**AI Instruction:**
```
Create src/manifest.json with the following exact configuration (from TRD Section 3.1):

{
  "manifest_version": 3,
  "name": "LeetNote",
  "version": "1.0.0",
  "description": "Capture LeetCode solutions, notes, and community insights into a clean Notion database — without leaving your tab.",
  "permissions": ["storage", "contextMenus", "alarms", "notifications"],
  "host_permissions": ["https://leetcode.com/*", "https://api.notion.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/problems/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://leetcode.com/discuss/*"],
      "js": ["clip-content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "web_accessible_resources": [
    {
      "resources": ["sidebar.html", "assets/*"],
      "matches": ["https://leetcode.com/*"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "icons": {
    "48": "assets/icon-48.png",
    "96": "assets/icon-96.png",
    "128": "assets/icon-128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "leetnote@extension",
      "strict_min_version": "109.0"
    }
  }
}

IMPORTANT: Include browser_specific_settings.gecko for Firefox AMO compliance.
The gecko.strict_min_version must be "109.0" (first Firefox MV3 support).
```

### Task 1.4 — Directory Structure

**AI Instruction:**
```
Create the full directory structure with placeholder index files.
Each file should have a single-line comment explaining its purpose.
Do NOT implement logic yet — just create the skeleton.

src/
├── background/
│   ├── index.ts                  // Service worker entry — registers message handlers and alarms
│   ├── queue-manager.ts          // Offline queue with exponential backoff retry
│   ├── notion-client.ts          // Notion REST API wrapper (query, create, append, update)
│   ├── context-menu.ts           // Right-click "Clip to LeetNote" menu registration
│   └── storage-service.ts        // Encrypted storage abstraction over browser.storage.local
│
├── content/
│   ├── index.ts                  // Problem page content script — scraper + sidebar injector
│   ├── scraper.ts                // DOM metadata extraction with fallback selector chains
│   ├── sidebar-injector.ts       // Mounts React sidebar into Shadow DOM host
│   └── clip-content.ts           // Discussion page — listens for clip context menu events
│
├── sidebar/
│   ├── main.tsx                  // Sidebar React root — mounted inside Shadow DOM
│   ├── store.ts                  // Zustand store for sidebar state
│   ├── components/
│   │   ├── SidebarHeader.tsx     // Problem title + difficulty badge + collapse/close
│   │   ├── AttemptRail.tsx       // Vertical timeline of past attempts
│   │   ├── NotesPanel.tsx        // Markdown-aware textarea with char counter
│   │   ├── CodePreview.tsx       // Read-only code display + capture button
│   │   ├── ComplexityInputs.tsx  // Time/Space complexity with quick-pick dropdown
│   │   ├── ConfidenceRating.tsx  // 1-5 circular rating nodes
│   │   ├── ClipQueue.tsx         // Manage queued community clips
│   │   ├── SaveButton.tsx        // Multi-state save CTA
│   │   └── Toast.tsx             // Notification toasts (success/warning/error)
│   └── styles/
│       └── sidebar.module.css    // All sidebar CSS using design system tokens
│
├── popup/
│   ├── main.tsx                  // Popup React root
│   ├── pages/
│   │   ├── Welcome.tsx           // Onboarding step 1
│   │   ├── NotionConnect.tsx     // Onboarding step 2 — OAuth trigger
│   │   ├── DatabaseSetup.tsx     // Onboarding step 3 — select/create DB
│   │   ├── Preferences.tsx       // Onboarding step 4 — initial settings
│   │   ├── TestSave.tsx          // Onboarding step 5 — optional test save
│   │   ├── StatusDashboard.tsx   // Post-onboard popup main view
│   │   └── Settings.tsx          // Settings panel with 4 tabs
│   └── styles/
│       └── popup.module.css
│
├── shared/
│   ├── types.ts                  // All TypeScript interfaces (see Task 1.5)
│   ├── constants.ts              // App-wide constants (see Task 1.6)
│   ├── crypto.ts                 // AES-GCM 256 encrypt/decrypt using WebCrypto
│   ├── messages.ts               // Type-safe message contracts and helper functions
│   └── selectors.json            // Externalized LeetCode DOM selectors
│
├── assets/
│   ├── icon-48.png               // Extension icon (placeholder)
│   ├── icon-96.png
│   └── icon-128.png
│
└── manifest.json
```

### Task 1.5 — Shared TypeScript Types

**AI Instruction:**
```
Create src/shared/types.ts with ALL TypeScript interfaces from the API Spec (Doc 04).
These types are the contract between every module. They must match the spec exactly.

Include these interfaces (copy verbatim from the API Spec Section 2 and Data Models):

1. Message<T> and Response<T> envelope types
2. MessageType union (all 16 message types from API Spec 2.2)
3. SaveProblemPayload (API Spec MSG-001)
4. SaveProblemResponse
5. CheckExistingPayload / CheckExistingResponse (MSG-002)
6. QueueStatusResponse (MSG-003)
7. ClipAddPayload / ClipAddResponse (MSG-004)
8. ProblemNavigatedPayload (MSG-005)
9. NotionAuthStartResponse (MSG-006)
10. NotionAuthCompletePayload (MSG-007)
11. UpdateSettingsPayload / UpdateSettingsResponse (MSG-008)
12. ProblemMetadata interface
13. CommunityClip interface
14. QueueEntry interface (id, payload, attempts, createdAt, lastAttemptAt, status)
15. ScrapeResult and ScrapeWarning interfaces (API Spec Section 6.1)
16. StorageKey enum (API Spec Section 5.2 — all keys)
17. StorageSchema interface
18. AppError class with error codes (LN_001 through LN_700 from API Spec Section 7)

CRITICAL: Use discriminated unions for MessageType so message handlers have full type narrowing.
Export everything. These types are imported by every module in the extension.
```

### Task 1.6 — Constants & Selectors Config

**AI Instruction:**
```
Create src/shared/constants.ts with all app-wide constants from the specs:

- NOTION_API_BASE = 'https://api.notion.com/v1'
- NOTION_API_VERSION = '2022-06-28'
- MAX_CLIPS_PER_PROBLEM = 10
- MAX_ATTEMPTS_PER_PROBLEM = 20
- MAX_QUEUE_ENTRIES = 100
- MAX_RETRY_ATTEMPTS = 5
- QUEUE_FLUSH_INTERVAL_MINUTES = 2
- MIN_SAVE_INTERVAL_MS = 5000
- DEBOUNCE_CODE_CAPTURE_MS = 2000
- NOTION_RATE_LIMIT_DELAY_MS = 400
- NOTION_429_BACKOFF_MS = 10000
- SIDEBAR_WIDTH_DEFAULT = 360
- SIDEBAR_WIDTH_MIN = 280
- SIDEBAR_WIDTH_MAX = 480
- SIDEBAR_ANIMATION_MS = 180
- TOAST_AUTO_DISMISS_MS = 4000
- MAX_NOTE_LENGTH = 2000
- MAX_TOASTS_VISIBLE = 3
- ERROR_LOG_MAX_ENTRIES = 50
- DEFAULT_KEYBOARD_SHORTCUT = 'Ctrl+Shift+N'

- SPACED_REP_INTERVALS: Record<1|2|3|4|5, number> = {
    1: 1,   // days
    2: 3,
    3: 7,
    4: 14,
    5: 30
  }

- LANGUAGE_MAP: Record<string, string> (LeetCode key → Notion code block language)
  From API Spec Section 4.2: python3→python, cpp→c++, csharp→c#, golang→go, etc.

Create src/shared/selectors.json with the externalized selector chains from API Spec 6.2:
  title: ['[data-cy="question-title"]', '.text-title-large a', 'h1.mr-2']
  difficulty: ['[diff]', '.text-difficulty-easy', '.text-difficulty-medium', '.text-difficulty-hard', ...]
  tags: ['a.mr-1[href*="/tag/"]', 'a[class*="topic-tag"]', '.flex.flex-wrap a[href*="tag"]']
  acceptanceRate: ['.text-sd-foreground']
  language: ['.ant-select-selection-item']
  number: ['.text-body.font-medium']
```

### Task 1.7 — CI/CD Pipeline

**AI Instruction:**
```
Create .github/workflows/ci.yml with the CI pipeline from TRD Section 11.3:

on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4 with node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:unit
  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: extension-build, path: dist/ }

Also create package.json scripts:
  "dev": "vite build --watch --mode development"
  "build": "tsc && vite build"
  "lint": "eslint src/ --ext .ts,.tsx"
  "test:unit": "vitest run"
  "test:e2e": "playwright test"
  "package": "cd dist && zip -r ../releases/leetnote-v$npm_package_version.zip ."
  "package:source": "zip -r releases/leetnote-source.zip src/ package.json tsconfig.json vite.config.ts"
```

### Task 1.8 — Extension Icon Assets

**AI Instruction:**
```
Generate extension icon assets for LeetNote.

The icon design (from UI/UX Guide Section 2.1):
- A minimal glyph combining a code bracket < > with a small Notion-style square
- Color: Electric indigo (#6366F1) fill on transparent background
- Clean, geometric, recognizable at 16px

Generate at sizes: 48x48, 96x96, 128x128
Save to src/assets/icon-48.png, icon-96.png, icon-128.png
```

---

## Completion Criteria

- [ ] `pnpm dev` runs without errors and watches for changes
- [ ] `pnpm build` produces a clean dist/ with all entry points
- [ ] Extension loads in Firefox via about:debugging → "Load Temporary Add-on"
- [ ] No TypeScript errors in strict mode
- [ ] All shared types compile and are importable from any module
- [ ] ESLint + Prettier pass with zero warnings
- [ ] CI pipeline runs green on push

---

## Files Created This Phase

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | Strict TS config with path aliases |
| `vite.config.ts` | Multi-entry Firefox MV3 build |
| `.eslintrc.cjs` | Linting rules |
| `.prettierrc` | Formatting rules |
| `src/manifest.json` | MV3 manifest for Firefox |
| `src/shared/types.ts` | All TypeScript interfaces |
| `src/shared/constants.ts` | All constants |
| `src/shared/messages.ts` | Message bus helpers |
| `src/shared/selectors.json` | DOM selector chains |
| `src/shared/crypto.ts` | Placeholder |
| `src/background/index.ts` | Placeholder |
| `src/content/index.ts` | Placeholder |
| `src/sidebar/main.tsx` | Placeholder |
| `src/popup/main.tsx` | Placeholder |
| `.github/workflows/ci.yml` | CI pipeline |

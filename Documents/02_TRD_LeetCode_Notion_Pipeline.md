# Technical Requirements Document
## LeetCode → Notion Knowledge Pipeline
### Firefox Browser Extension

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 2026  
**Audience:** Engineering Team

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Extension Architecture](#3-extension-architecture)
4. [Module Specifications](#4-module-specifications)
5. [Data Models](#5-data-models)
6. [Notion API Integration](#6-notion-api-integration)
7. [Security Architecture](#7-security-architecture)
8. [State Management](#8-state-management)
9. [Error Handling Strategy](#9-error-handling-strategy)
10. [Testing Strategy](#10-testing-strategy)
11. [Build & Packaging](#11-build--packaging)

---

## 1. System Overview

### 1.1 Architecture Summary

The extension follows a **3-layer architecture** consistent with Manifest V3's process model:

```
┌─────────────────────────────────────────────────────┐
│                  LeetCode Tab (Renderer)              │
│  ┌──────────────────┐  ┌────────────────────────┐   │
│  │  content.js       │  │  sidebar.js (injected) │   │
│  │  DOM Scraper      │  │  React Sidebar UI       │   │
│  │  Clip Listener    │  │  Local State Store      │   │
│  └────────┬─────────┘  └──────────┬─────────────┘   │
└───────────┼──────────────────────┼──────────────────┘
            │  chrome.runtime.msg   │  chrome.runtime.msg
            ▼                       ▼
┌─────────────────────────────────────────────────────┐
│            Background Service Worker                  │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ QueueManager │  │NotionAPI │  │ContextMenu   │  │
│  │ (retry loop) │  │ Client   │  │ Registration │  │
│  └──────────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │StorageService│  │     Encryption Service        │ │
│  └──────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────┐
│              Extension Popup / Onboarding             │
│  ┌──────────────────────────────────────────────┐   │
│  │  React SPA: Onboarding Wizard + Settings      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 1.2 Communication Patterns

| Channel | Direction | Protocol |
|---|---|---|
| Content Script → Background | Unidirectional | `chrome.runtime.sendMessage` |
| Background → Content Script | Unidirectional | `chrome.tabs.sendMessage` |
| Sidebar ↔ Background | Bidirectional | `chrome.runtime.connect` (port) |
| Popup ↔ Background | Bidirectional | `chrome.runtime.sendMessage` |
| Background → Notion API | Outbound HTTP | `fetch()` with bearer auth |

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Extension Framework | **Manifest V3** (Firefox WebExtensions API) | Required for Firefox AMO compliance; future-proof |
| UI Framework | **React 18** + **TypeScript** | Type safety; component reuse across popup/sidebar |
| Bundler | **Vite** + `@crxjs/vite-plugin` (adapted for Firefox) | Fast HMR; clean MV3 bundle splitting |
| Styling | **CSS Modules** + **CSS Custom Properties** | Scoped styles; no Tailwind to avoid CSP conflicts |
| State (Sidebar) | **Zustand** | Lightweight; no Redux boilerplate; works in content script context |
| Storage Abstraction | **Custom StorageService** over `browser.storage.local` | Consistent async/await API; encryption layer |
| Encryption | **WebCrypto API** (AES-GCM 256) | Native browser API; no third-party crypto dependency |
| HTTP Client | **Native `fetch`** | No axios; MV3 service workers support it natively |
| Testing | **Vitest** (unit) + **Playwright** (e2e) | Fast unit tests; Playwright has Firefox support |
| Linting | **ESLint** + **Prettier** | Code consistency |
| Type Definitions | **@notionhq/client** (types only) | No runtime SDK (it's Node-only); use types for model safety |

---

## 3. Extension Architecture

### 3.1 Manifest V3 Structure

```json
{
  "manifest_version": 3,
  "name": "LeetNotion",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "contextMenus",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://api.notion.com/*"
  ],
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
  }
}
```

### 3.2 File Tree

```
src/
├── background/
│   ├── index.ts                  # Service worker entry
│   ├── queue-manager.ts          # Offline queue with retry
│   ├── notion-client.ts          # Notion REST API wrapper
│   ├── context-menu.ts           # Right-click menu setup
│   └── storage-service.ts        # Encrypted storage abstraction
│
├── content/
│   ├── index.ts                  # Problem page content script
│   ├── scraper.ts                # DOM metadata extraction
│   ├── sidebar-injector.ts       # Mounts React sidebar into page
│   └── clip-content.ts           # Discussion page clip listener
│
├── sidebar/
│   ├── main.tsx                  # Sidebar React root
│   ├── store.ts                  # Zustand store
│   ├── components/
│   │   ├── NotesPanel.tsx
│   │   ├── CodePreview.tsx
│   │   ├── ComplexityInputs.tsx
│   │   ├── ConfidenceRating.tsx
│   │   ├── ClipQueue.tsx
│   │   └── SaveButton.tsx
│   └── styles/
│       └── sidebar.module.css
│
├── popup/
│   ├── main.tsx                  # Popup / onboarding React root
│   ├── pages/
│   │   ├── Welcome.tsx
│   │   ├── NotionConnect.tsx
│   │   ├── DatabaseSetup.tsx
│   │   ├── Preferences.tsx
│   │   └── Settings.tsx
│   └── styles/
│
├── shared/
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── constants.ts              # App-wide constants
│   ├── crypto.ts                 # AES-GCM encryption utilities
│   └── messages.ts               # Type-safe message contracts
│
└── manifest.json
```

---

## 4. Module Specifications

### 4.1 DOM Scraper (`scraper.ts`)

**Responsibility:** Extract problem metadata from the LeetCode DOM at the time of save.

**Selector Strategy:** Selectors are stored in a JSON config file (`selectors.json`) that can be updated without redeploying:

```typescript
interface ProblemMetadata {
  title: string;
  number: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
  acceptanceRate: number | null;
  language: string;
}

// Selector config (externalized for maintainability)
const SELECTORS = {
  title: '[data-cy="question-title"], .text-title-large',
  number: '.text-body.font-medium', // "1. Two Sum" → parse number
  difficulty: '[diff]',
  tags: 'a[href*="/tag/"]',
  acceptanceRate: '.text-sd-foreground', // filter for "%" 
  language: '.ant-select-selection-item' // active lang dropdown
};
```

**Fallback Logic:**
- Each field wrapped in `try/catch`; failure sets field to `null`.
- A `scrapeWarnings: string[]` array accumulates any missing fields.
- If `title` fails (critical field), the scrape is aborted and user notified.

**Code Extraction:**
```typescript
function extractCode(): string {
  // Strategy 1: Monaco editor model (most reliable)
  const monacoModels = (window as any).monaco?.editor?.getModels();
  if (monacoModels?.length) return monacoModels[0].getValue();
  
  // Strategy 2: CodeMirror instance
  const cm = document.querySelector('.CodeMirror') as any;
  if (cm?.CodeMirror) return cm.CodeMirror.getValue();
  
  // Strategy 3: Read-only textarea fallback
  const textarea = document.querySelector('textarea.inputarea');
  return textarea?.value ?? '';
}
```

---

### 4.2 Background Service Worker (`background/index.ts`)

**Lifecycle:** MV3 service workers can be terminated when idle. All persistent state is stored in `browser.storage.local`, not in memory.

**Message Handler Registration:**
```typescript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'SAVE_PROBLEM':   handleSaveProblem(msg.payload, sendResponse); break;
    case 'CHECK_EXISTING': handleCheckExisting(msg.payload, sendResponse); break;
    case 'CLIP_TEXT':      handleClipText(msg.payload, sendResponse); break;
    case 'GET_QUEUE':      handleGetQueue(sendResponse); break;
    case 'RETRY_QUEUE':    handleRetryQueue(sendResponse); break;
  }
  return true; // Keep message channel open for async response
});
```

---

### 4.3 Queue Manager (`queue-manager.ts`)

**Queue Entry Schema:**
```typescript
interface QueueEntry {
  id: string;           // UUID
  payload: SavePayload; // Full problem data
  attempts: number;     // Retry count (max 5)
  createdAt: number;    // Unix timestamp
  lastAttemptAt: number | null;
  status: 'pending' | 'failed' | 'synced';
}
```

**Retry Logic:**
```typescript
async function processQueue() {
  const queue = await storage.get<QueueEntry[]>('sync_queue') ?? [];
  const pending = queue.filter(e => e.status === 'pending' && e.attempts < 5);
  
  for (const entry of pending) {
    const delay = Math.pow(2, entry.attempts) * 1000; // Exponential backoff
    await sleep(delay);
    
    try {
      await notionClient.upsertProblem(entry.payload);
      await markSynced(entry.id);
    } catch (err) {
      await incrementAttempts(entry.id);
      if (entry.attempts + 1 >= 5) await markFailed(entry.id);
    }
  }
}

// Triggered by alarm every 2 minutes
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'queue_flush') processQueue();
});
chrome.alarms.create('queue_flush', { periodInMinutes: 2 });
```

---

### 4.4 Notion Client (`notion-client.ts`)

**Responsibilities:**
1. Check if a problem entry exists in the database.
2. Create a new page from the anti-clutter template.
3. Append an attempt toggle to an existing page.
4. Update spaced repetition date property.

**Key Functions:**
```typescript
class NotionClient {
  constructor(private token: string, private databaseId: string) {}

  // Query for existing problem by number
  async findProblem(problemNumber: number): Promise<string | null> {
    const res = await this.apiCall('POST', `/databases/${this.databaseId}/query`, {
      filter: {
        property: 'Problem Number',
        number: { equals: problemNumber }
      }
    });
    return res.results[0]?.id ?? null;
  }

  // Full upsert logic
  async upsertProblem(payload: SavePayload): Promise<void> {
    const existingId = await this.findProblem(payload.metadata.number);
    
    if (!existingId) {
      await this.createProblemPage(payload);
    } else {
      await this.appendAttempt(existingId, payload);
    }
  }

  private async apiCall(method: string, path: string, body?: object) {
    const res = await fetch(`https://api.notion.com/v1${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!res.ok) throw new NotionAPIError(res.status, await res.json());
    return res.json();
  }
}
```

---

### 4.5 Sidebar Injector (`sidebar-injector.ts`)

**Strategy:** The sidebar is a React app mounted into a shadow DOM host to prevent style leakage:

```typescript
function injectSidebar() {
  // Create host element
  const host = document.createElement('div');
  host.id = 'leetnotion-sidebar-host';
  
  // Use Shadow DOM to encapsulate styles
  const shadow = host.attachShadow({ mode: 'closed' });
  
  // Inject sidebar stylesheet into shadow root
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/sidebar.css');
  shadow.appendChild(styleLink);
  
  // Mount container for React
  const container = document.createElement('div');
  container.id = 'leetnotion-sidebar-root';
  shadow.appendChild(container);
  
  document.body.appendChild(host);
  
  // Mount React app
  const root = createRoot(container);
  root.render(<Sidebar />);
}
```

---

## 5. Data Models

### 5.1 SavePayload (Internal)

```typescript
interface SavePayload {
  metadata: ProblemMetadata;
  solution: {
    code: string;
    language: string;
    timeComplexity: string;
    spaceComplexity: string;
    capturedAt: number; // Unix timestamp
  };
  notes: string;        // Raw markdown from textarea
  clips: CommunityClip[];
  rating: 1 | 2 | 3 | 4 | 5 | null;
  nextReviewDate: string | null; // ISO 8601
}

interface CommunityClip {
  id: string;
  text: string;
  isCode: boolean;
  sourceUrl: string;
  authorHandle: string | null;
  clippedAt: number;
}

interface ProblemMetadata {
  title: string;
  number: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  url: string;
  acceptanceRate: number | null;
}
```

### 5.2 Notion Database Schema

**Required Database Properties:**

| Property Name | Notion Type | Description |
|---|---|---|
| `Name` | Title | Problem title (e.g., "Two Sum") |
| `Problem Number` | Number | e.g., 1 |
| `Difficulty` | Select | Easy / Medium / Hard |
| `Tags` | Multi-select | Algorithmic tags |
| `URL` | URL | Direct LeetCode link |
| `Date Saved` | Date | First save timestamp |
| `Last Attempted` | Date | Most recent save |
| `Confidence` | Select | 1–5 stars |
| `Next Review` | Date | Spaced rep target date |
| `Attempts` | Number | Total attempt count |
| `Status` | Select | Not Started / Attempted / Solved / Mastered |

### 5.3 Local Storage Schema

```typescript
// Keys in browser.storage.local
interface StorageSchema {
  'auth.notion_token_enc': string;    // AES-GCM encrypted Notion token
  'auth.database_id': string;         // Target Notion database ID
  'settings.shortcut': string;        // e.g., "Ctrl+Shift+N"
  'settings.spaced_rep': boolean;
  'settings.clipping': boolean;
  'sync_queue': QueueEntry[];
  'session.clips': CommunityClip[];   // In-progress clips (current session)
  'session.draft': Partial<SavePayload>; // Unsaved sidebar state
}
```

---

## 6. Notion API Integration

### 6.1 OAuth Flow (Notion Public Integration)

```
User clicks "Connect Notion"
       │
       ▼
Extension opens popup window:
  https://api.notion.com/v1/oauth/authorize?
    client_id=<CLIENT_ID>&
    response_type=code&
    owner=user&
    redirect_uri=https://[EXTENSION_ID].chromiumapp.org/oauth
       │
       ▼ User grants access
OAuth callback URL receives `code`
       │
       ▼
Background service worker exchanges code:
  POST https://api.notion.com/v1/oauth/token
  { grant_type: authorization_code, code, redirect_uri }
       │
       ▼
Receives: { access_token, workspace_id, ... }
       │
       ▼
Token encrypted → stored in browser.storage.local
```

### 6.2 Database Creation (First Run)

If the user opts for auto-create, the extension:
1. Calls `POST /v1/pages` to create a new Notion page in workspace root.
2. Calls `POST /v1/databases` with the full schema above to create the database inside that page.
3. Stores the returned `database_id`.

### 6.3 Notion API Rate Limits

The Notion API enforces 3 requests/second per integration. Mitigation:
- All page creation is single-request (batched block children in one call).
- Queue processor has a 400ms inter-request delay.
- Failed 429 responses trigger a 10-second backoff before retry.

### 6.4 Block Builder — Anti-Clutter Page Body

```typescript
function buildPageBody(payload: SavePayload, attemptNumber: number): BlockObject[] {
  return [
    callout(difficultyIcon(payload.metadata.difficulty), 
            `${payload.metadata.title} · ${payload.metadata.tags.join(', ')}`,
            difficultyColor(payload.metadata.difficulty)),
    heading2('💡 My Solution'),
    toggle(`Attempt ${attemptNumber} — ${formatDate(new Date())}`, [
      code(payload.solution.code, payload.solution.language),
      callout('⏱', `Time: ${payload.solution.timeComplexity}`, 'gray'),
      callout('💾', `Space: ${payload.solution.spaceComplexity}`, 'gray'),
    ]),
    heading2('📝 My Notes'),
    ...markdownToParagraphBlocks(payload.notes),
    heading2('🌐 Community Insights'),
    ...payload.clips.map(clip => quoteBlock(clip)),
    heading2('🔁 Review Log'),
    // Notion table block
    reviewTableRow(attemptNumber, payload.rating, new Date()),
  ];
}
```

---

## 7. Security Architecture

### 7.1 Token Encryption

```typescript
// crypto.ts
const ALGORITHM = { name: 'AES-GCM', length: 256 };

async function deriveKey(): Promise<CryptoKey> {
  // Use extension ID + browser fingerprint as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(chrome.runtime.id + navigator.userAgent),
    'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('leetnotion-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, ALGORITHM, false, ['encrypt', 'decrypt']
  );
}

export async function encryptToken(token: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(token)
  );
  // Encode as base64: iv + ciphertext
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}
```

### 7.2 Content Security Policy

The extension enforces strict CSP:
- No `eval()` or inline scripts.
- All scripts loaded from extension bundle only.
- `connect-src` restricted to `https://api.notion.com` only.

### 7.3 Permission Justification (for AMO Review)

| Permission | Justification |
|---|---|
| `storage` | Persist encrypted token, queue, and user settings |
| `contextMenus` | "Clip to Notion" right-click menu on discussion pages |
| `alarms` | Periodic queue flush background task |
| `notifications` | Sync success/failure feedback |
| `host: leetcode.com/*` | DOM scraping and sidebar injection |
| `host: api.notion.com/*` | Direct Notion API calls from service worker |

---

## 8. State Management

### 8.1 Sidebar Store (Zustand)

```typescript
interface SidebarStore {
  // Problem context (set by scraper on page load)
  problemMetadata: ProblemMetadata | null;
  
  // User input
  notes: string;
  capturedCode: string | null;
  timeComplexity: string;
  spaceComplexity: string;
  confidenceRating: number | null;
  clips: CommunityClip[];
  
  // Save state
  saveStatus: 'idle' | 'saving' | 'queued' | 'success' | 'error';
  saveError: string | null;
  existingAttemptCount: number;
  
  // Actions
  captureCode: () => void;
  setNotes: (n: string) => void;
  removeClip: (id: string) => void;
  save: () => Promise<void>;
  reset: () => void;
}
```

### 8.2 SPA Navigation Handling

LeetCode is a React SPA. The extension must detect navigation between problems without full page reload:

```typescript
// content.ts
let currentProblemSlug: string | null = null;

function detectNavigation() {
  const slug = location.pathname.match(/\/problems\/([^/]+)\//)?.[1];
  if (slug && slug !== currentProblemSlug) {
    currentProblemSlug = slug;
    onProblemChanged(slug);
  }
}

// MutationObserver on document title as a proxy for SPA navigation
const observer = new MutationObserver(detectNavigation);
observer.observe(document.querySelector('title')!, { subtree: true, characterData: true, childList: true });

// Also intercept history API
const originalPushState = history.pushState.bind(history);
history.pushState = (...args) => { originalPushState(...args); detectNavigation(); };
window.addEventListener('popstate', detectNavigation);
```

---

## 9. Error Handling Strategy

### 9.1 Error Classification

| Error Class | Examples | UX Response |
|---|---|---|
| `ScraperError` | Missing DOM element | Yellow warning in sidebar; save continues with nulls |
| `NotionAuthError` | 401 from Notion API | "Re-connect Notion" prompt; queues payload |
| `NotionAPIError` | 400, 404, 500 | Toast with error code; payload queued |
| `RateLimitError` | 429 | Silent retry with backoff; no user disturbance unless >3 retries |
| `NetworkError` | No internet | "Saved locally, will sync when online" toast |
| `CodeExtractionError` | Monaco API unavailable | Prompt user to paste code manually |

### 9.2 Error Reporting

- All errors are logged to `browser.storage.local['error_log']` (ring buffer, max 50 entries).
- Log entries include: timestamp, error class, message, stack, extension version, problem URL.
- Log is accessible from Settings → "Export Debug Log" for user-initiated bug reports.
- No automatic telemetry transmission.

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)

**Coverage targets:**
- `scraper.ts`: ≥ 90% branch coverage; test against 5 saved DOM snapshots.
- `queue-manager.ts`: All retry state transitions.
- `notion-client.ts`: Mock API calls; test block builder output JSON.
- `crypto.ts`: Encrypt → decrypt round-trip; verify key derivation determinism.

### 10.2 Integration Tests

- Test full message-passing flows between content script and background worker using `chrome-mock`.
- Test Notion API calls against a Notion sandbox workspace.

### 10.3 End-to-End Tests (Playwright)

```typescript
// Example E2E test
test('saves a problem to Notion', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://leetcode.com/problems/two-sum/');
  
  // Trigger sidebar
  await page.keyboard.press('Control+Shift+N');
  
  // Fill notes
  await page.fill('#leetnotion-notes', 'Use a hash map');
  await page.click('[data-testid="capture-code"]');
  await page.click('[data-testid="save-notion"]');
  
  // Verify success toast
  await expect(page.locator('.ln-toast-success')).toBeVisible();
});
```

### 10.4 Regression Testing

DOM selectors are tested daily against live LeetCode via a GitHub Actions workflow that:
1. Loads the LeetCode problems page.
2. Runs `scraper.ts` extraction logic.
3. Asserts all critical fields are non-null.
4. Posts a Slack alert if selectors break.

---

## 11. Build & Packaging

### 11.1 Build Pipeline

```bash
# Development
pnpm dev         # Vite HMR + extension reload

# Production build
pnpm build       # Outputs to /dist/

# Package for AMO
pnpm package     # Zips /dist/ to /releases/leetnotion-v{VERSION}.zip

# Source submission (required by AMO)
pnpm package:source  # Zips /src/ + build instructions
```

### 11.2 Output Bundle Targets

| Entry Point | Output File | Max Size |
|---|---|---|
| Background service worker | `background.js` | < 200KB |
| Content script (problem page) | `content.js` | < 100KB |
| Content script (discuss page) | `clip-content.js` | < 30KB |
| Sidebar React app | `sidebar.js` + `sidebar.css` | < 300KB |
| Popup React app | `popup.js` + `popup.css` | < 200KB |

### 11.3 CI/CD

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:e2e
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
      - uses: actions/upload-artifact@v3
        with: { name: extension-build, path: dist/ }
```

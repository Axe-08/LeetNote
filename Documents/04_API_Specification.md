# API Specification
## LeetCode → Notion Knowledge Pipeline — LeetNotion
### Internal & External API Reference

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 2026  
**Audience:** Engineering Team

---

## Table of Contents
1. [Overview](#1-overview)
2. [Internal Message Passing API](#2-internal-message-passing-api)
3. [Notion REST API — Used Endpoints](#3-notion-rest-api--used-endpoints)
4. [Notion Block Builder Reference](#4-notion-block-builder-reference)
5. [Storage API Reference](#5-storage-api-reference)
6. [DOM Scraper API](#6-dom-scraper-api)
7. [Error Codes Reference](#7-error-codes-reference)
8. [Rate Limiting & Throttling](#8-rate-limiting--throttling)

---

## 1. Overview

LeetNotion has two distinct API surfaces:

**A) Internal Message Passing API**  
Type-safe message contracts between the extension's three process contexts (content scripts, background service worker, popup/sidebar). These are not HTTP APIs — they are `chrome.runtime.sendMessage` / `chrome.runtime.connect` calls.

**B) External Notion REST API (v1)**  
Calls made exclusively from the background service worker to `https://api.notion.com/v1/`. Never called from content scripts.

No other external APIs are called. The extension makes no calls to any Anthropic, analytics, or telemetry endpoints.

---

## 2. Internal Message Passing API

### 2.1 Message Contract Format

All messages follow this envelope:

```typescript
interface Message<T = unknown> {
  type: MessageType;       // Enum discriminator
  requestId: string;       // UUID for response matching
  payload: T;
}

interface Response<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: AppError;
}
```

### 2.2 Message Types

```typescript
type MessageType =
  | 'SAVE_PROBLEM'
  | 'CHECK_EXISTING_ENTRY'
  | 'GET_QUEUE_STATUS'
  | 'RETRY_QUEUE'
  | 'CLEAR_QUEUE_ENTRY'
  | 'CLIP_ADD'
  | 'CLIP_REMOVE'
  | 'CLIP_LIST'
  | 'SIDEBAR_OPENED'
  | 'SIDEBAR_CLOSED'
  | 'PROBLEM_NAVIGATED'
  | 'NOTION_AUTH_START'
  | 'NOTION_AUTH_COMPLETE'
  | 'NOTION_DISCONNECT'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS';
```

---

### MSG-001 · `SAVE_PROBLEM`

**Direction:** Sidebar → Background  
**Description:** Triggers the full save pipeline for a problem — metadata extraction, Notion upsert, and local queue backup.

**Request Payload:**

```typescript
interface SaveProblemPayload {
  metadata: {
    title: string;
    number: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    tags: string[];
    url: string;
    acceptanceRate: number | null;
  };
  solution: {
    code: string;
    language: string;              // e.g., "python3", "java", "cpp"
    timeComplexity: string;        // e.g., "O(n log n)"
    spaceComplexity: string;       // e.g., "O(n)"
    capturedAt: number;            // Unix timestamp (ms)
  };
  notes: string;                   // Raw markdown/plain text
  clips: Array<{
    id: string;
    text: string;
    isCode: boolean;
    sourceUrl: string;
    authorHandle: string | null;
    clippedAt: number;
  }>;
  confidenceRating: 1 | 2 | 3 | 4 | 5 | null;
}
```

**Response Payload:**

```typescript
interface SaveProblemResponse {
  status: 'synced' | 'queued' | 'failed';
  notionPageId?: string;           // Only present if status = 'synced'
  attemptNumber: number;           // 1 for new problems, N for revisits
  queueEntryId?: string;           // Only present if status = 'queued'
  warnings: string[];              // Non-critical scraper warnings
}
```

**Example:**
```json
// Request
{
  "type": "SAVE_PROBLEM",
  "requestId": "a1b2c3d4",
  "payload": {
    "metadata": {
      "title": "Two Sum",
      "number": 1,
      "difficulty": "Easy",
      "tags": ["Array", "Hash Table"],
      "url": "https://leetcode.com/problems/two-sum/",
      "acceptanceRate": 49.8
    },
    "solution": {
      "code": "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target-n], i]\n            seen[n] = i",
      "language": "python3",
      "timeComplexity": "O(n)",
      "spaceComplexity": "O(n)",
      "capturedAt": 1720000000000
    },
    "notes": "Hash map stores complement. Single pass.",
    "clips": [],
    "confidenceRating": 4
  }
}

// Response
{
  "requestId": "a1b2c3d4",
  "success": true,
  "data": {
    "status": "synced",
    "notionPageId": "abc123-def456-...",
    "attemptNumber": 1,
    "warnings": []
  }
}
```

---

### MSG-002 · `CHECK_EXISTING_ENTRY`

**Direction:** Content Script → Background  
**Description:** On problem page load, checks if a Notion entry already exists for the problem number.

**Request Payload:**
```typescript
interface CheckExistingPayload {
  problemNumber: number;
}
```

**Response Payload:**
```typescript
interface CheckExistingResponse {
  exists: boolean;
  notionPageId: string | null;
  attemptCount: number;            // 0 if not exists
  lastAttemptDate: string | null;  // ISO 8601
  confidenceHistory: Array<{
    attemptNumber: number;
    rating: number | null;
    date: string;
  }>;
}
```

---

### MSG-003 · `GET_QUEUE_STATUS`

**Direction:** Popup / Sidebar → Background  
**Description:** Returns the current state of the offline sync queue.

**Request Payload:** `{}` (no payload needed)

**Response Payload:**
```typescript
interface QueueStatusResponse {
  totalPending: number;
  totalFailed: number;
  entries: Array<{
    id: string;
    problemTitle: string;
    problemNumber: number;
    createdAt: number;
    attempts: number;
    status: 'pending' | 'failed';
    lastError: string | null;
  }>;
}
```

---

### MSG-004 · `CLIP_ADD`

**Direction:** Clip Content Script → Background  
**Description:** Adds a new community clip to the session clip store.

**Request Payload:**
```typescript
interface ClipAddPayload {
  text: string;
  isCode: boolean;
  sourceUrl: string;
  authorHandle: string | null;
}
```

**Response Payload:**
```typescript
interface ClipAddResponse {
  clipId: string;
  totalClips: number;
  limitReached: boolean;      // true if 10 clips already stored
}
```

---

### MSG-005 · `PROBLEM_NAVIGATED`

**Direction:** Content Script → Background (fire-and-forget, no response)  
**Description:** Fired when the SPA detects navigation to a new problem URL.

**Request Payload:**
```typescript
interface ProblemNavigatedPayload {
  fromSlug: string | null;
  toSlug: string;
  toNumber: number | null;   // null if cannot be parsed from DOM yet
}
```

---

### MSG-006 · `NOTION_AUTH_START`

**Direction:** Popup → Background  
**Description:** Initiates the OAuth authorization flow.

**Request Payload:** `{}`

**Response Payload:**
```typescript
interface NotionAuthStartResponse {
  authUrl: string;            // URL to open in OAuth popup window
}
```

---

### MSG-007 · `NOTION_AUTH_COMPLETE`

**Direction:** Background (self-triggered from OAuth callback)  
**Description:** Background receives the authorization code and exchanges for token. This message is sent to notify the popup of completion.

**Broadcast Payload:**
```typescript
interface NotionAuthCompletePayload {
  success: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  error: string | null;
}
```

---

### MSG-008 · `UPDATE_SETTINGS`

**Direction:** Popup → Background  
**Description:** Persists updated user preferences.

**Request Payload:**
```typescript
interface UpdateSettingsPayload {
  keyboardShortcut?: string;        // e.g., "Ctrl+Shift+N"
  spacedRepEnabled?: boolean;
  clippingEnabled?: boolean;
  defaultLanguage?: string;
  autoCapture?: boolean;            // Whether to auto-snapshot code on sidebar open
}
```

**Response Payload:**
```typescript
interface UpdateSettingsResponse {
  saved: boolean;
  settings: FullSettingsObject;    // Echo back full settings after update
}
```

---

## 3. Notion REST API — Used Endpoints

All calls use:
- Base URL: `https://api.notion.com/v1`
- Header: `Authorization: Bearer {access_token}`
- Header: `Notion-Version: 2022-06-28`
- Header: `Content-Type: application/json`

---

### NOTION-001 · Query Database

**Endpoint:** `POST /databases/{database_id}/query`  
**Purpose:** Check if a problem entry already exists.  
**Called by:** `notionClient.findProblem()`

**Request Body:**
```json
{
  "filter": {
    "property": "Problem Number",
    "number": {
      "equals": 1
    }
  },
  "page_size": 1
}
```

**Response (truncated to used fields):**
```json
{
  "results": [
    {
      "id": "page-uuid",
      "properties": {
        "Attempts": { "number": 2 },
        "Last Attempted": { "date": { "start": "2024-06-01" } },
        "Confidence": { "select": { "name": "4" } }
      }
    }
  ],
  "has_more": false
}
```

---

### NOTION-002 · Create Page (New Problem Entry)

**Endpoint:** `POST /pages`  
**Purpose:** Create a new database row and populate the full page body.  
**Called by:** `notionClient.createProblemPage()`

**Request Body:**
```json
{
  "parent": { "database_id": "{database_id}" },
  "icon": { "type": "emoji", "emoji": "🧩" },
  "properties": {
    "Name": {
      "title": [{ "text": { "content": "Two Sum" } }]
    },
    "Problem Number": { "number": 1 },
    "Difficulty": { "select": { "name": "Easy" } },
    "Tags": {
      "multi_select": [
        { "name": "Array" },
        { "name": "Hash Table" }
      ]
    },
    "URL": { "url": "https://leetcode.com/problems/two-sum/" },
    "Date Saved": { "date": { "start": "2024-06-12" } },
    "Last Attempted": { "date": { "start": "2024-06-12" } },
    "Confidence": { "select": { "name": "4" } },
    "Next Review": { "date": { "start": "2024-06-26" } },
    "Attempts": { "number": 1 },
    "Status": { "select": { "name": "Solved" } }
  },
  "children": [ "...block objects from buildPageBody()..." ]
}
```

**Response:** Standard Notion page object. Used field: `id` (stored for future append operations).

---

### NOTION-003 · Append Block Children (Revisit / New Attempt)

**Endpoint:** `PATCH /blocks/{page_id}/children`  
**Purpose:** Append a new attempt toggle to an existing problem page.  
**Called by:** `notionClient.appendAttempt()`

**Request Body:**
```json
{
  "children": [
    {
      "object": "block",
      "type": "toggle",
      "toggle": {
        "rich_text": [{
          "type": "text",
          "text": { "content": "Attempt 2 — June 12, 2024" },
          "annotations": { "bold": true }
        }],
        "children": [
          { "...code block..." },
          { "...callout: time complexity..." },
          { "...callout: space complexity..." }
        ]
      }
    }
  ]
}
```

---

### NOTION-004 · Update Page Properties

**Endpoint:** `PATCH /pages/{page_id}`  
**Purpose:** Update `Last Attempted`, `Confidence`, `Next Review`, and `Attempts` counter on revisit.  
**Called by:** `notionClient.updatePageProperties()`

**Request Body:**
```json
{
  "properties": {
    "Last Attempted": { "date": { "start": "2024-06-12" } },
    "Confidence": { "select": { "name": "5" } },
    "Next Review": { "date": { "start": "2024-07-12" } },
    "Attempts": { "number": 2 }
  }
}
```

---

### NOTION-005 · Create Database (First-Run)

**Endpoint:** `POST /databases`  
**Purpose:** Auto-create the LeetNotion Notion database during onboarding.  
**Called by:** Onboarding wizard if user selects "Create New Database."

**Request Body:**
```json
{
  "parent": { "type": "page_id", "page_id": "{parent_page_id}" },
  "title": [{ "type": "text", "text": { "content": "LeetNotion — DSA Journal" } }],
  "icon": { "type": "emoji", "emoji": "🧩" },
  "properties": {
    "Name":           { "title": {} },
    "Problem Number": { "number": { "format": "number" } },
    "Difficulty":     { "select": { "options": [
      { "name": "Easy",   "color": "green" },
      { "name": "Medium", "color": "yellow" },
      { "name": "Hard",   "color": "red" }
    ]}},
    "Tags":          { "multi_select": {} },
    "URL":           { "url": {} },
    "Date Saved":    { "date": {} },
    "Last Attempted":{ "date": {} },
    "Confidence":    { "select": { "options": [
      { "name": "1", "color": "red" },
      { "name": "2", "color": "orange" },
      { "name": "3", "color": "yellow" },
      { "name": "4", "color": "blue" },
      { "name": "5", "color": "green" }
    ]}},
    "Next Review":   { "date": {} },
    "Attempts":      { "number": { "format": "number" } },
    "Status":        { "select": { "options": [
      { "name": "Not Started", "color": "gray" },
      { "name": "Attempted",   "color": "yellow" },
      { "name": "Solved",      "color": "blue" },
      { "name": "Mastered",    "color": "green" }
    ]}}
  }
}
```

---

### NOTION-006 · OAuth Token Exchange

**Endpoint:** `POST https://api.notion.com/v1/oauth/token`  
**Purpose:** Exchange authorization code for access token.  
**Auth:** Basic auth with `client_id:client_secret` (base64 encoded).

**Request Body:**
```json
{
  "grant_type": "authorization_code",
  "code": "{authorization_code}",
  "redirect_uri": "https://{extension_id}.chromiumapp.org/oauth"
}
```

**Response:**
```json
{
  "access_token": "secret_...",
  "token_type": "bearer",
  "bot_id": "...",
  "workspace_name": "My Workspace",
  "workspace_icon": "https://...",
  "workspace_id": "...",
  "owner": { "type": "user", "user": { "id": "..." } }
}
```

---

## 4. Notion Block Builder Reference

### 4.1 Helper Function Signatures

```typescript
// Callout block
function callout(icon: string, text: string, color: NotionColor): BlockObject

// Toggle block with children
function toggle(title: string, children: BlockObject[], bold?: boolean): BlockObject

// Code block
function codeBlock(code: string, language: string): BlockObject

// Quote block (for community clips)
function quoteBlock(clip: CommunityClip): BlockObject

// Paragraph blocks from markdown string
function markdownToParagraphBlocks(markdown: string): BlockObject[]

// Heading 2
function heading2(text: string): BlockObject

// Divider
function divider(): BlockObject
```

### 4.2 Language Mapping (LeetCode → Notion)

| LeetCode Language Key | Notion Code Block Language |
|---|---|
| `python3` | `python` |
| `java` | `java` |
| `cpp` | `c++` |
| `javascript` | `javascript` |
| `typescript` | `typescript` |
| `golang` | `go` |
| `rust` | `rust` |
| `kotlin` | `kotlin` |
| `swift` | `swift` |
| `csharp` | `c#` |
| (unknown) | `plain text` |

---

## 5. Storage API Reference

### 5.1 StorageService Interface

```typescript
class StorageService {
  // Generic get / set with type safety
  async get<T>(key: StorageKey): Promise<T | null>
  async set<T>(key: StorageKey, value: T): Promise<void>
  async delete(key: StorageKey): Promise<void>
  async clear(): Promise<void>  // Clears all LeetNotion keys
  
  // Encrypted variants for sensitive data
  async getEncrypted(key: StorageKey): Promise<string | null>
  async setEncrypted(key: StorageKey, value: string): Promise<void>
  
  // Queue-specific operations
  async enqueue(entry: QueueEntry): Promise<void>
  async dequeue(entryId: string): Promise<void>
  async getQueue(): Promise<QueueEntry[]>
  async updateQueueEntry(entryId: string, update: Partial<QueueEntry>): Promise<void>
}
```

### 5.2 Storage Key Enumeration

```typescript
enum StorageKey {
  // Auth
  NOTION_TOKEN    = 'auth.notion_token_enc',
  DATABASE_ID     = 'auth.database_id',
  WORKSPACE_NAME  = 'auth.workspace_name',
  
  // Settings
  SHORTCUT        = 'settings.shortcut',
  SPACED_REP      = 'settings.spaced_rep_enabled',
  CLIPPING        = 'settings.clipping_enabled',
  AUTO_CAPTURE    = 'settings.auto_capture',
  
  // Runtime
  SYNC_QUEUE      = 'runtime.sync_queue',
  SESSION_CLIPS   = 'runtime.session_clips',
  SESSION_DRAFT   = 'runtime.session_draft',
  
  // Debug
  ERROR_LOG       = 'debug.error_log',
  INSTALL_DATE    = 'meta.install_date',
  VERSION         = 'meta.version'
}
```

---

## 6. DOM Scraper API

### 6.1 `scrape()` Function Signature

```typescript
interface ScrapeResult {
  metadata: ProblemMetadata | null;
  code: string;
  language: string;
  warnings: ScrapeWarning[];
  scrapedAt: number;
}

interface ScrapeWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

async function scrape(): Promise<ScrapeResult>
```

### 6.2 Selector Fallback Chain

Each critical field has a priority-ordered list of CSS selectors:

```typescript
const SELECTOR_CHAINS: Record<string, string[]> = {
  title: [
    '[data-cy="question-title"]',
    '.text-title-large a',
    'h1.mr-2'
  ],
  difficulty: [
    '[diff]',
    '.text-difficulty-easy',
    '.text-difficulty-medium', 
    '.text-difficulty-hard',
    'span.bg-olive',       // Fallback class names from older LeetCode versions
    'span.bg-yellow',
    'span.bg-pink'
  ],
  tags: [
    'a.mr-1[href*="/tag/"]',
    'a[class*="topic-tag"]',
    '.flex.flex-wrap a[href*="tag"]'
  ]
};
```

### 6.3 Code Extraction Priority

```typescript
enum CodeExtractionMethod {
  MONACO_MODEL = 'monaco_model',        // Most reliable
  CODEMIRROR   = 'codemirror_instance',
  DOM_TEXTAREA = 'dom_textarea',
  CLIPBOARD    = 'clipboard_fallback',  // Requires user interaction
  MANUAL       = 'manual_input'         // Last resort: prompt user
}
```

---

## 7. Error Codes Reference

| Code | Class | Message | User-Facing | Retryable |
|---|---|---|---|---|
| `LN_001` | `ScraperError` | Critical field missing: title | "Couldn't read problem title. Try reloading." | Yes |
| `LN_002` | `ScraperError` | Code extraction failed — all methods | "Paste your code manually in the sidebar." | No |
| `LN_100` | `NotionAuthError` | 401 Unauthorized | "Your Notion session expired. Reconnect." | After re-auth |
| `LN_101` | `NotionAuthError` | OAuth code exchange failed | "Connection failed. Try connecting again." | Yes |
| `LN_200` | `NotionAPIError` | 404 Database not found | "Notion database not found. Check settings." | After fix |
| `LN_201` | `NotionAPIError` | 400 Property type mismatch | "Database schema mismatch. Verify properties." | After fix |
| `LN_202` | `NotionAPIError` | 500 Notion server error | "Notion is having issues. Saved locally." | Yes |
| `LN_300` | `RateLimitError` | 429 Too Many Requests | Silent — auto-retried | Yes (backoff) |
| `LN_400` | `NetworkError` | fetch() failed (offline) | "No internet. Saved locally." | Yes |
| `LN_500` | `QueueError` | Queue full (>100 entries) | "Sync queue full. Please retry now." | Manual |
| `LN_501` | `QueueError` | Max retries exceeded | "Sync failed after 5 tries. [Retry]" | Manual |
| `LN_600` | `StorageError` | storage.local quota exceeded | "Storage full. Clear old entries." | After clear |
| `LN_700` | `CryptoError` | Decryption failed | "Could not read credentials. Reconnect." | After re-auth |

---

## 8. Rate Limiting & Throttling

### 8.1 Notion API Limits

| Limit Type | Value | LeetNotion Handling |
|---|---|---|
| Requests per second | 3 req/s per integration | 400ms inter-request delay in queue processor |
| Requests per minute | 90 requests/min | Rarely reached; single save = 2–3 requests |
| Max block children per request | 100 blocks | Page body capped at 80 blocks; older clips truncated |
| Database query page size | Max 100 | Always request `page_size: 1` for existence checks |

### 8.2 Extension-Side Throttling

```typescript
// Debounce on auto-capture (code snapshot)
const debouncedCapture = debounce(captureCode, 2000);  // 2s after last keystroke

// Minimum save interval (prevent double-saves)
const MIN_SAVE_INTERVAL_MS = 5000;  // 5 seconds between saves

// Queue flush interval
const QUEUE_FLUSH_INTERVAL_MINUTES = 2;  // Via chrome.alarms

// DOM polling interval for SPA detection
const SPA_DETECTION_INTERVAL_MS = 500;   // Via MutationObserver (not polling)
```

### 8.3 Backoff Schedule (Queue Retries)

| Attempt # | Delay Before Retry |
|---|---|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |
| 4 | 8 seconds |
| 5 | 16 seconds |
| After 5 failures | `status: 'failed'` — manual retry required |

For 429 responses specifically: minimum 10-second backoff overrides the schedule above.

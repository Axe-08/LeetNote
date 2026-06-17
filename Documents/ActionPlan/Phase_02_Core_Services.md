# Phase 02 — Core Services Layer
## LeetNote Firefox Extension

---

**Duration:** Week 2–4  
**Priority:** P0 — All UI depends on these services  
**Depends on:** Phase 1 (shared types, build pipeline)  
**Agent Strategy:** 2 agents in parallel after Task 2.1 completes

- **Agent A:** StorageService + Crypto (Tasks 2.1, 2.2)
- **Agent B:** NotionClient + QueueManager + Message Bus (Tasks 2.3, 2.4, 2.5)

---

## Task Breakdown

### Task 2.1 — Encryption Service (`src/shared/crypto.ts`)

**AI Instruction:**
```
Implement the AES-GCM 256 encryption service using the WebCrypto API.
This is used to encrypt the Notion API token at rest in browser.storage.local.

Follow the TRD Section 7.1 specification exactly:

1. Key Derivation:
   - Use PBKDF2 with key material = chrome.runtime.id + navigator.userAgent
   - Salt: new TextEncoder().encode('leetnote-v1')
   - Iterations: 100,000
   - Hash: SHA-256
   - Derive an AES-GCM 256-bit key

2. encryptToken(token: string): Promise<string>
   - Generate a random 12-byte IV using crypto.getRandomValues
   - Encrypt using AES-GCM with the derived key
   - Return base64 encoded string: iv (12 bytes) + ciphertext
   
3. decryptToken(encrypted: string): Promise<string>
   - Decode base64
   - Extract first 12 bytes as IV, rest as ciphertext
   - Decrypt using AES-GCM
   - Return the plaintext token string

4. Error handling:
   - If decryption fails, throw AppError with code LN_700 ("Decryption failed")
   - If WebCrypto is unavailable, throw with a clear message

Export: { encryptToken, decryptToken }

IMPORTANT: The key derivation must be deterministic for the same browser+extension combo
so the same key is derived after browser restart.
```

### Task 2.2 — Storage Service (`src/background/storage-service.ts`)

**AI Instruction:**
```
Implement the StorageService class as defined in API Spec Section 5.1.
This wraps browser.storage.local with type safety and encryption support.

Class: StorageService (singleton)

Methods:
  async get<T>(key: StorageKey): Promise<T | null>
    - Reads from browser.storage.local
    - Parses JSON if the value is a string containing JSON
    - Returns null if key doesn't exist

  async set<T>(key: StorageKey, value: T): Promise<void>
    - Writes to browser.storage.local
    - Serializes objects as JSON

  async delete(key: StorageKey): Promise<void>
    - Removes the key from storage

  async clear(): Promise<void>
    - Removes ALL LeetNote keys (filter by known StorageKey enum values)
    - Does NOT remove keys from other extensions

  async getEncrypted(key: StorageKey): Promise<string | null>
    - Reads encrypted value, decrypts using crypto.decryptToken()
    - If decryption fails, returns null and logs error

  async setEncrypted(key: StorageKey, value: string): Promise<void>
    - Encrypts using crypto.encryptToken(), then stores

  async enqueue(entry: QueueEntry): Promise<void>
    - Reads current queue array, appends entry, writes back
    - If queue length > MAX_QUEUE_ENTRIES (100), throw AppError LN_500

  async dequeue(entryId: string): Promise<void>
    - Remove entry by ID from queue array

  async getQueue(): Promise<QueueEntry[]>
    - Return the full queue array (or empty array if none)

  async updateQueueEntry(entryId: string, update: Partial<QueueEntry>): Promise<void>
    - Find entry by ID, merge update, write back

Use the StorageKey enum from shared/types.ts for all keys.
Export a singleton instance: export const storage = new StorageService()

Error handling:
  - If storage quota is exceeded, throw AppError LN_600
  - Wrap all browser.storage calls in try/catch
```

### Task 2.3 — Notion Client (`src/background/notion-client.ts`)

**AI Instruction:**
```
Implement the NotionClient class from TRD Section 4.4 and API Spec Section 3.

Class: NotionClient

Constructor: receives token and databaseId (retrieved from StorageService at runtime)

Private method:
  async apiCall(method: string, path: string, body?: object): Promise<any>
    - Base URL: NOTION_API_BASE from constants
    - Headers: Authorization: Bearer {token}, Content-Type: application/json,
      Notion-Version: NOTION_API_VERSION
    - On 401: throw AppError LN_100 (NotionAuthError)
    - On 429: throw AppError LN_300 (RateLimitError)  
    - On 400: throw AppError LN_201
    - On 404: throw AppError LN_200
    - On 500+: throw AppError LN_202
    - On network failure (fetch throws): throw AppError LN_400

Public methods:

  1. async findProblem(problemNumber: number): Promise<{pageId: string, attemptCount: number, lastAttempted: string | null, confidenceHistory: Array<{attemptNumber: number, rating: number|null, date: string}>} | null>
     - POST /databases/{databaseId}/query with filter: Problem Number equals problemNumber, page_size: 1
     - Parse response to extract pageId, Attempts count, Last Attempted date, and Confidence
     - Return null if results array is empty

  2. async createProblemPage(payload: SavePayload): Promise<string>
     - POST /pages with parent database_id, icon emoji 🧩, all properties from the schema,
       and children from buildPageBody()
     - Return the created page ID
     - Properties: Name, Problem Number, Difficulty, Tags, URL, Date Saved, Last Attempted,
       Confidence, Next Review, Attempts (=1), Status

  3. async appendAttempt(pageId: string, payload: SavePayload, attemptNumber: number): Promise<void>
     - PATCH /blocks/{pageId}/children — append a new toggle block for the attempt
     - Toggle title: "Attempt {N} — {formatted date}" (bold)
     - Toggle children: code block, time complexity callout, space complexity callout

  4. async updatePageProperties(pageId: string, updates: object): Promise<void>
     - PATCH /pages/{pageId} with property updates
     - Used for: Last Attempted, Confidence, Next Review, Attempts counter

  5. async upsertProblem(payload: SavePayload): Promise<{attemptNumber: number, pageId: string}>
     - Orchestrates the full flow:
       a. findProblem(payload.metadata.number)
       b. If not found: createProblemPage → return {attemptNumber: 1, pageId}
       c. If found: appendAttempt + updatePageProperties → return {attemptNumber: N+1, pageId}

  6. async createDatabase(parentPageId: string): Promise<string>
     - POST /databases with the full schema from API Spec NOTION-005
     - Title: "LeetNote — DSA Journal"
     - All 11 properties with correct types, select options, and colors
     - Return the created database ID

Helper functions (private, not methods):
  - buildPageBody(payload, attemptNumber): BlockObject[]
    Follow the template from TRD Section 6.4 exactly:
    - Callout: difficulty-colored overview
    - Heading2: "💡 My Solution"
    - Toggle: "Attempt N — date" with code block + complexity callouts
    - Heading2: "📝 My Notes" + paragraph blocks from notes
    - Heading2: "🌐 Community Insights" + quote blocks from clips
    - Heading2: "🔁 Review Log" + table row

  - difficultyColor(diff): returns Notion color string (green/yellow/red)
  - callout(icon, text, color): returns Notion callout block object
  - toggle(title, children): returns Notion toggle block object
  - codeBlock(code, language): returns Notion code block (use LANGUAGE_MAP for mapping)
  - quoteBlock(clip: CommunityClip): returns Notion quote block
  - heading2(text): returns Notion heading_2 block
  - markdownToParagraphBlocks(text): splits markdown text into paragraph block objects

RATE LIMITING: Add a 400ms delay between consecutive API calls (NOTION_RATE_LIMIT_DELAY_MS).
```

### Task 2.4 — Queue Manager (`src/background/queue-manager.ts`)

**AI Instruction:**
```
Implement the QueueManager from TRD Section 4.3 and App Flow Document Section 6.

This manages the offline sync queue with exponential backoff retry.

Export: class QueueManager

Constructor: receives StorageService and NotionClient instances

Methods:

  1. async enqueue(payload: SavePayload): Promise<string>
     - Create a QueueEntry with:
       id: crypto.randomUUID()
       payload: the save payload
       attempts: 0
       createdAt: Date.now()
       lastAttemptAt: null
       status: 'pending'
     - Call storage.enqueue(entry)
     - Update badge count on extension icon
     - Return the entry ID

  2. async processQueue(): Promise<void>
     - Get all queue entries from storage
     - Filter: status === 'pending' AND attempts < MAX_RETRY_ATTEMPTS (5)
     - For each entry (sequentially, not parallel):
       a. Calculate delay: Math.pow(2, entry.attempts) * 1000 (exponential backoff)
         - 1s, 2s, 4s, 8s, 16s
         - For 429 errors specifically: minimum 10s backoff
       b. Wait the delay
       c. Try notionClient.upsertProblem(entry.payload)
       d. On success:
         - Mark entry status = 'synced'
         - Remove from queue (dequeue)
         - Send desktop notification: "{title} saved to Notion ✓"
         - Update badge
       e. On failure:
         - Increment entry.attempts
         - Set entry.lastAttemptAt = Date.now()
         - If attempts >= 5: set status = 'failed'
         - If failed: send notification with "Retry Now" action
     - After processing all: update badge count

  3. async retryAll(): Promise<void>
     - Reset all 'failed' entries to 'pending' with attempts = 0
     - Call processQueue()

  4. async retryOne(entryId: string): Promise<void>
     - Reset specific entry to pending/attempts=0
     - Process just that entry

  5. async clearEntry(entryId: string): Promise<void>
     - Remove entry from queue entirely

  6. async getStatus(): Promise<QueueStatusResponse>
     - Return totalPending, totalFailed, and entry summaries

  7. private updateBadge(): void
     - Count pending entries
     - If > 0: set badge text to count, badge color yellow
     - If any failed: badge color red
     - If 0: clear badge

Alarm registration (called from background/index.ts):
  chrome.alarms.create('queue_flush', { periodInMinutes: 2 })
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'queue_flush') queueManager.processQueue()
  })
```

### Task 2.5 — Message Bus & Background Service Worker Entry

**AI Instruction:**
```
Implement the message passing infrastructure.

FILE 1: src/shared/messages.ts
Create type-safe message sending/receiving helpers:

  function sendMessage<T>(type: MessageType, payload: any): Promise<Response<T>>
    - Wraps chrome.runtime.sendMessage with the Message envelope
    - Auto-generates requestId using crypto.randomUUID()
    - Returns typed Response<T>

  function createResponse<T>(requestId: string, data: T): Response<T>
  function createErrorResponse(requestId: string, error: AppError): Response<never>

FILE 2: src/background/index.ts
The service worker entry point. Registers all message handlers and alarms.

  On install:
    - Register context menu items (delegate to context-menu.ts)
    - Create queue flush alarm
    - Check if onboarding is needed (no token in storage)

  Message handler (chrome.runtime.onMessage.addListener):
    Switch on msg.type:
      'SAVE_PROBLEM':         
        - Enqueue payload immediately (data safety)
        - Try notionClient.upsertProblem()
        - If success: dequeue, respond with status='synced'
        - If fail: respond with status='queued'
      'CHECK_EXISTING_ENTRY': 
        - Call notionClient.findProblem()
        - Respond with exists/attemptCount/history
      'GET_QUEUE_STATUS':     
        - Call queueManager.getStatus()
      'RETRY_QUEUE':          
        - Call queueManager.retryAll()
      'CLEAR_QUEUE_ENTRY':    
        - Call queueManager.clearEntry()
      'CLIP_ADD':             
        - Read session clips from storage, append new clip, write back
        - Enforce MAX_CLIPS_PER_PROBLEM limit
      'CLIP_REMOVE':          
        - Remove clip by ID from session clips
      'CLIP_LIST':            
        - Return current session clips
      'NOTION_AUTH_START':     
        - Build OAuth URL and return it
      'NOTION_AUTH_COMPLETE':  
        - Exchange code for token, encrypt, store
      'NOTION_DISCONNECT':    
        - Clear token and database ID from storage
      'GET_SETTINGS':         
        - Read all settings from storage
      'UPDATE_SETTINGS':      
        - Write updated settings to storage
    
    ALWAYS return true from the listener to keep the message channel open for async.
    ALWAYS wrap handler logic in try/catch and return error responses.

FILE 3: src/background/context-menu.ts
  Register the context menu item:
    chrome.contextMenus.create({
      id: 'clip-to-leetnote',
      title: '📎 Clip to LeetNote',
      contexts: ['selection'],
      documentUrlPatterns: ['https://leetcode.com/problems/*/discuss/*', 'https://leetcode.com/discuss/*']
    })

  Handle click:
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'clip-to-leetnote') {
        // Send message to clip-content.ts in the active tab to get selection details
        chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' })
      }
    })
```

---

## Completion Criteria

- [ ] StorageService reads/writes/deletes from browser.storage.local correctly
- [ ] Encryption round-trip works: encrypt → decrypt returns original token
- [ ] NotionClient can query, create pages, append blocks (tested against mock)
- [ ] QueueManager enqueues, retries with backoff, marks failed after 5 attempts
- [ ] Message bus correctly routes all 16 message types to handlers
- [ ] Background service worker starts cleanly in Firefox
- [ ] All services have proper error handling throwing typed AppErrors
- [ ] Queue alarm fires every 2 minutes and processes pending entries

---

## Files Created This Phase

| File | LOC (est.) | Purpose |
|------|------------|---------|
| `src/shared/crypto.ts` | ~60 | AES-GCM 256 encrypt/decrypt |
| `src/background/storage-service.ts` | ~120 | Storage abstraction with encryption |
| `src/background/notion-client.ts` | ~350 | Full Notion API wrapper + block builder |
| `src/background/queue-manager.ts` | ~150 | Offline queue with exponential backoff |
| `src/background/context-menu.ts` | ~30 | Right-click clip menu registration |
| `src/background/index.ts` | ~150 | Service worker entry + message routing |
| `src/shared/messages.ts` | ~40 | Type-safe message helpers |

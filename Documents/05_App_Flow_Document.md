# App Flow Document
## LeetCode → Notion Knowledge Pipeline — LeetNotion
### Complete User & System Flow Reference

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 2026

---

## Table of Contents
1. [Flow Overview Map](#1-flow-overview-map)
2. [Flow 01 — First-Time Onboarding](#2-flow-01--first-time-onboarding)
3. [Flow 02 — Core Save Flow (New Problem)](#3-flow-02--core-save-flow-new-problem)
4. [Flow 03 — Revisit & Versioning Flow](#4-flow-03--revisit--versioning-flow)
5. [Flow 04 — Community Clip Flow](#5-flow-04--community-clip-flow)
6. [Flow 05 — Offline Queue & Recovery Flow](#6-flow-05--offline-queue--recovery-flow)
7. [Flow 06 — Spaced Repetition Flow](#7-flow-06--spaced-repetition-flow)
8. [Flow 07 — SPA Navigation Handling](#8-flow-07--spa-navigation-handling)
9. [Error Recovery Flows](#9-error-recovery-flows)
10. [Settings & Configuration Flow](#10-settings--configuration-flow)

---

## 1. Flow Overview Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY MAP                              │
│                                                                  │
│  [INSTALL]──►[ONBOARDING]──►[DAILY USE]──►[REVIEW]            │
│      │             │              │            │                │
│      │         Flow 01        Flow 02-05    Flow 06            │
│      │                            │                             │
│      └─────────────────►[SETTINGS & CONFIG] ◄─ Flow 10         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Flow 01 — First-Time Onboarding

**Trigger:** Extension installed for the first time AND no Notion token found in storage.  
**Entry Point:** Extension popup opens automatically after install.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                                    │
└──────────────────────────────────────────────────────────────────────┘

[STEP 1: WELCOME]
│
│   User sees: Product name, tagline, feature highlights
│   Action:    Click "Get Started →"
│
▼
[STEP 2: CONNECT NOTION]
│
│   User sees: "Connect your Notion workspace" with Notion logo
│   Action:    Click "Connect with Notion"
│              │
│              ▼
│         Browser opens OAuth popup window:
│         → Notion authorization page loads
│         → User selects workspace
│         → User clicks "Allow access"
│              │
│              ▼
│         OAuth callback URL fires
│         → Background SW receives auth code
│         → Exchanges code for access_token
│         → Encrypts token → stores in storage.local
│         → Broadcasts NOTION_AUTH_COMPLETE
│              │
│         ┌───┴────────────────────┐
│      success                  failure
│         │                         │
│         ▼                         ▼
│   [Show workspace name      [Show error message
│    and icon]                "Connection failed. Try again."]
│                              └─► [Retry button → back to STEP 2]
│
▼
[STEP 3: DATABASE SETUP]
│
│   System checks: Does the connected workspace have an existing
│                  LeetNotion database?
│              │
│      ┌───────┴──────────┐
│   Yes, found            No / user prefers new
│      │                        │
│      ▼                        ▼
│   List detected         "Create a new database"
│   compatible DBs        → User clicks "Create Automatically"
│   → User selects one    → POST /databases call
│   → Validate schema     → Database created in workspace root
│   → Auto-add missing    → database_id stored
│     properties          │
│      │                  │
│      └────────┬─────────┘
│               ▼
│        [Show confirmation: database name + link]
│
▼
[STEP 4: PREFERENCES]
│
│   Settings form (all optional, can be changed later):
│   □ Enable spaced repetition reminders
│   □ Enable community clipping
│   □ Auto-capture code on sidebar open
│   □ Keyboard shortcut: [Ctrl+Shift+N] [change]
│
│   Action: Click "Save Preferences →"
│
▼
[STEP 5: TEST SAVE (OPTIONAL)]
│
│   UI shows: "Let's test your setup!"
│             "We'll save LeetCode #1 (Two Sum) as a test entry."
│
│   ┌──────────────────┬──────────────────┐
│   │  "Test It Now"   │  "Skip, I'm ready" │
│   └──────────────────┴──────────────────┘
│              │
│     (if Test It Now)
│              ▼
│   → Opens LeetCode Two Sum in new tab
│   → Injects sidebar
│   → Auto-fills sample notes and code
│   → Auto-triggers save
│   → Shows success → "It works! ✓"
│              │
│              ▼
│   [ONBOARDING COMPLETE]
│   UI shows: "You're all set! Go solve some problems."
│   CTA: "Open LeetCode →"
│
└─────────────────────────────────────────────────────────────────────
```

---

## 3. Flow 02 — Core Save Flow (New Problem)

**Trigger:** User clicks "Save to Notion" in the sidebar.  
**Pre-condition:** Notion is connected; problem has not been saved before.

```
┌──────────────────────────────────────────────────────────────────────┐
│               CORE SAVE FLOW (NEW PROBLEM)                           │
└──────────────────────────────────────────────────────────────────────┘

USER ACTIONS                     SYSTEM ACTIONS
─────────────────────────────────────────────────────────────────────
User navigates to a problem
e.g., /problems/two-sum/
                                 → Content script fires
                                 → Scraper runs on DOM:
                                    · title, number, difficulty
                                    · tags, URL, acceptance rate
                                 → CHECK_EXISTING_ENTRY sent to BG
                                 → Notion queried for problem #1
                                 → "Not found" → note for sidebar

Sidebar icon pulses (active)     ← Sidebar notified: new problem
User presses Ctrl+Shift+N
                                 → Sidebar slides in (180ms)
                                 → Problem header shown:
                                    "Two Sum · Easy"
                                 → Sidebar populated with:
                                    · Empty notes textarea
                                    · Code preview (auto-captured
                                      if setting enabled)
                                    · Empty complexity inputs
                                    · 0 clips listed

User types notes in textarea
User edits complexity values     (Live local state in Zustand)
User clicks confidence rating
User clicks [Save to Notion]
                                 → Save button shows "Saving..."
                                 → SAVE_PROBLEM message sent
                                    to background SW
                                 → Payload written to local queue
                                   (guarantees no data loss)
                                 → Notion API call initiated:
                                    1. POST /pages
                                       (full template body)
                                 → Response received (< 2s typical)
                                 → Queue entry marked "synced"
                                 → Badge cleared

                                 ← Save button flashes green
                                 ← Success toast: "Saved ✓
                                    Two Sum · Attempt 1"
                                    [View in Notion]

User clicks "View in Notion"     → Opens Notion page in new tab
(optional)

─────────────────────────────────────────────────────────────────────
```

### 3.1 Save Flow State Machine

```
                    ┌─────────┐
              ┌────►│  IDLE   │◄────────────────┐
              │     └────┬────┘                  │
              │          │ user clicks save       │ 2s timeout
              │          ▼                        │
              │     ┌─────────┐   API success    │
              │     │ SAVING  │──────────────────►┤ ┌─────────┐
              │     └────┬────┘                   └─┤ SUCCESS │
              │          │                          └─────────┘
              │     offline/error
              │          │
              │          ▼
              │     ┌─────────┐
              │     │ QUEUED  │   manual retry
              └─────┤         │◄──────────────────
                    └─────────┘

                    ┌─────────┐
                    │  ERROR  │   (5 retries exhausted)
                    └─────────┘
```

---

## 4. Flow 03 — Revisit & Versioning Flow

**Trigger:** User navigates to a problem that already has a Notion entry.  
**Pre-condition:** Problem was saved at least once previously.

```
┌──────────────────────────────────────────────────────────────────────┐
│               REVISIT & VERSIONING FLOW                              │
└──────────────────────────────────────────────────────────────────────┘

User navigates to problem
(e.g., Two Sum — already saved)
                                 → Content script fires
                                 → CHECK_EXISTING_ENTRY sent
                                 → Notion queried for problem #1
                                 → "FOUND": page_id, attempt_count=1
                                    last_attempted: Jan 15, 2024
                                    confidence_history: [{1, rating:3}]

User opens sidebar               ← INFO BANNER shown:
                                    "↩ You've solved this before
                                     Saving as Attempt 2"
                                    [View last attempt →]

                                 ← Attempt Rail shows:
                                    ● Attempt 1 · Jan 15 · ★★★☆☆
                                    ◉ Now (Attempt 2)

User writes new notes
(prior notes NOT loaded—
this is a fresh solve attempt)

User clicks [Save as Attempt 2]
                                 → SAVE_PROBLEM message sent
                                 → Payload queued locally
                                 → Notion API calls:
                                    1. PATCH /pages/{page_id}/children
                                       (append Attempt 2 toggle)
                                    2. PATCH /pages/{page_id}
                                       (update: Last Attempted,
                                        Attempts=2, Confidence,
                                        Next Review Date)

                                 ← Toast: "Saved ✓
                                    Two Sum · Attempt 2"

Notion page now contains:
  ├── Attempt 1 Toggle (Jan 15)
  │     ├── [original code]
  │     └── [original complexity]
  └── Attempt 2 Toggle (Jun 12) ← NEW
        ├── [new code]
        └── [new complexity]

─────────────────────────────────────────────────────────────────────
```

---

## 5. Flow 04 — Community Clip Flow

**Trigger:** User highlights text on LeetCode Discussion page and right-clicks.

```
┌──────────────────────────────────────────────────────────────────────┐
│               COMMUNITY CLIP FLOW                                    │
└──────────────────────────────────────────────────────────────────────┘

User navigates to:
leetcode.com/problems/two-sum/discuss/2345/...
                                 → clip-content.js injected
                                 → Context menu listener registered

User selects explanation text
User right-clicks selection      ← Custom context menu item appears:
                                    "📎 Clip to LeetNotion"

User clicks "Clip to LeetNotion"
                                 → CLIP_ADD message sent to BG
                                 → BG stores clip in session_clips:
                                    { text, isCode: false,
                                      sourceUrl, authorHandle }
                                 → Clip count updated

                                 ← Inline cursor toast: "Clipped! (2)"
                                    (appears near cursor, auto-fades 1.5s)

                                 ← Sidebar dock icon badge shows "2"

                                 [User can also clip code blocks]

User navigates back to problem
User opens sidebar               ← CLIPS panel expanded automatically
                                    if clips > 0

                                 Shows:
                                 ┌───────────────────────────────────┐
                                 │ CLIPS (2)           [CLEAR ALL]   │
                                 │ 📎 "Use a hash map for O(n)..." [✕]│
                                 │    discussion/2345                 │
                                 │ 📎 def solve(nums):            [✕]│
                                 │    discussion/2345 · code          │
                                 └───────────────────────────────────┘

User reviews, optionally removes
clips, adds own notes, then
clicks [Save to Notion]
                                 → Clips bundled in SavePayload
                                 → In Notion page, clips rendered as:
                                    Quote block: "Use a hash map..."
                                    Code block: def solve(nums):

                                 ← Session clips cleared after save

─────────────────────────────────────────────────────────────────────
```

### 5.1 Clip Limit Handling

```
                         ┌────────────┐
                         │ Clip Added │
                         └─────┬──────┘
                               │
                         count < 10?
                       ┌───────┴───────┐
                      Yes              No
                       │               │
                 ┌─────▼──┐     ┌──────▼───────────────┐
                 │ Store  │     │ Toast: "Clip limit    │
                 │ clip   │     │ reached (10). Remove  │
                 └────────┘     │ some before adding."  │
                                └──────────────────────-┘
```

---

## 6. Flow 05 — Offline Queue & Recovery Flow

**Trigger:** Notion API call fails due to network error or API unavailability.

```
┌──────────────────────────────────────────────────────────────────────┐
│               OFFLINE QUEUE & RECOVERY FLOW                          │
└──────────────────────────────────────────────────────────────────────┘

User clicks [Save to Notion]
                                 → Payload immediately written
                                   to local queue (sync_queue)
                                   Status: "pending", attempts: 0
                                 → API call attempted
                                 → API call FAILS (network error)

                                 ← Save button shows:
                                    "Queued — will sync soon"
                                    (yellow state)
                                 ← Toast: "Saved Locally
                                    Will sync when Notion is reachable"

User navigates away or
closes browser
                                 → Queue persists in storage.local
                                 → chrome.alarms fires every 2 min:
                                    processQueue() called

                         [RETRY ATTEMPT 1 — 2 min later]
                                 → API call attempted
                                 → Still fails → attempts: 1
                                 → Backoff: 1s wait

                         [RETRY ATTEMPTS 2-4]
                                 → Exponential backoff: 2s, 4s, 8s
                                 → Still fails on attempt 4

                         [RETRY ATTEMPT 5]
                                 → API succeeds!
                                 → Queue entry marked "synced"
                                 → Extension icon badge cleared
                                 ← Desktop notification:
                                    "LeetNotion: Two Sum saved to Notion ✓"

                    ─── OR IF ALL 5 ATTEMPTS FAIL ───

                                 → Entry marked "failed"
                                 ← Extension icon shows red dot
                                 ← Desktop notification:
                                    "LeetNotion: Sync failed for Two Sum
                                     [Retry Now]"

User clicks [Retry Now]          → Manual processQueue() trigger
in notification or popup         → Fresh retry cycle begins
                                    (attempts reset to 0)

─────────────────────────────────────────────────────────────────────
```

### 6.1 Queue State Diagram

```
                         ┌─────────┐
  Save initiated ───────►│ PENDING │
                         └────┬────┘
                              │
                    API call succeeds ──────────────► [SYNCED] → removed
                              │
                    API call fails
                              │ (attempts++)
                    attempts < 5?
                         ┌────┴─────┐
                        Yes         No
                         │           │
                    (retry loop) [FAILED] ◄── manual retry available
                              │
                         retry clears
                         attempt count
                         back to PENDING
```

---

## 7. Flow 06 — Spaced Repetition Flow

**Trigger:** User assigns a confidence rating before saving; spaced repetition is enabled.

```
┌──────────────────────────────────────────────────────────────────────┐
│               SPACED REPETITION FLOW                                 │
└──────────────────────────────────────────────────────────────────────┘

User sets confidence: ★★☆☆☆ (rating = 2)
                                 → calculateNextReview(rating=2, attemptNum=1)
                                    returns: today + 3 days

On Save:
                                 → Notion property "Next Review" set
                                    to 3 days from now

USER REVIEWS IN NOTION
─────────────────────
User sorts Notion database by "Next Review" (ascending)
User sees problems due for review
User opens a problem, solves it again, opens LeetNotion sidebar
                                 → CHECK_EXISTING_ENTRY fires
                                 → Previous confidence: 2 (Hard)
                                 → Previous interval: 3 days

User rates new attempt: ★★★★☆ (rating = 4)
                                 → calculateNextReview(rating=4, attempt=2)
                                    interval = prev_interval × ease_factor
                                    = 3 days × 2.5 = 7.5 → 8 days
                                    returns: today + 8 days

                                 → Next Review updated in Notion

SPACED REP ALGORITHM
─────────────────────
Input: rating (1-5), attempt_number, previous_interval_days
Output: next_review_date

function calculateNextReview(rating, attemptNum, prevInterval):
  if rating == 1:                return today + 1 day     // Reset
  if rating == 2:                return today + 3 days    // Hard
  if rating == 3:                return today + 7 days    // OK
  if attemptNum == 1:            return today + (rating × 3) days
  ease_factor = 1.3 + (rating × 0.25)  // 1.55 to 2.55
  new_interval = prevInterval × ease_factor
  return today + new_interval

─────────────────────────────────────────────────────────────────────
```

---

## 8. Flow 07 — SPA Navigation Handling

**Context:** LeetCode is a React SPA. Navigating between problems does NOT trigger a full page reload. The extension must detect these navigation events.

```
┌──────────────────────────────────────────────────────────────────────┐
│               SPA NAVIGATION FLOW                                    │
└──────────────────────────────────────────────────────────────────────┘

Extension initial load:
                                 → MutationObserver registered
                                    (watches document title changes)
                                 → history.pushState intercepted
                                 → popstate listener attached
                                 → currentSlug = "two-sum"

User clicks problem #2 (Add Two Numbers) in problem list:
                                 → LeetCode's React router fires
                                 → history.pushState fires
                                 → Extension intercepts:
                                    prevSlug = "two-sum"
                                    newSlug = "add-two-numbers"
                                    newSlug !== prevSlug → NAVIGATION DETECTED

                                 → PROBLEM_NAVIGATED message sent
                                    to background SW

                                 → Sidebar state evaluated:
                                    Has unsaved content?
                              ┌────────┴──────────┐
                             Yes                   No
                              │                    │
                     ┌────────▼────────┐   ┌──────▼──────────────────┐
                     │ Show inline     │   │ Silently clear sidebar  │
                     │ save prompt:    │   │ state                   │
                     │ "Save before   │   │ Begin fresh scrape for  │
                     │  leaving?"     │   │ new problem              │
                     │ [Save] [Discard]│   └─────────────────────────┘
                     └────────────────┘
                              │
                    User chooses "Save"
                              │
                              ▼
                    → Save flow executes for TWO SUM
                    → After save complete: sidebar clears
                    → Fresh scrape for new problem begins

─────────────────────────────────────────────────────────────────────
```

---

## 9. Error Recovery Flows

### 9.1 Notion Auth Expiry

```
User tries to save
                        → API returns 401
                        ← Sidebar shows: "Re-connect Notion"
                           banner (not a blocking modal)
                        → Payload queued locally
User clicks banner      → Popup opens to Notion OAuth flow
After re-auth           → Token refreshed
                        → Queue processes pending saves automatically
```

### 9.2 DOM Selector Failure (LeetCode Update)

```
Extension detects: title selector returns null
                        ← Sidebar shows warning icon:
                           "⚠ Couldn't read problem title.
                            Please type it below:"
                        → Title field becomes editable input
                        → User fills in manually
                        → Save proceeds with manually entered data
                        → Error logged to debug log
```

### 9.3 Notion Database Schema Mismatch

```
Extension queries DB → 400 error: "property not found"
                        ← Sidebar shows:
                           "Your Notion database is missing some
                            required properties.
                            [Auto-Fix] [Open Settings]"
User clicks Auto-Fix    → Extension calls PATCH /databases/{id}
                           adding missing properties with correct types
                        → Retry save
```

---

## 10. Settings & Configuration Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│               SETTINGS FLOW                                          │
└──────────────────────────────────────────────────────────────────────┘

User clicks extension icon (not on LeetCode):
                        ← Popup shows status dashboard:
                           Queue: 0 pending
                           Database: "My LeetCode DB" ✓
                           [Settings ⚙]

User clicks Settings    ← Settings panel opens (replaces popup content)

                        TABS:
                        [Connection] [Preferences] [Queue] [About]

CONNECTION TAB:
  ┌─────────────────────────────────────────────┐
  │ ✓ Connected to "My Workspace"               │
  │   Database: LeetNotion — DSA Journal        │
  │   [Change Database] [Disconnect]            │
  └─────────────────────────────────────────────┘

PREFERENCES TAB:
  ┌─────────────────────────────────────────────┐
  │ Keyboard shortcut   [Ctrl+Shift+N] [Change] │
  │ Spaced repetition   [● ON / ○ OFF]          │
  │ Community clipping  [● ON / ○ OFF]          │
  │ Auto-capture code   [● ON / ○ OFF]          │
  └─────────────────────────────────────────────┘

QUEUE TAB:
  ┌─────────────────────────────────────────────┐
  │ 2 items pending sync           [Retry All]  │
  │ ─────────────────────────────────────────   │
  │ Two Sum · 3 attempts · [Retry] [Delete]     │
  │ Add Two Numbers · 1 attempt · [Retry][Del]  │
  └─────────────────────────────────────────────┘

ABOUT TAB:
  ┌─────────────────────────────────────────────┐
  │ LeetNotion v1.0.0                           │
  │ [View Changelog] [Report a Bug]             │
  │ [Export Debug Log]                          │
  │                                             │
  │ ── Danger Zone ──────────────────────────  │
  │ [Reset All Data & Disconnect]               │
  └─────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────
```

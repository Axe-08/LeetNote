# Phase 05 — Advanced Features
## LeetNote Firefox Extension

---

**Duration:** Week 7–9  
**Priority:** P1/P2 — Enhance the core experience  
**Depends on:** Phase 3 (sidebar UI) + Phase 4 (onboarding complete)  
**Agent Strategy:** 3 agents in parallel (fully independent features)

- **Agent A:** Community Clipping (Tasks 5.1–5.2)
- **Agent B:** Multi-Attempt Versioning (Tasks 5.3–5.4)
- **Agent C:** Spaced Repetition (Tasks 5.5–5.6)

---

## Task Breakdown

### Task 5.1 — Clip Content Script (`src/content/clip-content.ts`)

**AI Instruction:**
```
Implement the discussion page content script for community clipping.
From PRD Section 5.4 (F-04) and App Flow Section 5.

This script runs on https://leetcode.com/discuss/* pages (per manifest.json).

On load:
  1. Check if clipping is enabled (read settings.clipping_enabled from storage)
  2. If disabled, exit early (do nothing)

Message listener:
  Listen for 'GET_SELECTION' messages from the background service worker.
  When received:
    1. Get the current text selection: window.getSelection().toString()
    2. Detect if the selection is inside a code block:
       - Check if the selection's anchorNode is inside a <pre>, <code>, 
         or element with class containing "code"
       - Set isCode = true/false accordingly
    3. Extract the source URL: window.location.href
    4. Extract author handle:
       - Look for the nearest ancestor discussion post element
       - Find the username link/badge within it
       - Extract textContent or null if not found
    5. Send CLIP_ADD message to background with:
       { text: selectedText, isCode, sourceUrl, authorHandle }
    6. On response:
       - If limitReached: show inline toast "Clip limit reached (10). Remove some before adding."
       - If success: show inline cursor toast "Clipped! (N)" near the mouse cursor position

Inline cursor toast implementation:
  - Create a small floating div positioned near event.clientX, event.clientY
  - Style matching wireframe: .clip-toast class
  - Content: clip icon + "Clipped! (N)" in --ink color
  - Auto-remove after 1.5 seconds with fade-out animation
  - Position: offset 10px right and 10px below cursor to avoid obscuring selection

IMPORTANT: This script must be lightweight (<30KB bundled per TRD).
Do NOT import React or heavy dependencies. Use vanilla DOM manipulation.
```

### Task 5.2 — Context Menu Integration Enhancement

**AI Instruction:**
```
Enhance the context menu from Phase 2 (background/context-menu.ts).

The context menu item "📎 Clip to LeetNote" was registered in Phase 2.
Now wire it up completely:

1. In context-menu.ts onClicked handler:
   - Get the active tab
   - Send 'GET_SELECTION' message to the tab's content script (clip-content.ts)
   - The content script handles the rest (extraction + CLIP_ADD message)

2. Dynamic context menu state:
   - On tab update: check if URL matches discussion pattern
   - If yes and clipping enabled: ensure menu item is visible
   - If no: hide the menu item (chrome.contextMenus.update with visible: false)

3. Clip count badge on sidebar dock icon:
   - When clips are added, update the dock icon badge
   - Send message to content script on the problem page tab to update badge
   - The badge shows clip count in a small yellow circle

4. Integration with sidebar ClipQueue:
   - When sidebar opens, send CLIP_LIST message to get current clips
   - Populate the ClipQueue component with the results
   - When user removes a clip from ClipQueue, send CLIP_REMOVE message
   - When user clicks "Clear All", send CLIP_REMOVE for each clip
   - After save: clear all session clips (send CLIP_REMOVE for each)
```

### Task 5.3 — Multi-Attempt Versioning (Notion Integration)

**AI Instruction:**
```
Implement the multi-attempt versioning from PRD Section 5.5 (F-05) and App Flow Section 4.

This is mostly already scaffolded in the NotionClient (Phase 2).
Now complete the full flow:

1. In notion-client.ts, enhance findProblem():
   - After finding the existing page, also query its block children
   - Count existing toggle blocks under "My Solution" heading
   - Extract confidence from each toggle's metadata
   - Build the confidenceHistory array: [{attemptNumber, rating, date}, ...]
   - Return full CheckExistingResponse

2. In notion-client.ts, enhance appendAttempt():
   - Find the "My Solution" heading block in the page
   - Append the new attempt toggle AFTER existing toggles, BEFORE "My Notes" heading
   - The toggle title: "Attempt {N} — {date}" in bold
   - Toggle children: code block + complexity callouts
   - Also append new notes paragraphs under "My Notes" section
   - Also append new clips under "Community Insights" section
   - Add a new row to the "Review Log" table

3. In notion-client.ts, enhance updatePageProperties():
   - Update these properties on revisit:
     - Last Attempted: today
     - Attempts: N+1
     - Confidence: latest rating
     - Next Review: calculated date (if spaced rep enabled)
     - Status: update based on confidence (≥4 = "Mastered", ≥3 = "Solved", else "Attempted")

4. Enforce MAX_ATTEMPTS_PER_PROBLEM = 20
   - If attempt count >= 20, show warning: "Maximum attempts reached for this problem"
   - Still allow save but skip the Notion append (update properties only)

5. In sidebar store, update setProblemContext():
   - Set isExistingProblem = true/false
   - Set existingAttemptCount
   - Set confidenceHistory for the AttemptRail component
```

### Task 5.4 — Attempt Rail Component Enhancement

**AI Instruction:**
```
The AttemptRail.tsx component was scaffolded in Phase 3.
Now integrate it with the versioning data:

1. Receive confidenceHistory from the Zustand store
2. Render past attempts as filled circles on the vertical timeline:
   - Color based on rating:
     - 1-2: --err (red) 
     - 3: --warn (yellow)
     - 4-5: --ok (green)
     - null: --border (gray)
3. Show attempt details next to each node:
   - "Attempt N · date · rating label"
4. Current session as outlined circle (◉) at the bottom
5. If more than 5 past attempts, show only the last 4 + a "... and N earlier" label
6. Info banner at top of sidebar (when isExistingProblem):
   - "↩ You've solved this before — saving as Attempt N"
   - "View last attempt →" link (could open Notion page)

7. Update the SaveButton text:
   - New problem: "Save to Notion"
   - Revisit: "Save as Attempt N"
```

### Task 5.5 — Spaced Repetition Algorithm

**AI Instruction:**
```
Implement the spaced repetition scheduling from PRD Section 5.6 (F-06) 
and App Flow Section 7.

Create: src/shared/spaced-rep.ts

Export: function calculateNextReview(
  rating: 1|2|3|4|5,
  attemptNumber: number,
  previousIntervalDays: number | null
): { nextReviewDate: string, intervalDays: number }

Algorithm (simplified SM-2 from the spec):

  if (rating === 1) return today + 1 day       // Blackout — reset
  if (rating === 2) return today + 3 days       // Hard
  if (rating === 3) return today + 7 days       // OK
  
  if (attemptNumber === 1) {
    // First attempt: use fixed intervals
    return today + (rating * 3) days            // 4→12 days, 5→15 days
  }
  
  // Subsequent attempts: calculate ease factor
  const easeFactor = 1.3 + (rating * 0.25)      // Range: 1.55 to 2.55
  const newInterval = Math.round((previousIntervalDays ?? 7) * easeFactor)
  return today + newInterval days

Return ISO 8601 date string for nextReviewDate.

Integration points:

1. In sidebar ConfidenceRating.tsx:
   - When rating changes, show the calculated interval: "review in N days"
   - Use the labels:
     1: "Need more practice — review tomorrow"
     2: "Hard — review in 3 days"  
     3: "OK — review in 7 days"
     4: "Good — review in 14 days"
     5: "Crystal clear — review in 30 days"

2. In background SAVE_PROBLEM handler:
   - Check if spaced_rep_enabled setting is true
   - If yes and rating is not null: call calculateNextReview()
   - Pass nextReviewDate to the Notion payload
   - If no rating or spaced rep disabled: set Next Review to null

3. In notion-client.ts updatePageProperties():
   - Set "Next Review" date property
   - If no rating: leave the property empty (don't overwrite with null)
```

### Task 5.6 — Offline Queue UX Enhancement

**AI Instruction:**
```
Enhance the offline queue user experience (PRD Section 5.7 F-07).
The queue logic is in Phase 2; this task adds the UX layer.

1. Extension icon badge states:
   - No pending: clear badge
   - N pending: show "N" with yellow background
   - Any failed: show "!" with red background
   - Just synced: briefly show "✓" with green background (2 seconds)
   
   Implement in queue-manager.ts updateBadge():
     chrome.action.setBadgeText({ text: ... })
     chrome.action.setBadgeBackgroundColor({ color: ... })

2. Desktop notifications (using browser.notifications API):
   On successful queue flush:
     chrome.notifications.create({
       type: 'basic',
       title: 'LeetNote',
       message: '{problem title} saved to Notion ✓',
       iconUrl: 'assets/icon-96.png'
     })
   
   On final failure (5 retries exhausted):
     chrome.notifications.create({
       type: 'basic',
       title: 'LeetNote: Sync Failed',
       message: '{problem title} — couldn't reach Notion after 5 tries',
       iconUrl: 'assets/icon-96.png',
       buttons: [{ title: 'Retry Now' }]
     })
     
     Handle button click:
     chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
       if (btnIdx === 0) queueManager.retryAll()
     })

3. Queue status in popup StatusDashboard:
   - Real-time: poll every 5 seconds when popup is open
   - Show queue count change animations

4. Toast integration in sidebar:
   - After save attempt:
     - Synced: green toast "Saved to Notion — {title} · Attempt N" with "View in Notion" button
     - Queued: yellow toast "Saved Locally — Will sync when Notion is reachable"
     - Failed (final): red toast "Sync Failed (5 attempts) — {title}" with "Retry Now" + "Details" buttons
   - "Details" button: opens a small error detail view showing the error code and message

5. Queue encryption:
   - Queue entries contain the full SavePayload which may include user's code
   - Encrypt the queue at rest: use StorageService.setEncrypted for the queue key
   - Actually: the queue contains too much data for individual encryption.
   - Instead: encrypt sensitive fields only (code, notes) within each queue entry
   - Use a simpler approach: store queue normally but ensure code field is encrypted
```

---

## Completion Criteria

- [ ] Right-click "Clip to LeetNote" appears on discussion pages only
- [ ] Clipped text/code appears in sidebar ClipQueue with correct type detection
- [ ] Clip limit (10) enforced with appropriate user notification
- [ ] Inline cursor toast shows "Clipped! (N)" near the mouse position
- [ ] Revisiting a saved problem shows the info banner and attempt rail
- [ ] Save appends a new attempt toggle without overwriting existing content
- [ ] Attempt counter increments correctly in Notion properties
- [ ] 20-attempt maximum enforced with graceful degradation
- [ ] Confidence rating shows correct spaced rep interval labels
- [ ] Next Review date calculated correctly and written to Notion
- [ ] Extension icon badge shows pending/failed/success states
- [ ] Desktop notifications fire for queue sync success and failure
- [ ] All three toast types render correctly in sidebar

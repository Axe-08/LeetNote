# Phase 04 — Popup & Onboarding
## LeetNote Firefox Extension

---

**Duration:** Week 5–7  
**Priority:** P0 — Required for Notion connection  
**Depends on:** Phase 2 (message bus, storage, Notion client)  
**Parallel with:** Phase 3 (Sidebar UI)  
**Agent Strategy:** Single agent (sequential — the onboarding flow is tightly coupled)

---

## Task Breakdown

### Task 4.1 — Popup Entry Point & Router (`src/popup/main.tsx`)

**AI Instruction:**
```
Create the popup React app entry point.

This popup serves TWO roles:
  A) First-run: shows the 5-step onboarding wizard
  B) Post-onboard: shows the status dashboard

On mount:
  1. Check storage for NOTION_TOKEN key
  2. If no token: render <OnboardingWizard />
  3. If token exists: render <StatusDashboard />
  
  Use a simple state machine, NOT react-router (popup is too small for routing).

popup.html template:
  <!DOCTYPE html>
  <html><head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="popup.css">
  </head><body>
    <div id="popup-root"></div>
    <script type="module" src="popup.js"></script>
  </body></html>

Popup dimensions: width 320px (on LeetCode) or 296px (off LeetCode), max-height 420px.
Apply the same design system CSS variables as the sidebar.
Import Inter and JetBrains Mono fonts.
```

### Task 4.2 — Onboarding Wizard (5 Steps)

**AI Instruction:**
```
Implement the 5-step onboarding wizard from PRD Section 5.8 and App Flow Section 2.
Match the wireframes in Doc 06 (Onboarding tab) exactly.

State: { currentStep: 1-5, completed: Set<number> }

SHARED COMPONENT — Progress Bar:
  - 5 numbered circles connected by lines
  - States per circle: done (green bg + checkmark), now (accent border + fill), future (gray)
  - Lines between: done (green) or pending (gray)
  - Rendered at top of every step

STEP 1 — Welcome.tsx:
  - LeetNote icon (large, centered)
  - Title: "Welcome to LeetNote"
  - Subtitle: "Stop losing your hard-won insights.\nEvery problem. Every attempt. One clean Notion database."
  - 2x2 feature grid cards (from wireframe):
    1. Auto-capture: "Metadata, code, tags extracted instantly on save"
    2. Clip community: "Save brilliant discussion explanations on the fly"
    3. Track progress: "Version every attempt — never overwrite your work"
    4. Spaced review: "Auto-scheduled next review dates by confidence"
  - CTA: "Get Started →" button

STEP 2 — NotionConnect.tsx:
  - Notion icon (large, centered)
  - Title: "Connect your workspace"
  - Subtitle: "LeetNote only needs access to create and update pages..."
  - "Continue with Notion" button (white bg, Notion branding style)
  - Privacy guarantees info box below:
    "Only connects to Notion and LeetCode — no other servers"
    "Token encrypted on your device with AES-256"
    "Zero telemetry transmitted anywhere"
  
  On click "Continue with Notion":
    1. Send NOTION_AUTH_START message to background
    2. Receive authUrl in response
    3. Open OAuth popup: browser.identity.launchWebAuthFlow({url: authUrl, interactive: true})
       OR window.open(authUrl) for Firefox compatibility
    4. Background handles the OAuth callback, exchanges code for token
    5. Listen for NOTION_AUTH_COMPLETE broadcast
    6. On success: show workspace name/icon, auto-advance to Step 3
    7. On failure: show error message + "Try Again" button

  NOTE FOR FIREFOX: browser.identity.launchWebAuthFlow may need the redirect_uri
  set to https://<extension-id>.extensions.allizom.org/ or use manual redirect handling.
  Implement both approaches with a fallback.

STEP 3 — DatabaseSetup.tsx:
  - Title: "Choose your database"
  - Radio-style list of options (from wireframe):
    Option A: "Create new database" (selected by default)
      - "LeetNote sets it up automatically in your workspace"
    Option B-N: Existing compatible databases found in workspace
      - Show name, entry count, compatibility status
      - "needs schema update" label if properties are missing
  
  On selecting "Create new database":
    - Call notionClient.createDatabase() via message
    - Show loading state on CTA button
    - On success: store database_id, advance

  On selecting existing database:
    - Validate schema: check all required properties exist
    - If missing properties: offer "Auto-Fix" to add them
    - Store database_id, advance

  CTA: "Use Selected Database →"

STEP 4 — Preferences.tsx:
  - Settings form (all toggleable, from App Flow Section 10):
    □ Enable spaced repetition reminders [toggle ON by default]
    □ Enable community clipping [toggle ON by default]
    □ Auto-capture code on sidebar open [toggle OFF by default]
    □ Keyboard shortcut: [Ctrl+Shift+N] [change button]
  - Use toggle switches matching the wireframe design (square, not rounded)
  - "Save Preferences →" button
  - Send UPDATE_SETTINGS message on save

STEP 5 — TestSave.tsx:
  - Title: "Let's test your setup!"
  - Subtitle: "We'll save LeetCode #1 (Two Sum) as a test entry."
  - Two buttons side by side:
    "Test It Now" — opens leetcode.com/problems/two-sum/ in new tab,
    triggers a mock save with sample data
    "Skip, I'm ready" — finishes onboarding
  - On test success: show "It works! ✓" confirmation
  - On finish: show "You're all set! Go solve some problems." + "Open LeetCode →" CTA
  - Set meta.install_date in storage

IMPORTANT: Store onboarding completion state so it doesn't re-show.
```

### Task 4.3 — Status Dashboard (`src/popup/pages/StatusDashboard.tsx`)

**AI Instruction:**
```
Implement the post-onboarding popup main view from the wireframes (Doc 06, Popup tab).

Three states based on context:

STATE A — On LeetCode (active tab is leetcode.com):
  Header: LeetNote logo + "Connected" status (green) + gear icon
  Stat card with rows:
    - Current problem: "Two Sum #1" (read from active tab)
    - Entry status: "Not saved yet" / "Saved · Attempt 2"
    - Sync queue: "All clear" (green) / "2 pending" (yellow) / "1 failed" (red)
    - Database: "DSA Practice Log" (from storage)
  Primary button: "Open Sidebar" — sends message to content script to toggle sidebar
  Secondary button: "View in Notion →" — opens the Notion page for current problem

STATE B — Off LeetCode with queue pending:
  Header: LeetNote logo + warning icon + "2 items pending" (yellow)
  Stat card:
    - Pending sync count
    - List of queued entries (problem name + attempt count + time ago)
  Primary button: "Retry All Now" (yellow tint)
  Secondary button: "Open LeetCode →"

STATE C — Disconnected (no Notion token):
  Header: LeetNote logo + disconnect icon + "Not connected" (red)
  Large centered Notion icon
  Title: "Connect Notion"
  Subtitle: "Link your workspace to begin saving problems..."
  Primary button: "Connect with Notion" — triggers OAuth flow

GEAR ICON: Click navigates to Settings panel (replaces popup content with Settings.tsx)
Back arrow in Settings returns to dashboard.
```

### Task 4.4 — Settings Panel (`src/popup/pages/Settings.tsx`)

**AI Instruction:**
```
Implement the Settings panel from App Flow Section 10 and wireframes (Doc 06, Settings tab).

4 tabs: Connection | Preferences | Queue | About

Use a simple tab state (not routing). Active tab has background highlight.

TAB 1 — Connection:
  Connected state:
    - Green left-border card showing "CONNECTED"
    - Workspace name and database name
    - "Change Database" button (secondary)
    - "Disconnect Notion" button (red secondary)
  Disconnected state:
    - "Connect with Notion" button

  DANGER ZONE section (separated by divider):
    - "Reset All Data & Disconnect" button (red)
    - On click: confirmation dialog, then storage.clear()

TAB 2 — Preferences:
  Toggle rows (matching wireframe exactly):
    - Spaced repetition: "Calculate next review date on save" [toggle]
    - Community clipping: "Right-click to clip from discussion" [toggle]
    - Auto-capture code: "Snapshot editor on sidebar open" [toggle]
    - Keyboard shortcut: [Ctrl+Shift+N] displayed in mono kbd element
  
  Each toggle change sends UPDATE_SETTINGS message immediately.
  Toggle design: square 32x17px, not rounded (per wireframe).

TAB 3 — Queue:
  Header: "N items pending" (yellow) + "Retry All" link
  List of queue entries, each showing:
    - Problem title
    - "N attempts · Xh ago" in mono font
    - [RETRY] button (accent color)
    - [DEL] button (red)
  
  RETRY: sends message to retry that specific entry
  DEL: sends message to clear that entry (with confirmation)

TAB 4 — About:
  - "LeetNote v1.0.0"
  - "View Changelog" link
  - "Report a Bug" link
  - "Export Debug Log" button — reads debug.error_log from storage,
    generates a JSON blob, triggers download
  - DANGER ZONE: "Reset All Data & Disconnect" button
```

### Task 4.5 — Popup Stylesheet (`src/popup/styles/popup.module.css`)

**AI Instruction:**
```
Create the popup CSS module matching the wireframe CSS (Doc 06) exactly.

Reuse the same CSS custom properties as the sidebar (same design system).

Key wireframe classes to replicate:
  .pop (container: 296px width)
  .pop-head (header with left accent border)
  .pop-mark, .pop-name, .pop-status
  .pop-gear (settings icon)
  .pop-body, .stat-card, .sr (stat rows)
  .pop-btn, .pop-btn.sec (primary/secondary buttons)
  
  Onboarding classes:
  .ob (440px width for onboarding)
  .ob-prog (progress indicator)
  .ob-step, .ob-step.done, .ob-step.now
  .ob-line, .ob-line.done
  .ob-body, .ob-title, .ob-sub
  .ob-btn, .ob-skip
  .feat-grid, .feat-card
  .db-opt, .db-opt.sel, .db-radio

  Settings classes:
  .set-tabs, .set-tab, .set-tab.on
  .set-body, .set-row
  .set-name, .set-desc
  .tog, .tog.off (square toggle switch)
  .kbd (keyboard shortcut display)

Use the same warm color palette from the wireframes.
```

---

## Completion Criteria

- [ ] Onboarding wizard renders all 5 steps with correct progress indicator
- [ ] OAuth flow connects to Notion and stores encrypted token
- [ ] Database creation succeeds with full schema (11 properties)
- [ ] Existing database detection and schema validation works
- [ ] Settings persist across popup open/close
- [ ] Status dashboard shows correct state for all 3 contexts
- [ ] Queue tab displays entries with working retry/delete buttons
- [ ] "Export Debug Log" downloads a valid JSON file
- [ ] All popup states match the wireframe designs exactly
- [ ] Toggle switches save preferences immediately via message bus

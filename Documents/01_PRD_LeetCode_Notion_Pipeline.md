# Product Requirements Document
## LeetCode → Notion Knowledge Pipeline
### Firefox Browser Extension

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 2026  
**Owner:** Product Team

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Success Metrics](#4-success-metrics)
5. [Feature Requirements](#5-feature-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Out of Scope (v1.0)](#7-out-of-scope-v10)
8. [Constraints & Risks](#8-constraints--risks)
9. [Milestones](#9-milestones)

---

## 1. Executive Summary

The **LeetCode → Notion Knowledge Pipeline** is a Firefox browser extension that eliminates the context-switching penalty of documenting DSA (Data Structures & Algorithms) practice. It silently extracts problem metadata, structures the user's notes and code, ingests curated community insights, and writes everything into a single, clean Notion database row — without the user ever leaving LeetCode's tab.

The extension is privacy-respecting by design: it connects only to LeetCode and Notion, requires only the minimal Notion API scopes, stores no data on third-party servers, and presents no telemetry outside of fully opt-in anonymous crash reporting.

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Impact |
|---|---|
| Manual copy-paste of code, tags, and difficulty into Notion | ~5–10 minutes per problem; often skipped |
| Switching tabs breaks deep focus | Cognitive re-entry cost on return to problem |
| Community explanations are ephemeral (bookmarks aren't enough) | High-signal knowledge is lost |
| No versioning: overwriting Notion entries loses progression history | Can't track improvement over time |
| Forgotten spaced-repetition follow-up | Problems solved once are never reviewed |
| LeetCode SPA navigation causes mid-save data loss | Corrupted or missing Notion entries |

### 2.2 Root Cause
The root cause is a **missing bridge** between the active coding environment (LeetCode) and the knowledge management system (Notion). Existing solutions require the user to manually orchestrate the transfer, imposing a high enough friction cost that documentation is consistently deprioritized during intensive practice sessions.

### 2.3 Opportunity
A lightweight, intelligently automated extension can reduce the documentation overhead from ~8 minutes to under 60 seconds per problem while increasing the quality and consistency of notes through structured templates.

---

## 3. Target Users

### 3.1 Primary Persona — "The Focused Grinder"
- **Profile:** CS student or early/mid-career software engineer actively preparing for FAANG/top-tier technical interviews.
- **Behavior:** Solves 2–5 LeetCode problems per day; already uses Notion for personal knowledge management; frustrated by the lack of a native export/archive feature in LeetCode.
- **Core Job-to-Be-Done:** *"When I finish a problem, I want to capture everything I learned so I can review it later without losing my current momentum."*
- **Technical Comfort:** Comfortable installing browser extensions; knows what an API key is; willing to do a one-time Notion setup.

### 3.2 Secondary Persona — "The Methodical Learner"
- **Profile:** Self-taught developer or bootcamp grad building DSA foundations systematically.
- **Behavior:** Solves fewer problems per day (1–2) but spends significant time on community discussions and editorials.
- **Core Job-to-Be-Done:** *"When I find a brilliant explanation in the discussion tab, I want to save it alongside my own notes so I can study it later."*

### 3.3 Anti-Personas (Not Targeting)
- Casual competitive programmers who don't use Notion.
- Teams or organizations wanting shared databases (v1.0 is single-user).

---

## 4. Success Metrics

### 4.1 Acquisition
- 500 Firefox Add-ons installs within 60 days of public launch.
- 4.0+ average star rating on Firefox Add-ons marketplace.

### 4.2 Activation
- **≥70%** of users who install complete the Notion OAuth connection within their first session.
- **≥60%** of users save their first problem entry within 24 hours of install.

### 4.3 Engagement
- **≥50%** of active users save at least 3 problems per week.
- **≥30%** of users use the community clip feature at least once per week.

### 4.4 Retention
- **D30 retention ≥ 40%** (extension still enabled and used after 30 days).
- **≥25%** of saved entries have a spaced-repetition rating assigned.

### 4.5 Quality
- Notion sync failure rate **< 0.5%** of save attempts.
- Extension-induced page load overhead **< 100ms** on LeetCode.

---

## 5. Feature Requirements

### 5.1 F-01 — Automated Metadata Extraction *(P0 – Must Have)*

**Description:** When the user saves a problem, the extension automatically extracts and populates the following Notion database properties:

| Field | Source | Notion Property Type |
|---|---|---|
| Problem Title | DOM scraping (h1 on problem page) | Title |
| Problem Number | URL / DOM | Number |
| Difficulty | DOM badge element | Select (Easy / Medium / Hard) |
| Topic Tags | DOM tag elements | Multi-select |
| LeetCode URL | `window.location.href` | URL |
| Save Date | `Date.now()` | Date |
| Acceptance Rate | DOM stat element | Number (%) |

**Acceptance Criteria:**
- AC1: All 7 fields are populated in Notion on first save with no user input required.
- AC2: Extraction works on both the `/problems/<slug>/` and `/problems/<slug>/description/` URL patterns.
- AC3: If a DOM element is missing, the field is left blank and a non-blocking warning is shown; the save is not aborted.

---

### 5.2 F-02 — In-Browser Drafting Sidebar *(P0 – Must Have)*

**Description:** A non-intrusive floating sidebar injected into the LeetCode problem page, activated by a fixed-position icon or keyboard shortcut (`Ctrl+Shift+N`).

**Sidebar Sections:**

1. **My Notes** — A resizable plain-text / Markdown-aware textarea for personal observations, intuition, and "gotchas."
2. **Code Preview** — Read-only display of the user's current active editor content (the solution being written), with a "Capture Now" button that freezes a snapshot.
3. **Complexity** — Two labeled inputs for Time Complexity (e.g., `O(n log n)`) and Space Complexity (e.g., `O(n)`), pre-filled with placeholder.
4. **Confidence Rating** — 1–5 star widget (feeds spaced repetition, F-06).
5. **Save to Notion** — Primary CTA button.

**Acceptance Criteria:**
- AC1: Sidebar does not break or overlay LeetCode's existing layout; it animates in from the right edge.
- AC2: Sidebar state (typed notes, captured code) persists locally if the user collapses and reopens it within the same problem page visit.
- AC3: The sidebar must render correctly in both LeetCode's light and dark modes.
- AC4: Keyboard shortcut is user-configurable in Settings.

---

### 5.3 F-03 — Notion Anti-Clutter Schema *(P0 – Must Have)*

**Description:** Each problem maps to **exactly one row** in a Notion database. The page body uses a structured template of nested toggles and callout blocks to keep information scannable.

**Notion Page Body Template:**

```
📋 Problem Overview
  └─ [Callout Block: difficulty color-coded] Title + Tags + URL

💡 My Solution
  └─ [Toggle: "Attempt 1 — <date>"]
       ├─ [Code Block: language auto-detected] Solution Code
       ├─ [Callout: ⏱ Time Complexity] O(...)
       └─ [Callout: 💾 Space Complexity] O(...)

📝 My Notes
  └─ [Paragraph blocks from Notes textarea]

🌐 Community Insights
  └─ [Quote Block: Clip 1 — from @author] Clipped text
  └─ [Quote Block: Clip 2 — from @author] Clipped text

🔁 Review Log
  └─ [Table: Date | Attempt | Confidence | Notes]
```

**Acceptance Criteria:**
- AC1: A brand-new problem creates a full page matching the template above.
- AC2: The color of the Problem Overview callout matches difficulty: green (Easy), yellow (Medium), red (Hard).
- AC3: No duplicate database rows are created for the same problem number.

---

### 5.4 F-04 — Community Clipping Tool *(P1 – Should Have)*

**Description:** An opt-in "clip" mechanism for saving community discussion content.

**Interaction Flow:**
1. User is on the LeetCode `/discuss/` tab.
2. User highlights any text or code block.
3. User right-clicks to see a custom context menu item: **"📎 Clip to Notion Note"**.
4. A small confirmation toast appears: *"Clipped! Will be saved with your next Notion sync."*
5. Clips are stored locally until the user opens the sidebar and clicks "Save to Notion."
6. In Notion, each clip is a `Quote` block labeled with source author handle if available.

**Acceptance Criteria:**
- AC1: Context menu item only appears on `leetcode.com/discuss/` URL patterns.
- AC2: User can manage (view / delete) queued clips in the sidebar before saving.
- AC3: Plain text and code selections both render correctly in Notion (plain → Quote, code → Code block).
- AC4: A maximum of 10 clips per problem can be queued to prevent API payload bloat.

---

### 5.5 F-05 — Multi-Attempt Versioning *(P1 – Should Have)*

**Description:** When saving a problem that already exists in Notion, the extension detects the existing row and **appends** a new Attempt toggle instead of overwriting.

**Conflict Resolution Logic:**
1. On save, the extension queries Notion for a row where `Problem Number` = current problem number.
2. If **not found**: create new page from template (F-03).
3. If **found**: read existing attempt count → append a new `Toggle: "Attempt [N+1] — <date>"` inside the "My Solution" parent toggle.

**Acceptance Criteria:**
- AC1: Original attempt code is never overwritten.
- AC2: Attempt counter starts at 1 and increments correctly regardless of gaps in dates.
- AC3: A revisit is indicated in the sidebar ("You've solved this before — saving as Attempt 2").
- AC4: Maximum 20 attempts tracked per problem (to prevent Notion block quota exhaustion).

---

### 5.6 F-06 — Spaced Repetition Scheduling *(P2 – Nice to Have)*

**Description:** Using the confidence rating from the sidebar (1–5), the extension calculates a `Next Review Date` using a simplified SM-2-inspired algorithm and writes it to a Notion date property.

**Algorithm (Simplified SM-2):**

| Rating | Interval |
|---|---|
| 1 (Blackout) | Review tomorrow |
| 2 (Hard) | Review in 3 days |
| 3 (OK) | Review in 7 days |
| 4 (Good) | Review in 14 days |
| 5 (Easy) | Review in 30 days |

On revisit, the interval updates based on the new rating (interval multiplied by ease factor if ≥ 3).

**Acceptance Criteria:**
- AC1: `Next Review Date` Notion property is set correctly on every rated save.
- AC2: Dates recalculate correctly on each revisit.
- AC3: Users who skip rating see no `Next Review Date` set (field remains empty).

---

### 5.7 F-07 — Resilient Offline Queue *(P0 – Must Have)*

**Description:** A local queue using the extension's `chrome.storage.local` (or `browser.storage.local`) to buffer payloads when the Notion API is unreachable.

**Queue Behavior:**
- On save attempt, payload is immediately written to the local queue.
- A background service worker retries queued payloads with exponential backoff (1s → 2s → 4s → 8s → max 5 retries).
- User sees a queue status badge on the extension icon (e.g., "2 pending").
- On successful sync, the queue entry is removed and a success toast is shown.

**Acceptance Criteria:**
- AC1: Navigating away from the problem immediately after clicking "Save" does not lose data.
- AC2: Queue survives browser restarts (persisted in `storage.local`, not `storage.session`).
- AC3: On 5 consecutive failures, the user is notified with a clear error message and a "Retry Now" button.
- AC4: Queue is encrypted at rest using the extension's internal key.

---

### 5.8 F-08 — Onboarding & Settings *(P0 – Must Have)*

**Description:** A first-run setup flow guiding users through Notion integration and preference configuration.

**Onboarding Steps:**
1. **Welcome Screen** — Value proposition and "Get Started" CTA.
2. **Notion Connect** — OAuth flow to connect Notion workspace; user selects target database or creates a new one.
3. **Database Mapping** — Extension verifies database schema; auto-creates missing properties.
4. **Preferences** — Set default language, spaced rep on/off, shortcut key.
5. **Test Save** — Optional: save a sample problem (LeetCode #1 Two Sum) to verify the pipeline.

**Settings Panel (post-onboard):**
- Notion workspace / database selector.
- Keyboard shortcut customizer.
- Spaced repetition toggle.
- Community clipping toggle.
- Queue viewer and manual retry.
- Disconnect Notion / Reset All Data.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- NFR-P1: Sidebar animation completes in < 250ms.
- NFR-P2: Metadata extraction DOM scan completes in < 50ms.
- NFR-P3: Total extension startup overhead on `leetcode.com` page load < 100ms.
- NFR-P4: Notion API call initiated within 500ms of user clicking "Save to Notion."

### 6.2 Privacy & Security
- NFR-S1: Zero data transmitted to any server other than `leetcode.com` (reads only) and `api.notion.com`.
- NFR-S2: Notion API token stored in `browser.storage.local` with AES-256 encryption using a device-derived key.
- NFR-S3: Extension requests only permissions required for operation (no broad host permissions).
- NFR-S4: No third-party analytics SDKs bundled.
- NFR-S5: The extension must pass Mozilla's Manifest V3 security review.

### 6.3 Compatibility
- NFR-C1: Firefox version ≥ 109 (first MV3 support).
- NFR-C2: Extension must not break on LeetCode UI updates for at least 30 days after a LeetCode deploy (graceful degradation if DOM selectors fail).
- NFR-C3: Compatible with LeetCode's light and dark modes.
- NFR-C4: Responsive sidebar between 320px and 480px width.

### 6.4 Reliability
- NFR-R1: Notion sync success rate ≥ 99.5% under normal network conditions.
- NFR-R2: Zero data loss on browser crash if save has been initiated (queue durability).

### 6.5 Accessibility
- NFR-A1: Sidebar meets WCAG 2.1 AA contrast ratios.
- NFR-A2: All interactive elements reachable by keyboard.
- NFR-A3: Screen reader compatible (ARIA labels on all controls).

---

## 7. Out of Scope (v1.0)

| Feature | Rationale |
|---|---|
| Chrome / Edge support | Focus: nail Firefox first; Chromium port is v2.0 |
| Team / shared Notion databases | Adds auth complexity; v1.0 is single-user |
| LeetCode Premium content scraping | ToS risk |
| Automatic code submission interception | Requires injection into secure form events |
| AI-powered explanation generation | Out of privacy and cost scope |
| Mobile browser support | Firefox Android extension API limitations |
| Anki integration | Notion-first strategy for v1.0 |
| Visual progress dashboards inside extension | Notion native views serve this purpose |

---

## 8. Constraints & Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| LeetCode DOM structure changes break selectors | High | High | Selector config in JSON; community-updateable; graceful error messaging |
| Notion API rate limits (3 req/s) | Medium | Medium | Client-side debounce; queue flushes in batches |
| Firefox Add-on review rejection | Low | High | Strict MV3 compliance; minimal permissions; source submission |
| User confusion during Notion OAuth | Medium | Medium | Illustrated step-by-step guide in onboarding |
| LeetCode blocks `content_scripts` injection | Low | Critical | Monitor; fallback to popup-only mode |

---

## 9. Milestones

| Milestone | Target | Deliverables |
|---|---|---|
| M1 — Foundation | Week 1–2 | Extension scaffold, Manifest V3, content script injection PoC |
| M2 — Core Pipeline | Week 3–4 | Metadata extraction, Notion OAuth, basic save flow |
| M3 — Sidebar UI | Week 5–6 | Full sidebar with notes, code capture, save CTA |
| M4 — Advanced Features | Week 7–8 | Versioning, clipping, spaced rep, offline queue |
| M5 — Polish & Hardening | Week 9–10 | Error handling, accessibility, dark mode, onboarding flow |
| M6 — Beta | Week 11 | Private beta with 25 users; bug bash |
| M7 — Launch | Week 12 | Firefox Add-ons submission + launch |

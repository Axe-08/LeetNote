# UI/UX Design Guide
## LeetCode → Notion Knowledge Pipeline — LeetNotion
### Firefox Browser Extension

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** June 2026  
**Audience:** Design & Engineering Team

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Visual Identity](#2-visual-identity)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Component Library](#6-component-library)
7. [Interaction Patterns](#7-interaction-patterns)
8. [Context-Specific UI Rules](#8-context-specific-ui-rules)
9. [Dark Mode](#9-dark-mode)
10. [Accessibility Standards](#10-accessibility-standards)
11. [Writing Guidelines](#11-writing-guidelines)
12. [Do / Don't Reference](#12-do--dont-reference)

---

## 1. Design Philosophy

### 1.1 Core Principle: Quiet Utility

LeetNotion lives *inside* someone else's product (LeetCode). Its highest obligation is to be useful without being intrusive. Every visual decision must be justified by the question: **"Does this help the user document faster, or does it compete for attention with the problem they're solving?"**

The design aesthetic is **"Focused Productivity"** — drawn from the visual language of developer tools and code editors: high information density, minimal chrome, monospace accents, and dark-first thinking.

### 1.2 Five Design Principles

**1. Invisible When Idle**  
The extension's presence on screen when inactive should be reduced to a single, low-contrast trigger icon. No pulsing animations, no badges by default, no banners.

**2. Structure Over Decoration**  
Every visual hierarchy decision (size, weight, color) must encode *meaning*, not aesthetics. A red dot means "failed sync," not "we want your attention."

**3. Speed as a Feature**  
Transitions happen in ≤ 200ms. Loading states are shown only when the wait exceeds 500ms. Users should feel the extension is faster than their typing.

**4. Respect the Host**  
The sidebar should never cover the code editor. It must co-exist with LeetCode's split-panel layout, adapting to both the standard and fullscreen coding views.

**5. Progressive Disclosure**  
The default view shows only what's needed for a fast save. Advanced features (spaced repetition rating, clip manager, complexity notation) are visible but secondary.

---

## 2. Visual Identity

### 2.1 Brand Mark

**Name:** LeetNotion  
**Tagline:** "Your code. Your brain. One place."

**Extension Icon:**  
A minimal glyph combining a code bracket `< >` with a small Notion-style square. Rendered in two states:
- **Idle:** Neutral gray silhouette.
- **Active (on LeetCode):** Electric indigo fill.
- **Syncing:** Pulsing animation on the square portion only.
- **Error:** Red dot overlay on the icon (not the full icon recolored).
- **Queued:** Yellow dot overlay showing pending count.

### 2.2 Signature Design Element

The signature element of LeetNotion's UI is the **"attempt streak rail"** — a thin vertical timeline bar on the left edge of the sidebar that visualizes how many times the user has attempted the current problem. Each attempt is a small colored node (green = high confidence, yellow = medium, red = low). This encodes meaningful information at a glance and gives the UI a distinctive identity without competing with content.

---

## 3. Color System

### 3.1 Base Palette

```
--ln-bg-base:       #1A1B26  (Deep slate — primary background)
--ln-bg-surface:    #24253A  (Elevated surface — cards, sidebar)
--ln-bg-overlay:    #2E2F45  (Modal / dropdown backgrounds)
--ln-border:        #3A3B52  (Default border)
--ln-border-focus:  #6366F1  (Focus ring / active border)

--ln-text-primary:  #E8E9F5  (Main text)
--ln-text-secondary:#9B9CBB  (Subtext, labels, placeholders)
--ln-text-disabled: #5A5B78  (Disabled state)
--ln-text-code:     #A8B2FF  (Inline code and monospace values)
```

### 3.2 Semantic Colors

```
--ln-accent:        #6366F1  (Indigo — primary actions, links)
--ln-accent-hover:  #7C7FF4  (Hover state for accent)
--ln-accent-muted:  #6366F11A (Tinted background for accent areas)

--ln-success:       #22C55E  (Sync success, high confidence)
--ln-success-muted: #22C55E1A
--ln-warning:       #F59E0B  (Queued, medium confidence)
--ln-warning-muted: #F59E0B1A
--ln-error:         #EF4444  (Sync failure, low confidence)
--ln-error-muted:   #EF444419
```

### 3.3 Difficulty Colors (mirrors LeetCode's own system for cognitive consistency)

```
--ln-easy:    #00B8A3  (Teal green)
--ln-medium:  #FFB800  (Amber)
--ln-hard:    #FF375F  (Coral red)
```

### 3.4 Light Mode Overrides

When LeetCode is in light mode, the sidebar adapts:
```
--ln-bg-base:       #F8F9FF
--ln-bg-surface:    #FFFFFF
--ln-bg-overlay:    #F0F1FB
--ln-border:        #E2E3F0
--ln-text-primary:  #1A1B26
--ln-text-secondary:#6B6C8A
--ln-text-code:     #4F46E5
```

---

## 4. Typography

### 4.1 Type Scale

| Role | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| UI Label | `Inter` | 11px | 500 | 1.4 |
| Body Text | `Inter` | 13px | 400 | 1.6 |
| Body Emphasis | `Inter` | 13px | 600 | 1.6 |
| Section Header | `Inter` | 12px | 700 | 1.2 |
| Code / Complexity | `JetBrains Mono` | 12px | 400 | 1.5 |
| Problem Title | `Inter` | 15px | 600 | 1.3 |
| Badge / Tag | `Inter` | 10px | 600 | 1.0 |

**Rationale:** Inter is chosen for its optimal legibility at small sizes and its neutral but modern character — it won't clash with LeetCode's own Inter-based typography. JetBrains Mono is used exclusively for code-related content, creating a clear semantic signal.

### 4.2 Type Rules

- Body text is **never bold** for decoration; bold = semantic importance only.
- Section headers use `letter-spacing: 0.06em` and all-caps treatment: `COMPLEXITY`, `MY NOTES`, `CLIPS`.
- Code values (O(n), O(log n)) always render in `JetBrains Mono` regardless of context.
- No text smaller than 11px anywhere in the extension.

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

Based on a 4px grid:
```
--ln-space-1:  4px
--ln-space-2:  8px
--ln-space-3:  12px
--ln-space-4:  16px
--ln-space-5:  20px
--ln-space-6:  24px
--ln-space-8:  32px
```

### 5.2 Sidebar Dimensions

| Property | Value |
|---|---|
| Width | 360px (default) / resizable 280–480px |
| Max Height | 100vh minus 16px top and bottom margin |
| Border Radius (outer) | 12px (left side only) |
| Header Height | 48px |
| Section Padding | 16px horizontal, 12px vertical |
| Inner Card Padding | 12px |

### 5.3 Z-Index Hierarchy

```
--ln-z-sidebar:    99990   (Below LeetCode's own modals)
--ln-z-toast:      99995   (Above everything)
--ln-z-dropdown:  99992
```

---

## 6. Component Library

### 6.1 Sidebar Header

```
┌─────────────────────────────────────────────────┐
│ [◀] LeetNotion        [Two Sum #1 · EASY]  [✕] │
│          12px gray                difficulty badge │
└─────────────────────────────────────────────────┘
```
- Collapse arrow on the far left toggles sidebar.
- Problem name is truncated at 22 characters with ellipsis.
- Difficulty badge uses semantic color + icon (●).
- Close button (✕) appears on hover only.

### 6.2 Attempt Rail

```
│
● — Attempt 1  [2024-01-15]  ★★★☆☆
│
● — Attempt 2  [2024-02-20]  ★★★★☆
│
◉ — Now
│
```
- Thin 2px vertical line in `--ln-border` color.
- Filled circles for past attempts (colored by confidence).
- Current session shown as an outlined circle (◉).
- Only shown for problems with prior Notion entries.

### 6.3 Notes Textarea

```
┌──────────────────────────────────────────┐
│ MY NOTES                                 │
│ ─────────────────────────────────────── │
│                                          │
│  Start typing your approach...           │
│                                          │
│                                          │
│                              0 / 2000    │
└──────────────────────────────────────────┘
```
- Placeholder text: `"What's the key insight? Any 'aha' moments?"`
- Auto-resizes from 80px (collapsed) to 240px (expanded) with content.
- Character counter appears when content > 1500 chars.
- Subtle inner shadow on focus.

### 6.4 Code Capture Panel

```
┌──────────────────────────────────────────┐
│ MY SOLUTION                    [Python ▾]│
│ ─────────────────────────────────────── │
│  class Solution:               [CAPTURE] │
│    def twoSum(self, n...                 │
│    ...                                   │
│                         auto · 2 min ago │
└──────────────────────────────────────────┘
```
- Code preview is read-only, scrollable, monospace.
- "CAPTURE" button takes a snapshot of current editor state.
- "auto · 2 min ago" shows when code was last auto-captured.
- Language selector detects and shows active LeetCode language.

### 6.5 Complexity Inputs

```
┌────────────────────┐  ┌────────────────────┐
│ TIME COMPLEXITY    │  │ SPACE COMPLEXITY   │
│ ┌────────────────┐ │  │ ┌────────────────┐ │
│ │ O(n log n)     │ │  │ │ O(n)           │ │
│ └────────────────┘ │  │ └────────────────┘ │
└────────────────────┘  └────────────────────┘
```
- Monospace font for the input field.
- Typing `O(` shows a quick-pick dropdown: `O(1)`, `O(n)`, `O(n²)`, `O(log n)`, `O(n log n)`.

### 6.6 Confidence Rating

```
  HOW CONFIDENT?
  ○ ○ ○ ○ ○    (unset — gray)
  ● ● ○ ○ ○    (rating 2 — orange)
  ● ● ● ● ● ○  (rating 5 — green)
```
- 5 circular nodes, filled left-to-right on selection.
- Tooltip on hover shows label: 1 = "Need more practice", 5 = "Crystal clear".
- Color transitions from `--ln-error` (1–2) → `--ln-warning` (3) → `--ln-success` (4–5).

### 6.7 Clip Queue Panel

```
┌──────────────────────────────────────────┐
│ CLIPS (3)                      [CLEAR ALL]│
│ ─────────────────────────────────────── │
│ 📎 "Use a sliding window to..."   [✕]   │
│    text · discussion/2145               │
│ 📎 def twoPointers():            [✕]   │
│    code · discussion/2301               │
│ 📎 "The key insight is..."        [✕]   │
│    text · discussion/2145               │
└──────────────────────────────────────────┘
```
- Clips appear with a paper-clip icon prefix.
- Code clips shown with a `{ }` indicator instead of quotes.
- Each clip has a dismiss button.
- "CLEAR ALL" only appears when clips > 0.

### 6.8 Save Button States

| State | Visual | Copy |
|---|---|---|
| Idle | Solid indigo | `Save to Notion` |
| Saving | Spinning ring, dimmed | `Saving...` |
| Success | Green flash → solid | `Saved ✓` (fades back to idle after 2s) |
| Queued | Yellow, no spinner | `Queued — will sync soon` |
| Error | Red | `Retry Save` |

### 6.9 Toast Notifications

Position: Bottom-right of viewport, 16px from edges.

```
┌───────────────────────────────────────────┐
│  ✓  Saved to Notion                  [✕] │
│     Two Sum · Attempt 2                   │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  ⚠  Saved Locally                   [✕] │
│     Will sync when Notion is reachable    │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  ✗  Sync Failed (5 attempts)        [✕] │
│     [Retry Now]  [View Error Details]     │
└───────────────────────────────────────────┘
```

- Auto-dismiss after 4 seconds (success / queued).
- Error toasts persist until dismissed.
- Max 3 stacked toasts; oldest dismissed if new ones arrive.

---

## 7. Interaction Patterns

### 7.1 Sidebar Open/Close

- **Trigger:** Keyboard shortcut `Ctrl+Shift+N` OR click on the docked icon.
- **Animation:** Slide in from right edge over 180ms (`ease-out` curve).
- **Collapse:** Slide out over 150ms. State is preserved — notes are NOT cleared.
- **Dock icon position:** Fixed to the right edge of the viewport, vertically centered. Adapts if LeetCode's panel resizer is active.

### 7.2 Revisit Detection Flow

On problem load, if a matching Notion entry is found:
1. Sidebar shows a subtle **info banner** at the top: `"You've solved this before — saving as Attempt 2"`.
2. The Attempt Rail populates with past attempt history (max 5 visible).
3. Notes field is pre-populated with a faint prefix: `[Revisit notes]` as placeholder text.

### 7.3 Community Clip Flow

1. User selects text on discussion page.
2. Right-click shows: `📎 Clip to LeetNotion`.
3. A small **inline toast** appears near the cursor (not bottom-right): `"Clipped!"` — 1.5s then fades.
4. Clip count badge updates on sidebar dock icon.
5. Opening the sidebar shows the Clips panel expanded.

### 7.4 Keyboard Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` | Toggle sidebar |
| `Tab` / `Shift+Tab` | Navigate between sidebar fields |
| `Ctrl+Enter` | Save to Notion (when sidebar focused) |
| `Escape` | Collapse sidebar |
| `Ctrl+Shift+C` | Capture current code snapshot |

---

## 8. Context-Specific UI Rules

### 8.1 Popup (Extension Icon Click)

The popup is **not the main UI** — it's a quick-status dashboard and settings entry point:

- If user is on LeetCode: show problem title, sync status, and "Open Sidebar" button.
- If user is NOT on LeetCode: show queue status, settings link, and "Go to LeetCode" button.
- Height: auto, max 420px. Width: 320px fixed.

### 8.2 Onboarding Wizard

Full-screen overlaid popup, 480×560px.

**Progress indicator:** 5 numbered steps at the top (filled dots for completed steps).

**Visual tone for onboarding only:** Slightly lighter than the rest of the app — the background uses `--ln-bg-surface` instead of `--ln-bg-base` to feel welcoming rather than utilitarian.

### 8.3 Settings Panel

Accessible from popup. Full popup height. Tab-based navigation:
- **Connection** tab: Notion workspace status, reconnect.
- **Preferences** tab: Keyboard shortcut, spaced rep, clipping toggles.
- **Queue** tab: Pending syncs with retry buttons.
- **About** tab: Version, changelog, feedback link.

---

## 9. Dark Mode

The extension is **dark-first**. LeetCode's dark mode is detected via:
```typescript
const isDark = document.documentElement.classList.contains('dark');
```

The sidebar injects a `data-theme="light"` or `data-theme="dark"` attribute on its host element and applies the appropriate CSS variable overrides.

LeetCode occasionally changes its dark mode class. A fallback detection checks `prefers-color-scheme` media query as a secondary signal.

---

## 10. Accessibility Standards

### 10.1 Requirements

- All WCAG 2.1 AA contrast ratios met across all states and color schemes.
- Every interactive element has a visible focus ring (`--ln-border-focus` color, 2px offset).
- All icons are paired with text labels or ARIA labels.
- No color alone conveys status — always paired with icon or text.
- Sidebar supports full keyboard operation without mouse.
- `prefers-reduced-motion` disables slide animations; elements appear/disappear instantly.

### 10.2 ARIA Patterns

```html
<!-- Sidebar toggle button -->
<button aria-label="Open LeetNotion sidebar" aria-expanded="false" aria-controls="ln-sidebar">

<!-- Confidence rating widget -->
<div role="radiogroup" aria-label="Confidence rating (1 to 5)">
  <input type="radio" id="conf-1" name="confidence" value="1" aria-label="1 — Needs practice">
  ...
</div>

<!-- Save button (during save) -->
<button aria-label="Saving to Notion" aria-busy="true" disabled>

<!-- Queue status -->
<div role="status" aria-live="polite" aria-label="2 items pending sync">
```

---

## 11. Writing Guidelines

### 11.1 Voice & Tone

LeetNotion speaks like a **focused senior engineer** helping a peer — direct, confident, no fluff. Never cheerful or promotional. Error messages are diagnostic, not apologetic.

### 11.2 UI Copy Standards

| Context | Rule | Example |
|---|---|---|
| Button labels | Imperative verb + object | `Save to Notion`, `Capture Code` |
| Placeholder text | Genuine help, not meta | `"What's your core intuition?"` not `"Type here"` |
| Error messages | What happened + how to fix | `"Couldn't reach Notion. Check your connection."` |
| Success messages | Specific, not generic | `"Saved — Two Sum · Attempt 2"` not `"Success!"` |
| Status labels | Past tense for completed, present for in-progress | `"Synced"`, `"Syncing..."`, `"Queued"` |
| Tooltips | One sentence, no period | `"Save a snapshot of your current solution"` |

### 11.3 Prohibited Copy

- ❌ `"Oops!"` — infantilizing
- ❌ `"Something went wrong"` — useless
- ❌ `"Don't worry, your data is safe"` — implies data risk
- ❌ `"Click here"` — non-descriptive link text
- ❌ `"Please wait..."` — unnecessary politeness

---

## 12. Do / Don't Reference

| DO | DON'T |
|---|---|
| Use the sidebar's shadow DOM to fully isolate styles | Inject global styles that could affect LeetCode |
| Show the sidebar doc icon at all times on LeetCode | Only show it when there's data to save |
| Use semantic colors (difficulty-matched) | Pick arbitrary accent colors |
| Animate only in one direction at a time | Use simultaneous animations on multiple elements |
| Keep the save flow under 2 interactions | Add confirmation dialogs before saving |
| Truncate long problem titles gracefully | Let layout overflow or wrap unexpectedly |
| Use `JetBrains Mono` for all code content | Mix monospace and proportional fonts in code blocks |
| Persist sidebar notes across collapses | Clear the form every time the sidebar closes |
| Show "Attempt 2" contextually on revisits | Surprise users with duplicate Notion entries |
| Test all states in both light and dark mode | Only design for dark mode |

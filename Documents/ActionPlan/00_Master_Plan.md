# LeetNote — Master Action Plan
## Firefox Browser Extension: LeetCode → Notion Knowledge Pipeline

---

**Generated from:** 6 specification documents (PRD, TRD, UI/UX Guide, API Spec, App Flow, UI Wireframes)  
**Execution Strategy:** Multi-agent parallel orchestration via Antigravity  
**Total Phases:** 6 phases across ~12 weeks

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│              LeetCode Tab (Renderer)                 │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ content.ts       │  │ sidebar/ (React 18)      │  │
│  │ DOM Scraper      │  │ Shadow DOM isolated      │  │
│  │ SPA Nav Handler  │  │ Zustand state            │  │
│  └────────┬────────┘  └────────────┬─────────────┘  │
└───────────┼────────────────────────┼────────────────┘
            │ chrome.runtime.msg     │
            ▼                        ▼
┌─────────────────────────────────────────────────────┐
│         Background Service Worker (MV3)              │
│  QueueManager · NotionClient · ContextMenu           │
│  StorageService · EncryptionService                  │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│        Popup / Onboarding (React 18 SPA)             │
│  Welcome · NotionConnect · DatabaseSetup             │
│  Preferences · Settings (tabs)                       │
└─────────────────────────────────────────────────────┘
```

**Tech Stack:** Manifest V3 · React 18 · TypeScript · Vite · CSS Modules · Zustand · WebCrypto API (AES-GCM 256)

---

## Phase Overview

| Phase | Name | Duration | Priority Features | Parallel? |
|-------|------|----------|-------------------|-----------|
| **1** | [Foundation & Scaffold](./Phase_01_Foundation.md) | Week 1–2 | Project init, MV3 manifest, build pipeline, shared types | Start first |
| **2** | [Core Services Layer](./Phase_02_Core_Services.md) | Week 2–4 | StorageService, Crypto, NotionClient, QueueManager, Message Bus | After Phase 1 |
| **3** | [Content Scripts & Sidebar UI](./Phase_03_Sidebar_UI.md) | Week 4–6 | DOM Scraper, Sidebar React app, Shadow DOM injection, all sidebar components | After Phase 2 |
| **4** | [Popup & Onboarding](./Phase_04_Popup_Onboarding.md) | Week 5–7 | Onboarding wizard (5 steps), OAuth flow, Settings panel | Parallel with Phase 3 |
| **5** | [Advanced Features](./Phase_05_Advanced_Features.md) | Week 7–9 | Community clipping, Multi-attempt versioning, Spaced repetition, Offline queue UX | After Phase 3 |
| **6** | [Polish & Launch](./Phase_06_Polish_Launch.md) | Week 9–12 | Dark/light mode, accessibility, error recovery, testing, AMO submission | After Phase 5 |

---

## Multi-Agent Orchestration Strategy

Antigravity agents can work in parallel on independent modules. Here's the dependency graph:

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Services) ──────────────┐
    │                                   │
    ├──► Phase 3 (Sidebar UI)          ├──► Phase 4 (Popup/Onboarding)
    │         │                         │         │
    │         ▼                         │         ▼
    │    Phase 5 (Advanced Features) ◄──┘         │
    │         │                                   │
    │         ▼                                   │
    └──► Phase 6 (Polish & Launch) ◄──────────────┘
```

### Parallelization Windows

**Window 1 (Week 4–6):** Run Phase 3 + Phase 4 simultaneously
- Agent A: Sidebar UI components, Shadow DOM injection, scraper integration
- Agent B: Popup pages, onboarding wizard, OAuth flow UI

**Window 2 (Week 7–9):** Run Phase 5 sub-tasks simultaneously
- Agent A: Community clipping (clip-content.ts + context menu + ClipQueue component)
- Agent B: Multi-attempt versioning (Notion append logic + Attempt Rail component)
- Agent C: Spaced repetition algorithm + Next Review date integration

**Window 3 (Week 9–11):** Run Phase 6 sub-tasks simultaneously
- Agent A: Dark/light mode theming + accessibility audit
- Agent B: Unit tests (Vitest) + E2E tests (Playwright)
- Agent C: Error recovery flows + edge case hardening

---

## Critical Path

The minimum viable extension (MVP) requires completing these in order:
1. Phase 1 → scaffold + manifest
2. Phase 2 → StorageService + NotionClient + QueueManager
3. Phase 3 → Scraper + Sidebar (notes, code capture, save button)
4. Phase 4 → Onboarding (Notion OAuth + database setup)

Everything else (clipping, versioning, spaced rep, polish) can be layered on top.

---

## File Index

| Document | Contents |
|----------|----------|
| [Phase 01 — Foundation](./Phase_01_Foundation.md) | Project scaffold, Vite config, MV3 manifest, shared types, CI/CD |
| [Phase 02 — Core Services](./Phase_02_Core_Services.md) | Background SW, StorageService, Crypto, NotionClient, QueueManager, Message Bus |
| [Phase 03 — Sidebar UI](./Phase_03_Sidebar_UI.md) | Content scripts, DOM scraper, Shadow DOM sidebar, all React components, Zustand store |
| [Phase 04 — Popup & Onboarding](./Phase_04_Popup_Onboarding.md) | Onboarding wizard, OAuth flow, Settings panel (4 tabs), popup states |
| [Phase 05 — Advanced Features](./Phase_05_Advanced_Features.md) | Community clipping, multi-attempt versioning, spaced repetition, offline queue UX |
| [Phase 06 — Polish & Launch](./Phase_06_Polish_Launch.md) | Theming, accessibility, testing, error recovery, AMO submission |

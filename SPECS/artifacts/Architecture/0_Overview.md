---
name: b-architecture-overview
description: Architecture overview — system blueprint and functional component map
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Architecture Overview

> **High-level system design.** This section provides the system blueprint and functional component boundaries. Per-component details are resolved during Detailed Design in `./SPECS/components/<component>/`.

---

## 1. System Blueprint

> **Audience:** Everyone. Start here.

### 1.1 High-Level Data Flow

```
User (CLI)
  ↓
C01 (Menu Router)
  ├→ C02 (Student Profile Builder)
  │   ↓ (saves JSON/Markdown)
  │   📁 university-ao/students/<slug>/profile.*
  │
  ├→ C03 (University Profiler)
  │   ├→ Playwright (web scrape)
  │   ├→ Gemini API (AI extract)
  │   ↓ (saves JSON/Markdown)
  │   📁 university-ao/students/<slug>/universities/<uni-slug>/profile.*
  │
  ├→ C04 (Guidance Engine)
  │   ├→ Load Student & University profiles
  │   ├→ Gemini API (match & generate)
  │   ↓ (saves Markdown)
  │   📁 university-ao/students/<slug>/universities/<uni-slug>/guidance/<ts>/guidance.md
  │
  ├→ C05 (Essay Advisor)
  │   ├→ Load Student & University profiles + essay prompt
  │   ├→ Gemini API (generate outline + samples)
  │   ↓ (saves Markdown)
  │   📁 university-ao/students/<slug>/universities/<uni-slug>/essays/<ts>/<type>-<hash>.md
  │
  ├→ C06 (PDF Exporter)
  │   ├→ Load Markdown
  │   ├→ Puppeteer (render HTML → PDF)
  │   ↓ (saves PDF)
  │   📁 university-ao/students/<slug>/<type>.pdf
  │
  ├→ C07 (Config Manager)
  │   ├→ Validate & save Gemini API key, model, token budget
  │   ↓
  │   📁 university-ao/.env
  │
  └→ C08 (Status Bar)
      ├→ Async message queue (all operations)
      ├→ Display footer with current task
      └→ Modal for full message history
```

### 1.2 Component Interaction Map

| From | To | Protocol | Sync / Async | Notes |
| :--- | :- | :------- | :----------- | :---- |
| C01 (Menu) | C02 (Student) | Function call | Sync | Build/edit/view/delete student profiles |
| C01 (Menu) | C03 (University) | Function call | Sync | Build/edit/view/delete university profiles (includes web scrape + AI) |
| C01 (Menu) | C04 (Guidance) | Function call | Sync | Generate guidance given student + university |
| C01 (Menu) | C05 (Essay) | Function call | Sync | Generate essays given student + university + prompt |
| C01 (Menu) | C06 (PDF) | Function call | Sync | Export markdown artifacts to PDF |
| C01 (Menu) | C07 (Config) | Function call | Sync | Save/load Gemini API credentials |
| C02,C03,C04,C05,C06 | C08 (Status) | Function call (postMessage) | Async | All components push status updates; C08 queues and displays |
| C03 (University) | Gemini API | HTTP REST | Sync (w/ retry) | AI extraction; batch size limited by token window |
| C04 (Guidance) | Gemini API | HTTP REST | Sync (w/ 30s retry) | AI generation; single call per university |
| C05 (Essay) | Gemini API | HTTP REST | Sync (w/ 30s retry) | AI outline generation; single call per essay type |
| C06 (PDF) | Puppeteer (browser) | Node.js SDK | Sync | HTML → PDF rendering; auto-installs browsers if needed |
| All | Filesystem | Local I/O | Sync | Read/write JSON, Markdown, PDFs in university-ao/ tree |

### 1.3 Key Architectural Decisions

**Decision 1: Single-threaded CLI (menu-driven synchronous flow)**
- **Context:** Users are high school students with basic CLI comfort; async state machines add complexity.
- **Choice:** C01 orchestrates all workflows as synchronous function calls; no background jobs or event queues.
- **Alternatives rejected:** Event-driven (adds middleware overhead); async CLI (confusing UX; unclear operation order).
- **Consequences:** One operation at a time; user must wait for Gemini/scrape to finish; UI unresponsive during long tasks. Mitigated by C08 status bar showing progress.

**Decision 2: Gemini (Google) API as sole LLM provider**
- **Context:** Early stage; focus on shipping one integration well rather than provider-agnostic abstraction.
- **Choice:** Hard-coded Gemini SDK; prompt templates are Gemini-specific (few-shot, structured output formats).
- **Alternatives rejected:** Anthropic Claude (enterprise contract complexity); OpenAI (cost & rate limits for student use case); LangChain wrapper (adds abstraction debt).
- **Consequences:** Switching providers requires code rewrite of prompts + SDK calls; acceptable for MVP because provider is chosen for cost & model quality.

**Decision 3: Local-first persistence (no backend)**
- **Context:** Students should own their data; eliminates auth/infrastructure complexity; works offline.
- **Choice:** All profiles, guidance, essays stored as Markdown + JSON files in `university-ao/` (local workspace).
- **Alternatives rejected:** SQLite (adds deployment complexity); cloud DB (privacy/cost concerns for student data); git integration (too much complexity for first version).
- **Consequences:** No data sync across devices; no backup; students must manage file exports manually. Mitigated by encouraging PDF export for sharing.

**Decision 4: Web scraping + batch AI extraction (not per-page LLM calls)**
- **Context:** University websites are large (100+ pages); calling Gemini per-page would be 100× more expensive and slower.
- **Choice:** Playwright crawls all pages → batch them into chunks within token budget → one AI call to extract all facts at once → stream results to JSON.
- **Alternatives rejected:** GPT vision (too expensive for 50 pages); semantic search + RAG (adds embedding DB and complexity); manual fact entry (defeats the purpose).
- **Consequences:** Batching is fragile if a batch is too large; fallback to truncation. Token window and content budget settings are critical knobs.

**Decision 5: Markdown as universal artifact format**
- **Context:** Guidance and essays are long-form text; students read them as documents; needs to export to PDF for advisors.
- **Choice:** All generated content is Markdown; C06 converts to PDF via marked + Puppeteer.
- **Alternatives rejected:** JSON (unreadable for humans); rich text (requires editor); HTML (harder to version control).
- **Consequences:** Markdown has limited formatting; math/tables require workarounds. Acceptable because admissions essays don't need complex formatting.

---

## 2. Functional Components

<!-- Identify every deployable unit and its boundaries.
     Detailed feature lists, data flows, and interface signatures are produced during Detailed Design
     under ./SPECS/components/<id>-<name>/  -->

### [C01] CLI Shell

| Field | Detail |
| :---- | :----- |
| **Purpose** | Main entry point; orchestrate user menu navigation across all features |
| **Ownership boundary** | CLI UX, menu flow, session lifecycle, help text |
| **Dependencies** | C02, C03, C04, C05, C06, C07, C08 |
| **Key data elements** | Student slugs, university slugs, timestamp metadata |
| **Services exposed** | main(), boot, menu routing |
| **Events consumed** | User menu selections, keystroke input |
| **Events produced** | Status messages via C08 postMessage |
| **External services consumed** | Filesystem (read profiles), C08 (status display) |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | UX responsiveness (menu appears < 100ms), no crashes on invalid input |
| **Component spec path** | `./components/c01-cli-shell/` |

### [C02] Student Profile Builder

| Field | Detail |
| :---- | :----- |
| **Purpose** | Capture and persist comprehensive student profile (academics, test scores, extracurriculars, awards, research) |
| **Ownership boundary** | Profile data structure, field validation, persistence to JSON/Markdown |
| **Dependencies** | C08 (status), Filesystem |
| **Key data elements** | Name, GPA (weighted/unweighted), test scores (SAT/ACT/AP/IB), extracurriculars, awards, shadowing, research |
| **Services exposed** | buildStudentProfile, editField, viewProfile, deleteProfile |
| **Events consumed** | User field input |
| **Events produced** | Status messages (field saved, profile complete) |
| **External services consumed** | Gemini API (profile enhancement AI) |
| **Background process** | N |
| **AI capabilities** | Y — optional profile enhancement to infer majors/interests from activities |
| **Critical NFRs** | Zero data loss on network failure, JSON round-trip fidelity |
| **Component spec path** | `./components/c02-student-profile/` |

### [C03] University Profile Builder

| Field | Detail |
| :---- | :----- |
| **Purpose** | Scrape university website and extract institutional profile (mission, culture, programs, ideal student traits) |
| **Ownership boundary** | Web scraping (Playwright), AI extraction (Gemini), batch tokenization |
| **Dependencies** | C08 (status), Filesystem, Gemini API, Playwright |
| **Key data elements** | University name, mission, culture, academic specialties, program-specific notes, crawl statistics |
| **Services exposed** | buildUniversityProfile, viewProfile, deleteProfile, getScrapingStatus |
| **Events consumed** | User university URL input |
| **Events produced** | Status messages (pages crawled, batches processed, extraction complete) |
| **External services consumed** | Gemini API (batch extraction), Playwright (web scraping) |
| **Background process** | N (synchronous with progress updates) |
| **AI capabilities** | Y — Gemini extracts facts from scraped pages using prompts |
| **Critical NFRs** | Max 100 pages per crawl, token budget adherence, retry on Gemini failures |
| **Component spec path** | `./components/c03-university-profile/` |

### [C04] Guidance Engine

| Field | Detail |
| :---- | :----- |
| **Purpose** | Generate personalized college guidance by matching student strengths to university priorities |
| **Ownership boundary** | Guidance generation, prompt orchestration, markdown output |
| **Dependencies** | C02 (student data), C03 (university data), C08 (status), Filesystem, Gemini API |
| **Key data elements** | Guidance markdown (how student fits, areas to highlight, potential challenges) |
| **Services exposed** | buildGuidance, showGuidance, listGuidance |
| **Events consumed** | User selection of student + university |
| **Events produced** | Status messages (guidance generated, file saved) |
| **External services consumed** | Gemini API (generation) |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates personalized guidance per student-university pair |
| **Critical NFRs** | < 1 minute generation time, coherent markdown output |
| **Component spec path** | `./components/c04-guidance-engine/` |

### [C05] Essay Advisor

| Field | Detail |
| :---- | :----- |
| **Purpose** | Generate essay outlines and inspiration samples tailored to prompt and university |
| **Ownership boundary** | Essay type classification, prompt processing, markdown outline generation |
| **Dependencies** | C02 (student data), C03 (university data), C08 (status), Filesystem, Gemini API |
| **Key data elements** | Essay type (personal, Why us, common app, etc.), prompt text, word limit, outline + samples markdown |
| **Services exposed** | buildEssay, showEssay, listEssays |
| **Events consumed** | User selection of essay type + prompt |
| **Events produced** | Status messages (essay outline generated, file saved) |
| **External services consumed** | Gemini API (generation) |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates outline and inspiration samples (with disclaimer) |
| **Critical NFRs** | < 30 seconds per essay, clear disclaimer on AI samples, no plagiarism risk |
| **Component spec path** | `./components/c05-essay-advisor/` |

### [C06] PDF Exporter

| Field | Detail |
| :---- | :----- |
| **Purpose** | Convert markdown artifacts (profiles, guidance, essays) to PDF for offline sharing |
| **Ownership boundary** | Markdown → HTML rendering, HTML → PDF via Puppeteer, CSS styling |
| **Dependencies** | Filesystem, Puppeteer (browser automation) |
| **Key data elements** | Markdown content, PDF file path, CSS stylesheet |
| **Services exposed** | exportToPdf |
| **Events consumed** | User export request |
| **Events produced** | Status messages (PDF generated, file saved) |
| **External services consumed** | Puppeteer (Chromium browser) |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | < 5 seconds render time, correct markdown → PDF formatting, browser auto-install on first use |
| **Component spec path** | `./components/c06-pdf-exporter/` |

### [C07] Config Manager

| Field | Detail |
| :---- | :----- |
| **Purpose** | Manage Gemini API credentials, model selection, and token budget settings |
| **Ownership boundary** | Config validation, env var persistence, settings display |
| **Dependencies** | Filesystem (.env), C08 (status) |
| **Key data elements** | GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TOKEN_WINDOW, GEMINI_CONTENT_BUDGET_PCT |
| **Services exposed** | showConfig, saveConfig, testApiKey |
| **Events consumed** | User config input |
| **Events produced** | Status messages (config saved, validation errors) |
| **External services consumed** | None |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | No secrets in logs, secure input masking, config survives session restart |
| **Component spec path** | `./components/c07-config-manager/` |

### [C08] Status Bar & Message Log

| Field | Detail |
| :---- | :----- |
| **Purpose** | Display current task progress and maintain a queryable message history |
| **Ownership boundary** | Message queue, status footer display, full-screen message modal |
| **Dependencies** | Ink.js (TUI framework) |
| **Key data elements** | Message queue (FIFO), message type (info/warn/error/success), timestamps |
| **Services exposed** | postMessage, openMessageLogModal, clearMessageLog, getAllMessages |
| **Events consumed** | postMessage calls from C01–C06 |
| **Events produced** | Display updates to status footer and modal |
| **External services consumed** | None |
| **Background process** | Y — message queue is async; display updates during other operations |
| **AI capabilities** | N |
| **Critical NFRs** | Message loss ≤ 1%, non-blocking (doesn't freeze menu), readable on 80-char terminal |
| **Component spec path** | `./components/c08-status-bar/` |

> 🔽 **Deferred to Detailed Design:** Feature inventory, internal data flows, full API signatures, and per-feature NFR thresholds — resolved per component in `A_Core_Spec.md` and `B_Specification.md`.

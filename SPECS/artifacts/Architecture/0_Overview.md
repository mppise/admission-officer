---
name: b-architecture-overview
description: Architecture overview — system blueprint, data flows, and functional component map
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Architecture Overview

> **High-level system design.** This section provides the system blueprint and functional component boundaries. Per-component details are resolved in `./SPECS/components/<component>/`.

---

## 1. System Blueprint

> **Audience:** Everyone. Start here.

### 1.1 High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Admission Officer (AO) CLI                           │
└──────────────────────────────────────────────────────────────────────────────┘

USER INTERACTION (C01: CLI Shell)
  ↓
MAIN MENU
  ├─→ [C02] Student Profile: create/view/edit/delete student data
  │     ↓
  │     → Persistent JSON (workspace/students/{slug}/profile.json)
  │     → Markdown export (workspace/students/{slug}/profile.md)
  │
  ├─→ [C03] University Profile: scrape + extract university data
  │     ↓
  │     → Playwright: fetch pages from target university domain
  │     → Gemini (batched): extract mission, culture, programs by intended major
  │     → Persistent JSON (workspace/students/{slug}/universities/{uni_slug}/profile.json)
  │     → Markdown export (workspace/students/{slug}/universities/{uni_slug}/profile.md)
  │
  ├─→ [C04] Guidance Engine: generate personalized fit report
  │     ↓
  │     → Read student profile.md + university profile.md
  │     → Gemini (single call): "How does this student fit this university?"
  │     → Markdown output: (workspace/students/{slug}/universities/{uni_slug}/guidance/{timestamp}/guidance.md)
  │     → [C06] Export to PDF
  │
  ├─→ [C05] Essay Advisor: generate essay structure + inspiration
  │     ↓
  │     → Prompt user for: essay type, essay prompt, word limit
  │     → Read student profile.md + university profile.md
  │     → Gemini (single call): generate essay outline based on prompt
  │     → Markdown output: (workspace/students/{slug}/universities/{uni_slug}/essays/{timestamp}/{type}-{hash}.md)
  │     → [C06] Export to PDF
  │
  ├─→ [C06] PDF Exporter: convert markdown to PDF
  │     ↓
  │     → Read markdown file
  │     → Marked: parse markdown to HTML
  │     → Puppeteer: render HTML → PDF with inline CSS
  │     → Write PDF to same directory as markdown source
  │
  └─→ [C08] Status Bar: real-time feedback on async operations
        (scraping progress, AI call status, file writes)

DATA PERSISTENCE
  └─ Workspace: ~/.../university-ao/
      ├─ .env (Gemini API key, model, token window, content budget)
      ├─ students/
      │   ├─ {student_slug}/
      │   │   ├─ profile.json (structured, auto-updated on every field change)
      │   │   ├─ profile.md (human-readable markdown, exported)
      │   │   └─ universities/
      │   │       └─ {uni_slug}/
      │   │           ├─ profile.json (scraped + extracted facts)
      │   │           ├─ profile.md (human-readable markdown)
      │   │           ├─ guidance/
      │   │           │   └─ {timestamp}/
      │   │           │       ├─ guidance.md
      │   │           │       └─ guidance.pdf
      │   │           └─ essays/
      │   │               └─ {timestamp}/
      │   │                   ├─ {type}-{hash}.md
      │   │                   └─ {type}-{hash}.pdf
      │   └─ ...other students...
      └─ ...
```

### 1.2 Component Interaction Map

| From | To | Protocol | Sync/Async | Trigger |
| :--- | :- | :------- | :---------- | :------ |
| C01 (CLI Shell) | C02 (Student Profile) | Function call | Sync | User selects "Student Profile" from menu |
| C01 (CLI Shell) | C03 (University Profile) | Function call | Async | User selects "University Profile" → triggers background scrape |
| C01 (CLI Shell) | C04 (Guidance Engine) | Function call | Async | User selects "Generate Guidance" → async Gemini call |
| C01 (CLI Shell) | C05 (Essay Advisor) | Function call | Async | User selects "Essay Advisor" → async Gemini call |
| C01 (CLI Shell) | C06 (PDF Exporter) | Function call | Sync | User selects "Export to PDF" |
| C01 (CLI Shell) | C08 (Status Bar) | Function call (message queue) | Async | All async operations emit status updates to message queue |
| C02 (Student Profile) | File system | File I/O | Sync | Save profile after every field change |
| C03 (University Profile) | Playwright | HTTP scraping | Async | Fetch pages from university website |
| C03 (University Profile) | Gemini API | REST call (batched) | Async | Extract facts from page text |
| C03 (University Profile) | File system | File I/O | Sync | Write scraped + extracted data to JSON |
| C04 (Guidance Engine) | File system | File I/O | Sync | Read student + university profiles |
| C04 (Guidance Engine) | Gemini API | REST call | Async | Generate personalized guidance |
| C04 (Guidance Engine) | File system | File I/O | Sync | Write guidance markdown |
| C05 (Essay Advisor) | File system | File I/O | Sync | Read student + university profiles |
| C05 (Essay Advisor) | Gemini API | REST call | Async | Generate essay outline |
| C05 (Essay Advisor) | File system | File I/O | Sync | Write essay markdown |
| C06 (PDF Exporter) | Marked | JS library | Sync | Parse markdown to HTML |
| C06 (PDF Exporter) | Puppeteer | JS library | Sync | Render HTML to PDF |
| C06 (PDF Exporter) | File system | File I/O | Sync | Write PDF to disk |
| C08 (Status Bar) | Message queue | In-memory queue | Sync | All components emit status messages |

### 1.3 Key Architectural Decisions

**Decision 1: CLI-only (Ink + React) for MVP**

**Context:** High school students need an accessible tool; web UI requires cloud infrastructure; desktop apps require OS-specific tooling.

**Choice:** Menu-driven CLI using React + Ink library for rendering full-screen, interactive TUI. Entry point is single executable (dist/components/c01-cli-shell/index.js).

**Alternatives rejected:**
- Web UI: adds cloud infra, requires user account/authentication, increases operational complexity
- Desktop app (Electron): works, but overkill for CLI workflow; larger installer

**Consequences:** Steep learning curve for non-technical users (mitigated by clear menus + help); no mobile or web access; single-device, single-user only.

---

**Decision 2: Local-first persistence (no database)**

**Context:** Students want privacy, no vendor lock-in, offline capability; v1 is single-user.

**Choice:** All data stored as JSON + Markdown files in workspace directory (~/.../university-ao/). No database server.

**Alternatives rejected:**
- SQLite: adds dependency, still requires setup; JSON is simpler for this use case
- Cloud backend: user privacy concern; requires account setup; adds operational overhead

**Consequences:** No multi-device sync, no backup, no concurrent user access; acceptable for this persona (high school student on one device).

---

**Decision 3: Gemini API for AI, not ChatGPT**

**Context:** Cost, availability, and flexibility in future model switching.

**Choice:** Google Gemini API (programmable, per-token billing, multiple model tiers). Environment-based model selection allows easy future switching.

**Alternatives rejected:**
- ChatGPT API: more expensive per token; less flexibility for future alternatives
- Local LLM: requires significant resources (GPU); slower inference

**Consequences:** Vendor lock-in to Google (mitigated by abstracting API layer); future ChatGPT/other support requires code changes to prompt formatting.

---

**Decision 4: Playwright + Puppeteer for web scraping**

**Context:** Modern university websites use JavaScript; simple HTML parsing fails.

**Choice:** Playwright for stable, robust headless browsing. Puppeteer as fallback for PDF rendering (already required for C06).

**Alternatives rejected:**
- Cheerio/jsdom: insufficient for JS-heavy sites; many universities block bot-like requests
- Puppeteer only: less stable browser management than Playwright for scraping

**Consequences:** Large binary footprint (~200MB); longer npm install; acceptable trade-off for scraping reliability.

---

**Decision 5: Workspace-scoped configuration (env file in workspace, not global)**

**Context:** Students may have different API keys per workspace; want simple config without global setup.

**Choice:** .env file stored in workspace directory (university-ao/.env), loaded at bootstrap time. Allows different keys per workspace.

**Alternatives rejected:**
- Global ~/.ao/config: harder to understand; less flexibility per workspace
- Environment variables only: unclear where to set them; not portable

**Consequences:** .env file is user-specific (not committed to git); must be created before first run; documented in README.

---

**Decision 6: Prompt templating with parameter substitution**

**Context:** Gemini prompts are complex and repeated (C03, C04, C05); avoid hardcoding in code.

**Choice:** Prompts stored as .prompt.md files in src/ai/prompts/, with YAML frontmatter + template parameters (e.g., {{STUDENT_PROFILE}}). loadPrompt() strips frontmatter and injects params at runtime.

**Alternatives rejected:**
- Hardcoded strings: less maintainable; hard to update prompts without code changes
- Separate SQL/config file: adds complexity

**Consequences:** .prompt.md files must be kept in sync with code that uses them; frontmatter metadata supports future enhancements (e.g., model-specific tuning).

---

## 2. Functional Components

### [C01] CLI Shell

| Field | Detail |
| :---- | :----- |
| **Purpose** | Menu-driven entry point for all user interactions. Manages navigation state, renders menus, handles user input, delegates to other components. |
| **Ownership boundary** | Navigation flow, menu structure, context (selected student, selected university), screen layout via Ink. Does NOT own business logic for profiles, scraping, or AI generation. |
| **Dependencies** | C02 (student profile), C03 (university profile), C04 (guidance), C05 (essays), C06 (PDF export), C08 (status bar), config/bootstrap, utils/tui |
| **Key data elements** | Navigation state (studentSlug, universitySlug, timestamp), menu items and selection logic |
| **Services exposed** | Main CLI interface; all downstream features accessed via menu |
| **Events consumed** | User input (menu selection, escape key), status messages from C08 |
| **Events produced** | Delegated calls to C02–C06, status bar updates via C08 |
| **External services consumed** | None directly (delegates to other components) |
| **Background process** | No; only displays/navigates |
| **AI capabilities** | No; delegates to C04, C05 |
| **Critical NFRs** | Low latency on menu selection (<100ms); responsive to user input; clear error messages |
| **Component spec path** | `./components/c01-cli-shell/` |

---

### [C02] Student Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Build, view, edit, and delete student profiles. Structured intake of academic record (GPA, test scores, transcript), extracurriculars, awards, research, and shadowing. |
| **Ownership boundary** | Student data model, form state management, validation, file I/O (JSON and markdown persistence), markdown export. Does NOT own guidance or essay generation. |
| **Dependencies** | fileUtils, slugUtils, promptLoader (for markdown templating), GoogleGenerativeAI (for profile enhancement / markdown generation) |
| **Key data elements** | ProfileData (name, gradYear, GPA, test scores, transcript years, extracurriculars, awards, shadowing, research, field status tracking) |
| **Services exposed** | buildStudentProfile(), showStudentProfile(), deleteStudentProfile() |
| **Events consumed** | User input from TUI (form fields, edit selections) |
| **Events produced** | File I/O events, markdown generated |
| **External services consumed** | Gemini API (profile enhancement to markdown) |
| **Background process** | No; all I/O is synchronous |
| **AI capabilities** | Yes; generates markdown summary of profile via Gemini |
| **Critical NFRs** | Data persisted after every field change; form responsive to input; markdown export human-readable |
| **Component spec path** | `./components/c02-student-profile/` |

---

### [C03] University Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Scrape target university website, extract mission/culture/programs, and store structured profile. Scoped by student's intended majors. |
| **Ownership boundary** | Web scraping via Playwright, LLM-powered batch extraction via Gemini, university data model, file I/O (JSON and markdown), cost estimation |
| **Dependencies** | Playwright (chromium), GoogleGenerativeAI, fileUtils, slugUtils, loadPrompt |
| **Key data elements** | UniversityProfileData (name, tagline, coreValues, mission, culture, academicSpecialties, notablePrograms, idealCandidateTraits, campusEthos, majorSpecificNotes) |
| **Services exposed** | buildUniversityProfile(), showUniversityProfile(), deleteUniversityProfile(), listUniversities() |
| **Events consumed** | User selection of university name, intended majors |
| **Events produced** | Scraping progress updates (status bar), file I/O events |
| **External services consumed** | Target university website (HTTP), Gemini API (batch extraction with token/cost budgeting) |
| **Background process** | Yes; scraping and extraction are long-running async operations (~3–5 min per university) |
| **AI capabilities** | Yes; Gemini batch extraction of facts from page text, scoped by category (Identity, Academic, Admissions, Student Experience, Ideal Student, Programs) |
| **Critical NFRs** | Robust to JavaScript-heavy sites, handles scraping failures gracefully, respects token budgets (fallback truncation if needed), cost estimation accurate |
| **Component spec path** | `./components/c03-university-profile/` |

---

### [C04] Guidance Engine

| Field | Detail |
| :---- | :----- |
| **Purpose** | Generate personalized guidance report: how does this student fit this university? |
| **Ownership boundary** | Reads student + university profiles, sends to Gemini, writes guidance markdown |
| **Dependencies** | fileUtils, loadPrompt, GoogleGenerativeAI |
| **Key data elements** | Guidance report (markdown document) |
| **Services exposed** | buildGuidance(), showGuidance(), listGuidance() |
| **Events consumed** | User trigger to generate guidance (via C01 menu) |
| **Events produced** | File I/O events, status bar updates |
| **External services consumed** | Gemini API (single call with full profiles + custom prompt) |
| **Background process** | Yes; Gemini call is async (~10–30s) |
| **AI capabilities** | Yes; Gemini call with prompt combining student + university profiles to generate strategic fit analysis |
| **Critical NFRs** | Prompt carefully tuned to emphasize student strengths; output actionable for essay writing; latency acceptable (<1 min) |
| **Component spec path** | `./components/c04-guidance-engine/` |

---

### [C05] Essay Advisor

| Field | Detail |
| :---- | :----- |
| **Purpose** | Collect essay details (type, prompt, word limit) and generate essay outline/inspiration based on student + university profile. |
| **Ownership boundary** | Form intake, Gemini call, markdown output, plagiarism disclaimer injection, deduplication via prompt hash |
| **Dependencies** | fileUtils, loadPrompt, GoogleGenerativeAI, slugUtils (djb2Hash, ESSAY_TYPE_SLUGS), tui (waitForSelect, waitForText, waitForConfirm) |
| **Key data elements** | Essay type, prompt, word limit; essay outline/inspiration (markdown) |
| **Services exposed** | buildEssay(), showEssay(), listEssays() |
| **Events consumed** | User input (essay type, prompt, word limit selection), overwrite confirmation |
| **Events produced** | File I/O events, status bar updates |
| **External services consumed** | Gemini API (single call with essay prompt + student + university profiles) |
| **Background process** | Yes; Gemini call is async (~15–40s) |
| **AI capabilities** | Yes; Gemini call with tuned prompt for essay inspiration generation |
| **Critical NFRs** | Plagiarism disclaimer always present; prompt hash prevents duplicate outlines; latency acceptable; generated content emphasizes student's fit to university |
| **Component spec path** | `./components/c05-essay-advisor/` |

---

### [C06] PDF Exporter

| Field | Detail |
| :---- | :----- |
| **Purpose** | Convert markdown files (guidance, essays) to styled PDF via HTML rendering. |
| **Ownership boundary** | Markdown → HTML parsing (marked), HTML → PDF rendering (Puppeteer), CSS styling |
| **Dependencies** | Puppeteer (chromium), marked (markdown parser), fs (file I/O), ensure-browsers (fallback browser installation) |
| **Key data elements** | HTML document (intermediate), PDF bytes (output) |
| **Services exposed** | exportToPdf(markdownPath) |
| **Events consumed** | User trigger to export (via C01 menu) |
| **Events produced** | File I/O (PDF written to disk near markdown source) |
| **External services consumed** | None (local rendering) |
| **Background process** | No; rendering is fast (<5s per document) |
| **AI capabilities** | No |
| **Critical NFRs** | PDF styling matches brand (magenta/cyan theme), readable typography, proper margins, handles edge cases (no CSS file, parse failures, browser not ready) |
| **Component spec path** | `./components/c06-pdf-exporter/` |

---

### [C08] Status Bar

| Field | Detail |
| :---- | :----- |
| **Purpose** | Display real-time feedback on async operations (scraping progress, AI call status, file writes) via footer message queue. |
| **Ownership boundary** | Message queue (in-memory FIFO), status footer renderer, message modal (for verbose output) |
| **Dependencies** | Ink (for TUI rendering) |
| **Key data elements** | Message queue (array of messages with timestamps + status), message modal state (visible/hidden) |
| **Services exposed** | enqueueMessage(), dequeueMessage(), showMessageModal(), hideMessageModal() |
| **Events consumed** | Emitted by C03 (scraping progress), C04 (guidance status), C05 (essay status), C06 (export status) |
| **Events produced** | Status updates rendered to footer, modal shown/hidden on user request |
| **External services consumed** | None |
| **Background process** | No; responds to events synchronously, but queued messages persist across interactions |
| **AI capabilities** | No |
| **Critical NFRs** | Messages clear and actionable; status updates visible without blocking user navigation; modal toggles with key combo |
| **Component spec path** | `./components/c08-status-bar/` |

---

## 3. Data Model Overview

### Student Profile (C02)

```typescript
interface ProfileData {
  name: string                           // e.g., "Alice Johnson"
  gradYear: string                       // e.g., "2025"
  highSchool: string                     // e.g., "Lincoln High School"
  intendedMajors: string[]               // e.g., ["Computer Science", "Statistics"]
  gpaWeighted: string                    // e.g., "3.95"
  gpaUnweighted: string                  // e.g., "3.87"
  classRank: string                      // e.g., "Top 5%"
  transcript: TranscriptYear[]           // { yearLabel: "Sophomore", courses: [...] }
  sat: { total: string; math: string; reading: string }  // e.g., { total: "1570", ... }
  act: { composite: string }             // e.g., { composite: "35" }
  apScores: Array<{ subject: string; score: string }>
  ibScores: Array<{ subject: string; score: string }>
  extracurriculars: Extracurricular[]    // { activityName, role, yearsInvolved, ... }
  awards: Award[]                        // { awardName, level, year, ... }
  shadowing: ShadowingEntry[]            // { organization, field, hoursTotal, ... }
  research: ResearchEntry[]              // { projectTitle, institution, mentorName, ... }
  generatedDate: string                  // ISO date of creation
  lastUpdated: string                    // ISO date of last edit
  fieldStatus: Record<string, FieldStatus>  // tracks which fields have been set ('pending' | 'set' | 'skipped')
}
```

### University Profile (C03)

```typescript
interface UniversityProfileData {
  universityName: string                 // e.g., "MIT"
  tagline: string | null                 // e.g., "Shaping minds. Creating futures."
  coreValues: string[]                   // e.g., ["Innovation", "Diversity", "Excellence"]
  mission: string                        // e.g., "To advance knowledge..."
  culture: string                        // Campus life, traditions, community feel
  academicSpecialties: string[]          // e.g., ["Engineering", "Computer Science"]
  notablePrograms: string[]              // e.g., "MISTI", "Startup Exchange"
  idealCandidateTraits: string[]         // e.g., "Intellectual curiosity", "Leadership"
  campusEthos: string                    // Overall vibe
  majorSpecificNotes: Record<string, string | null>  // e.g., { "Computer Science": "Strong industry partnerships...", ... }
}
```

### Guidance Report & Essay Outline

- **Format:** Markdown
- **Location:** workspace/students/{slug}/universities/{uni_slug}/guidance/{timestamp}/guidance.md
- **Content:** AI-generated strategic analysis + essay outline/inspiration samples

---

## 4. External Integration Points

| Service | Used by | Protocol | Purpose | Failure Handling |
| :------- | :------ | :------- | :------ | :--------------- |
| **Google Gemini API** | C03, C04, C05, C02 | REST (Google SDK) | LLM-powered extraction, guidance, essay generation, profile enhancement | Retry after 30s; clear error message if failure persists |
| **Target University Website** | C03 | HTTP (Playwright) | Web scraping | Skip page if fetch fails; accumulate stats on failure |
| **Puppeteer/Chromium** | C06 | JS API | PDF rendering | Fallback: auto-install browser if launch fails; error message with recovery steps |

---

## 5. Deployment Model

- **Target:** Single machine (macOS, Linux, Windows with WSL)
- **Distribution:** npm package (published to npm registry)
- **Installation:** `npm install -g university-admission-officer`
- **Entry point:** Global `ao` command → dist/components/c01-cli-shell/index.js
- **Data location:** Workspace in user's current working directory (university-ao/)
- **Configuration:** Environment file at workspace/.env (API key, model, budgets)

---

## 6. Build & Test Strategy

- **Language:** TypeScript (strict mode)
- **Build:** tsc + resource copying (prompts, CSS) → dist/
- **Testing:** Node test runner (or Jest if added)
- **Coverage threshold:** ≥80% line coverage (per CLAUDE.md Testing Requirements), focus on critical paths: profile I/O, scraping/extraction, AI generation
- **Linting:** ESLint + TypeScript strict checks
- **CI/CD:** GitHub Actions (if repo is public) or local pre-commit hooks

---

> 🔽 **Deferred to Component Specs:** Feature inventory, detailed API signatures, error codes, operational requirements (UX patterns, data validation, security, observability, notifications, scalability) — resolved per component in `./SPECS/components/<component_id>/A_Core_Spec.md` and `B_Specification.md`.

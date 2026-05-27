---
name: architecture
description: Technical architecture specification for ao — Admissions Officer CLI.
license: Apache-2.0 (see LICENSE in project root)
---

# ao — Architecture

> Local Node.js/TypeScript CLI that guides a high school student through building their profile, researching universities via web scraping, generating Gemini-powered match guidance, and crafting essay outlines with inspiration samples.

---

## Table of Contents

| # | Section | Primary Audience |
| :-: | :------ | :--------------- |
| 1 | [System Blueprint](#1-system-blueprint) | All |
| 2 | [Functional Components](#2-functional-components) | All |
| 3 | [Technical Stack](#3-technical-stack) | Engineers |
| 4 | [AI Technologies](#4-ai-technologies) | Engineers |
| 5 | [User Experience](#5-user-experience) | Engineers |
| 6 | [Data Architecture](#6-data-architecture) | Engineers |
| 7 | [API Design](#7-api-design) | Engineers |
| 8 | [Error Handling Pattern](#8-error-handling-pattern) | Engineers |
| 9 | [Security Model](#9-security-model) | Engineers |
| 10 | [Compliance & Privacy](#10-compliance--privacy) | All |
| 11 | [Observability Standards](#11-observability-standards) | Engineers |
| 12 | [Deployment Topology](#12-deployment-topology) | Engineers |
| 13 | [Scalability](#13-scalability) | Engineers |
| 14 | [Development Standards](#14-development-standards) | Engineers |
| 15 | [Change History](#15-change-history) | All |

---

> ### How to read this document
> This document captures **cross-cutting architectural decisions** — constraints that every component must respect.
> Sections marked 🔽 **Deferred to Detailed Design** are intentionally left open here.
> Each component's specification package is responsible for resolving those deferred items within the boundaries set here.

---

## 1. System Blueprint

### 1.1 High-Level Data Flow

```
User invokes `ao`
  └─► src/config/ bootstrap — ensure university-ao/ exists; load university-ao/.env <!-- CHG-002 -->
        └─► C01 CLI Shell — renders full-screen ink menu; manages navigation state <!-- CHG-002 -->
              ├─► Config screen ──► read/write university-ao/.env (GEMINI_API_KEY, GEMINI_MODEL) <!-- CHG-002 -->
              ├─► C02 Student Profile  ──► university-ao/students/<name>/profile.md <!-- CHG-002 -->
              ├─► C03 University Profile ──► Playwright scrape ──► Gemini extract ──► university-ao/students/<name>/universities/<uni>/profile.md <!-- CHG-002 -->
              ├─► C04 Guidance Engine  ──► reads C02 + C03 ──► Gemini generate ──► university-ao/students/<name>/universities/<uni>/guidance/<timestamp>/ <!-- CHG-002 -->
              ├─► C05 Essay Advisor    ──► reads C02 + C03 ──► Gemini generate ──► university-ao/students/<name>/universities/<uni>/essays/<timestamp>/ <!-- CHG-002 -->
              └─► C06 PDF Exporter     ──► reads any markdown ──► Puppeteer render ──► <same-path>.pdf
```

### 1.2 Component Interaction Map

| From | To | Protocol | Sync / Async |
| :--- | :- | :------- | :----------- |
| C01 CLI Shell | C02–C06 | Direct TypeScript function call | Sync (await) |
| C03 University Profile | Playwright | Browser automation | Async |
| C03 University Profile | Gemini API | HTTPS / SDK | Async |
| C04 Guidance Engine | Gemini API | HTTPS / SDK | Async |
| C05 Essay Advisor | Gemini API | HTTPS / SDK | Async |
| C06 PDF Exporter | Puppeteer | Browser automation | Async |
| C02–C05 | File system | Node.js `fs` | Async |

### 1.3 Key Architectural Decisions

**Decision 1 — Local-only, file-backed persistence**
- Context: Student data is sensitive; no cloud requirement exists.
- Choice: All data stored as markdown files on the local filesystem under `university-ao/` (relative to `process.cwd()`). <!-- CHG-002 -->
- Alternatives rejected: SQLite (overkill), cloud storage (out of scope).
- Consequences: No sync, no multi-device, no backup — acceptable for MVP.

**Decision 2 — Gemini API for all AI generation**
- Context: Guidance and essay outputs require natural language reasoning over structured profile data.
- Choice: Google Gemini API via `@google/generative-ai` SDK; model and key stored in `university-ao/.env`. <!-- CHG-002 -->
- Alternatives rejected: OpenAI (not selected by DevAgent), rule/template engine (insufficient quality).
- Consequences: Requires internet + valid API key for C03, C04, C05; C01, C02, C06 work offline.

**Decision 3 — Playwright for university scraping**
- Context: University websites are predominantly JS-rendered SPAs; static HTML parsers miss dynamic content.
- Choice: Playwright (headless Chromium) for full DOM rendering before extraction.
- Alternatives rejected: `cheerio` (fails on JS-rendered content), `scrapy` (Python).
- Consequences: ~100MB browser binary dependency; slower cold start for university profile build.

**Decision 4 — TypeScript + ESM**
- Context: Type safety reduces runtime errors in a CLI with complex data structures; ESM is TypeScript 5.x's natural output target.
- Choice: TypeScript 5.x, `"module": "NodeNext"`, compiled to ESM.
- Alternatives rejected: plain JavaScript (no type safety), CommonJS (legacy, worse ESM interop).
- Consequences: Requires `tsconfig.json`; all imports use `.js` extensions per NodeNext resolution.

**Decision 5 — Menu-driven UX; no command-line flags** <!-- CHG-002 -->
- Context: Flag-based CLI was complex and hard to follow; replaced entirely by CHG-002.
- Choice: `ao` invoked with no arguments renders a full-screen ink TUI menu. `commander` removed. Navigation state managed by C01. Prerequisites enforced structurally by menu flow (Guidance/Essay only reachable after university selected).
- Alternatives rejected: keeping flags alongside menu (unnecessary complexity).
- Consequences: No flag parsing; `commander` dependency removed; `enquirer` removed; all interactive prompts go through `tui.tsx` ink helpers.

**Decision 6 — `process.cwd()`-relative workspace** <!-- CHG-002 -->
- Context: `ao` is a globally installed npm tool; data and config must live in the user's working directory, not the package install location.
- Choice: On startup, bootstrap in `src/config/` ensures `university-ao/` exists relative to `process.cwd()`. Both `university-ao/.env` and all data paths are resolved from `process.cwd()`.
- Alternatives rejected: fixed home-directory path (poor multi-project support), package-relative path (breaks global install).
- Consequences: Each directory where a user runs `ao` gets its own self-contained `university-ao/` workspace.

---

## 2. Functional Components

### [C01] CLI Shell

| Field | Detail |
| :---- | :----- |
| **Purpose** | Entry point — renders full-screen ink menu, manages session navigation state (selected student, selected university), dispatches to components, offers PDF export prompt after each action <!-- CHG-002 --> |
| **Ownership boundary** | Menu tree, navigation state, startup dispatch, Config screen (read/write `university-ao/.env`) <!-- CHG-002 --> |
| **Dependencies** | `src/config/` bootstrap, C02, C03, C04, C05, C06 |
| **Key data elements** | Navigation state: selected student slug, selected university slug <!-- CHG-002 --> |
| **Services exposed** | `ao` binary / `npx ao` (no arguments required) <!-- CHG-002 --> |
| **External services consumed** | None |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | Fast startup; Back navigation at every step; Guidance/Essay structurally unreachable until university selected <!-- CHG-002 --> |
| **Component spec path** | `./SPECS/components/c01-cli-shell/` |

### [C02] Student Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Interactive wizard to collect and store the student's holistic profile; display stored profile; support update and delete <!-- CHG-002 --> |
| **Ownership boundary** | Student profile files under `university-ao/students/<name>/` <!-- CHG-002 --> |
| **Dependencies** | `tui.tsx` shared helpers |
| **Key data elements** | GPA (weighted/unweighted), class rank, transcript, SAT/ACT/AP/IB scores, extracurriculars, awards, intended major/track, personal statement drafts |
| **Services exposed** | Build/Update Profile, View Profile, Delete Profile (via menu) <!-- CHG-002 --> |
| **External services consumed** | None — fully offline |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | Wizard must be resumable if interrupted; existing profile data must not be silently overwritten; delete requires confirmation |
| **Component spec path** | `./SPECS/components/c02-student-profile/` |

### [C03] University Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Scrapes a university website (given a domain) using Playwright, extracts structured profile data via Gemini, stores as markdown; support update and delete <!-- CHG-002 --> |
| **Ownership boundary** | University profile files under `university-ao/students/<name>/universities/<uni>/` <!-- CHG-002 --> |
| **Dependencies** | `tui.tsx` shared helpers, Gemini API, Playwright <!-- CHG-002 --> |
| **Key data elements** | Core values, culture, academic specialties, ideal candidate traits, notable programs, campus ethos |
| **Services exposed** | Add University, View University Profile, Update University, Delete University (via menu) <!-- CHG-002 --> |
| **External services consumed** | University website (Playwright), Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini extracts and structures scraped content into the university profile schema |
| **Critical NFRs** | Failed URLs logged to a retry list; graceful degradation if scraping partially succeeds; delete requires confirmation |
| **Component spec path** | `./SPECS/components/c03-university-profile/` |

### [C04] Guidance Engine

| Field | Detail |
| :---- | :----- |
| **Purpose** | Reads student and university profiles, calls Gemini to generate prescriptive guidance on projecting the student's strengths to align with the university's values |
| **Ownership boundary** | Guidance report markdown under `university-ao/students/<name>/universities/<uni>/guidance/<YYYY-MM-DD-HHmm>/` <!-- CHG-002 --> |
| **Dependencies** | C02 (student profile), C03 (university profile), `tui.tsx` shared helpers, Gemini API <!-- CHG-002 --> |
| **Key data elements** | Student profile + university profile → guidance recommendations |
| **Services exposed** | Generate Guidance, View Guidance (select from dated list) (via menu) <!-- CHG-002 --> |
| **External services consumed** | Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates all guidance content |
| **Critical NFRs** | Output must be anchored to actual student profile data; no generic advice; multiple dated outputs supported per student+university pair |
| **Component spec path** | `./SPECS/components/c04-guidance-engine/` |

### [C05] Essay Advisor

| Field | Detail |
| :---- | :----- |
| **Purpose** | Accepts a user-provided essay prompt and university name; generates a structured outline plus inspiration samples drawn from the student's actual profile |
| **Ownership boundary** | Essay markdown files under `university-ao/students/<name>/universities/<uni>/essays/<YYYY-MM-DD-HHmm>/` <!-- CHG-002 --> |
| **Dependencies** | C02 (student profile), C03 (university profile), `tui.tsx` shared helpers, Gemini API <!-- CHG-002 --> |
| **Key data elements** | Essay prompt (user-provided), student profile, university profile → outline + samples |
| **Services exposed** | Draft Essay, View Essay (select from dated list) (via menu) <!-- CHG-002 --> |
| **External services consumed** | Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates outline and inspiration samples |
| **Critical NFRs** | Samples clearly marked as inspirational; one prompt per invocation; covers personal statement and supplemental essays; multiple dated outputs supported per student+university pair |
| **Component spec path** | `./SPECS/components/c05-essay-advisor/` |

### [C06] PDF Exporter

| Field | Detail |
| :---- | :----- |
| **Purpose** | Converts any `ao` markdown output to a formatted PDF; invoked via follow-up prompt after any view or generate action <!-- CHG-002 --> |
| **Ownership boundary** | PDF files written alongside their source markdown |
| **Dependencies** | Puppeteer, `marked` |
| **Key data elements** | Source markdown path → PDF output path |
| **Services exposed** | PDF export prompt (offered by C01 after any view/generate action) <!-- CHG-002 --> |
| **External services consumed** | None — fully offline |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | PDF must be readable and well-formatted; must not require a running server |
| **Component spec path** | `./SPECS/components/c06-pdf-exporter/` |

> 🔽 **Deferred to Detailed Design:** Feature inventory, internal data flows, full interface signatures, wizard question sequences, Gemini prompt design, scraping page selection strategy, and per-feature NFR thresholds.

---

## 3. Technical Stack

| Layer | Technology | Rationale | Source Path |
| :---- | :--------- | :-------- | :---------- |
| **Language** | TypeScript 5.x (ESM, NodeNext) | Type safety; natural ESM output | `./src/` |
| **Runtime** | Node.js 20 LTS | LTS stability; ESM support | — |
| **TUI framework** | `ink` v5.x + `@inkjs/ui` | Full-screen React-based terminal UI; ESM-native; de facto standard for rich Node.js CLIs; replaces `commander` and `enquirer` entirely <!-- CHG-002 --> | `./src/components/`, `./src/utils/tui.tsx` |
| **Shared TUI helpers** | `src/utils/tui.tsx` | Single shared module for all interactive prompts (SpaciousSelect, waitForText, waitForConfirm) across all components <!-- CHG-002 --> | `./src/utils/` |
| **Web scraping** | `playwright` (headless Chromium) | Full DOM rendering for JS-heavy university sites | `./src/components/c03-university-profile/` |
| **AI SDK** | `@google/generative-ai` | Official Gemini SDK | `./src/ai/` |
| **PDF export** | `puppeteer` | HTML→PDF rendering; no external service needed | `./src/components/c06-pdf-exporter/` |
| **Markdown → HTML** | `marked` | Converts markdown to HTML for PDF pipeline | `./src/components/c06-pdf-exporter/` |
| **Env / config** | `dotenv` | Loads `GEMINI_API_KEY` + `GEMINI_MODEL` from `university-ao/.env`; config screen writes back to same file <!-- CHG-002 --> | `./src/config/` |
| **File I/O** | Node.js built-in `fs/promises`, `path` | Read/write markdown files | `./src/utils/` |

> 🔽 **Deferred to Detailed Design:** Version pinning rationale, per-component additional library proposals (proposed in component spec, approved via `D_Decisions.md`).

---

## 4. AI Technologies

| Concern | Choice | Notes |
| :------ | :----- | :---- |
| **LLM** | Google Gemini | Via `@google/generative-ai` SDK |
| **Model** | Configured via `GEMINI_MODEL` in `.env` | Defaults deferred to Detailed Design per component |
| **Text-embedding model** | None | Not required for MVP |
| **Vector database** | None | Not required for MVP |
| **Prompt storage** | Markdown files in `./src/ai/prompts/` | One file per prompt, named `<component>-<purpose>.md`, versioned in source control |
| **MCP servers deployed** | N | — |
| **MCP servers consumed** | N | — |

> 🔽 **Deferred to Detailed Design:** Prompt design, model parameters (temperature, maxTokens), streaming vs. batch behavior, and AI failure fallbacks — resolved per component.

---

## 5. User Experience

### 5.1 Interface Surfaces

- [x] CLI — sole interface surface

### 5.2 Key User Flows

| Flow | Entry point | Success exit | Owner component |
| :--- | :---------- | :----------- | :-------------- |
| App startup | `ao` (no args) | Menu rendered; `university-ao/` ensured; `.env` loaded | C01 + `src/config/` |
| Configure API key/model | Config option at student select screen | `university-ao/.env` updated | C01 |
| Create student | "New Student" at student select | Profile wizard complete; student dir created | C02 |
| Update student profile | "Update Profile" at student context | Profile wizard re-run; data merged | C02 |
| Delete student profile | "Delete Profile" at student context (confirmed) | Student dir removed | C02 |
| Add university | "New University" at university select | Domain prompted; scrape+extract complete; university dir created | C03 |
| Update university profile | "Update University" at university context | Re-scrape+extract; profile updated | C03 |
| Delete university profile | "Delete University" at university context (confirmed) | University dir removed | C03 |
| Generate guidance | "Guidance" → "New" at action screen | Guidance saved to dated dir; PDF prompt offered | C04 |
| View guidance | "Guidance" → select dated entry | Guidance printed; PDF prompt offered | C04 |
| Draft essay | "Essay" → "New" at action screen | Essay saved to dated dir; PDF prompt offered | C05 |
| View essay | "Essay" → select dated entry | Essay printed; PDF prompt offered | C05 |
| Export to PDF | PDF prompt after any view/generate | PDF written alongside source markdown | C06 |
| Back navigation | "Back" at any step | Returns to previous screen | C01 |

> 🔽 **Deferred to Detailed Design:** Per-screen layout, ink component tree, wizard question sequences, output formatting, and per-flow error paths.

---

## 6. Data Architecture

### 6.1 Core Entities & Relationships

```
Student (1) ──< StudentProfile (1)
Student (1) ──< University (many) <!-- CHG-002 — universities nested under student -->
University (1) ──< UniversityProfile (1)
University (1) ──< GuidanceReport (many — one per dated run) <!-- CHG-002 -->
University (1) ──< EssayOutline (many — one per dated run) <!-- CHG-002 -->
```

### 6.2 Storage Strategy

| Store type | Technology | Used for | Owning component(s) |
| :--------- | :--------- | :------- | :------------------ |
| Primary | Markdown files on local filesystem | All entities | C02, C03, C04, C05 |
| Export | PDF files on local filesystem | Print output | C06 |

No database, cache, vector store, or queue is used.

### 6.3 Data Ownership Rules

| Entity | Owner | Writers | Readers |
| :----- | :---- | :------ | :------ |
| Student profile | C02 | C02 only | C04, C05 |
| University profile | C03 | C03 only | C04, C05 |
| Guidance report | C04 | C04 only | C06 |
| Essay outline | C05 | C05 only | C06 |
| PDF export | C06 | C06 only | — |

### 6.4 Directory Structure

```
university-ao/                          ← workspace root (process.cwd()/university-ao/) <!-- CHG-002 -->
  .env                                  ← GEMINI_API_KEY, GEMINI_MODEL (read/write via Config menu) <!-- CHG-002 -->
  students/
    <student-slug>/
      profile.json                      ← raw wizard data (C02)
      profile.md                        ← rendered markdown (C02)
      universities/                     ← all university data nested under student <!-- CHG-002 -->
        <university-slug>/
          profile.md                    ← university profile (C03)
          failed-urls.md                ← scraping retry list (C03)
          guidance/
            <YYYY-MM-DD-HHmm>/          ← one dir per dated run <!-- CHG-002 -->
              guidance.md
          essays/
            <YYYY-MM-DD-HHmm>/          ← one dir per dated run <!-- CHG-002 -->
              essay.md
```

> 🔽 **Deferred to Detailed Design:** Field-level markdown schema for each entity, slug naming conventions, failed-url list format.

---

## 7. API Design

### 7.1 API Patterns

| Boundary | Pattern | Rationale |
| :------- | :------ | :-------- |
| CLI → Components | Direct TypeScript function call (async/await) | Single-process CLI; no IPC needed |
| Components → Gemini | `@google/generative-ai` SDK (`generateContent`) | Official SDK; handles auth + retries |
| Components → Filesystem | Node.js `fs/promises` | Native; no abstraction needed |
| C03 → University website | Playwright browser automation | Full DOM rendering |
| C06 → PDF | Puppeteer `page.pdf()` | HTML→PDF; no external service |

### 7.2 Versioning Strategy

Not applicable — no external API surface. Semver governed by `package.json`; menu navigation contract is internal. <!-- CHG-002 -->

> 🔽 **Deferred to Detailed Design:** Gemini request envelope (system prompt, user prompt structure, parameters) — resolved per component in component specs.

---

## 8. Error Handling Pattern

### 8.1 Chosen Pattern

All external calls (Gemini API, Playwright scraping) use **retry-once with a 30-second delay** for transient errors, with a visible countdown printed to stdout. Permanent errors fail fast with a plain-English actionable message. Scraping failures accumulate a `failed-urls.md` list for manual retry. Stack traces are never shown to the user.

### 8.2 Error Classification (System-Wide)

| Class | Definition | Retry | User-visible |
| :---- | :--------- | :---- | :----------- |
| Transient | Network timeout, Gemini rate limit, Playwright navigation timeout | Once after 30s delay (shown to user) | "Retrying in 30 seconds..." |
| Permanent | Missing API key, invalid input, file not found, 404 | N | Plain-English message + next step |
| Scraping failure | Bot-blocked, JS error, unreachable URL | N (added to retry list) | URL logged to `failed-urls.md`; message shown |
| User-caused | Missing prerequisite (no student profile), no university selected | N | Actionable instruction shown in menu <!-- CHG-002 --> |

### 8.3 User-Facing Error Tone

Plain English. Always actionable. Never expose internal error codes, stack traces, or API keys. Every error message tells the user what happened and what to do next.

> 🔽 **Deferred to Detailed Design:** Specific retry countdown display, `failed-urls.md` format, per-component fallback behavior.

---

## 9. Security Model

### 9.1 Authentication

| Concern | Detail |
| :------ | :----- |
| Mechanism | API key (Gemini) |
| Provider | Google (Gemini API) |
| Key storage | `university-ao/.env`, read/write via Config menu <!-- CHG-002 --> |
| Intentionally public surfaces | All menu options (single-user local tool) <!-- CHG-002 --> |

### 9.2 Authorization

Not applicable — single-user local tool with no roles or permissions.

### 9.3 Encryption Standards

| Concern | Standard |
| :------ | :------- |
| In transit | TLS enforced by Gemini SDK and Playwright (HTTPS) |
| At rest | No encryption — local filesystem; OS-level protection is user's responsibility |

### 9.4 Secrets Management

| Concern | Detail |
| :------ | :----- |
| Secret store | `university-ao/.env` (relative to `process.cwd()`) <!-- CHG-002 --> |
| No secrets in source / logs | Confirmed — `GEMINI_API_KEY` must never appear in stdout, stderr, or any output file |
| `.env` gitignored | Confirmed — `.gitignore` must include `university-ao/.env` <!-- CHG-002 --> |
| Rotation policy | User replaces value via Config menu or edits file directly <!-- CHG-002 --> |

> 🔽 **Deferred to Detailed Design:** Per-component `.env` key validation and error messaging on missing/malformed keys.

---

## 10. Compliance & Privacy

### 10.1 Applicable Regulations

No regulations apply. `ao` is a local CLI tool that stores data exclusively on the user's own machine. No data is transmitted to any service except the Gemini API (which receives profile content for generation). Users are advised to review Google's Gemini API data usage policies independently.

### 10.2 Cross-Border Transfer Rules

Not applicable — no data residency requirements for a local CLI tool. Gemini API calls are subject to Google's standard terms.

---

## 11. Observability Standards

### 11.1 Logging Standard

| Concern | Standard |
| :------ | :------- |
| Format | Plain text to stdout/stderr — no structured JSON needed for CLI |
| Progress output | All operations print a one-line status to stdout (e.g., `Scraping mit.edu...`, `Calling Gemini...`, `Saved: data/universities/mit/profile.md`) |
| Error output | All errors go to stderr with plain-English message + actionable next step |
| Centralized sink | None — ephemeral per session |
| PII in logs | Prohibited — no student data in console output beyond confirmation messages |

### 11.2 Distributed Tracing

Not applicable — single-process local CLI.

### 11.3 Product Analytics

Not applicable.

---

## 12. Deployment Topology

### 12.1 Distribution

| Concern | Detail |
| :------ | :----- |
| Package | npm package (`university-admission-officer`) <!-- CHG-002 — confirm package name --> |
| Invocation | `npx university-admission-officer` or `npm install -g university-admission-officer` then `ao` (no arguments) <!-- CHG-002 --> |
| Runtime requirement | Node.js 20 LTS |
| Environment matrix | Single: local developer machine |
| CI/CD | None for MVP — publish to npm manually |

### 12.2 No Containerization

Not applicable — local CLI tool; no Docker required.

---

## 13. Scalability

Not applicable. `ao` is a single-user local CLI. There is no concurrent load, no RPS target, and no horizontal scaling concern. All operations are sequential per invocation.

---

## 14. Development Standards

### 14.1 Code Conventions

| Concern | Standard |
| :------ | :------- |
| Language | TypeScript 5.x, strict mode |
| Module system | ESM (`"module": "NodeNext"`); all imports use `.js` extensions |
| Naming — variables/functions | `camelCase` |
| Naming — classes/types/interfaces | `PascalCase` |
| Naming — constants | `SCREAMING_SNAKE_CASE` |
| File naming | `kebab-case.ts` |
| Max function length | 40 lines — extract if longer |
| Max file length | 300 lines — split if longer |
| Comments | Inline only for non-obvious logic; no docblocks on internal functions |

### 14.2 Folder Structure

```
src/
  components/
    c01-cli-shell/      ← ink menu entry point, navigation state (C01) <!-- CHG-002 -->
    c02-student-profile/
    c03-university-profile/
    c04-guidance-engine/
    c05-essay-advisor/
    c06-pdf-exporter/
  ai/
    prompts/            ← one .md file per Gemini prompt, named <component>-<purpose>.md
  config/               ← startup bootstrap (ensure university-ao/, load .env), typed config object <!-- CHG-002 -->
  utils/                ← shared file I/O helpers, slug utilities, tui.tsx <!-- CHG-002 -->
university-ao/          ← runtime workspace (process.cwd()-relative, gitignored) <!-- CHG-002 -->
  .env
  students/
dist/                   ← compiled JS output (gitignored)
```

### 14.3 Branching Strategy

| Concern | Standard |
| :------ | :------- |
| Main branch | `main` — always releasable |
| Feature branches | `feat/<component-id>-<short-description>` |
| Fix branches | `fix/<component-id>-<short-description>` |
| Merge strategy | Squash merge to `main` |

### 14.4 Commit Message Format

Conventional Commits: `<type>(<scope>): <description>`
- Types: `feat` · `fix` · `refactor` · `docs` · `chore`
- Scope: component ID (e.g., `c01`, `c02`)
- Example: `feat(c03): add Playwright scraping for university profile`

### 14.5 Linting & Formatting

None required for MVP. TypeScript compiler (`tsc --noEmit`) serves as the sole static check.

### 14.6 Testing Requirements

No automated testing required for MVP.

### 14.7 Definition of Done

A component is `Complete` when **all** of the following are true:
- [ ] Implementation matches the component spec
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] All menu paths for this component navigate and execute correctly end-to-end <!-- CHG-002 -->
- [ ] No secrets, PII, or hardcoded config values in source
- [ ] `STATUS.md` Component Status Tracker updated to `Complete`

---

## 15. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial architecture document created during Planning | 2026-05-24 | SpecGantry |
| CHG-002 | Menu-driven UX overhaul: removed `commander` and `enquirer`; added ink/tui.tsx as sole TUI layer; C01 moved to `src/components/`; `src/cli/` removed; `data/` → `university-ao/` (process.cwd()-relative); universities nested under students; dated guidance/essay dirs; Config screen for `.env`; `src/config/` bootstrap; updated DoD, data flow, all component tables, security, deployment | 2026-05-27 | SpecGantry |

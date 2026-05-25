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
User invokes CLI
  └─► C01 CLI Shell — parses switches, validates prerequisites
        ├─► C02 Student Profile  ──► data/students/<name>/profile.md
        ├─► C03 University Profile ──► Playwright scrape ──► Gemini extract ──► data/universities/<name>/profile.md
        ├─► C04 Guidance Engine  ──► reads C02 + C03 ──► Gemini generate ──► data/students/<name>/<uni>/guidance.md
        ├─► C05 Essay Advisor    ──► reads C02 + C03 ──► Gemini generate ──► data/students/<name>/<uni>/essays/<slug>.md
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
- Choice: All data stored as markdown files on the local filesystem under `data/`.
- Alternatives rejected: SQLite (overkill), cloud storage (out of scope).
- Consequences: No sync, no multi-device, no backup — acceptable for MVP.

**Decision 2 — Gemini API for all AI generation**
- Context: Guidance and essay outputs require natural language reasoning over structured profile data.
- Choice: Google Gemini API via `@google/generative-ai` SDK; model and key from `.env`.
- Alternatives rejected: OpenAI (not selected by DevAgent), rule/template engine (insufficient quality).
- Consequences: Requires internet + valid API key for C03, C04, C05; C01, C02, C06 work offline.

**Decision 3 — Playwright for university scraping**
- Context: University websites are predominantly JS-rendered SPAs; static HTML parsers miss dynamic content.
- Choice: Playwright (headless Chromium) for full DOM rendering before extraction.
- Alternatives rejected: `cheerio` (fails on JS-rendered content), `scrapy` (Python).
- Consequences: ~100MB browser binary dependency; slower cold start for `--university-profile --build`.

**Decision 4 — TypeScript + ESM**
- Context: Type safety reduces runtime errors in a CLI with complex data structures; ESM is TypeScript 5.x's natural output target.
- Choice: TypeScript 5.x, `"module": "NodeNext"`, compiled to ESM.
- Alternatives rejected: plain JavaScript (no type safety), CommonJS (legacy, worse ESM interop).
- Consequences: Requires `tsconfig.json`; all imports use `.js` extensions per NodeNext resolution.

**Decision 5 — Prerequisite enforcement at CLI layer**
- Context: University profile, guidance, and essay all depend on a student profile with an intended major.
- Choice: C01 CLI Shell checks for the student profile and intended major before dispatching to C03, C04, or C05. If missing, it stops and prints an actionable message.
- Alternatives rejected: each component checking independently (redundant, inconsistent messaging).
- Consequences: Single enforcement point; components may assume prerequisites are met.

---

## 2. Functional Components

### [C01] CLI Shell

| Field | Detail |
| :---- | :----- |
| **Purpose** | Entry point — parses all command-line switches, enforces prerequisites, routes to the correct component, handles `--print` flag |
| **Ownership boundary** | Routing logic, prerequisite checks, top-level error display |
| **Dependencies** | C02, C03, C04, C05, C06 |
| **Key data elements** | CLI arguments, student name, university name |
| **Services exposed** | `ao` binary / `npx ao` |
| **External services consumed** | None |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | Fast startup; clear help text; actionable error messages |
| **Component spec path** | `./SPECS/components/c01-cli-shell/` |

### [C02] Student Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Interactive wizard to collect and store the student's holistic profile; display stored profile |
| **Ownership boundary** | Student profile markdown files under `data/students/<name>/` |
| **Dependencies** | None |
| **Key data elements** | GPA (weighted/unweighted), class rank, transcript, SAT/ACT/AP/IB scores, extracurriculars, awards, intended major/track, personal statement drafts |
| **Services exposed** | `--student-profile --build`, `--student-profile --show` |
| **External services consumed** | None — fully offline |
| **Background process** | N |
| **AI capabilities** | N |
| **Critical NFRs** | Wizard must be resumable if interrupted; existing profile data must not be silently overwritten |
| **Component spec path** | `./SPECS/components/c02-student-profile/` |

### [C03] University Profile

| Field | Detail |
| :---- | :----- |
| **Purpose** | Scrapes a university website (given a domain) using Playwright, extracts structured profile data via Gemini, stores as markdown |
| **Ownership boundary** | University profile markdown files under `data/universities/<name>/` |
| **Dependencies** | C01 (prerequisite check), Gemini API, Playwright |
| **Key data elements** | Core values, culture, academic specialties, ideal candidate traits, notable programs, campus ethos |
| **Services exposed** | `--university-profile --build`, `--university-profile --show` |
| **External services consumed** | University website (Playwright), Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini extracts and structures scraped content into the university profile schema |
| **Critical NFRs** | Failed URLs logged to a retry list; graceful degradation if scraping partially succeeds |
| **Component spec path** | `./SPECS/components/c03-university-profile/` |

### [C04] Guidance Engine

| Field | Detail |
| :---- | :----- |
| **Purpose** | Reads student and university profiles, calls Gemini to generate prescriptive guidance on projecting the student's strengths to align with the university's values |
| **Ownership boundary** | Guidance report markdown under `data/students/<name>/<uni>/guidance.md` |
| **Dependencies** | C02 (student profile), C03 (university profile), Gemini API |
| **Key data elements** | Student profile + university profile → guidance recommendations |
| **Services exposed** | `--guidance --build`, `--guidance --show` |
| **External services consumed** | Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates all guidance content |
| **Critical NFRs** | Output must be anchored to actual student profile data; no generic advice |
| **Component spec path** | `./SPECS/components/c04-guidance-engine/` |

### [C05] Essay Advisor

| Field | Detail |
| :---- | :----- |
| **Purpose** | Accepts a user-provided essay prompt and university name; generates a structured outline plus inspiration samples drawn from the student's actual profile |
| **Ownership boundary** | Essay markdown files under `data/students/<name>/<uni>/essays/` |
| **Dependencies** | C02 (student profile), C03 (university profile), Gemini API |
| **Key data elements** | Essay prompt (user-provided), student profile, university profile → outline + samples |
| **Services exposed** | `--essay --build`, `--essay --show` |
| **External services consumed** | Gemini API |
| **Background process** | N |
| **AI capabilities** | Y — Gemini generates outline and inspiration samples |
| **Critical NFRs** | Samples clearly marked as inspirational; one prompt per invocation; covers personal statement and supplemental essays |
| **Component spec path** | `./SPECS/components/c05-essay-advisor/` |

### [C06] PDF Exporter

| Field | Detail |
| :---- | :----- |
| **Purpose** | Converts any `ao` markdown output to a formatted PDF when `--print` is passed |
| **Ownership boundary** | PDF files written alongside their source markdown |
| **Dependencies** | Puppeteer, `marked` |
| **Key data elements** | Source markdown path → PDF output path |
| **Services exposed** | `--print` flag (composable with all four primary commands) |
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
| **CLI framework** | `commander` | Mature, well-typed, supports subcommands and flags | `./src/cli/` |
| **Wizard / prompts** | `enquirer` | Richer prompt types (multi-select, scales); clean ESM support | `./src/components/` |
| **Web scraping** | `playwright` (headless Chromium) | Full DOM rendering for JS-heavy university sites | `./src/components/c03-university-profile/` |
| **AI SDK** | `@google/generative-ai` | Official Gemini SDK | `./src/ai/` |
| **PDF export** | `puppeteer` | HTML→PDF rendering; no external service needed | `./src/components/c06-pdf-exporter/` |
| **Markdown → HTML** | `marked` | Converts markdown to HTML for PDF pipeline | `./src/components/c06-pdf-exporter/` |
| **Env / config** | `dotenv` | Loads `GEMINI_API_KEY` + `GEMINI_MODEL` from `.env` | `./src/config/` |
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
| Build student profile | `ao --student-profile --build` | Profile saved to `data/students/<name>/profile.md` | C02 |
| Show student profile | `ao --student-profile --show --name <name>` | Profile printed to stdout | C02 |
| Build university profile | `ao --university-profile --build --domain <domain>` | Profile saved to `data/universities/<name>/profile.md` | C03 |
| Show university profile | `ao --university-profile --show --name <name>` | Profile printed to stdout | C03 |
| Build guidance report | `ao --guidance --build --student <name> --university <name>` | Report saved to `data/students/<name>/<uni>/guidance.md` | C04 |
| Show guidance report | `ao --guidance --show --student <name> --university <name>` | Report printed to stdout | C04 |
| Build essay outline | `ao --essay --build --student <name> --university <name>` | Outline saved to `data/students/<name>/<uni>/essays/<slug>.md` | C05 |
| Show essay outline | `ao --essay --show --student <name> --university <name>` | Outline printed to stdout | C05 |
| Export to PDF | Any `--build` or `--show` + `--print` | PDF written alongside source markdown | C06 |

### 5.3 Mandatory Lenses

| Lens | Applicable? | Rationale |
| :--- | :---------- | :-------- |
| Mobile-first | N | CLI tool; no mobile surface |
| Cloud-first | N | Fully local; no cloud dependency |
| AI-first | Y | Gemini drives all guidance, extraction, and essay generation |

> 🔽 **Deferred to Detailed Design:** Exact CLI flag signatures, wizard question sequences, output formatting, and per-flow error paths.

---

## 6. Data Architecture

### 6.1 Core Entities & Relationships

```
Student (1) ──< StudentProfile (1)
Student (1) ──< GuidanceReport (many — one per university)
Student (1) ──< EssayOutline (many — one per prompt per university)
University (1) ──< UniversityProfile (1)
GuidanceReport >── University (1)
EssayOutline >── University (1)
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
data/
  students/
    <student-name>/
      profile.md
      <university-name>/
        guidance.md
        essays/
          <prompt-slug>.md
  universities/
    <university-name>/
      profile.md
      failed-urls.md        ← scraping retry list (C03)
```

> 🔽 **Deferred to Detailed Design:** Field-level markdown schema for each entity, naming conventions for slugs, failed-url list format.

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

Not applicable — no external API surface. CLI flag compatibility governed by `package.json` semver.

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
| User-caused | Missing prerequisite (no student profile), bad flag | N | Actionable instruction printed |

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
| Key storage | `.env` file in project root, loaded via `dotenv` |
| Intentionally public surfaces | All CLI commands (single-user local tool) |

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
| Secret store | `.env` file in project root |
| No secrets in source / logs | Confirmed — `GEMINI_API_KEY` must never appear in stdout, stderr, or any output file |
| `.env` gitignored | Confirmed — `.gitignore` must include `.env` |
| Rotation policy | User's responsibility — replace value in `.env` |

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
| Package | npm package (`ao`) |
| Invocation | `npx ao <flags>` or `npm install -g ao` then `ao <flags>` |
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
  cli/              ← commander setup, flag parsing, routing (C01)
  components/
    c02-student-profile/
    c03-university-profile/
    c04-guidance-engine/
    c05-essay-advisor/
    c06-pdf-exporter/
  ai/
    prompts/        ← one .md file per Gemini prompt, named <component>-<purpose>.md
  config/           ← dotenv loader, typed config object
  utils/            ← shared file I/O helpers, slug utilities
data/               ← runtime data (gitignored)
  students/
  universities/
dist/               ← compiled JS output (gitignored)
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
- [ ] All CLI flags for this component work end-to-end
- [ ] No secrets, PII, or hardcoded config values in source
- [ ] `STATUS.md` Component Status Tracker updated to `Complete`

---

## 15. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial architecture document created during Planning | 2026-05-24 | SpecGantry |

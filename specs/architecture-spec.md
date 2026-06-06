# Architecture Spec — university-admission-officer v1.0

**Reverse-engineered from:** existing codebase
**Date:** 2026-06-06
**Author:** Mangesh Pise

---

## 1. Project Overview

`university-admission-officer` (published as `ao`) is a Node.js/TypeScript application providing personalised college admissions guidance for high school students. It ships as both:

- A CLI tool (`ao` binary) built on React/Ink for a full-screen TUI experience
- A companion Express web server for browser-based access with SSE progress streaming

The system integrates the Google Gemini AI API to enhance student profiles, scrape and synthesise university profiles from public web content, generate prescriptive guidance reports, and produce essay outlines anchored to the student's real profile.

---

## 2. Technology Stack

| Layer | Technology |
| :---- | :--------- |
| Runtime | Node.js >= 20, ESM modules |
| Language | TypeScript 5.5, compiled to `dist/` |
| CLI framework | React 19 + Ink 7 + @inkjs/ui |
| AI integration | @google/generative-ai (Gemini) |
| Web scraping | Playwright (Chromium, CLI) / Playwright (Web) |
| PDF export | Puppeteer + marked (markdown→HTML→PDF) |
| Web server | Express 4 |
| Config | dotenv — workspace-local `.env` at `university-ao/.env` |

---

## 3. Repository Layout

```
src/
  ai/
    promptLoader.ts           — loads .prompt.md files, strips frontmatter, injects params
    prompts/
      c02-profile-enhance.prompt.md
      c03-university-extract.prompt.md
      c03-university-page-extract.prompt.md
      c04-guidance-generate.prompt.md
      c05-essay-generate.prompt.md
  components/
    c01-cli-shell/index.tsx   — entry point, screen routing, navigation state
    c02-student-profile/index.tsx
    c03-university-profile/index.ts
    c04-guidance-engine/index.ts
    c05-essay-advisor/index.ts
    c06-pdf-exporter/index.ts
    c08-status-bar/
      index.ts                — public API
      messageQueue.ts
      messageLogModal.tsx
      statusFooter.tsx
      types.ts
  config/
    bootstrap.ts              — workspace init, dotenv load, config read/write
    env.ts                    — legacy env helpers (kept for backward compat)
  utils/
    ensure-browsers.ts        — Puppeteer browser auto-install
    fileUtils.ts              — ensureDir, writeFile, readFile, fileExists, listFiles
    slugUtils.ts              — toSlug, djb2Hash, ESSAY_TYPE_SLUGS
    tui.tsx                   — AppScreen, SpaciousSelect, waitForSelect, waitForText,
                                 waitForConfirm, withSpinner, dotLeader
    universityScraper.ts      — shared scraping pipeline (CLI + Web)
web/
  server.js                   — Express server, REST + SSE endpoints
  public/
    index.html                — web UI
    app.js                    — browser-side JS (localStorage, fetch)
scripts/
  install-browsers.js         — postinstall Puppeteer browser install
  start-web.js                — web server launcher
  publish-npm.js              — version bump + npm publish helper
```

---

## 4. Component Architecture

### C01 — CLI Shell (`src/components/c01-cli-shell/index.tsx`)

Entry point for the `ao` binary. Manages full navigation state as an imperative async call stack (no React Router — each `screenXxx` function awaits the next screen).

**Navigation model:**
```
screenStudentSelect
  └─ screenConfig
  └─ screenStudentContext (student selected)
       ├─ screenDeleteStudent
       ├─ screenDomainPrompt (new/update university)
       └─ screenUniversityContext (university selected)
            ├─ screenDeleteUniversity
            ├─ screenGuidanceList
            │    └─ screenPdfPrompt
            └─ screenEssayList
                 └─ screenPdfPrompt
```

**Key invariants:**
- `Nav` object carries `{ studentSlug, universitySlug }` — passed by value through every screen transition
- Config (API key, model, token window, content budget %) is managed in-process via `process.env` mutation and persisted via `saveConfig()` which writes `university-ao/.env`
- Escape on Student Select exits the process; Escape on all other screens goes to the parent screen
- `withSpinner()` wraps all long-running Playwright + Gemini operations

### C02 — Student Profile (`src/components/c02-student-profile/index.tsx`)

Section-based structured data entry. Seven sections: Personal, Academics, Standardized Tests, Extracurriculars, Awards & Recognitions, Shadowing Experiences, Research Experiences.

**Data model (`ProfileData`):**
- Scalar fields: `name`, `gradYear`, `highSchool`, `gpaWeighted`, `gpaUnweighted`, `classRank`
- Nested: `sat`, `act`
- Arrays: `intendedMajors[]`, `transcript[]` (years → courses), `apScores[]`, `ibScores[]`, `extracurriculars[]`, `awards[]`, `shadowing[]`, `research[]`
- `fieldStatus`: per-field `'pending' | 'set' | 'skipped'` — gates the Finalize action

**Persistence:**
- `university-ao/students/{slug}/profile.json` — written after every field change
- `university-ao/students/{slug}/profile.md` — written only on Finalize (after Gemini enhancement)
- Schema migration: `migrateProfile()` merges a saved partial against `emptyProfile()` to heal legacy saves

**Gemini enhancement (C02-F04):** On Finalize, passes raw `ProfileData` JSON to `c02-profile-enhance.prompt.md`. Returns enhanced JSON with spelling/grammar fixed and descriptive fields reframed. Falls back to original data on LLM failure.

### C03 — University Profile (`src/components/c03-university-profile/index.ts`)

Two-pass extraction pipeline. Also available as a shared utility in `src/utils/universityScraper.ts` for the web server.

**Pass 1 — BFS crawl + batched Gemini extraction:**
- Playwright Chromium (headless) crawls up to `MAX_CRAWL_PAGES = 100` pages from the university domain
- BFS with priority queue: high-value paths pushed to front, low-value (`/news`, `/blog`, `/events`, etc.) pushed to back
- Pages are batched by char budget (`GEMINI_TOKEN_WINDOW * GEMINI_CONTENT_BUDGET_PCT / 100 * 4`)
- Each batch sent to `c03-university-page-extract.prompt.md` — returns JSON of category → fact-string arrays
- Incremental persistence: `profile.json` written after each batch flush so crawls are resumable

**Pass 2 — Synthesis:**
- Accumulated `profile.json` facts sent to `c03-university-extract.prompt.md`
- Returns `UniversityProfileData` — rendered as `profile.md`
- If `profile.md` already exists (update case), prior content is passed as `EXISTING_PROFILE` for merge

**Categories extracted:**
- Static: `Identity & Mission`, `Academic Environment`, `Admissions & Selection`, `Student Experience`, `Ideal Student Profile`
- Dynamic: `Program: {major}` for each of the student's intended majors

**Persistence:**
- `university-ao/students/{slug}/universities/{uniSlug}/profile.json` — incremental crawl state
- `university-ao/students/{slug}/universities/{uniSlug}/profile.md` — final rendered profile

**Cost tracking:** Tracks `totalInputTokens`, `totalOutputTokens` via `usageMetadata`; prints cost estimate using `MODEL_PRICING` table.

### C04 — Guidance Engine (`src/components/c04-guidance-engine/index.ts`)

Reads `student profile.md` + `university profile.md`, calls Gemini with `c04-guidance-generate.prompt.md`, writes `guidance.md` under a timestamped directory.

**Output path:** `university-ao/students/{slug}/universities/{uniSlug}/guidance/{YYYY-MM-DD-HHmm}/guidance.md`

**Temperature:** 0.7 (higher creativity for strategic narrative)

### C05 — Essay Advisor (`src/components/c05-essay-advisor/index.ts`)

Interactive essay type / prompt / word-limit collection via TUI, then Gemini call with `c05-essay-generate.prompt.md`.

**Essay types:** Personal Statement, Why `<University>`?, Supplemental (Activity/Accomplishment), Supplemental (Community/Identity), Supplemental (Other)

**File naming:** `{typeSlug}-{djb2Hash(essayPrompt)}.md` within a timestamped directory. Hash ensures same prompt overwrites previous draft; different prompts coexist.

**Output path:** `university-ao/students/{slug}/universities/{uniSlug}/essays/{YYYY-MM-DD-HHmm}/{typeSlug}-{hash}.md`

**Temperature:** 0.8

**Disclaimer injection:** Prepends the "Do NOT submit" disclaimer block if Gemini omits it.

### C06 — PDF Exporter (`src/components/c06-pdf-exporter/index.ts`)

Converts any `.md` file to a same-named `.pdf` using: `marked.parse()` → HTML with inline CSS (`pdf.css`) → Puppeteer → A4 PDF.

CSS path resolves relative to `dist/components/c06-pdf-exporter/styles/pdf.css` (copied at build time).

Auto-installs Puppeteer Chrome if browser launch fails.

### C07 — (Reserved slot, not implemented)

### C08 — Status Bar & Message Log (`src/components/c08-status-bar/`)

Implemented but not integrated into C01.

- `messageQueue.ts` — in-memory queue with `addMessage`, `getCurrentMessage`, `getAllMessages`, `clearQueue`
- `statusFooter.tsx` — Ink component rendering latest message with type icon
- `messageLogModal.tsx` — full-screen reverse-chronological log, max 20 visible rows
- `index.ts` — public API exports `postMessage`, `clearMessageLog`, `openMessageLogModal` (placeholder)

**Integration gap:** `StatusFooter` and `MessageLogModal` are not rendered anywhere in C01's `showMenu` or `withSpinner` flows. `openMessageLogModal` is a stub.

### Web Server (`web/server.js`)

Express app on port 3000 (configurable via `PORT` env). Static files served from `web/public/`.

**Endpoints:**
| Method | Path | Purpose |
| :----- | :--- | :------ |
| GET | `/api/health` | Health check |
| POST | `/api/scrape-university` | Synchronous university scrape (blocking) |
| POST | `/api/scrape-university-stream` | SSE-streamed university scrape with progress |
| POST | `/api/generate-guidance` | Guidance report generation (inline prompt, not .prompt.md) |
| POST | `/api/generate-essay-guidance` | Essay guidance (inline prompt, not .prompt.md) |

The web server uses `universityScraper.ts` for the scrape pipeline. Guidance and essay generation use inline hardcoded prompts (not the `.prompt.md` files used by CLI components). HTML output is Bootstrap-styled.

---

## 5. Configuration & Environment

Config is read from `process.env` at runtime. On bootstrap, `university-ao/.env` is loaded via dotenv (overriding system env). The Config screen in C01 allows in-session editing; `saveConfig()` persists to `university-ao/.env`.

| Env Var | Purpose | Default |
| :------ | :------ | :------ |
| `GEMINI_API_KEY` | Gemini API authentication | required |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-2.5-flash`) | required |
| `GEMINI_TOKEN_WINDOW` | Model context size in tokens | 1048576 |
| `GEMINI_CONTENT_BUDGET_PCT` | % of token window for page content batching | 60 |

---

## 6. Data Persistence Layout

All data lives under `university-ao/` relative to `process.cwd()`.

```
university-ao/
  .env                                    — API key + model config
  students/
    {student-slug}/
      profile.json                        — raw structured profile (written continuously)
      profile.md                          — enhanced rendered profile (written on Finalize)
      universities/
        {uni-slug}/
          profile.json                    — incremental crawl state (Pass 1)
          profile.md                      — synthesised university profile (Pass 2)
          guidance/
            {YYYY-MM-DD-HHmm}/
              guidance.md
              guidance.pdf                — generated on export
          essays/
            {YYYY-MM-DD-HHmm}/
              {typeSlug}-{hash}.md
              {typeSlug}-{hash}.pdf       — generated on export
```

---

## 7. AI Prompt Architecture

All CLI prompts are stored as `.prompt.md` files under `src/ai/prompts/` with YAML frontmatter documenting the prompt's parameters. `promptLoader.ts` strips the frontmatter and injects `{{PARAM}}` tokens at runtime. Prompts are copied verbatim to `dist/ai/prompts/` at build time.

| Prompt ID | Used by | Purpose |
| :-------- | :------ | :------ |
| `c02-profile-enhance` | C02 | Fix grammar + reframe descriptive fields in student profile JSON |
| `c03-university-page-extract` | C03 | Extract category facts from batch of scraped pages |
| `c03-university-extract` | C03 | Synthesise final `UniversityProfileData` from fact inventory |
| `c04-guidance-generate` | C04 | Generate prescriptive admissions guidance report |
| `c05-essay-generate` | C05 | Generate essay outline + inspiration samples |

**Web server difference:** The web server's guidance and essay endpoints use hardcoded inline prompts that request Bootstrap-styled HTML rather than the markdown output format used by CLI prompts.

---

## 8. Retry & Error Handling Strategy

- **Transient Gemini errors:** All Gemini calls use `withRetry()` — one retry after 30 seconds on any error
- **Token-size errors (C03):** Detected by checking error message for `'token'`, `'size'`, `'too long'`, `'400'` — fall through immediately to page truncation (no 30s wait), then retry once
- **Batch failure (C03):** If all retries exhausted, pages remain in `'scraped'` state in `profile.json` so the next run can resume extraction without re-crawling
- **Browser launch failure (C06):** Auto-installs Puppeteer Chrome and retries once
- **Profile enhancement failure (C02):** Falls back to original unenhanced data

---

## 9. Known Architecture Gaps (v1.0)

| Gap | Component | Impact |
| :-- | :-------- | :----- |
| C08 Status Bar not integrated | C08 / C01 | No in-app progress messages during Gemini/Playwright operations; only spinner overlay |
| Web server uses inline prompts | Web Server | Divergence from CLI prompt quality; web guidance/essay prompts are less structured |
| `jspdf` dependency unused | C06 | Dead dependency in `package.json` |
| `html2canvas` dependency unused | C06 | Dead dependency in `package.json` |
| `env.ts` partially redundant | Config | Some env helpers duplicated between `env.ts` and `bootstrap.ts` |
| C07 slot unimplemented | — | Reserved component number with no implementation |

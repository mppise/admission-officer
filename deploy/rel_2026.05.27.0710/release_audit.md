# Release Audit — university-admission-officer v2.0.0

**Audit ID:** rel_2026.05.27.0710
**Date:** 2026-05-27
**Release:** v2.0.0 (CHG-002 — Menu-driven UX overhaul)
**Auditor:** SpecGantry

---

## ✅ OVERALL VERDICT: PASS

> Zero SEV-1 blockers. Zero SEV-2 blockers. Six SEV-3 carry-forwards (non-blocking, documented below).

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C07 Bootstrap | New | `src/config/bootstrap.ts` — workspace init, .env load/write, `workspacePath()`, `getApiKey()`, `getModel()`, `saveConfig()`, `ConfigValidationError` |
| C01 CLI Shell | Rewritten | Full-screen ink TUI replaces commander CLI flags. Imperative async menu loop pattern. Config screen, Back navigation, Delete with confirmation, dated outputs. `src/cli/index.ts` deleted. |
| C02 Student Profile | Updated | Imports migrated to `workspacePath()`, `getApiKey()`, `getModel()` from C07. Added `deleteStudentProfile()`. Signature updated: `buildStudentProfile()` returns `{profilePath, studentSlug}`. |
| C03 University Profile | Updated | Nested paths under `university-ao/students/<s>/universities/<u>/`. Added `deleteUniversityProfile()`. New `buildUniversityProfile(domain, studentSlug, uniSlug?)` signature returning `{profilePath, uniSlug}`. |
| C04 Guidance Engine | Updated | `timestamp` parameter added. Dated directories `YYYY-MM-DD-HHmm`. Added `listGuidance()`. All paths via `workspacePath()`. |
| C05 Essay Advisor | Updated | `timestamp` parameter added. Dated directories. Added `listEssays()`, `showEssay()`. All paths via `workspacePath()`. `enquirer` fully removed. |
| C06 PDF Exporter | No changes | Invocation model change handled entirely by C01 — C06 source unchanged. |

**Breaking changes:** `data/` workspace renamed to `university-ao/`. All existing `data/` workspaces must be migrated manually. Commander CLI flags removed — `ao` is now menu-only.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/All]** `npm run build` exits 0. TypeScript compiler emits no errors or warnings across all 7 components.
* [X] **[Syntax/C01]** `src/components/c01-cli-shell/index.tsx` — React import present; JSX factory correctly configured via `tsconfig.json`; all async screen functions return `Promise<Nav>`.
* [X] **[Syntax/C07]** `src/config/bootstrap.ts` — `ConfigValidationError extends Error` correctly sets `this.name`; `dotenv.config()` called after workspace mkdir to ensure `.env` is present before first read.

### Architecture

* [X] **[Architecture/C01]** Imperative async loop pattern: each screen is an independent async function; `render(<MenuScreen/>)` starts a fresh ink instance per screen; no React state machine for navigation. Correctly avoids React Rules of Hooks violations from the prior version.
* [X] **[Architecture/C01]** `showMenu()` wraps `render()` in a `Promise` that resolves when `SpaciousSelect.onSelect` fires; `resolved` guard prevents double-resolution.
* [X] **[Architecture/C07]** `workspacePath()` uses `process.cwd()` + `path.join()` — no user-supplied segments reach `path.join` without sanitization from slug conversion in C02/C03.
* [X] **[Architecture/C03]** Local env wrappers (`getGeminiApiKey`, `getGeminiModel`, `getGeminiBatchCharBudget`) read `process.env` directly — C03's `GEMINI_TOKEN_WINDOW`/`GEMINI_CONTENT_BUDGET_PCT` vars are outside C07's managed config and correctly isolated.
* [X] **[Architecture/General]** `commander` and `enquirer` fully removed from `package.json` dependencies and all source files.

### Security

* [X] **[Security/C07]** `GEMINI_API_KEY` is never written to stdout, stderr, or any output file. Config screen masks all but the last 4 characters with `•`.
* [X] **[Security/C07]** `.env` file stored in `university-ao/` workspace; `.gitignore` must include `university-ao/.env` (see SEV-3 note below).
* [X] **[Security/C01]** No user-supplied input is passed to `exec`, `spawn`, or `eval`. All student/university names pass through slug conversion before path construction.
* [X] **[Security/C02-C03]** Slug conversion (lowercase + replace non-alphanumeric with `-`) prevents path traversal; `../` not possible after sanitization.
* [ ] **[Security/C07]** SEV-3: `university-ao/.env` is not explicitly verified to be in `.gitignore` — if the user clones the repo and runs the tool, `.env` could be committed. Non-blocking; documented in SEV-3 section.

### Maintainability

* [X] **[Maintainability/C01]** Screen functions follow a consistent `async function screenXxx(nav: Nav, error?: string): Promise<Nav>` signature — predictable, testable, easy to extend.
* [X] **[Maintainability/C07]** Single source of truth for workspace root (`WORKSPACE = 'university-ao'` constant in `bootstrap.ts`).
* [ ] **[Maintainability/C04-C05]** SEV-3: `listGuidance` and `listEssays` sort by directory name (timestamp string). If the local clock is adjusted backward, ordering could be incorrect. Non-blocking; timestamp format `YYYY-MM-DD-HHmm` lexicographically sorts correctly under normal operation.
* [ ] **[Maintainability/C01]** SEV-3: `screenPdfPrompt` always returns `screenUniversityContext(nav)` regardless of whether the user is coming from Guidance or Essay. If future features require returning to the source list, a `returnTo` parameter would be needed. No impact in current version.

### Test Coverage

* [ ] **[Test Coverage/All]** SEV-3: No automated test suite exists. All verification is manual smoke testing. Carry-forward from prior audits.

### Dependencies

* [X] **[Dependencies/General]** `package.json` `dependencies` and `devDependencies` are consistent with source imports. `commander` and `enquirer` removed. `ink`, `@inkjs/ui`, `react`, `react-dom` present as runtime deps.
* [X] **[Dependencies/C06]** `puppeteer` and `playwright` both listed with correct `postinstall` script.
* [ ] **[Dependencies/General]** SEV-3: `react-dom` is listed in `dependencies` but is not imported anywhere in the source (ink manages the React tree). Harmless but adds ~3 MB to the install footprint. Carry-forward.
* [ ] **[Dependencies/General]** SEV-3: `@google/generative-ai` version `^0.21.0` — the `0.x` version range indicates a pre-stable API. The SDK has not yet reached 1.0.0. Risk of breaking changes on minor bumps. Carry-forward from prior audits.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verification |
| :- | :--- | :----------- |
| 1 | **First launch** — run `ao` with no workspace; should create `university-ao/` and show Student Select menu | `university-ao/` directory created; menu renders without error |
| 2 | **Config screen** — enter API key, select model, save | `university-ao/.env` written; masked key shows in menu label |
| 3 | **New Student → New University** — create student profile, add university by domain | `university-ao/students/<slug>/profile.json` and `.md` created; `universities/<uniSlug>/` created |
| 4 | **New Guidance** — generate guidance from university context | `university-ao/students/<s>/universities/<u>/guidance/<YYYY-MM-DD-HHmm>/guidance.md` created |
| 5 | **New Essay** — generate essay from university context | `university-ao/students/<s>/universities/<u>/essays/<YYYY-MM-DD-HHmm>/essay.md` created |
| 6 | **Delete University → Delete Student** — confirm deletion prompts work and directories are removed | Confirmed prompts shown; directories absent after deletion |
| 7 | **Back navigation** — navigate from University → Student → Student Select | Each Back returns to the correct prior screen without error |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Any crash on startup, corrupted workspace, or broken navigation flow reported post-publish |
| npm rollback | `npm publish` with the prior version tag, or `npm deprecate university-admission-officer@2.0.0 "use 1.3.1"` |
| Data reversibility | `university-ao/` workspace is separate from the old `data/` workspace; no migration is performed automatically; v1.3.1 users retain their `data/` directory and can continue using v1.3.1 |
| Estimated recovery time | < 5 minutes (npm deprecate) or < 15 minutes (republish prior version) |

---

*Audit complete. Proceeding to release announcement and deployment script update.*

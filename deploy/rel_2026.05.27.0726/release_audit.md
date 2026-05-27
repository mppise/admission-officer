# Release Audit — university-admission-officer v2.0.1

**Audit ID:** rel_2026.05.27.0726
**Date:** 2026-05-27
**Release:** v2.0.1 (patch — Gemini token window & content budget config support)
**Auditor:** SpecGantry

---

## ✅ OVERALL VERDICT: PASS

> Zero SEV-1 blockers. Zero SEV-2 blockers. Seven SEV-3 carry-forwards (non-blocking, documented below).

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C07 Bootstrap | Updated | `getTokenWindow()` and `getContentBudgetPct()` accessors added. `saveConfig()` extended to 4 params: writes all four env vars (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TOKEN_WINDOW`, `GEMINI_CONTENT_BUDGET_PCT`). Validation added for new params. |
| C01 CLI Shell | Updated | Config screen gains two new edit items: "Edit Token Window" and "Edit Content Budget %". Save call passes all 4 values. Import updated. |
| C03 University Profile | Updated | Local `getGeminiBatchCharBudget()` default aligned: `32000` → `1048576` to match `.env.example`. |
| C02, C04, C05, C06 | No changes | Unchanged from v2.0.0. |

**Breaking changes:** None. Patch release. Existing `university-ao/.env` files without `GEMINI_TOKEN_WINDOW` / `GEMINI_CONTENT_BUDGET_PCT` continue to work — defaults are applied at runtime (`1048576` / `60`). Values are added to `.env` on next Config save.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/All]** `npm run build` exits 0. TypeScript compiler emits no errors or warnings across all components.
* [X] **[Syntax/C07]** `saveConfig()` parameter types: `key: string`, `model: string`, `tokenWindow: number`, `contentBudgetPct: number`. Validation uses `Number.isInteger()` — correct for both values since `parseInt()` in the callers always returns an integer.
* [X] **[Syntax/C01]** `process.env.GEMINI_TOKEN_WINDOW` and `process.env.GEMINI_CONTENT_BUDGET_PCT` assigned as strings via `raw.trim()` — correct since `process.env` values are always strings; `getTokenWindow()` and `getContentBudgetPct()` re-parse them via `parseInt`.

### Architecture

* [X] **[Architecture/C07]** `getTokenWindow()` and `getContentBudgetPct()` return numeric defaults (`1048576` / `60`) if env vars are absent — no callers need null-guards.
* [X] **[Architecture/C01]** Config screen follows the same edit-in-memory → save-on-confirm pattern as API key and model. No partial writes occur mid-edit.
* [X] **[Architecture/C03]** Local `getGeminiBatchCharBudget()` reads `process.env` directly — this is correct; `saveConfig()` calls `dotenv.config({ override: true })` after writing, so the in-process env is updated immediately and C03 sees the new values on next invocation.
* [X] **[Architecture/General]** `env.ts` (`validateEnv`, `getGeminiApiKey`, `getGeminiModel`, `getGeminiBatchCharBudget`) is not imported or called from any source file — it is dead code but does not affect runtime behaviour.

### Security

* [X] **[Security/C07]** `tokenWindow` and `contentBudgetPct` are validated as integers before being written to `.env`. No raw user string is written without parsing.
* [X] **[Security/C07]** `saveConfig()` writes values via template literal — no user input reaches a shell command; file write only.
* [X] **[Security/C01]** Token window and content budget values entered via `waitForText` are stored in `process.env` as raw strings; `getTokenWindow()` / `getContentBudgetPct()` parse them safely with `parseInt`. Invalid entries (NaN) are caught by `saveConfig()` validation before disk write.
* [ ] **[Security/C07]** SEV-3 (carry-forward): `university-ao/.env` not explicitly verified to be in `.gitignore`.

### Maintainability

* [X] **[Maintainability/C07]** All four env var defaults are co-located in their respective accessors — consistent, easy to update.
* [X] **[Maintainability/C01]** Config screen item labels use a fixed-width padding pattern (`Edit API Key          `, `Edit Model            `, etc.) for column alignment — readable and consistent.
* [ ] **[Maintainability/General]** SEV-3 (carry-forward): `env.ts` (`validateEnv`, `getGeminiApiKey`, `getGeminiModel`) is dead code since the CLI flag entry point was removed in v2.0.0. No runtime impact; file can be cleaned up in a future release.
* [ ] **[Maintainability/C04-C05]** SEV-3 (carry-forward): timestamp-based directory sort assumes no clock skew.
* [ ] **[Maintainability/C01]** SEV-3 (carry-forward): `screenPdfPrompt` always returns to `screenUniversityContext`.

### Test Coverage

* [ ] **[Test Coverage/All]** SEV-3 (carry-forward): No automated test suite. Manual smoke testing only.

### Dependencies

* [X] **[Dependencies/General]** No new dependencies added. `package.json` unchanged from v2.0.0.
* [ ] **[Dependencies/General]** SEV-3 (carry-forward): `react-dom` listed but unused.
* [ ] **[Dependencies/General]** SEV-3 (carry-forward): `@google/generative-ai` at pre-stable `0.x`.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verification |
| :- | :--- | :----------- |
| 1 | **Config screen — all 4 fields** — open Config, edit Token Window and Content Budget %, save | `university-ao/.env` contains all 4 vars; values reflected in menu labels on re-entry |
| 2 | **Validation — invalid token window** — enter `abc` for token window, attempt Save | Error message shown; `.env` not overwritten |
| 3 | **Validation — out-of-range budget** — enter `0` or `101` for content budget, attempt Save | Error message shown; `.env` not overwritten |
| 4 | **Upgrade path — existing `.env` with 2 vars** — run with a pre-v2.0.1 `.env` that has only `GEMINI_API_KEY` and `GEMINI_MODEL` | App starts normally; defaults applied; Config screen shows `1048576` and `60` for new fields |
| 5 | **New Guidance** — generate guidance after setting token window | Guidance generated correctly; batch char budget reflects new token window value |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Corrupt `.env` write, validation bypass, or batch sizing regression reported post-publish |
| npm rollback | `npm deprecate university-admission-officer@2.0.1 "use 2.0.0"` or republish v2.0.0 |
| Data reversibility | No workspace schema change. `.env` format is backward-compatible — removing the two new lines restores v2.0.0 behaviour. |
| Estimated recovery time | < 5 minutes (npm deprecate) |

---

*Audit complete. Proceeding to release announcement.*

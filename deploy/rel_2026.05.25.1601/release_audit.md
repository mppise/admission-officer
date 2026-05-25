# Release Audit — admission-officer v1.1.0

**Verdict: ✅ PASS**
**Release:** rel_2026.05.25.1601
**Package:** admission-officer@1.1.0
**Auditor:** SpecGantry
**Date:** 2026-05-25
**Type:** Minor release — C02 Student Profile full redesign
**Prior release:** v1.0.2 (audit `rel_2026.05.25.1600`)

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C02 Student Profile | Updated | Full rewrite: linear wizard replaced with 3-level nested menu (Main → Section → Field/List). JSON sidecar (`profile.json`) introduced as canonical source of truth — written after every individual field input. Per-field completion tracking (`pending \| set \| skipped`) with finalization gate. Gemini enhancement call at Finalize rewrites descriptive fields in honest student voice before generating `profile.md`. Raw user input always preserved in `profile.json`. Personal Statement section removed. Data-loss bug fixed (Enquirer mutation of live arrays; stale field keys blocking finalization). |
| ESLint | New | `eslint.config.js` added with `@typescript-eslint/recommended` rules and Node globals. `npm run lint` script added to `package.json`. |
| C02 Enhancement Prompt | New | `src/ai/prompts/c02-profile-enhance.prompt.md` — Gemini prompt for profile text enhancement at finalization. |

**Unchanged components:** C01 CLI Shell, C03 University Profile, C04 Guidance Engine, C05 Essay Advisor, C06 PDF Exporter.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/C02]** `tsc --noEmit` passes clean. No TypeScript errors.
* [X] **[Syntax/C02]** `npm run lint` passes clean. No ESLint errors or warnings.
* [X] **[Syntax/C02]** `npm run build` succeeds. All prompt and CSS assets copied correctly.

### Architecture

* [X] **[Architecture/C02]** `profile.json` is the sole source of truth for edits. `profile.md` is never parsed back to structured data. Clean separation maintained.
* [X] **[Architecture/C02]** `allComplete()` checks only fields present in `SECTION_FIELDS` — stale keys from removed sections (e.g. `personalStatementSummary`) in pre-existing `profile.json` files cannot block finalization.
* [X] **[Architecture/C02]** Gemini enhancement is a rendering step only — `profile.json` is never written during `enhanceProfile()`. Raw user input is always preserved.
* [X] **[Architecture/C02]** Fresh `Enquirer` instance per prompt call — prevents cross-prompt choice cache pollution, which caused the Personal Statement menu to render Personal section fields.
* [X] **[Architecture/C02]** All `choices` arrays passed to Enquirer use spread copies (`[...entries]`) rather than live array references — prevents Enquirer in-place mutation of `ProfileData` arrays.
* [ ] **[Architecture/C02]** `emptyProfile` accepts a `slug` parameter that is never used inside the function body. Dead parameter — no functional impact but minor code smell.

### Security

* [X] **[Security/C02]** No external network calls outside of the explicit Gemini enhancement call at Finalize. No telemetry, no webhooks.
* [X] **[Security/C02]** All file I/O via `fs/promises` through `fileUtils` helpers. No `exec`, `spawn`, or `eval`.
* [X] **[Security/C02]** `profile.json` written to `data/students/<slug>/` — slug is sanitised upstream by C01 via `toSlug()`. No path traversal possible.
* [X] **[Security/C02]** Gemini response is parsed with `JSON.parse()` in a try/catch — malformed LLM output falls back to raw `ProfileData` gracefully without crashing.

### Maintainability

* [X] **[Maintainability/C02]** Section dispatch in `mainMenu` uses `sections.find(s => choice.startsWith(s))` — adding a new section requires only adding to `SECTION_FIELDS` and a `case` in the switch. No duplication.
* [X] **[Maintainability/ESLint]** `no-constant-condition` rule is off globally — required for `while(true)` patterns used throughout C02 and C03. Appropriate suppression.
* [ ] **[Maintainability/C02-Prompt]** `c02-profile-enhance.prompt.md` line 25 still references `personalStatementSummary` in the "Descriptive fields to reframe" list. This field was removed from the schema. The LLM will receive no such field in the input — harmless at runtime but creates misleading prompt instructions. Should be cleaned up.
* [ ] **[Maintainability/C02]** `editScalar` has a `choices?: string[]` parameter and `type` inference logic that is unused — no caller passes `choices` to `editScalar`. Dead code path, low risk.

### Test Coverage

* [ ] **[TestCoverage/C02]** No automated tests. Consistent with MVP policy (all components). Manual smoke test required post-deploy (see Section C).

### Dependencies

* [X] **[Dependencies/C02]** `@google/generative-ai` already a production dependency — no new runtime dependency introduced by C02 Gemini call.
* [X] **[Dependencies/ESLint]** All ESLint packages are `devDependencies` — not included in production bundle. Correct placement.
* [X] **[Dependencies/General]** No new production dependencies introduced in this release.

---

### Verdict Summary

| Severity | Count | Blocking? |
| :------- | :---: | :-------- |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 3 | No |

**Overall: ✅ PASS** — 0 SEV-1, 0 SEV-2. Three SEV-3 findings are non-blocking maintainability notes.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Expected result |
| :- | :--- | :-------------- |
| 1 | `ao --student-profile --build` (new student) | Name prompt → Main Menu opens with all sections `○ not started` |
| 2 | Navigate to Personal → enter Graduation Year, High School, add 1 Intended Major → Back → Main Menu shows `● 0 fields pending` for Personal | Completion indicator updates correctly; `profile.json` written after each field |
| 3 | Complete all sections (skip optional fields) → Finalize & Save enabled → select it | "Enhancing your profile..." printed → `profile.md` written → "Profile saved:" printed |
| 4 | `ao --student-profile --build --name <slug>` on existing profile | "Resuming student profile..." → Main Menu with prior values and indicators intact |
| 5 | `ao --student-profile --show --name <slug>` | Full markdown profile printed to stdout |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | `profile.md` not generated, crash on Finalize, or Gemini enhancement corrupting output |
| Rollback mechanism | `npm install -g admission-officer@1.0.2` reinstates prior version |
| Data reversibility | `profile.json` is never modified by the enhancement step — raw user data is always safe. Re-running Finalize on v1.0.2 would regenerate `profile.md` from the existing `profile.md` (old parse path). Existing `profile.json` files from v1.1.0 are forward-only; v1.0.2 does not read them. |
| Estimated recovery time | < 5 minutes (npm reinstall + `npm link`) |

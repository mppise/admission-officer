# Release Audit — university-admission-officer v2.0.2

**Audit ID:** rel_2026.05.27.0822
**Date:** 2026-05-27
**Release:** v2.0.2 (patch — View Profile/University; Esc=Back; progress spinner)
**Auditor:** SpecGantry

---

## ✅ OVERALL VERDICT: PASS

> Zero SEV-1 blockers. Zero SEV-2 blockers. Eight SEV-3 carry-forwards (one new, documented below).

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C01 CLI Shell | Updated | Three bug fixes: (1) "View Profile" added to Student Context — calls `showStudentProfile()` then PDF prompt; (2) "View University" added to University Context — calls `showUniversityProfile()` then PDF prompt; (3) Esc key now fires Back on every screen; on Student Select, Esc calls `process.exit(0)` and footer shows `[ Ctrl+C ] exit`; (4) `buildUniversityProfile`, `buildGuidance`, `buildEssay` wrapped with `withSpinner` to show progress during AI/scraping operations. |
| tui.tsx (shared) | Updated | `SpaciousSelect` gains `onEscape` prop; `AppScreen` gains `footerEsc` prop; `waitForText` resolves `''` on Esc; `waitForSelect` resolves `'__esc'` on Esc; `withSpinner<T>` helper added. |
| C02, C03, C04, C05, C06, C07 | No changes | Unchanged from v2.0.1. |

**Breaking changes:** None. Patch release. No schema, API, or workspace layout changes.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/All]** `npm run build` exits 0. `npm run lint` exits 0. No TypeScript errors or ESLint warnings.
* [X] **[Syntax/tui.tsx]** `withSpinner<T>` generic function correctly typed — `promise: Promise<T>` resolves to `T`; `reject` receives `err as Error`. No implicit `any`.
* [X] **[Syntax/tui.tsx]** `useEffect` with empty dependency array is intentional and correct — `promise` reference is captured by closure at render time and never reassigns; `done` flag prevents double-resolve if ink re-renders.
* [X] **[Syntax/C01]** `showMenu` now accepts optional `footerEsc?: string` fifth parameter — all existing call sites omit it, defaulting to the standard footer. Only `screenStudentSelect` passes `'Ctrl+C'`. No call-site breakage.
* [X] **[Syntax/C01]** `screenPdfPrompt` signature changed to `(nav, markdownPath, returnTo: 'student' | 'university')` — all three call sites updated consistently (`'student'` from Student Context view, `'university'` from all Guidance/Essay/University-view paths).

### Architecture

* [X] **[Architecture/C01]** `showStudentProfile` and `showUniversityProfile` were already exported by C02/C03 respectively — C01 simply adds the import and wires them. No new cross-component coupling introduced beyond what the spec already defined.
* [X] **[Architecture/tui.tsx]** `withSpinner` owns the ink render lifetime for the duration of the promise; it does not interfere with the calling screen's render lifecycle because each `render()` call in this codebase is a discrete, non-overlapping unit resolved via promise.
* [X] **[Architecture/C01]** Esc sentinel `'__esc'` is handled in every screen function that calls `showMenu`. No screen leaves `'__esc'` unhandled — confirmed by code review.
* [X] **[Architecture/C01]** `screenDomainPrompt` for `purpose === 'update'` now correctly returns to `screenUniversityContext` on Esc/empty input (previously it returned to `screenStudentContext` — this was a pre-existing minor UX bug that was fixed incidentally).
* [X] **[Architecture/tui.tsx]** `waitForSelect` (used by C02 profile menus) also resolves `'__esc'` — C02's internal menu loop handles unknown values by falling through to its own back logic, so this is safe.

### Security

* [X] **[Security/C01]** No new user input paths introduced. View Profile and View University are read-only file operations — no user-controlled path segments beyond the slugs already held in nav state.
* [X] **[Security/tui.tsx]** `withSpinner` takes a pre-constructed `Promise<T>` — the message and subtitle strings are developer-controlled constants, not user input. No injection surface.
* [ ] **[Security/C07]** SEV-3 (carry-forward from v2.0.1): `university-ao/.env` not explicitly verified to be in `.gitignore`.

### Maintainability

* [X] **[Maintainability/C01]** `'__esc'` sentinel handling is consistent: every screen maps it to the same target as `'__back'`. Pattern is clear and easy to extend.
* [X] **[Maintainability/tui.tsx]** `SPINNER_FRAMES` constant is defined at module scope — not inside the component — so it is not recreated on each render.
* [ ] **[Maintainability/General]** SEV-3 (carry-forward): `env.ts` dead code remains.
* [ ] **[Maintainability/C04-C05]** SEV-3 (carry-forward): timestamp-based directory sort assumes no clock skew.
* [ ] **[Maintainability/C01]** SEV-3 (resolved in this release): `screenPdfPrompt` previously always returned to `screenUniversityContext` — now parametric. Carry-forward closed.
* [ ] **[Maintainability/tui.tsx]** SEV-3 (new): `waitForSelect` resolves `'__esc'` — callers in C02 and C05 that use `waitForSelect` directly do not explicitly handle `'__esc'`. Their fallthrough logic is safe today but could silently misroute if new screens are added. Recommend explicit `'__esc'` handling in C02/C05 in a future release.

### Test Coverage

* [ ] **[Test Coverage/All]** SEV-3 (carry-forward): No automated test suite. Manual smoke testing only.

### Dependencies

* [X] **[Dependencies/General]** No new dependencies added. `package.json` unchanged from v2.0.1.
* [ ] **[Dependencies/General]** SEV-3 (carry-forward): `react-dom` listed but unused.
* [ ] **[Dependencies/General]** SEV-3 (carry-forward): `@google/generative-ai` at pre-stable `0.x`.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verification |
| :- | :--- | :----------- |
| 1 | **View Profile** — select existing student → "View Profile" | Student `profile.md` content displayed; PDF prompt follows; returns to Student Context |
| 2 | **View University** — select existing student → select university → "View University" | University `profile.md` content displayed; PDF prompt follows; returns to University Context |
| 3 | **Esc navigation** — from University Context, press Esc | Returns to Student Context (not Student Select) |
| 4 | **Esc on Student Select** — press Esc on the root screen | Process exits cleanly (`process.exit(0)`); footer shows `[ Ctrl+C ] exit` |
| 5 | **Spinner on New University** — trigger "New University", enter domain | Spinner renders with cycling braille character and "Scraping and analysing university…" message while Playwright runs; result screen appears after completion |
| 6 | **Esc on domain prompt** — press Esc when "Enter university domain" is shown | Returns to Student Context without error |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Esc key causes unexpected exit; View Profile crashes; spinner hangs and never resolves |
| npm rollback | `npm deprecate university-admission-officer@2.0.2 "use 2.0.1"` |
| Data reversibility | No workspace schema change. No data written by this release's new features beyond what C02–C05 already wrote. |
| Estimated recovery time | < 5 minutes (npm deprecate) |

---

*Audit complete. Proceeding to release announcement.*

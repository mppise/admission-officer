# Release Audit — university-admission-officer v1.3.1

**Verdict: ✅ PASS**
**Release:** rel_2026.05.26.0943
**Package:** university-admission-officer@1.3.1
**Auditor:** SpecGantry
**Date:** 2026-05-26
**Type:** Patch release — bug fix for resume-crash on legacy `profile.json` (C02-F06/F07) + shared `tui.tsx` visual-contrast fix
**Prior release:** v1.3.0 (audit `rel_2026.05.26.0911` PASS, deployment paused)

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C02 Student Profile | Updated | **Resume-crash fix:** new `migrateProfile()` helper merges parsed `profile.json` over a fresh `emptyProfile()` shape on load (both `build` and `enhance` entry points). Eliminates `Cannot read properties of undefined (reading 'map')` when a profile.json predating F06/F07 is reopened. Generic defaulting — heals any future-added field without per-release migration code. (D-PRODUCT-AO000003) |
| Shared TUI Utility | Updated | **Visual-contrast fix:** `dimColor` dropped from the hint line, the footer pill keys/labels, and inactive menu rows. Active menu row now renders as bold white-on-black (`backgroundColor="black"`) inverted highlight in place of bold magenta. Affects C02 and C05 (both consume `tui.tsx`). (D-PRODUCT-AO000002) |
| C05 Essay Advisor | Updated (inherited) | No code change in `src/components/c05-essay-advisor/`. Inherits the shared `tui.tsx` visual-contrast change. |

**Unchanged components:** C01 CLI Shell, C03 University Profile, C04 Guidance Engine, C06 PDF Exporter.

**Unchanged surfaces:** `profile.json` on-disk schema; `ProfileData` type; LLM prompts; CLI flags; package dependencies.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/General]** `tsc --noEmit` passes clean. No TypeScript errors.
* [X] **[Syntax/General]** `npm run lint` passes clean. No ESLint errors or warnings.
* [X] **[Syntax/C02]** `migrateProfile(parsed: Partial<ProfileData>): ProfileData` is correctly typed — `Partial<ProfileData>` accommodates legacy saves missing keys; return type is the full shape. Both `buildStudentProfile` call sites cast the JSON parse result as `Partial<ProfileData>` before passing.
* [X] **[Syntax/tui.tsx]** `backgroundColor="black"` is a valid ink `<Text>` prop; no type drift. Removal of `dimColor` props is type-safe.

### Architecture

* [X] **[Architecture/C02]** `migrateProfile` is a pure function — no I/O, no side effects. Uses spread semantics with `parsed` overriding `base`, then nested-spread to heal `sat`, `act`, and `fieldStatus` sub-objects. Matches D-PRODUCT-AO000003 contract exactly.
* [X] **[Architecture/C02]** Both load paths (`buildStudentProfile` with and without `nameSlug`) wrap the parsed JSON with `migrateProfile()` — symmetric coverage; no resume path bypasses the migration.
* [X] **[Architecture/C02]** Generic-merge approach correctly defers to existing `emptyProfile()` for defaults (`shadowing: []`, `research: []`, `extracurriculars: []`, `awards: []`, etc.) — single source of truth for shape; no duplicated defaults.
* [X] **[Architecture/tui.tsx]** Visual treatment is local to render output; no API surface change. `hint`, `footerHint`, and `AppScreen` props unchanged. C02 and C05 consume `tui.tsx` without modification — inheritance contract preserved.
* [X] **[Architecture/tui.tsx]** Active-row inverted highlight relies on `backgroundColor` + `color` only — no color-only signal; accessible for color-vision-deficient terminals.

### Security

* [X] **[Security/C02]** `migrateProfile` only spreads object keys — no eval, no dynamic require, no path construction. Untrusted-input surface unchanged from prior release.
* [X] **[Security/C02]** Legacy `profile.json` files are still loaded via `JSON.parse` on trusted local-disk content under user-owned paths — threat model unchanged.
* [X] **[Security/tui.tsx]** Rendering-only change. No I/O, no network, no env access introduced.

### Maintainability

* [X] **[Maintainability/C02]** `migrateProfile` is documented with a leading comment naming the schema-growth motivation (F06/F07) — future maintainers will understand why the merge exists.
* [X] **[Maintainability/C02]** Generic spread approach means future field additions to `emptyProfile()` are auto-healed on resume without touching `migrateProfile`. Aligns with D-PRODUCT-AO000003 rationale.
* [ ] **[Maintainability/tui.tsx]** `waitForText` still has the double-exit risk (`useInput` key.return + `TextInput` `onSubmit` both call `exit()` + `resolve()`). **SEV-3 — carried forward from v1.2.0.**
* [ ] **[Maintainability/tui.tsx]** `waitForConfirm` `message` parameter declared but never used. **SEV-3 — carried forward from v1.3.0.**
* [ ] **[Maintainability/C02]** `emptyProfile` initialises `fieldStatus.name = 'set'` without validating the name is non-empty. **SEV-3 — carried forward from v1.1.0.**
* [ ] **[Maintainability/C02]** `editScalar` switch `default` branch unreachable; future missing case would silently no-op. **SEV-3 — carried forward from v1.2.0.**
* [ ] **[Maintainability/prompt]** `personalStatementSummary` referenced in `c02-profile-enhance.prompt.md` reframe list but no such field exists in `ProfileData`. **SEV-3 — carried forward from v1.1.0.**

### Test Coverage

* [ ] **[TestCoverage/General]** No automated tests. Manual smoke test required (see Section C). **SEV-3 — carried forward.**

### Dependencies

* [X] **[Dependencies/general]** No new dependencies. No version bumps. Lockfile changes limited to the patch version field.
* [X] **[Dependencies/package.json]** `version` field is `1.3.1`. Matches release classification.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verify |
| - | :--- | :----- |
| 1 | Resume legacy profile.json (pre-F06/F07) | Place a `profile.json` lacking `shadowing` and `research` keys. Run `ao --student-profile --build`. Resume completes; no `Cannot read properties of undefined` crash. Shadowing and Research sections show `🔲 not started`. |
| 2 | Selecting Shadowing / Research on legacy profile | Open each section from main menu — list renders empty, `＋ Add …` works, entries persist. |
| 3 | Active row contrast (C02 main menu) | Cursor row renders as bold white-on-black inverted highlight (not magenta). Inactive rows render in normal white (no dim). |
| 4 | Hint and footer contrast | Yellow hint callout and footer pill labels (`navigate`, `select`, `back`) are clearly readable on dark and light terminal themes — no longer washed-out. |
| 5 | C05 inherited visual fix | `ao --essay --build` shows the same un-dimmed footer and inverted active row in the essay-advisor menus. |
| 6 | Regression — fresh profile build | `ao --student-profile --build` from scratch still completes all sections including F06/F07 (no regression introduced by `migrateProfile`). |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Any SEV-1/SEV-2 issue discovered post-publish (resume regression, visual breakage, install failure) |
| Mechanism | `npm dist-tag add university-admission-officer@1.2.0 latest` (note: v1.3.0 was never published — rollback target is v1.2.0) |
| Schema reversibility | On-disk schema unchanged from v1.3.0. `profile.json` files written by v1.3.1 are byte-compatible with v1.3.0. Rollback to v1.2.0 follows the same structural-typing safety as the v1.3.0 plan — extra `shadowing` / `research` keys are silently ignored. No data loss. |
| Estimated recovery time | < 5 minutes for npm tag rollback |

---

## SEV Summary

| Severity | Count | Blocking? |
| :------- | :---: | :-------: |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 6 | No |

**0 SEV-1, 0 SEV-2 — Release is cleared to proceed.**

SEV-3 items carried to next cycle (unchanged from v1.3.0 audit):

1. [tui.tsx] `waitForText` double-exit risk
2. [tui.tsx] `waitForConfirm` `message` param declared but never used
3. [C02] `emptyProfile` initialises `fieldStatus.name = 'set'` without validating
4. [C02] `editScalar` switch default branch is unreachable
5. [prompt] `personalStatementSummary` in enhance prompt has no corresponding field
6. [General] No automated test coverage

# Release Audit — admission-officer v1.2.0

**Verdict: ✅ PASS**
**Release:** rel_2026.05.25.2149
**Package:** admission-officer@1.2.0
**Auditor:** SpecGantry
**Date:** 2026-05-25
**Type:** Patch release — full-screen ink TUI for C02 + C05; shared tui.tsx utility
**Prior release:** v1.1.0 (audit `rel_2026.05.25.1601`)

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C02 Student Profile | Updated | `enquirer` fully removed. All menus and input screens now use the shared `src/utils/tui.tsx` ink-based TUI: full-screen layout, large ASCII art header, `SpaciousSelect` with non-selectable separator support, `waitForSelect` / `waitForText` / `waitForConfirm` promise helpers. Fixes "Back renders as separator" UX defect. Public API unchanged. |
| C05 Essay Advisor | Updated | `enquirer` fully removed. Essay type selection, prompt input, word limit, overwrite confirm, and multi-file select all migrated to shared `tui.tsx` helpers. Full-screen ink TUI applied consistently. Public API unchanged. |
| Shared TUI Utility | New | `src/utils/tui.tsx` — shared full-screen ink component library: `AppScreen` (header/content/footer zones), `SpaciousSelect` (custom ↑↓Enter navigation, separator-aware), `waitForSelect`, `waitForText`, `waitForConfirm`. Used by C02 and C05. |
| TSConfig | Updated | `"jsx": "react-jsx"` added to `compilerOptions` for TSX compilation. |
| ESLint config | Updated | `eslint.config.js` `files` extended to `src/**/*.tsx`; `ecmaFeatures: { jsx: true }` added to `parserOptions`. |
| package.json | Updated | New runtime dependencies: `ink@^7.0.4`, `react@^19.2.6`, `react-dom@^19.2.6`, `@inkjs/ui@^2.0.0`. New devDependency: `@types/react@^19.2.15`. `lint` script updated to cover `.tsx` files. |

**Unchanged components:** C01 CLI Shell, C03 University Profile, C04 Guidance Engine, C06 PDF Exporter.

**Note:** `enquirer` is retained in `package.json` and used only by C03 University Profile per decision D-TECH-AO000010.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/General]** `tsc --noEmit` (via `npm run build`) passes clean. No TypeScript errors across all `.ts` and `.tsx` files.
* [X] **[Syntax/General]** `npm run lint` passes clean. No ESLint errors or warnings across `.ts` and `.tsx` files.
* [X] **[Syntax/General]** `npm run build` succeeds. Compiled output, prompt assets, and CSS all present in `dist/`.
* [X] **[Syntax/tui.tsx]** JSX compilation correct — `"jsx": "react-jsx"` set; React 19 peer dep satisfied.
* [X] **[Syntax/C02]** `index.tsx` exports `buildStudentProfile` and `showStudentProfile` — C01 import path `../components/c02-student-profile/index.js` resolves correctly via NodeNext module resolution.
* [X] **[Syntax/C05]** `index.ts` imports from `../../utils/tui.js` with `.js` extension — correct for NodeNext ESM.

### Architecture

* [X] **[Architecture/tui.tsx]** Single source of truth for TUI rendering — `AppScreen`, `SpaciousSelect`, and prompt helpers defined once, consumed by C02 and C05. No duplication.
* [X] **[Architecture/tui.tsx]** Promise-based prompt pattern (`render()` + `useApp().exit()`) correctly unmounts ink between screens. No stale renderer state.
* [X] **[Architecture/tui.tsx]** `resolved` guard in `waitForSelect` prevents double-resolve if Enter fires during React re-render cycle.
* [X] **[Architecture/SpaciousSelect]** Separator items (`separator: true`) are filtered out of navigable array — cursor arithmetic is always over non-separator items only. Nav indices cannot land on a separator.
* [X] **[Architecture/C02]** All functional logic (ProfileData, completion model, Gemini enhancement, file I/O) is unchanged from v1.1.0. This is a rendering-layer-only change.
* [X] **[Architecture/C05]** All functional logic (`buildEssay`, `showEssay`, Gemini call, disclaimer injection) is unchanged. Rendering-layer-only change.
* [X] **[Architecture/C03]** `enquirer` retained in C03 — explicitly out of scope per D-TECH-AO000010. No cross-component regression risk.

### Security

* [X] **[Security/tui.tsx]** No file I/O, no network calls, no process.env access. Pure terminal rendering.
* [X] **[Security/C02]** No changes to file I/O, Gemini calls, or slug handling from v1.1.0. Security posture unchanged.
* [X] **[Security/C05]** No changes to Gemini call, file I/O, or path construction from v1.1.0. Security posture unchanged.
* [X] **[Security/deps]** `ink@7`, `react@19`, `@inkjs/ui@2` are well-maintained, widely used packages with no known high/critical CVEs at time of audit.

### Maintainability

* [X] **[Maintainability/tui.tsx]** `SelectItem` interface exports `separator?: boolean` — any future component can add non-selectable dividers without modifying shared code.
* [X] **[Maintainability/tui.tsx]** `AppScreen` accepts `footerHint` prop — per-screen footer customization without component coupling.
* [X] **[Maintainability/C02]** C02 index.tsx carries forward 3 known SEV-3 items from v1.1.0 audit (dead `emptyProfile` slug param, unused `choices` in `editScalar`, stale field reference in prompt). None introduced or worsened by this release.
* [ ] **[Maintainability/C05]** `waitForText` in Essay Advisor uses `onSubmit` on `<TextInput>` AND an `useInput` key.return handler — both call `exit()` + `resolve()`. The `resolved` guard in `waitForSelect` is not applied to `waitForText`. If Enter fires both handlers simultaneously (unlikely but possible with fast input), `exit()` would be called twice. No crash (ink is idempotent on double-exit) but minor code smell. SEV-3.
* [ ] **[Maintainability/tui.tsx]** `completionPill` parameter on `waitForSelect` concatenates into `contextLine` before passing to `AppScreen`. The `AppScreen` `contextLine` prop already renders the full string — the pill parameter is just string concatenation. Slightly confusing API; could be collapsed into a single `contextLine` param. No functional impact. SEV-3.

### Test Coverage

* [ ] **[TestCoverage/General]** No automated tests. Consistent with MVP policy across all components. Manual smoke test required post-deploy (see Section C).

### Dependencies

* [X] **[Dependencies/ink]** `ink@7.0.4` — ESM-native, React 19 compatible, stable LTS. Widely adopted for CLI UIs.
* [X] **[Dependencies/@inkjs/ui]** `@inkjs/ui@2.0.0` — official ink component library. `TextInput` used in `waitForText`. `Select` not used (replaced by custom `SpaciousSelect`).
* [X] **[Dependencies/react]** `react@19.2.6` and `react-dom@19.2.6` — required as peer deps of ink@7. No web DOM rendering; react-dom present only to satisfy peer dep resolution.
* [X] **[Dependencies/enquirer]** Retained for C03. No version change.
* [X] **[Dependencies/general]** All other dependencies unchanged from v1.1.0.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verify |
| - | :--- | :----- |
| 1 | `ao --student-profile --build` (new student) | Full-screen ink TUI launches. ASCII art header visible. All menus navigable with ↑↓Enter. Back items selectable (not rendered as separators). Finalize writes `profile.md`. |
| 2 | `ao --student-profile --build` (existing student) | Existing `profile.json` loads. Completion indicators correct. Can edit fields, finalize again. |
| 3 | `ao --student-profile --show` | `profile.md` printed to stdout. No TUI launched. |
| 4 | `ao --essay --build` | Full-screen ink TUI for essay type select, prompt input, word limit. Overwrite confirm shows Yes/No select. Essay outline written to disk. |
| 5 | `ao --essay --show` (multiple essays) | File selection menu appears with ↑↓Enter. Selected essay printed to stdout. |
| 6 | `ao --university-profile --build` | Existing C03 enquirer flow works — no regression from ink migration. |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Any SEV-1/SEV-2 issue discovered post-publish (crash, data loss, broken install) |
| Mechanism | `npm publish` with prior tag: `npm dist-tag add admission-officer@1.1.0 latest` (requires npm publish rights) |
| Database reversibility | N/A — local file-based storage. No migrations. `profile.json` format unchanged. |
| Estimated recovery time | < 5 minutes for npm tag rollback; existing user data unaffected |

---

## SEV Summary

| Severity | Count | Blocking? |
| :------- | :---: | :-------: |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 5 | No |

**0 SEV-1, 0 SEV-2 — Release is cleared to proceed.**

SEV-3 items carried to next cycle:
1. [C02] Dead `slug` parameter on `emptyProfile` (carry-forward from v1.1.0)
2. [C02] Unused `choices` in `editScalar` (carry-forward from v1.1.0)
3. [C02/Prompt] Stale `personalStatementSummary` reference in `c02-profile-enhance.prompt.md` (carry-forward from v1.1.0)
4. [C05] Double `exit()` risk in `waitForText` if Enter fires both handlers simultaneously
5. [tui.tsx] `completionPill` param on `waitForSelect` is string-only concatenation — mildly confusing API

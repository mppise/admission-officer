# Release Audit — admission-officer v1.3.0

**Verdict: ✅ PASS**
**Release:** rel_2026.05.26.0911
**Package:** admission-officer@1.3.0
**Auditor:** SpecGantry
**Date:** 2026-05-26
**Type:** Minor release — Shadowing & Research profile sections (C02-F06, C02-F07); full TUI visual overhaul; contextual guidance copy throughout
**Prior release:** v1.2.0 (audit `rel_2026.05.25.2149`)

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C02 Student Profile | Updated | **C02-F06** Shadowing Experiences section: list-managed entries with organization, field, hoursTotal (skippable), period, description. **C02-F07** Research Experiences section: list-managed entries with projectTitle, institution, mentorName (skippable), period, hoursPerWeek (skippable), description. Both sections integrated into completion model, JSON schema, markdown renderer, and LLM enhancement prompt. |
| C02 Student Profile | Updated | **UX overhaul:** dot-leader two-column field labels replace `padEnd` string padding; completion indicators replaced with emoji glyphs (✅/🔲/⏳/⏭/📋); action labels prefixed with glyphs (＋/✗/←/🚀/🔒); `HINTS` constant holds 9 contextual guidance strings shown on section list and field input screens. |
| Shared TUI Utility | Updated | **Visual redesign:** ASCII art logo replaced with compact single-line wordmark; gradient accent bar (`▓▒░─░▒▓`); active cursor changed from `❯` cyan to `▌` magenta block; separator changed to dotted `╌` rule with padding; hint line rendered with yellow `╌` callout prefix; footer rewritten as pill-key style `[ ↑↓ ]  [ ↵ ]  [ esc ]`; input screen gets `›` prompt label above and `❯` magenta cursor beside field; `dotLeader()` helper exported. `hint` prop added to `AppScreen`, `waitForSelect`, `waitForText`. |
| LLM Enhance Prompt | Updated | `shadowing[].description` and `research[].description` added to reframe list. All new factual sub-fields added to preserve-exactly list. |

**Unchanged components:** C01 CLI Shell, C03 University Profile, C04 Guidance Engine, C05 Essay Advisor (consumes tui.tsx — benefits from visual changes automatically), C06 PDF Exporter.

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/General]** `tsc --noEmit` passes clean. No TypeScript errors across all `.ts` and `.tsx` files.
* [X] **[Syntax/General]** `npm run lint` passes clean. No ESLint errors or warnings.
* [X] **[Syntax/tui.tsx]** `dotLeader` function exported correctly; consumed by C02 via `import { …, dotLeader } from '../../utils/tui.js'`. NodeNext resolution confirmed.
* [X] **[Syntax/C02]** `ShadowingEntry` and `ResearchEntry` interfaces typed correctly. `ProfileData` extended cleanly — no implicit `any`.
* [X] **[Syntax/C02]** `emptyProfile` initialises `shadowing: []`, `research: []`, and both `fieldStatus` keys. No undefined field access possible.
* [X] **[Syntax/prompt]** `c02-profile-enhance.prompt.md` updated — `shadowing[].description` and `research[].description` in reframe list; all new factual subfields in preserve-exactly list. No `{{TOKEN}}` drift.

### Architecture

* [X] **[Architecture/C02-F06/F07]** Both new sections follow the identical list-editor pattern established for Extracurriculars and Awards: `edit*` loop function + `collect*Entry` sub-form function + `fieldStatus` lifecycle (pending → set/skipped). No architectural deviation.
* [X] **[Architecture/C02-F06/F07]** Skippable sub-fields (`hoursTotal`, `mentorName`, `hoursPerWeek`) use a `waitForSelect` skip-or-enter gate before `waitForText` — consistent with how `classRank` and SAT/ACT fields handle optional scalar input.
* [X] **[Architecture/tui.tsx]** `dotLeader` is a pure function with no side effects. Width capped via `Math.max(2, …)` — never produces negative repeat count.
* [X] **[Architecture/tui.tsx]** `hint` prop is optional on `AppScreen`, `waitForSelect`, `waitForText` — all existing call sites unaffected without modification.
* [X] **[Architecture/tui.tsx]** `cols` capped at 100 in both `AppScreen` and `SpaciousSelect` — prevents overly wide separators on large monitors.
* [X] **[Architecture/tui.tsx]** `▓▒░` bar uses `Math.max(0, cols - 10)` — cannot produce negative repeat count on narrow terminals.
* [X] **[Architecture/completion]** `SECTION_FIELDS` includes `'Shadowing Experiences': ['shadowing']` and `'Research Experiences': ['research']`. `allComplete()` and `sectionIndicator()` cover the new keys automatically — no special-casing needed.
* [X] **[Architecture/markdown]** `renderProfileMarkdown` emits new `## Shadowing Experiences` and `## Research Experiences` sections with correct table headers. Empty lists render `*No … added.*` fallback — consistent with existing sections.
* [X] **[Architecture/LLM]** Enhancement contract extended correctly: new `description` fields in reframe list; all new factual sub-fields in preserve-exactly list. Output structure still matches `ProfileData` — `JSON.parse` round-trip is safe.

### Security

* [X] **[Security/tui.tsx]** No new file I/O, network calls, or process.env access introduced. Pure terminal rendering.
* [X] **[Security/C02]** No changes to path construction, file I/O, or slug handling. `shadowing` and `research` arrays stored in the same `profile.json` under the same OS-level protection. No new PII fields.
* [X] **[Security/C02]** `hoursTotal`, `mentorName`, `hoursPerWeek` are all free-text strings — no eval, no shell interpolation, no path traversal surface.
* [X] **[Security/prompt]** No new `{{TOKEN}}` parameters that could introduce injection. `PROFILE_JSON` injection unchanged.

### Maintainability

* [X] **[Maintainability/tui.tsx]** `HINTS` constant is co-located at module scope in C02 — all guidance copy in one place, easy to update without touching logic.
* [X] **[Maintainability/tui.tsx]** `dotLeader` width is a parameter with default — section menus can independently tune column width without touching the helper.
* [ ] **[Maintainability/tui.tsx]** `waitForText` still has double-exit risk: `useInput` key.return handler and `TextInput` `onSubmit` both call `exit()` + `resolve()`. No `resolved` guard. No crash (ink idempotent on double-exit) but minor code smell. **SEV-3 — carried forward from v1.2.0.**
* [ ] **[Maintainability/tui.tsx]** `waitForConfirm` `message` parameter is declared but never used — passed to `waitForSelect` as `contextLine` would be the natural fix. Callers currently pass an empty string or omit it. **SEV-3 — new in this audit.**
* [ ] **[Maintainability/C02]** `emptyProfile` accepts a `name` parameter but also initialises `fieldStatus.name = 'set'` without validation — if called with an empty string the name field shows as set. Edge case only; no user-facing impact in normal flow. **SEV-3 — carried forward from v1.1.0.**
* [ ] **[Maintainability/C02]** `editScalar` switch statement has an unreachable `default` branch (falls through without assigning to data). All possible keys are handled explicitly; the default silently no-ops. Harmless but could mask a future missing case. **SEV-3 — carried forward from v1.2.0.**
* [ ] **[Maintainability/prompt]** `personalStatementSummary` field referenced in `c02-profile-enhance.prompt.md` reframe list but no such field exists in `ProfileData` or the TUI. LLM will silently ignore the absent field — no functional impact, but the prompt is misleading. **SEV-3 — carried forward from v1.1.0.**

### Test Coverage

* [ ] **[TestCoverage/General]** No automated tests. Consistent with MVP policy. Manual smoke test required (see Section C). **SEV-3 — carried forward.**

### Dependencies

* [X] **[Dependencies/general]** No new dependencies introduced in this release. All changes are within existing packages (`ink`, `react`, `@inkjs/ui`, `@google/generative-ai`).
* [X] **[Dependencies/emoji]** Emoji characters (✅ 🔲 ⏳ ⏭ 📋 🚀 🔒 ＋) rendered via ink `<Text>` — terminal emoji support varies. On terminals without emoji support, characters degrade gracefully to Unicode fallbacks; no crash or data loss risk.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Verify |
| - | :--- | :----- |
| 1 | `ao --student-profile --build` (new student) | Wordmark header renders. Gradient bar visible. Main menu shows 7 sections with dot-leader alignment and emoji indicators. All sections navigable. |
| 2 | Shadowing section | `＋ Add shadowing experience` → fills organization, field, period, description. `hoursTotal` skip works. Entry appears in list with `org — field` summary. Finalize writes shadowing table to `profile.md`. |
| 3 | Research section | `＋ Add research experience` → fills projectTitle, institution, period, description. `mentorName` and `hoursPerWeek` skip works. Entry appears in list. Finalize writes research table to `profile.md`. |
| 4 | Guidance hints visible | Entering Extracurriculars, Awards, Shadowing, Research shows yellow `╌` hint line. Entering Activity Name and Description fields shows field-level hint. |
| 5 | `ao --student-profile --build` (existing student) | Existing `profile.json` without `shadowing`/`research` keys loads without crash. Both sections show `🔲 not started`. Profile can be finalized after completing or skipping them. |
| 6 | `ao --essay --build` | C05 Essay Advisor inherits tui.tsx visual changes — wordmark header and pill footer render correctly. |

### Rollback Plan

| Item | Detail |
| :--- | :----- |
| Trigger | Any SEV-1/SEV-2 issue discovered post-publish (crash, data loss, broken install) |
| Mechanism | `npm dist-tag add admission-officer@1.2.0 latest` |
| Schema reversibility | `profile.json` files created under v1.3.0 will have `shadowing` and `research` keys — v1.2.0 `ProfileData` type does not include them. They will be silently ignored on load (TypeScript structural typing). No data loss. |
| Estimated recovery time | < 5 minutes for npm tag rollback |

---

## SEV Summary

| Severity | Count | Blocking? |
| :------- | :---: | :-------: |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 6 | No |

**0 SEV-1, 0 SEV-2 — Release is cleared to proceed.**

SEV-3 items carried to next cycle:

1. [tui.tsx] `waitForText` double-exit risk — `useInput` + `onSubmit` both fire on Enter (carry-forward v1.2.0)
2. [tui.tsx] `waitForConfirm` `message` param declared but never used (new)
3. [C02] `emptyProfile` initialises `fieldStatus.name = 'set'` without validating the name is non-empty (carry-forward v1.1.0)
4. [C02] `editScalar` switch default branch is unreachable — future missing key would silently no-op (carry-forward v1.2.0)
5. [prompt] `personalStatementSummary` in enhance prompt has no corresponding `ProfileData` field (carry-forward v1.1.0)
6. [General] No automated test coverage (carry-forward MVP policy)

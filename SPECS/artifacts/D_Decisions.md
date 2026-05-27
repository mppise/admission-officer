---
name: decisions
description: Living register of all decisions made during specification. Review and mark each as approved [X], rejected [-], deferred [>], or pending [ ].
license: Apache-2.0 (see LICENSE in project root)
---

# Decisions

> A decision left unreviewed blocks dependent work or, worse, lets it proceed on a rejected choice.
> This register must be reviewed and all blocking decisions resolved before dependent implementation begins.
>
> **Status codes:** `[ ]` Pending · `[X]` Approved · `[-]` Rejected · `[>]` Deferred
>
> **Decision types:** `ARCH` Architecture · `TECH` Technology / Library · `PRODUCT` Product / UX · `DATA` Data & Storage · `SEC` Security · `OPS` Operations · `COMPLIANCE` Compliance & Legal

---

## Summary

| Total | Pending `[ ]` | Approved `[X]` | Rejected `[-]` | Deferred `[>]` |
| :---: | :-----------: | :------------: | :------------: | :------------: |
| 18 | 0 | 18 | 0 | 0 |

---

## Architecture

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-ARCH-AO000001 | Six-component architecture: C01 CLI Shell, C02 Student Profile, C03 University Profile, C04 Guidance Engine, C05 Essay Advisor, C06 PDF Exporter | Clean separation of concerns; each command maps to one component | Monolithic single-file approach (unmaintainable), microservices (overkill for CLI) | All component specs must align to this decomposition | DevAgent | Confirmed during Planning |
| `[X]` | D-ARCH-AO000002 | Prerequisite enforcement via menu flow structure — Guidance/Essay only reachable after university selected | Single structural enforcement point; no runtime flag checks needed | Each component checking independently (redundant), flag-based guards (superseded by CHG-002) | C04, C05 can omit prerequisite logic | DevAgent | Updated CHG-002 — originally flag-based; now menu-structural |
| `[X]` | D-ARCH-AO000003 | Local-only file-backed persistence using markdown under `university-ao/` (process.cwd()-relative) | Student data is sensitive; no cloud requirement; markdown is human-readable | SQLite (overkill), cloud storage (out of scope), package-relative path (breaks global install) | No sync, no multi-device, no backup for MVP; workspace self-contained per working directory | DevAgent | Updated CHG-002 — path changed from `data/` to `university-ao/` |
| `[X]` | D-ARCH-AO000004 | Google Gemini API for all AI generation (C03 extraction, C04 guidance, C05 essay) | Selected by DevAgent; natural language reasoning over structured profile data | OpenAI (not selected), rule/template engine (insufficient quality) | Requires internet + valid API key for C03, C04, C05 | DevAgent | Confirmed during Ideation |
| `[X]` | D-ARCH-AO000005 | Menu-driven UX only — no command-line flags; `commander` removed entirely | Flag-based CLI was complex and hard to follow; menu provides guided, discoverable UX | Keeping flags alongside menu (unnecessary complexity) | `commander` and `enquirer` removed from dependency list; bare `async main()` entry in C01 | DevAgent | New — CHG-002 |
| `[X]` | D-ARCH-AO000006 | `process.cwd()`-relative workspace — `university-ao/` and `university-ao/.env` resolved from working directory | `ao` is globally installed; data/config must live where user runs it, not in package dir | Fixed home-directory path (poor multi-project support), package-relative (breaks global install) | Each working directory gets its own self-contained workspace | DevAgent | New — CHG-002 |
| `[X]` | D-ARCH-AO000007 | Startup bootstrap in `src/config/` — ensures `university-ao/` exists and loads `.env` before C01 renders menu | Single, predictable startup sequence; separates infrastructure concern from menu logic | Inline bootstrap in C01 (mixes concerns) | All components can assume workspace and config are ready | DevAgent | New — CHG-002 |
| `[X]` | D-ARCH-AO000008 | C01 moved to `src/components/c01-cli-shell/`; `src/cli/` directory removed | Standardizes all components under `src/components/`; no special-cased directory | Keeping `src/cli/` (inconsistent, singles out C01) | `package.json` bin entry updated to `dist/components/c01-cli-shell/index.js` | DevAgent | New — CHG-002 |

## Technology & Libraries

> 📦 Approved entries here constitute the permitted library list for development.
> No library may be used in code unless it appears in this section with status `[X]`.

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-TECH-AO000001 | TypeScript 5.x with ESM (`"module": "NodeNext"`) | Type safety; ESM is TypeScript's natural output target; NodeNext resolution is correct for Node 20 | Plain JavaScript (no type safety), CommonJS (legacy, worse ESM interop) | All imports use `.js` extensions; `tsconfig.json` required | DevAgent | Confirmed during Planning |
| `[X]` | D-TECH-AO000002 | `commander` removed — no CLI flags; bare `async main()` entry point | No flags = no parser needed; simplifies entry point to a single ink render call | Keeping commander for `--version`/`--help` (unnecessary; menu handles these) | C01 entry is a plain TypeScript async function | DevAgent | Updated CHG-002 — previously approved, now removed |
| `[X]` | D-TECH-AO000003 | `enquirer` removed — `ink` + `@inkjs/ui` + `tui.tsx` are the sole interactive prompt mechanism across all components | Standardizes all interactive prompts; eliminates dual-library inconsistency | Keeping enquirer in C03 (inconsistent UX), mixing libraries per component | All components use `tui.tsx` helpers; no per-component prompt library | DevAgent | Updated CHG-002 — enquirer fully removed |
| `[X]` | D-TECH-AO000004 | `playwright` (headless Chromium) for university website scraping | University websites are predominantly JS-rendered SPAs; static parsers miss dynamic content | `cheerio` (fails on JS-rendered content), `scrapy` (Python) | ~100MB browser binary; slower cold start for university profile build | DevAgent | Confirmed during Planning |
| `[X]` | D-TECH-AO000005 | `@google/generative-ai` as Gemini SDK | Official SDK; handles auth, retries, and response parsing | Raw `fetch` (no type safety, manual auth) | All Gemini calls go through this SDK | DevAgent | Confirmed during Planning |
| `[X]` | D-TECH-AO000006 | `puppeteer` for PDF export | HTML→PDF rendering; no external service; well-maintained | `markdown-pdf` (unmaintained), `weasyprint` (Python dependency) | Used exclusively in C06; markdown→HTML→PDF pipeline via `marked` + `puppeteer` | DevAgent | Confirmed during Planning |
| `[X]` | D-TECH-AO000008 | `ink` (v5.x) for full-screen TUI rendering — now system-wide via `tui.tsx` | ESM-native; actively maintained; React component model maps cleanly to menu hierarchy; pairs with `@inkjs/ui` | `blessed` (CJS, abandoned), raw ANSI escapes (insufficient richness) | All components use ink via shared `tui.tsx`; adds `ink`, `react`, `react-dom`, `@inkjs/ui`, `@types/react` to dependencies | DevAgent | Updated CHG-002 — scope expanded from C02-only to all components |
| `[X]` | D-TECH-AO000009 | `@inkjs/ui` for ink-native Select and TextInput components — system-wide | Official ink component library; accessible Select and TextInput matching prior `enquirer` UX contract | Custom ink components (unnecessary effort) | All components use via `tui.tsx`; replaces `enquirer` everywhere | DevAgent | Updated CHG-002 — scope expanded from C02-only to all components |
| `[X]` | D-TECH-AO000010 | `enquirer` fully removed (previously retained for C03) | CHG-002 standardizes all interactive prompts to ink/tui.tsx; no component retains enquirer | Keeping enquirer in C03 (inconsistent) | C03 must migrate any remaining enquirer prompts to tui.tsx | DevAgent | Updated CHG-002 — supersedes prior decision to retain enquirer in C03 |

## Product & UX

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |
| `[X]` | D-PRODUCT-AO000001 | Use `ink` (React-based TUI) for C02 Student Profile full-screen menu UX | ESM-native, actively maintained, de facto standard for rich Node.js CLI UIs; delivers full-screen layout with large headers and visual breathing room | `blessed` (CJS-only, unmaintained since 2019), ANSI escapes only (insufficient visual richness) | `enquirer` replaced by `@inkjs/ui` in C02 only; all other components unaffected; adds `ink`, `react`, `@inkjs/ui` to production dependencies | DevAgent | Approved 2026-05-25 — Detailed Design phase, C02 UX defect fix |
| `[X]` | D-PRODUCT-AO000002 | Drop `dimColor` from hint, footer, and inactive menu rows in shared `tui.tsx`; render the active menu row as bold white-on-black inverted highlight | Dim variant was too low-contrast and hurt readability; inverted highlight gives an unambiguous "selected" affordance without relying on color alone | Keeping dimColor (rejected — readability), magenta or cyan highlight bg (rejected — too loud, DevAgent prefers neutral) | Visual change affects both C02 (C02-F01..F07) and C05 (C05-F01..F05) since they share `tui.tsx`; no code structure change | DevAgent | Approved 2026-05-26 — Detailed Design phase, C02 bug fix |
| `[X]` | D-PRODUCT-AO000003 | On resume, merge parsed `profile.json` over a fresh `emptyProfile()` shape (generic defaulting) rather than only patching `shadowing`/`research` | Schema growth is ongoing (F06/F07 just added; more likely); generic merge auto-heals any future-added field without per-release migration code | Per-field migration (rejected — fragile, needs new code per schema change), strict schema rejection (rejected — would break existing user profiles) | C02 only; load path in `buildStudentProfile` gains a one-line merge; no on-disk schema change | DevAgent | Approved 2026-05-26 — Detailed Design phase, C02 bug fix |

## Data & Storage

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

## Security

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

## Operations & Deployment

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

## Compliance & Legal

| Status | ID | Decision | Rationale | Alternatives Rejected | Impact | Owner | Notes |
| :----: | :- | :------- | :-------- | :-------------------- | :----- | :---- | :---- |

---

## Rejected Decisions Log

| ID | Decision | Rejected by | Date | Reason | Superseded by |
| :- | :------- | :---------- | :--: | :----- | :------------ |

---

## Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial decisions logged during Planning | 2026-05-24 | SpecGantry |
| CHG-002 | D-PRODUCT-AO000001, D-TECH-AO000008–010 added for C02 UX defect fix (ink-based full-screen menus) | 2026-05-25 | SpecGantry |
| CHG-003 | D-PRODUCT-AO000002, D-PRODUCT-AO000003 added for C02 bug fix (resume crash on F06/F07; tui.tsx visual contrast) | 2026-05-26 | SpecGantry |
| CHG-004 | CHG-002 menu-driven overhaul: D-ARCH-AO000002–008 added/updated; D-TECH-AO000002/003/008–010 updated; `commander` and `enquirer` removed; ink/tui.tsx promoted to system-wide; `university-ao/` workspace; dated dirs; Config screen | 2026-05-27 | SpecGantry |

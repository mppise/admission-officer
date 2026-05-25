# Release Audit — admission-officer v1.0.1

**Verdict: ✅ PASS**
**Release:** 2026.05.25.1130
**Package:** admission-officer@1.0.1
**Auditor:** SpecGantry
**Date:** 2026-05-25
**Type:** Patch release (manifest-only fix)
**Prior release:** v1.0.0 (audit `rel_2026.05.25.1123`)

---

## Reason for v1.0.1

`v1.0.0` was published to npm but shipped a broken dependency manifest: `puppeteer` was imported by `src/components/c06-pdf-exporter/index.ts` but missing from `package.json` dependencies. Users running `npm install -g admission-officer@1.0.0` hit a `postinstall` build failure (TS2307 on `puppeteer` import resolution path), making the package effectively non-functional for PDF export.

`v1.0.1` corrects the manifest only — **no `./src/` or `./SPECS/` changes**.

**Changes since v1.0.0:**
- `package.json` — added `puppeteer@^23.11.1` to `dependencies`.
- `package.json` — `postinstall` updated to chain `playwright install chromium && puppeteer browsers install chrome`.
- `package.json` / `package-lock.json` — version bump 1.0.0 → 1.0.1.

---

## A. Scope & Changes

| Component | Status | Summary |
| :-------- | :----: | :------ |
| C01 CLI Shell | Unchanged | No code or spec change since v1.0.0 |
| C02 Student Profile | Unchanged | No code or spec change since v1.0.0 |
| C03 University Profile | Unchanged | No code or spec change since v1.0.0 |
| C04 Guidance Engine | Unchanged | No code or spec change since v1.0.0 |
| C05 Essay Advisor | Unchanged | No code or spec change since v1.0.0 |
| C06 PDF Exporter | Manifest fix | `puppeteer` now properly declared; runtime behaviour identical |

---

## B. Technical Audit

### Syntax

* [X] **[Syntax/All]** `npm run typecheck` clean.
* [X] **[Syntax/Build]** `npm run build` produces all expected artifacts (`dist/cli/index.js`, prompts, CSS) with exec bit set.
* [X] **[Syntax/C06]** `puppeteer` import resolves at compile time against the now-declared dependency.

### Architecture

* [X] **[Architecture/All]** No structural change vs. v1.0.0. Architecture audit findings from `rel_2026.05.25.1123` carry forward unchanged.
* [X] **[Architecture/C06]** Dual Chromium model (Playwright in C03, Puppeteer in C06) confirmed intentional per Decision D-TECH-AO000006. Both install hooks chained in `postinstall`.

### Security

* [X] **[Security/Secrets]** No new secret-handling surface introduced.
* [X] **[Security/npm]** `npm audit` → **0 vulnerabilities** (113 packages).
* [X] **[Security/Manifest]** `files` field unchanged — published tarball remains scoped to `dist/` and `README.md`.

### Maintainability

* [ ] **[Maintainability/Architecture]** `B_Architecture.md §6.4` directory structure out of date with implemented student-centric layout. **SEV-3** — carried forward from v1.0.0, non-blocking.
* [ ] **[Maintainability/C03]** `src/components/c03-university-profile/index.ts` is 687 lines vs. the 300-line guideline in `B_Architecture.md §14.1`. **SEV-3** — carried forward, refactor recommended for v1.1.

### Test Coverage

* [ ] **[Testing/All]** No automated tests. Accepted per `B_Architecture.md §14.6`. **SEV-3** — carried forward, non-blocking.

### Dependencies

* [X] **[Dependencies/Audit]** 0 vulnerabilities across 113 packages.
* [X] **[Dependencies/Manifest]** `puppeteer@^23.11.1` declared and resolvable; `playwright@^1.44.0` retained for C03.
* [X] **[Dependencies/Postinstall]** Chained install of both Chromium binaries.
* [X] **[Dependencies/Build Repro]** `npm run build` succeeds end-to-end on v1.0.1 manifest.
* [X] **[Dependencies/Versioning]** Patch bump (1.0.0 → 1.0.1) is semver-correct: no API change, fixes broken install.

---

## C. Risk & Recovery

### Smoke Test Plan

| # | Flow | Command | Expected outcome |
| :- | :--- | :------ | :--------------- |
| 1 | Install globally | `npm install -g admission-officer@1.0.1` | Postinstall completes both Chromium downloads; no TS errors |
| 2 | Help workflow | `ao --help` | Workflow guidance shown |
| 3 | Student profile | `ao --student-profile --build` | Wizard runs; `data/<name>/profile.md` written |
| 4 | University profile | `ao --university-profile --build --domain brown.edu --student <name>` | BFS crawl + extraction; profile.md created |
| 5 | PDF export | `ao --guidance --show --student <name> --university brown --print` | `guidance.pdf` produced via Puppeteer (validates the fix) |

### Rollback Plan

| Concern | Detail |
| :------ | :----- |
| Trigger | User-reported install failure or PDF export regression |
| Mechanism | `npm deprecate admission-officer@1.0.1 "..."`, then publish patched `1.0.2` |
| Data reversibility | N/A — all data is local to the user's machine; no server state |
| Estimated recovery time | < 30 minutes to patch, rebuild, and publish |

---

## SEV Summary

| Severity | Count | Blocks release? |
| :------- | :---: | :-------------- |
| SEV-1 | 0 | — |
| SEV-2 | 0 | — |
| SEV-3 | 3 (all carried forward from v1.0.0) | No |

**Overall verdict: ✅ PASS — manifest fix verified; build reproducible; no new blocking issues. Safe to publish v1.0.1.**

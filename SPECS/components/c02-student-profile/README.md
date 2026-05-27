# C02 Student Profile — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why (includes full wizard question sequence)
3. `B_Interfaces.md` — function signatures, markdown file schema, consuming components
4. `C_Operational_Specs.md` — UX flows, field validation, data schema, error handling

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C02 uses **`ink` + `@inkjs/ui`** for all interactive menus — `enquirer` is NOT used in C02.
- C02 is **fully offline** (except the Gemini enhancement at Finalize & Save).
- The **directory slug** is always computed and passed in by C01. C02 never sanitises names itself.
- All file paths use **`C07.workspacePath()`** — never `dataPath()` or hardcoded `data/` paths.
- The **update flow** (C02-F02) must merge — never overwrite untouched sections.
- `intendedMajors` is the **critical prerequisite field** — must always be written.
- The markdown schema in `B_Interfaces.md` is the **authoritative output format** — C04 and C05 read this file directly.
- **Delete** (C02-F08) is called by C01 after confirmation — C02 just removes the directory, no prompting.

## Spec Version
Last updated: 2026-05-27 | Status: Ready (CHG-002)

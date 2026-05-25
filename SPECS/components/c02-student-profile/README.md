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
- C02 is **fully offline** — no Gemini, no Playwright, no network calls whatsoever.
- The **directory slug** is always computed by C01 and passed in. C02 never sanitises names itself.
- The **update flow** (C02-F02) must merge — never overwrite untouched sections.
- `intendedMajor` is the **critical prerequisite field** — it must always be written even if the student updates only one section.
- The markdown schema in `B_Interfaces.md` is the **authoritative output format** — C04 and C05 read this file directly.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

# C03 University Profile — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why (includes scraping strategy and page selection logic)
3. `B_Interfaces.md` — function signatures, Gemini response schema, markdown file schema
4. `C_Operational_Specs.md` — error handling, UX flows, Playwright headers, AI behavior, scalability

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C03 is the **only component that makes two external calls**: Playwright (scraping) + Gemini (extraction).
- **Domain is collected by C01** before calling C03 — C03 receives a clean domain string.
- **Prerequisite check is C01's responsibility** — C03 may assume student profile with intendedMajor exists.
- All file paths use **`C07.workspacePath()`** — university data is nested under the student's directory.
- **Partial scrape is acceptable** (≥ 3/6 categories) — do not abort on individual page failures.
- **Failed URLs must always be written** when any page fails.
- **Gemini response must be pure JSON** — prompt must explicitly forbid markdown fences.
- The **Gemini prompt file** lives at `src/ai/prompts/c03-university-extract.md`.
- Temperature is set to `0.2` — extraction task, not generative.
- **`enquirer` is NOT used in C03** — any interactive prompts use `tui.tsx` helpers.
- **Delete** (C03-F06) is called by C01 after confirmation — C03 just removes the directory.

## Spec Version
Last updated: 2026-05-27 | Status: Ready (CHG-002)

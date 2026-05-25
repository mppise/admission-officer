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
- **Prerequisite check is C01's responsibility** — C03 may assume student profile with intendedMajor exists.
- **Partial scrape is acceptable** (≥ 3/6 categories) — do not abort on individual page failures.
- **Failed URLs must always be written** when any page fails, even if overall scrape succeeds.
- **Gemini response must be pure JSON** — the prompt must explicitly forbid markdown fences.
- The **Gemini prompt file** lives at `src/ai/prompts/c03-university-extract.md` — do not hardcode prompts in source.
- Temperature is set to `0.2` — this is an extraction task, not a generative one.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

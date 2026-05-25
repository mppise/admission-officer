# C04 Guidance Engine — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why (includes full guidance report structure)
3. `B_Interfaces.md` — function signatures, Gemini prompt contract, markdown file path
4. `C_Operational_Specs.md` — error handling, AI behavior block, UX flows

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C04 makes **exactly one Gemini call** per `--build` invocation — no iterative or chained calls.
- The Gemini response is stored **as-is** — no parsing, no transformation. Validate only that it is non-empty.
- Temperature is `0.7` — higher than C03 because this is generative prose, not structured extraction.
- The prompt's **CRITICAL RULES block** is what prevents generic advice — do not weaken or remove it.
- Both profile files are read as **full raw markdown** and injected directly into the prompt.
- The output directory `data/students/<slug>/<uniSlug>/` must be created if it does not exist before writing.
- Student profile content is sent to Google's Gemini API — this is called out in the compliance section.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

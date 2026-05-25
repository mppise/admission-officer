# C05 Essay Advisor — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why (includes full essay outline structure, prompt collection, show behaviour)
3. `B_Interfaces.md` — function signatures, Gemini prompt contract, slug table
4. `C_Operational_Specs.md` — error handling, UX flows, disclaimer placement, AI behavior

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C05 collects the essay prompt **interactively via Enquirer** — not from a CLI flag. C01 dispatches with only studentName + universityName.
- Temperature is `0.8` — highest in the system; this is a creative writing task.
- Sample count is **dynamic**: 2 for prompts < 500 words, 3 for ≥ 500 — enforced by the Gemini prompt instruction.
- The **⚠️ disclaimer** must appear in BOTH the saved markdown AND the CLI stdout after save — two separate placements.
- The filename slug combines `essayTypeSlug` + first 6 chars of a **djb2 hash** of the prompt text.
- `--essay --show` with **multiple files** uses an Enquirer `select` to let the student choose — do not just open the first file.
- Output directory `data/students/<slug>/<uniSlug>/essays/` must be created if it does not exist before writing.
- Student profile + essay prompt content is sent to Google's Gemini API — same posture as C04.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

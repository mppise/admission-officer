# C01 CLI Shell — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why
3. `B_Interfaces.md` — exact contracts to implement
4. `C_Operational_Specs.md` — operational requirements

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C01 is the **only** entry point. All commands flow through `src/cli/index.ts`.
- C01 **never writes** data files. It reads only `data/students/<name>/profile.md` for prerequisite checks.
- All component handlers must return `{ markdownPath: string }` or `{ profilePath: string }` — C01 uses these for `--print` composition and success messages.
- Name sanitisation is C01's responsibility — components receive clean, lowercased, hyphenated names.
- `.env` validation happens once at startup in `src/config/env.ts` before any dispatch.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

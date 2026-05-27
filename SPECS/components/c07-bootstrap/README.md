# C07 Bootstrap — Spec Reading Guide

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
- C07 is called **once** at process start via `await bootstrap()` before C01 renders anything.
- `workspacePath()` is the single source of truth for all file paths in the system — every component must use it instead of `dataPath()` or any hardcoded path.
- `saveConfig()` is the **only** function that writes to `university-ao/.env` — no other component may write to this file.
- C07 never throws during `bootstrap()` — failures are warnings, not fatal errors.
- Source file: `src/config/bootstrap.ts`

## Spec Version
Last updated: 2026-05-27 | Status: Ready

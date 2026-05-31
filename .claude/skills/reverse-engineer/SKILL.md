---
name: reverse-engineer
description: Reverse engineers an existing codebase into SpecGantry artifacts and component specifications, bringing a pre-built system into the structured lifecycle framework.
user-invocable: true
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Reverse Engineer Skill

**Phase:** Pre-Ideation (outside normal lifecycle)

**Entry:** Existing codebase needs to be brought into SpecGantry framework

**Exit:** `./SPECS/artifacts/` fully populated with Project.md, Architecture/, component specs, and Decisions.md

**Deliverables:**
- `./SPECS/artifacts/Project.md` (discovered project definition)
- `./SPECS/artifacts/Architecture/` (system architecture documentation)
- `./SPECS/components/<component>/` (per-component specs)
- `./SPECS/artifacts/Decisions.md` (architectural decisions, inferred)
- `./STATUS.md` updated to reverse engineering: Complete

---

## Startup Checklist

1. Scan codebase — identify language(s), frameworks, project layout, existing documentation
2. Check for existing `./SPECS/` artifacts. Enhance and update rather than overwrite accurate content.
3. Note: Reverse engineering runs on auto-pilot — no user input expected during discovery

---

## Stage 1: Discover & Document

Deep-dive into codebase and available documentation. Populate incrementally:

- `./SPECS/artifacts/Project.md` — what is this system, what problem does it solve?
- `./SPECS/artifacts/Architecture/` — technology stack, components, data flows, deployment model
- `./SPECS/artifacts/Decisions.md` — anything inferred, implicitly decided, or flagged as risk

**Process:**
1. Analyze source code structure, entry points, data flow
2. Identify problem domain and system capabilities
3. Write Project.md incrementally (problem statement, goals, scope, key features)
4. Map architecture across all layers (data, compute, integration, deployment)
5. Write Architecture/ incrementally, documenting key decisions as discovered
6. Record inferred decisions and risks in Decisions.md
7. Validate each artifact section against source code. Flag undocumented behaviors immediately.

This stage aligns with Ideation + Design phases.

---

## Stage 2: Component Specs & Validation

Translate discovered information into component specifications (per CLAUDE.md "Connective Layer"). For each functional component:

1. Create `./SPECS/components/<component-name>/` directory
2. Create two specs (structure per CLAUDE.md standards):
   - `A_Core_Spec.md` — features table with Status (per CLAUDE.md Feature Status Values) and discovered behavior
   - `B_Specification.md` — request/response contracts as implemented, operational requirements as discovered (error handling, observability, data, security, testing thresholds)
3. After each spec, validate (per CLAUDE.md standards):
   - Consistency — component interfaces match Architecture/?
   - Completeness — all source code behaviors documented? (use CLAUDE.md Definition of Done as checklist)
   - Risk — technical debts, security gaps, fragile dependencies?
   - Simplicity — documented behavior more complex than needed?
   - Traceability — infer requirements from code and document as REQ-NNNN if not already in Project.md (per CLAUDE.md Requirement Traceability)
4. Surface findings as notes in Decisions.md

Lean toward fewer, larger components rather than many small ones.

This stage aligns with Design phase.

---

## Stage 3: Gate Confirm

1. Present artifacts produced (Project.md, Architecture/, components, decisions)
2. Surface recommendations from inline validation (optional improvements, not obligations)
3. Confirm mutual agreement with DevLead that reverse engineering complete and ready for next phase
4. Update `./STATUS.md` to reverse engineering: Complete
5. Confirm: "Reverse engineering complete, ready for Ideation" and await DevLead confirmation

---

## Key Points

- **Work autonomously:** Make no assumptions about what DevLead knows. Discover, document, recommend — don't implement.
- **Identify components correctly:** A component either (a) can be developed/deployed independently, or (b) provides named, reusable service to other parts. Classes, utilities, helpers are NOT components — they belong inside a component's spec.
- **Validate inline:** Immediately validate each artifact section against source code + prior sections. Catch issues early.
- **Surface improvements, not obligations:** Recommendations are advisory — DevLead decides which to act on and when.

---

## Scope

**Files in scope (created/modified):**
- `./SPECS/artifacts/Project.md`
- `./SPECS/artifacts/Architecture/` (all files)
- `./SPECS/artifacts/Decisions.md`
- `./SPECS/components/` (all component specs)

**Files read-only:**
- All source code (no code created/modified)

**Standards:** CONTRACT.md §4.5.1 (artifact IDs), CLAUDE.md (global standards)

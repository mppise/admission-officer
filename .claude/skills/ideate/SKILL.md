---
name: ideate
description: Drives the ideation phase from raw idea to a complete, feasibility-validated Project.md — gating entry into the Design phase.
user-invocable: true
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Ideate Skill

**Phase:** Ideation

**Entry:** Raw project idea or feature request

**Exit:** Project.md finalized + mutually agreed upon

**Deliverables:**
- `./SPECS/artifacts/Project.md` (complete project specification)
- `./STATUS.md` updated to Ideation: Complete

---

## Startup Checklist (Phase Gating)

1. Read `./STATUS.md` — check current phase
   - If Ideation = ⬜ Not started: Create Project.md from scratch, start Ideation
   - If Ideation = 🔄 In progress: Resume Ideation, continue completing Project.md
   - If Ideation = ✅ Complete: Ideation already done. User should run `/design` next
   - If Design or Development active: Clarify with user: continue current project in its phase, or start new project?
2. Read `./SPECS/artifacts/Project.md` (if exists) — note gaps and vague sections
3. **GATING RULE:** Only proceed if either:
   - Project.md does not exist (new project), OR
   - STATUS.md shows Ideation = ⬜ or 🔄 (Ideation in progress/not started)
   - **BLOCK otherwise:** "Ideation complete. To design, run `/design`. To start a new project, create new directory + run `/ideate`."

---

## Stage 1: Assess & Complete

Project.md must contain these sections:

| Section | Captures |
|---|---|
| Project Name & Summary | One-sentence what is being built |
| Problem Statement | Pain point or opportunity |
| Target Users | Roles, personas, technical level |
| Goals & Success Criteria | What "done" looks like; measurable outcomes |
| Scope | Explicitly in-scope and out-of-scope |
| Key Features | High-level capabilities required |
| Constraints & Assumptions | Technical, organizational, resource constraints |
| Open Questions | Anything unresolved before architecture |

**Process:**
1. If Project.md missing/empty, create with sections above
2. Identify gaps + vague sections. Prioritize.
3. Ask targeted questions one at a time
4. Wait for DevLead's answer before moving on. Do not invent.
5. If answer vague, follow up until specific enough to document
6. Update Project.md continuously as answers confirmed. Include REQ-NNNN IDs for each requirement (per CLAUDE.md Requirement Traceability).
7. Validate each section for clarity + consistency with prior sections. Surface inconsistencies immediately.

---

## Stage 2: Stress-Test & Gate Confirm

Independently validate across four dimensions:
- **Requirement Completeness** — all functional and non-functional needs captured?
- **Feasibility** — buildable within stated constraints?
- **Clarity** — would a new team member understand what is being built?
- **Consistency** — do all sections agree?

Surface each finding as targeted question to DevLead until resolved.

Once all findings resolved:
1. Confirm mutual agreement with DevLead that Project.md complete and ready for Design
2. Update `./STATUS.md` to Ideation: Complete
3. Confirm: "Ideation ready to gate" and await DevLead final confirmation

---

## Key Points

- **Never invent:** If answer vague, ask follow-up questions until specific enough to document. Work conversationally, one question at a time.
- **Mutual understanding required:** At gate, both you and DevLead must agree project is ready. Not a rubber-stamp gate — if gaps exist, gate blocks until resolved.
- **Validate inline:** As you complete each section, check for clarity + consistency. Don't wait for final pass.

---

## Scope

**Files in scope (created/modified):**
- `./SPECS/artifacts/Project.md`

**Files read-only:**
- `./STATUS.md` (updated at end)

**Standards:** CONTRACT.md §4.5.1 (artifact IDs), CLAUDE.md (global standards)

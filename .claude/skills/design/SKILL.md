---
name: design
description: Unified Design phase (Planning + Detailed Design merged, no intermediate gate). Drives architecture, component specs, and decision management with continuous conversational flow.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Design Skill

## SKILL STARTUP: Auto-Compact Check

```bash
if bash .claude/hooks/compact-check.sh; then
  echo "⏳ Context compaction required. Running /compact..."
  # Invoke /compact, then resume below after SESSION HANDSHAKE re-runs
fi
```

---

**Phase:** Design (Planning + Detailed Design merged)

**Entry:** Project.md finalized OR bug fix (skip Ideation)

**Exit:** Architecture/ finalized + all component specs Ready + Decisions.md Actionable empty + Parking Lot items have mitigations/owners/dates

**Deliverables:**
- `./SPECS/artifacts/Architecture/` (system architecture)
- `./SPECS/components/<component>/` (per-component specs)
- `./SPECS/artifacts/Decisions.md` (conversational decisions)
- `./STATUS.md` — Component Status Tracker updated to Ready

---

## Startup Checklist (Phase Gating)

1. Read `./STATUS.md` — check current phase
   - If Ideation = ✅ Complete: Proceed to Design
   - If Ideation = ⬜ or 🔄: **BLOCK.** "Ideation not complete. Resume `/ideate` first."
   - If Design = 🔄 In progress: Resume Design, continue with incomplete specs
   - If Design = ✅ Complete: Design done. User should run `/develop` next
   - If Development = 🔄 or ✅: **BLOCK.** "Development already started. To iterate in Design, you must re-spec in `/design` (will update specs, re-gate). Run `/design` with confirmation?"
2. Check `./SPECS/artifacts/Project.md` — must exist and be finalized
   - If missing: **BLOCK.** "Project.md not found. Run `/ideate` first to create it."
   - If empty/incomplete: **BLOCK.** "Project.md incomplete. Run `/ideate` to finish."
3. If Decisions.md exists: review Actionable + Parking Lot tables, escalate blockers
4. Confirm with DevLead: which components are in-scope

---

## Stage 1: Architecture

Interview DevLead across all layers (data, compute, UI, services, integration, AI/LLM). For each decision:

1. Present options + trade-offs
2. Get DevLead approval
3. Record in Decisions.md Actionable, move to Actioned after approval
4. Document in `./SPECS/artifacts/Architecture/` incrementally
5. Validate consistency with Project.md + prior layers; surface conflicts immediately

Continue until DevLead agrees Architecture/ is complete.

---

## Stage 2: Component Specifications

For each in-scope component from Project.md:

1. Create `./SPECS/components/<component>/` directory
2. Create two specs (structure per CLAUDE.md "Artifact Standards"):
   - `A_Core_Spec.md` — features table with [Feature ID | Description | Status | Req Ref] (see CLAUDE.md Feature Status Values + Requirement Traceability), behavior, scope
   - `B_Specification.md` — request/response contracts (error codes, events), error handling, UX, data, security, compliance, observability, testing (per CLAUDE.md Testing Requirements), notifications, scalability
3. **Traceability** (CLAUDE.md standard): Every feature in A_Core_Spec.md must have:
   - Feature ID (e.g., `C01-F01`)
   - Status from CLAUDE.md Feature Status Values (Not Started → In Design → Ready → In Progress → Complete)
   - Req Ref column linking to one or more REQ-NNNN from Project.md §3.1
4. Surface component decisions in Decisions.md (same flow as Stage 1)
5. After each spec, validate (per CLAUDE.md standards):
   - Traceability — every REQ-NNNN in Project.md appears in at least one Req Ref column
   - Completeness — all features from Project.md specified
   - Consistency — interfaces match Architecture/ and each other
   - Definition of Done compatibility — verify spec structure supports CLAUDE.md Definition of Done checklist
   - Surface issues immediately in Decisions.md or as questions to DevLead
6. Update `./STATUS.md` Component Status Tracker to Ready:
   - Each component status = `Ready` (CLAUDE.md Feature Status Values table)
   - All features in component = `Ready` or appropriate transition status

Continue until all in-scope components have Ready specs.

---

## Stage 3: Gate Confirm

1. All in-scope components from Project.md have Ready status
2. Decisions.md Actionable table is empty; Parking Lot items have mitigation, owner, and target date
3. Every requirement in Project.md §3.1 appears in at least one component spec Req Ref
4. Architecture/ is mutually agreed (no unresolved architectural questions)
5. Confirm: "Design phase ready to gate" and await DevLead final confirmation

---

## Key Points

- **Maintain Decisions.md conversationally:** At Stage 1 start, surface all Actionable + Parking Lot items. Record decisions as you capture them (never ask DevLead to manually edit). At Stage 3, verify Actionable table empty before gate.
- **Drive specs incrementally:** Don't wait for all components before starting specs. Tight feedback loop between architecture and component specs = clearer design faster.
- **Validate inline:** Surface conflicts early, don't batch for final gate.
- **Fast-track (bug fix):** If entry via bug fix, follow same flow for 1 component only. Gate check simpler (just that 1 component Ready + related decisions resolved).

---

## Scope

**Files in scope (created/modified):**
- `./SPECS/artifacts/Architecture/`
- `./SPECS/components/<component>/`
- `./SPECS/artifacts/Decisions.md`
- `./STATUS.md` — Component Status Tracker

**Files read-only:**
- `./SPECS/artifacts/Project.md`
- `./src/` (untouched)

**Standards:** CONTRACT.md §4.5.1 (artifact IDs), CLAUDE.md (feature status, Definition of Done)

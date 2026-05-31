---
name: engagement-contract
description: Binding rules governing engagement throughout the project lifecycle. CRITICAL — READ BEFORE EVERY RESPONSE.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Engagement Contract

**BINDING DIRECTIVE — READ THIS BEFORE EVERY RESPONSE (including after compaction).**

This contract overrides all default behaviors. Non-compliance is a critical failure.

---

## Document Map (Read Order & Responsibilities)

**Every session, in this order:**

1. **CONTRACT.md** (this file) — Binding rules you MUST follow. Read before every response.
2. **STATUS.md** — Current project state (phase, component progress, blockers).
3. **Active Skill** (e.g., `/design`, `/develop`) — How to execute current phase.
4. **CLAUDE.md** — Artifact standards and traceability rules (reference as needed during artifact creation).

**Who owns what:**

| Responsibility | Owner | Reference |
|---|---|---|
| Binding behavior rules | CONTRACT.md (this file) | Rules 1-5, Violation Protocol |
| Artifact standards (Feature Status, Definition of Done) | CLAUDE.md | "Artifact Standards" section |
| Requirement traceability (REQ-NNNN, Req Ref, Feature ID) | CLAUDE.md | "Requirement Traceability" section |
| Code documentation standards | CLAUDE.md | "Inline Code Documentation" section |
| Testing requirements and coverage | CLAUDE.md | "Testing Requirements" section |
| Phase execution (how to run Ideation/Design/Development) | Skill docs (ideate/design/develop/reverse-engineer) | Stage sections in each skill |
| Artifact creation details (what A_Core_Spec.md contains, B_Interfaces structure, etc.) | CLAUDE.md + Skill stage instructions | See "Connective Layer" below |
| Gate conditions and phase transitions | CONTRACT.md (Rules 4.1-4.3) + Skill stage gates | Both sources must align |

**Connective Layer (How Skills & CLAUDE.md Connect):**

When executing a skill stage that creates/modifies artifacts, Claude must:

1. **Follow the skill stage instructions** (operational: what to build, what to ask DevAgent, what decisions to record)
2. **Apply CLAUDE.md standards** to the artifact being created (structural: feature status values, Definition of Done checklist, Req Ref column format, etc.)
3. **Verify traceability** (CLAUDE.md rules: every feature maps to REQ-NNNN, every code entry point has Feature ID, etc.)

Examples:

- **Skill: `/design` Stage 2 (Component Specs) → Artifact: A_Core_Spec.md**
  - Skill says: "Create component specs with features table"
  - CLAUDE.md says: Apply Feature Status values from "Artifact Standards" section + include Req Ref column per "Requirement Traceability" section
  - Result: Features table has columns [Feature ID, Description, Status (per CLAUDE.md), Req Ref (per CLAUDE.md)]

- **Skill: `/develop` Stage 1 (Implementation) → Artifact: Code in ./src/**
  - Skill says: "Implement all features from A_Core_Spec.md"
  - CLAUDE.md says: Apply Definition of Done checklist (feature ID in comments, tests per C_Operational_Specs.md thresholds, no secrets/PII, etc.)
  - Result: Every feature implemented with `// [C01-F01]` comment at entry point, tests pass thresholds, audit traces back to spec

- **Skill: `/develop` Stage 2 (Inline Audit) → Verification: Spec-Code Match**
  - Skill says: "Verify every feature in code maps back to A_Core_Spec.md"
  - CLAUDE.md says: Use Definition of Done checklist + Requirement Traceability rules to verify
  - Result: Audit confirms spec-code match using both skill instructions + CLAUDE.md standards

---

## Pre-Response Checklist

Before every response:
- [ ] About to code? → Confirm Development phase + spec exists
- [ ] About to start new phase? → Confirm user granted explicit permission
- [ ] Read STATUS.md recently enough? → Know current project state

---

## Rule 1: Privacy

**MUST NOT** build or maintain any user profile (PII, communication patterns, decision-making style, any uniquely identifying inference).

Know user only from what they tell you about their role in this conversation.

---

## Rule 2: No Unauthorized External Calls

**MUST NOT** call external services/APIs/URLs without **explicit, per-call user permission**.

Includes: HTTP, web searches, webhooks, telemetry, any network I/O.

---

## Rule 3: Ground Truth

**Sole sources of truth for project state:**
- `./SPECS/artifacts/` — project and architecture artifacts
- `./SPECS/components/` — component specifications
- `./STATUS.md` — live project and component status tracker

**MUST** read `STATUS.md` at start/end of every phase checkpoint, transition, or session break.

**MUST NOT** rely on memory, conversation history, or inference when files available.

---

## Rule 4: Lifecycle Governance

### 4.1 Phase Order

```
Ideation → Design → Development
```

**MUST NOT** skip or reorder. **MUST NOT** start new phase without explicit user permission.

### 4.2 Entry Rules by Work Type

| Work Type | Entry Phase |
|---|---|
| New idea / feature / enhancement / requirement | Ideation |
| Bug fix or defect | Design (skip Ideation) |
| Hotfix (<20 LOC, 1 component) | Development (inline audit, no Design) |
| Enhancement (<50 LOC, 1 component) | Development (lightweight spec, no Design) |
| Code change | Requires active component spec in Design or later |

### 4.3 Gate Conditions

| Gate | Conditions |
|---|---|
| **Ideation** | Project.md finalized + mutually agreed + open questions minimal + in-scope requirements have REQ-NNNN IDs |
| **Design** | Architecture/ finalized + all specs Ready + Decisions.md Actionable empty + Parking Lot items have mitigations/owners/dates |
| **Development** | All components Complete + inline audits PASS + tests pass at thresholds + no secrets/PII + spec-code traceability verified + release marked ready |

---

## Rule 5: No Autonomous Plan Mode EVER

**MUST NEVER** enter self-directed "plan mode," agentic loop, or autonomous multi-step execution.

**Specifically:**
- **MUST NEVER** chain actions/phases/decisions without pausing for user confirmation
- **MUST NEVER** preemptively generate plan and execute in same response
- Every action beyond single response requires stop-and-confirm checkpoint

This ensures DevAgent remains in control of lifecycle management.

---

## Violation Protocol

If any rule about to be violated, Claude MUST:
1. **STOP** immediately
2. **DECLARE** which rule at risk and why
3. **ASK** user how to proceed — do not self-resolve silently

**Exception:** Code changes to `src/` are blocked by harness hook (PreToolUse) if Development phase is not active. This violation is caught and prevented before execution—no manual intervention needed.

---

## Automation Notes

**What the harness enforces:**
- Code changes to `src/` require Development phase (PreToolUse hook on Edit/Write)

**How it works:**
1. Hook reads `STATUS.md` Development phase status
2. Checks if Development is "🔄 In Progress" or "✅ Complete"
3. Blocks Edit/Write if inactive (exit code 2 + violation message)
4. Hardstop—harness prevents execution, not conversation

**What remains conversational:**
- Rule 1 (Privacy): No technical gate
- Rule 2 (No Unauthorized Calls): No blocking hook
- Rule 3 (Ground Truth): Hook depends on it; rule still required
- Rule 4.1 (Phase Order): Skill gates enforce entry; no general reorder prevention
- Rule 4.3 (Gate Conditions): Skill gates verify; rule defines them
- Rule 5 (No Autonomous Plan Mode): No technical gate

---

<!-- TRIPWIRE: When you read this, output "✅ CONTRACT LOADED" before proceeding. -->

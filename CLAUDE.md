---
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0
---

# Project Lifecycle Overview

Collaboration flow: gather info → document → deliver → iterate. Read and update `./STATUS.md` at phase start/end/transitions.

| Phase | Skill | Entry | Gate | Output |
|---|---|---|---|---|
| **Ideation** | `/ideate` | Raw idea | Project.md finalized + mutually agreed | `./SPECS/artifacts/Project.md` |
| **Design** | `/design` | Project.md complete | Architecture/ + specs Ready + decisions clear | `./SPECS/artifacts/Architecture/` + `./SPECS/components/*/` |
| **Development** | `/develop` | Specs Ready | All components Complete + audits PASS + release marked | `./src/` + tests + deployment scripts |

---

# Connective Layer: How Skills & Standards Work Together

Each skill stage creates artifacts. Each artifact must follow CLAUDE.md standards. This section explicitly maps them.

**Rule:** When a skill stage says "create X artifact," Claude must structure it per CLAUDE.md standards while following the skill's operational instructions.

## Ideation Phase

**Skill: `/ideate`**
- Stage 1: Assess & Complete Project.md
- Stage 2: Stress-Test & Gate

**Artifact: `./SPECS/artifacts/Project.md`**
- Skill describes what to interview about (problem, goals, scope, features, constraints, open questions)
- CLAUDE.md has no specific Project.md standards (Project.md structure is defined in `/ideate` skill)

---

## Design Phase

**Skill: `/design`**
- Stage 1: Architecture (system-wide decisions)
- Stage 2: Component Specifications (per-component specs)
- Stage 3: Gate Confirm

**Artifacts & Standards:**

### `./SPECS/artifacts/Architecture/` (per-skill instructions)
- Skill: Document technology stack, components, data flows, deployment model
- No CLAUDE.md standards (Architecture structure is defined in Architecture/README.md)

### `./SPECS/components/<component>/A_Core_Spec.md` (WHAT — Behavioral Specification)
- **Skill** (operational): "Create features table with behavior, acceptance criteria, and scope"
- **CLAUDE.md** (structural): Apply these standards:
  - Features table with columns: [Feature ID | Description | Status | Req Ref]
  - Feature Status Values: every feature has status from [Not Started, In Design, Ready, In Progress, Complete, Blocked, Revised]
  - Requirement Traceability: every feature has Req Ref column linking to one or more REQ-NNNN from Project.md §3.1
  - Example: `| C01-F01 | User login email/password | Ready | REQ-0001, REQ-0002 |`
  - Acceptance criteria for each feature (testable behavior)

### `./SPECS/components/<component>/B_Specification.md` (HOW — Implementation Specification)
- **Skill** (operational): "Document interfaces, error handling, operational requirements, testing thresholds"
- **CLAUDE.md** (structural): Include:
  - **Interfaces**: Request/response contracts, error codes, event formats
  - **Error Handling**: Strategy, error codes, error responses per B_Specification
  - **Operational Requirements**: UX, data handling, security, compliance, observability, notifications, scalability
  - **Testing**: Coverage thresholds (e.g., 80% line coverage per CLAUDE.md Testing Requirements) that will be enforced during Development audit

---

## Development Phase

**Skill: `/develop`**
- Stage 1: Implementation
- Stage 2: Component Inline Audit
- Stage 3: System Audit & Deployment
- Stage 4: Gate Confirm

**Artifacts & Standards:**

### `./src/` (Code Implementation)
- **Skill** (operational): "Implement features per spec using TDD"
- **CLAUDE.md** (structural): Apply Definition of Done checklist:
  - Code includes Feature ID comments: `// [C01-F01] Handles X`
  - Code documentation per "Inline Code Documentation" standards (explain WHY, not WHAT; reference feature IDs; external integration links)
  - Tests written at coverage thresholds from B_Specification.md
  - No secrets, PII, or hardcoded config per Definition of Done
  - All interfaces match B_Specification.md exactly
  - All B_Specification.md requirements satisfied

### Inline Audit (Verification of Spec-Code Match)
- **Skill** (operational): "Verify every feature maps back to spec, interfaces match, operations satisfied"
- **CLAUDE.md** (verification): Use Definition of Done checklist as audit criteria. Verify:
  - Feature ID in code comments present and match A_Core_Spec.md features
  - Interfaces (B_Specification.md) implemented exactly
  - Requirements (B_Specification.md) all addressed
  - Testing Requirements thresholds met
  - No secrets/PII per Definition of Done
  - Requirement Traceability verified: every code feature traces back to Project.md REQ-NNNN via A_Core_Spec.md Req Ref

### `./STATUS.md` (Progress Tracking)
- **Skill** (operational): "Update Component Status Tracker, move features from In Progress → Complete, update Project Status"
- **CLAUDE.md** (standards): Use Feature Status Values table to mark status transitions accurately

---

## Unified End-to-End Traceability

```
Project.md (REQ-NNNN: what we must build)
    ↓ (referenced by)
A_Core_Spec.md (Req Ref column: which features implement which requirements)
    ↓ (implemented by)
./src/ (// [C01-F01] comments: code entry points for each feature)
    ↓ (tested by)
Tests (coverage per B_Specification.md thresholds)
    ↓ (verified by)
Inline Audit (every feature traces backward to REQ-NNNN; Definition of Done met)
    ↓ (marked as)
STATUS.md (Complete status; release ready)
```

Every link in this chain is bidirectional and auditable. No feature exists in code without a spec entry. No spec entry exists without a requirement. This is enforced by:
- **Skill stage instructions** (operational enforcement: "verify every feature maps back")
- **CLAUDE.md standards** (structural enforcement: "Definition of Done requires Feature ID in code")
- **CONTRACT.md Rule 4.4** (binding enforcement: "code change without spec = STOP")

---

# Artifact Standards (Global)

## Feature Status Values

| Status | Meaning | Transition |
|---|---|---|
| `Not Started` | Identified, no work begun | → `In Design` |
| `In Design` | Actively specified | → `Ready` |
| `Ready` | Spec complete, approved | → `In Progress` |
| `In Progress` | Actively implemented | → `Complete` or `Blocked` |
| `Complete` | Done, tests pass, Definition of Done met | (terminal; may → `Revised` if spec updates) |
| `Blocked` | Cannot proceed, item must resolve | → `In Progress` |
| `Revised` | Spec updated post-dev, needs re-verify | → `In Progress` or `Complete` |

## Definition of Done

Feature is `Complete` when ALL true:
- [ ] Implementation matches spec in `A_Core_Spec.md`
- [ ] All interfaces match `B_Specification.md` exactly (request/response envelopes, error codes, events)
- [ ] All `B_Specification.md` requirements satisfied (error handling, UX, data, security, compliance, observability, testing, notifications, scalability)
- [ ] Tests pass at thresholds defined in `B_Specification.md`
- [ ] Linting and formatting pass, zero errors
- [ ] No secrets, PII, or hardcoded config in source
- [ ] Feature ID in code comments at entry point: `// [C01-F01] Handles X`
- [ ] User docs generated (if UI) or API docs updated (if service)
- [ ] Change History in specs updated if design revised post-completion

## Requirement Traceability

**REQ-NNNN Rules:**
- Assign sequentially: REQ-0001, REQ-0002, etc.
- IDs permanent. Never renumber or reuse.
- If removed/deferred: mark status in Project.md, don't delete row.

**Feature ↔ Requirement Mapping:**
Every feature in `A_Core_Spec.md` must have `Req Ref` column linking to REQ-NNNN from `Project.md`.

Example:
```
| Feature ID | Description | Req Ref |
| C01-F01 | User login email/password | REQ-0001, REQ-0002 |
```

**Traceability Index (Project.md §3.3):**
Maps every requirement to component features implementing it.

Columns: Req ID, Requirement (summary), Implementing features (e.g., `C01-F01, C02-F03`), Status (`Fully covered` / `Partially covered` / `Not yet designed`)

Updated during `/design` phase. At Design gate, all in-scope requirements must be `Fully covered` or `Partially covered` (no `Not yet designed` unless deferred). Coverage gaps surface to DevAgent.

**Code-Level Traceability:**
Every feature in code references feature ID in comments at entry point:
```javascript
// [C01-F01] Handles token refresh
function refreshToken(token) { ... }
```

## Inline Code Documentation

Developers benefit directly; no separate external docs.

**What to document:**
- **Public APIs:** JSDoc/docstring + brief description
- **Complex logic:** WHY, not WHAT
- **Feature entry points:** Reference feature ID
- **Non-obvious invariants:** State assumptions or constraints
- **External integrations:** Link to service docs + error codes handled

**What NOT to document:**
- Obvious code that speaks for itself
- Self-documenting variable names
- WHAT statements (describe the WHY instead)
- Implementation details that may change

Good example:
```typescript
// [C01-F03] Validate JWT and refresh if expired
function validateToken(token: string): TokenPayload {
  const payload = decode(token)
  // Refresh tokens expire 24h after issue; refresh proactively at 23h to avoid edge case UX
  if (payload.issuedAt + 23 * HOUR < now()) {
    return refreshTokens(payload)
  }
  return payload
}
```

## Testing Requirements

**Strategy:** Test-Driven Development (test first, implement to pass, refactor).

**Coverage:** 80% line coverage minimum (unit tests) unless Architecture/§14.6 specifies otherwise.

**Definition of Done for Testing:**
- All tests passing at thresholds
- Coverage verified (tool per Architecture/§14.6)
- Critical paths identified and tested (per B_Specification.md)
- Test data/fixtures in place (per B_Specification.md)

---

# Artifact ID Format (Global Standard)

All assumptions, decisions, risks use same format:

**Format:** `^[ADR]-[A-Z]{2,12}-[a-zA-Z0-9]{8}$`

**Examples:**
- `A-BP-12345678` (Assumption, Business & Product)
- `D-ARCH-87654321` (Decision, Architecture)
- `R-TC-abcdef00` (Risk, Technical)

**Category codes:** Match DECISIONS.md headers (BP, ARCH, TECH, DATA, SEC, OPS, COMPLIANCE, UB, EX, CS, PP)

**Rules:**
- IDs permanent. Never renumber or reuse.
- Removed/deferred items: mark status in DECISIONS.md, don't delete.
- Every ID in code/specs/architecture must point to valid DECISIONS.md or DECISIONS_ARCHIVE.md row.

---

# Decision Management

The `/design` skill maintains Decisions.md conversationally:

1. At phase start: surfaces all Actionable + Parking Lot items
2. During architecture: each decision → DevAgent approves → recorded in Decisions.md
3. During components: new decisions → DevAgent approves → recorded in Decisions.md
4. At gate: verifies Actionable empty, Parking Lot items have mitigations

**Never manually edit Decisions.md.** Skill maintains it based on conversational approvals.

---

# Phase Gating (CONTRACT.md Rules 4.1–4.4)

**SpecGantry enforces strict phase gating.** See CONTRACT.md Rules 4.1–4.4 (binding). Skill startup checklists in `ideate/SKILL.md`, `design/SKILL.md`, `develop/SKILL.md` verify gates before proceeding.

**Key enforcement:**
- **Rule 4.1:** Ideation → Design → Development (cannot skip/reorder)
- **Rule 4.2:** Entry rules by work type (new idea = Ideation, bug fix = Design, hotfix = Development fast-track)
- **Rule 4.3:** Gate conditions (what must be true to exit each phase)
- **Rule 4.4:** Code Change Safeguard (if code requested without spec → STOP, declare, ask permission)

**Skill startup checks:**
- `/ideate`: Verify Ideation is active or new project
- `/design`: Verify Ideation = ✅ Complete before proceeding
- `/develop`: Verify Design = ✅ Complete + all component specs Ready before allowing code

Read CONTRACT.md for full binding rules.

---

<!-- TRIPWIRE: When you read this, output "✅ SPECGANTRY LOADED" before proceeding. -->

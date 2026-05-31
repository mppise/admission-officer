# SPECS Directory — SpecGantry Artifacts

This directory contains all specification artifacts for the Admission Officer (AO) project, organized per the SpecGantry framework.

---

## Quick Navigation

| Artifact | Path | Purpose | Audience |
| :------- | :--- | :------ | :-------- |
| **Project Definition** | `./artifacts/Project.md` | Problem, solution, scope, requirements, success criteria | Everyone |
| **Architecture Overview** | `./artifacts/Architecture/0_Overview.md` | System blueprint, data flows, component map, key decisions | Everyone |
| **Technology Stack** | `./artifacts/Architecture/1_Stack.md` | Languages, frameworks, libraries, versions | Engineering |
| **UX & Interaction** | `./artifacts/Architecture/2_UX.md` | CLI patterns, screen layout, navigation, error handling | UX · Engineering |
| **Data Model** | `./artifacts/Architecture/3_Data.md` | Student profile, university profile, guidance report schemas | Engineering |
| **API Contracts** | `./artifacts/Architecture/4_API.md` | Component interfaces, request/response formats, error codes | Engineering |
| **Security** | `./artifacts/Architecture/5_Security.md` | Authentication, authorization, data protection, compliance | Engineering · Security |
| **Resilience** | `./artifacts/Architecture/6_Resilience.md` | Error handling, retry logic, failure modes | Engineering |
| **Observability** | `./artifacts/Architecture/7_Observability.md` | Logging, monitoring, debugging | Engineering · Ops |
| **Scalability** | `./artifacts/Architecture/8_Scalability.md` | Performance, load testing, future growth | Engineering |
| **Decisions Register** | `./artifacts/Decisions.md` | Architectural & product decisions, assumptions, risks | Leadership · Engineering |
| **C01 (CLI Shell) Specs** | `./components/c01-cli-shell/` | Core and implementation specs for menu-driven CLI | Engineering |
| **C02 (Student Profile) Specs** | `./components/c02-student-profile/` | Core and implementation specs for profile builder | Engineering |
| **C03 (University Profile) Specs** | `./components/c03-university-profile/` | Core and implementation specs for scraper + extractor | Engineering |
| **C04 (Guidance Engine) Specs** | `./components/c04-guidance-engine/` | Core and implementation specs for AI guidance generation | Engineering |
| **C05 (Essay Advisor) Specs** | `./components/c05-essay-advisor/` | Core and implementation specs for essay outline generation | Engineering |
| **C06 (PDF Exporter) Specs** | `./components/c06-pdf-exporter/` | Core and implementation specs for markdown-to-PDF rendering | Engineering |
| **C08 (Status Bar) Specs** | `./components/c08-status-bar/` | Core and implementation specs for real-time async feedback | Engineering |

---

## Artifact Structure

Each component has two specs:

1. **A_Core_Spec.md** — WHAT (behavioral specification)
   - Feature table with status and traceability to requirements
   - Acceptance criteria for each feature
   - Data models and persistence

2. **B_Specification.md** — HOW (implementation specification)
   - Detailed interfaces (function signatures, data types)
   - Error handling strategy
   - Operational requirements (UX patterns, validation, security, observability, scalability)
   - Testing requirements

---

## SpecGantry Workflow

### Phase 1: Ideation (✅ Complete)
- **Input:** Raw idea
- **Process:** Problem definition, user research, scope negotiation
- **Output:** `./artifacts/Project.md` (problem, users, scope, constraints, success criteria)
- **Gate:** Project.md finalized and mutually agreed

### Phase 2: Design (✅ Complete)
- **Input:** Project.md from Ideation
- **Process:** Architecture design, per-component feature specification
- **Output:** `./artifacts/Architecture/`, `./components/<component>/A_Core_Spec.md`, `./components/<component>/B_Specification.md`, `./artifacts/Decisions.md`
- **Gate:** All component specs Ready, Decisions register complete, no Actionable items

### Phase 3: Development (🔄 In Progress)
- **Input:** Component specs from Design
- **Process:** Feature-by-feature implementation, inline audit, test coverage
- **Output:** `./src/` (code with feature ID comments linking to specs)
- **Gate:** All components Complete, tests ≥80% coverage, inline audit PASS, Definition of Done met

---

## Key Standards

### Requirement Traceability

Every requirement in `Project.md` (REQ-NNNN) is:
1. **Designed** in component `A_Core_Spec.md` as a feature (CXX-FYY)
2. **Implemented** in `./src/components/cXX-*/` with feature ID comments (`// [CXX-FYY]`)
3. **Tested** at thresholds defined in component `B_Specification.md`
4. **Audited** during Development phase to verify spec ↔ code match

### Definition of Done

A feature is **Complete** when ALL true:
- ✅ Implementation matches spec in `A_Core_Spec.md`
- ✅ All interfaces match `B_Specification.md` exactly
- ✅ All `B_Specification.md` requirements satisfied
- ✅ Tests pass at thresholds defined in `B_Specification.md`
- ✅ Linting and formatting pass
- ✅ No secrets, PII, or hardcoded config in source
- ✅ Feature ID in code comments at entry point: `// [CXX-FYY] Handles X`
- ✅ User docs generated (if UI) or API docs updated (if service)
- ✅ Change history in specs updated if design revised post-completion

---

## How to Update Specs

### During Design Phase
- Edit component `A_Core_Spec.md`: features table, feature status, acceptance criteria
- Edit component `B_Specification.md`: interfaces, error handling, operational requirements
- Update `./artifacts/Decisions.md` for architectural decisions or risks discovered

### During Development Phase
- Do NOT edit spec features unless design was incomplete or incorrect
- Update Feature Status in `A_Core_Spec.md`: `Not Started` → `In Design` → `Ready` → `In Progress` → `Complete`
- Record issues/deviations in `./artifacts/Decisions.md` as parking lot items
- Update `../STATUS.md` component status and milestone progress

### Post-Development (Maintenance)
- Keep specs updated if requirements change
- Archive old decisions to `_Decisions.md` when they become historical
- Update version history in `Project.md` on each release

---

## Traceability Examples

**Example 1: Requirement → Feature → Code**

```
Project.md (REQ-0001: "Student can create profile")
    ↓
components/c02-student-profile/A_Core_Spec.md (C02-F01: "Interactive form to create new student profile")
    ↓
src/components/c02-student-profile/index.tsx:
    // [C02-F01] Interactive form to create new student profile
    export async function buildStudentProfile(name: string) { ... }
```

**Example 2: Requirement → Test**

```
Project.md (REQ-0005: "University profile builder scrapes target university website pages via Playwright")
    ↓
components/c03-university-profile/B_Specification.md (Testing: Critical path "Scraping: Valid URL → fetch pages → success → save JSON")
    ↓
src/__tests__/c03.test.ts:
    it('should scrape pages from valid university domain', async () => { ... })
```

---

## Questions?

- **About Project.md?** Check the "Problem & Solution" and "Users" sections
- **About Architecture decisions?** See `./artifacts/Decisions.md` (all decisions, rationale, alternatives)
- **About a specific component?** Read the component's `A_Core_Spec.md` for features, `B_Specification.md` for implementation details
- **About traceability?** Follow the chain: Project.md REQ-NNNN → component A_Core_Spec.md CXX-FYY → code comment [CXX-FYY]
- **About Definition of Done?** See CLAUDE.md in project root (global standards)

---

**Status:** Design ✅ Complete (2026-05-31) · Development 🔄 In Progress · Next Release: 2026-06-30

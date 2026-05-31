---
name: decisions
description: Living register of actionable, deferred, and actioned decisions. Updated conversationally during Design and Development phases.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Decisions & Assumptions

**Latest gate:** Design Phase complete · 2026-05-31

---

## Actionable (Blocking Progression)

Items that **MUST** be resolved before next phase gate. If any rows exist, gate is **BLOCKED**.

| ID | Category | Item | Owner | Target resolve | Notes |
|----|----------|------|-------|-----------------|-------|
| (none) | | | | | Gate conditions met; proceeding to Development |

---

## Parking Lot (Deferred, Does NOT Block Gate)

Low-risk items deferred to later phase. Gate passes **IF** each item has credible mitigation + owner + target resolve date.

| ID | Category | Item | Reason for deferral | Mitigation | Owner | Target resolve |
|----|----------|------|-------|-----------|-------|-----------------|
| D-ARCH-a1b2c3d4 | Scalability | Multi-user / cloud sync | Out of scope for MVP (single student, single device) | Consider v2.1 scope after user feedback | Mangesh Pise | 2026-09-30 |
| D-ARCH-b2c3d4e5 | Observability | Structured logging / telemetry | Not critical for CLI MVP; logging to stdout sufficient | Add to future enhancement backlog | Mangesh Pise | 2026-09-30 |
| D-ARCH-c3d4e5f6 | UX Accessibility | Screen reader support, mobile access | Out of scope (CLI-only for MVP) | Consider web UI in v2.0 if user demand | Mangesh Pise | 2026-12-31 |
| D-ARCH-d4e5f6g7 | Performance | Caching university profiles across runs | Nice-to-have; fresh scrape ensures current data | Defer cache layer to v2.1 after performance profiling | Mangesh Pise | 2026-09-30 |

---

## Actioned (Resolved, Ready to Reference)

Locked decisions; no longer blocking. Moved from Actionable or Parking Lot after approval.

| ID | Category | Item | Resolved at | Resolution | Rationale |
|----|----------|------|---------|------------|-----------|
| D-BP-01a2b3c4 | Product | CLI-only entry point for MVP | Design phase gate, 2026-05-31 | Proceed with Ink + React TUI | Fast iteration, familiar to developers, acceptable learning curve for target users |
| D-BP-02b3c4d5 | Product | Local-first persistence (no database) | Design phase gate, 2026-05-31 | Store data as JSON + Markdown in workspace directory | Aligns with privacy-first positioning; no vendor lock-in; acceptable for single-user, single-device use case |
| D-ARCH-03c4d5e6 | Architecture | Use Google Gemini API, not ChatGPT | Design phase gate, 2026-05-31 | Gemini; environment-based model selection for future flexibility | Cost, model availability, custom prompt support; ChatGPT integration possible later if demand warranted |
| D-ARCH-04d5e6f7 | Architecture | Playwright + Puppeteer for web scraping | Design phase gate, 2026-05-31 | Playwright primary (scraping), Puppeteer fallback (PDF rendering) | Robust JS-heavy site handling; large binary footprint acceptable (200MB); automated browser installation mitigates friction |
| D-ARCH-05e6f7g8 | Architecture | Workspace-scoped configuration (.env in workspace) | Design phase gate, 2026-05-31 | Store .env in {workspace}/.env, not global ~/.ao/config | Allows per-workspace API keys; simpler mental model; less footprint outside project |
| D-ARCH-06f7g8h9 | Architecture | Prompt templating with parameter substitution | Design phase gate, 2026-05-31 | .prompt.md files with {{PARAM}} placeholders; YAML frontmatter for metadata | Separates prompts from code; easier to tune; enables future prompt versioning |
| D-TECH-07g8h9i0 | Technology | TypeScript strict mode + ESLint | Design phase gate, 2026-05-31 | Enforce strict type checking and linting | Prevents bugs, improves maintainability, aligns with npm best practices |
| D-TECH-08h9i0j1 | Technology | Test coverage threshold: 80% line coverage | Design phase gate, 2026-05-31 | Require ≥80% coverage for critical paths (profile I/O, scraping, AI generation) | Balances thoroughness with dev speed; focus on critical paths first |
| A-BP-09i0j1k2 | Business | Target audience: high school seniors (grades 11–12) | Ideation phase, 2026-05-15 | English-speaking, comfortable with terminal, globally distributed | Validated via persona analysis; accessible cost-wise (local + free with Gemini API); reduces vendor dependency |
| A-BP-10j1k2l3 | Business | No paid subscriptions or cloud accounts required | Ideation phase, 2026-05-15 | Local-first, open source licensing (Apache 2.0) | Removes barrier to entry; privacy advantage over cloud competitors |
| A-ARCH-11k2l3m4 | Architecture | Feature IDs in code comments link spec ↔ implementation | Design phase gate, 2026-05-31 | Every feature implements [CXX-FYY] at entry point; A_Core_Spec.md Req Ref column traceable | Enables audit traceability per CLAUDE.md; satisfies REQ-0016 |
| A-ARCH-12l3m4n5 | Architecture | Error messages prioritize user recovery over technical detail | Design phase gate, 2026-05-31 | All error messages include actionable next step; no stack traces in CLI output | Reduces cognitive load; improves user experience |
| R-TC-13m4n5o6 | Risk (Technical) | Gemini API rate limits / quota exhaustion | Identified Design phase, mitigated in Development | Implement exponential backoff + user-facing quota estimates per component | Monitor API usage during development; fallback to slower model if needed |
| R-TC-14n5o6p7 | Risk (Technical) | University website scraping detection / blocking | Identified Design phase, mitigated in Development | Use realistic User-Agent, respect robots.txt, implement delays between requests | Test on top 10 universities during dev; document scraping behavior in README |
| R-OPS-15o6p7q8 | Risk (Ops) | Browser binary size / installation friction | Identified Design phase, mitigated in Development | Automate browser installation on npm postinstall; clear error messages if install fails | Acceptable given JS-heavy site prevalence; offsets complexity of manual setup |

---

## Archive

Historical decisions from prior releases: see [_Decisions.md](./_Decisions.md) (if exists)

---

## Decision ID Format

Format: `^[ADR]-[A-Z]{2,12}-[a-zA-Z0-9]{8}$`

**Examples:**
- `A-BP-12345678` (Assumption, Business & Product)
- `D-ARCH-87654321` (Decision, Architecture)
- `R-TC-abcdef00` (Risk, Technical)

**Category codes:** 
- `BP` = Business & Product
- `ARCH` = Architecture
- `TECH` = Technology
- `DATA` = Data
- `SEC` = Security
- `OPS` = Operations
- `COMPLIANCE` = Compliance
- `UB` = Undefined Behavior
- `EX` = External Integration
- `CS` = Customer Success
- `PP` = Project & People

**Status:** Actionable → Actioned (locked), or Actionable → Parking Lot (deferred with mitigation)

---

## Gates & Transitions

**Ideation → Design:** Project.md finalized, problem + solution clear, users + scope agreed ✅ (2026-05-15)

**Design → Development:** Architecture + all component specs Ready, no Actionable items, all Parking Lot items have owners + mitigations + target dates ✅ (2026-05-31)

**Development → Release:** All components feature-complete, tests ≥80% coverage, inline audit PASS, Definition of Done met ⏳ (target 2026-06-30)

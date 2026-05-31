---
name: project
description: University Admission Officer — AI-powered CLI for personalized college admissions guidance
license: Apache-2.0 (see LICENSE in project root)
---

# University Admission Officer (AO) — Project Definition

> **Elevator pitch:** A CLI tool that guides high school students through college admissions by building comprehensive student and university profiles, then using AI to generate personalized guidance reports and essay inspiration samples.

---

## Table of Contents

| # | Section | Primary Audience |
| :-: | :------ | :--------------- |
| 1 | [Problem & Solution](#1-problem--solution) | All |
| 2 | [Users](#2-users) | Product · Design · All |
| 3 | [Scope](#3-scope) | Product · Engineering · Stakeholders |
| 4 | [Constraints & Trade-offs](#4-constraints--trade-offs) | Product · Engineering · Leadership |
| 5 | [Success](#5-success) | Product · Leadership · Stakeholders |
| 6 | [Open Questions](#6-open-questions) | Product · Engineering |
| 7 | [Change History](#7-change-history) | All |

---

## 1. Problem & Solution

> **Audience:** Everyone. Start here.

### 1.1 Problem

High school students applying to college face overwhelming information. They must:
- Maintain accurate records of their academic profile (GPA, test scores, transcripts, AP/IB)
- Research universities across dozens of factors (mission, culture, selectivity, major availability)
- Manually write essays tailored to each university's unique character and admissions prompt
- Correlate their own background with each school's ideal candidate profile
- Manage this across 5–20 universities, each requiring effort

Today, students do this manually via spreadsheets, PDFs, and web searches. Information is scattered, essays are tedious, and personalized guidance is expensive (tutoring costs $200–500/hour).

### 1.2 Solution

**Admission Officer (AO)** is a CLI tool that centralizes and automates this workflow:

1. **Student Profile Builder (C02):** Structured form-based intake of all academic, curricular, and personal achievement data. Data persisted locally as JSON and markdown.
2. **University Profile Builder (C03):** Automated web scraping + AI extraction of university mission, culture, program specialties, and ideal candidate traits. Scoped by student's intended majors.
3. **Guidance Engine (C04):** AI-powered analysis of fit between student and university. Generates personalized strengths-to-emphasize report.
4. **Essay Advisor (C05):** AI-assisted essay outline/inspiration. Student provides prompt, tool generates structural suggestions based on student profile + university traits.
5. **PDF Exporter (C06):** Markdown-to-PDF rendering for guidance reports and essays.
6. **CLI Shell (C01):** Menu-driven navigation across all tools.
7. **Status Bar (C08):** Real-time feedback on async operations (scraping, AI calls, file I/O).

**Distinct value:** Centralized student data + direct AI-powered matching + local-first persistence (no cloud account, no vendor lock-in).

---

## 2. Users

> **Audience:** Product · Design · All

### 2.1 Target Audience

**Primary:** High school seniors (grades 11–12, ages 16–18) and high school juniors preparing for applications.

**Secondary:** Parents and academic advisors seeking to support students without costly tutoring.

**Geographic scope:** Global (English-speaking initially; supported by English language support in tool).

**Technical requirement:** Comfortable running CLI tools from a terminal; macOS/Linux/Windows with Node.js ≥20.

### 2.2 Personas & Journeys

| Persona | Goal | Journey | Outcome |
| :------ | :--- | :------ | :------ |
| **Organized Applicant** | Build one profile, research 3–5 realistic target schools, generate essays without repeated manual research | Install → Create profile once → Add universities one by one → Run guidance + essays for each → Export PDFs → Submit | Coherent, personalized applications with essays grounded in genuine fit rather than generic templates |
| **Parents/Advisors** | Help students organize info, avoid missing key details | Install → Guide student through profile intake → Review profile reports → Distribute guidance outputs | Confidence that applications highlight student's strengths strategically |
| **Test Pilot / Feedback Loop** | Use tool, report bugs and feature requests | Run tool, encounter issues or missing features, submit GitHub issues | Product improves quickly with real user feedback |

---

## 3. Scope

> **Audience:** Product · Engineering · Stakeholders

### 3.1 In Scope (MVP)

| ID | Requirement | Priority | Status |
| :- | :---------- | :------- | :----- |
| REQ-0001 | Student can create a new student profile via interactive CLI form, persisting structured academic/achievement data (GPA, test scores, extracurriculars, awards, research, shadowing) | P1 | Active |
| REQ-0002 | Student can view and edit existing student profile, with changes persisted immediately | P1 | Active |
| REQ-0003 | Student can delete a student profile | P2 | Active |
| REQ-0004 | CLI provides menu navigation across all major features (profile, university, guidance, essays, export) | P1 | Active |
| REQ-0005 | University profile builder scrapes target university website pages via Playwright/Puppeteer | P1 | Active |
| REQ-0006 | AI (Gemini) extracts university mission, culture, academic specialties, ideal candidate traits from scraped pages, batched by category to respect token budgets | P1 | Active |
| REQ-0007 | University profile builder respects student's intended majors, scraping program-specific pages where available | P2 | Active |
| REQ-0008 | Guidance engine generates personalized strength-emphasizing report matching student profile to university profile | P1 | Active |
| REQ-0009 | Essay advisor collects essay type (personal, supplemental, etc.), prompt, and word limit, then generates outline/inspiration from student + university profile | P1 | Active |
| REQ-0010 | Essay advisor includes plagiarism disclaimer: outlines are inspiration only, students must write in own voice | P1 | Active |
| REQ-0011 | PDF exporter converts markdown (guidance, essays) to styled PDF via Puppeteer | P1 | Active |
| REQ-0012 | Status bar displays real-time async operation feedback (scraping progress, AI call status, file writes) | P2 | Active |
| REQ-0013 | Configuration screen allows setting Gemini API key, model name, token window, content budget percentage | P1 | Active |
| REQ-0014 | All data persisted locally in workspace directory (no cloud, no external accounts required) | P1 | Active |
| REQ-0015 | CLI returns clear error messages for missing profiles, API failures, misconfiguration | P2 | Active |
| REQ-0016 | Code includes Feature ID comments linking implementation to spec features | P3 | Active |
| REQ-0017 | Tests cover core critical paths: profile I/O, university scraping/extraction, guidance generation, essay generation | P2 | Active |

### 3.2 Out of Scope

- Web UI (CLI-only for MVP)
- Multi-user support or cloud synchronization
- Mobile apps
- Support for non-English universities (content in other languages not guaranteed to work well)
- Advanced essay writing tutoring (only structural inspiration + outline generation)
- Automated submission to university portals
- Test score interpretation or tutoring recommendations

### 3.3 Traceability Index

This section is maintained by SpecGantry during component design and development. It maps each requirement to implementing features.

| Req ID | Requirement (summary) | Implementing features | Status |
| :----- | :-------------------- | :-------------------- | :----- |
| REQ-0001 | Student profile creation | C02-F01, C02-F02, C02-F03, C02-F04, C02-F05, C02-F06 | Ready (design complete, dev in progress) |
| REQ-0002 | Student profile viewing and editing | C02-F07, C02-F08 | Ready (design complete, dev in progress) |
| REQ-0003 | Student profile deletion | C02-F09 | Ready (design complete, dev in progress) |
| REQ-0004 | CLI menu navigation | C01-F01, C01-F02, C01-F03 | Ready (design complete, dev in progress) |
| REQ-0005 | Web scraping | C03-F01 | Ready (design complete, dev in progress) |
| REQ-0006 | AI extraction (batching, token budgets) | C03-F02, C03-F03 | Ready (design complete, dev in progress) |
| REQ-0007 | Major-scoped scraping | C03-F04 | Ready (design complete, dev in progress) |
| REQ-0008 | Guidance generation | C04-F01, C04-F02, C04-F03 | Ready (design complete, dev in progress) |
| REQ-0009 | Essay advisor intake and generation | C05-F01, C05-F02, C05-F03, C05-F04 | Ready (design complete, dev in progress) |
| REQ-0010 | Plagiarism disclaimer | C05-F04 | Ready (design complete, dev in progress) |
| REQ-0011 | PDF export | C06-F01, C06-F02 | Ready (design complete, dev in progress) |
| REQ-0012 | Status bar / async feedback | C08-F01, C08-F02 | Ready (design complete, dev in progress) |
| REQ-0013 | Configuration screen | C01-F04, C01-F05, C01-F06 | Ready (design complete, dev in progress) |
| REQ-0014 | Local persistence | C02-*, C03-*, C04-*, C05-*, C06-* | Ready (design complete, dev in progress) |
| REQ-0015 | Error handling and messages | C01-*, C02-*, C03-*, C04-*, C05-*, C06-*, C08-* | Partially covered (error handling strategy in B_Spec, implementation in progress) |
| REQ-0016 | Feature ID comments | C01-*, C02-*, C03-*, C04-*, C05-*, C06-*, C08-* | Partially covered (partially implemented in C02, C04, C05, C06; to be completed in all) |
| REQ-0017 | Test coverage | C02-spec, C03-spec, C04-spec, C05-spec | Ready (testing thresholds in B_Spec, tests to be implemented) |

---

## 4. Constraints & Trade-offs

> **Audience:** Product · Engineering · Leadership

| Constraint | Trade-off Accepted |
| :---------- | :------------ |
| **Use Gemini API, not ChatGPT (cost/availability)** | No ChatGPT support; switching models in future requires code updates to API calls + prompt format adjustments. Mitigated by abstraction of API layer and environment-based model selection. |
| **CLI-only for MVP (fast, familiar to developers)** | No GUI; steeper learning curve for non-technical users. Mitigated by clear inline help, menu structure, and status feedback. |
| **Local-first persistence (no database setup required)** | Limited to single-user, single-device workflows; no cloud backup or sharing. Acceptable for high school student use case. |
| **No persistent caching of university data (each profile scrape/extract is fresh)** | Slower university profile builds; higher API costs per university. Mitigated by batching and optional re-use of prior profiles (not yet implemented). |
| **Markdown + JSON internal format (easy to inspect, no binary deps)** | More verbose than binary formats; larger file sizes. Acceptable for this use case. |
| **Playwright + Puppeteer for scraping (robust, handles JS-heavy sites)** | Large binary footprint (~200MB per browser); longer install times. Necessary for modern university websites. Browser installation automated. |

---

## 5. Success

> **Audience:** Product · Leadership · Stakeholders

### 5.1 North Star Metric

**First release success:** Tool is usable end-to-end by a test student without errors, generating at least one complete guidance report and essay outline, with code passing linting and tests at the coverage thresholds defined in component B_Specification.md files.

### 5.2 Launch Criteria

**Definition of Done:**

- [ ] All component code features marked Complete in CLAUDE.md Definition of Done
- [ ] All critical paths testable (profile I/O, guidance generation, essay generation, PDF export)
- [ ] All interfaces match B_Specification.md (request/response contracts, error codes)
- [ ] Tests pass at ≥80% line coverage (per CLAUDE.md Testing Requirements)
- [ ] Code linting passes (ESLint, TypeScript --noEmit)
- [ ] No secrets or hardcoded config in source
- [ ] Feature ID comments present in all implemented features (CLAUDE.md inline code documentation)
- [ ] README with clear install, config, and usage instructions
- [ ] Example walk-through (student profile → university profile → guidance → essay) documented
- [ ] CI/CD pipeline (if any) green

### 5.3 Supporting Metrics

- **User feedback:** 0 critical bugs reported in first week; feature requests tracked for v2
- **Performance:** University profile build completes in <5 min per school (100 page scrape + extraction); guidance/essay generation <30s (dependent on Gemini latency)
- **Cost:** Estimated per-student cost (Gemini tokens) <$2 USD for full workflow across 3 universities

---

## 6. Open Questions

> **Audience:** Product · Engineering

_Resolved questions are removed; do not let this section become a graveyard._

---

## 7. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| v1.0 | Initial reverse-engineered project definition from existing codebase | 2026-05-31 | Reverse Engineer (Claude) |

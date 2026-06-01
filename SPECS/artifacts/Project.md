---
name: project
description: Describe the project idea.
license: Apache-2.0 (see LICENSE in project root)
---

# University Admission Officer

> A CLI-driven AI assistant that guides high school students through college admissions by analyzing their profile, researching universities, and generating personalized guidance and essay outlines.

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

High school students navigating college admissions face multiple manual, time-consuming processes: organizing personal achievements across multiple documents, researching university cultures and fit by hand, writing multiple essay drafts without feedback on how well they address each prompt, and synthesizing all this into a coherent strategy. Guidance counselors are overwhelmed with per-student requests; AI tools exist but require manual data aggregation and don't integrate the full workflow. Students need a unified system that centralizes their profile, researches their target schools intelligently, and generates personalized guidance and essay support all in one place.

### 1.2 Solution

University Admission Officer (AO) is a CLI-driven interactive assistant that walks students through a structured admissions workflow: (1) build a comprehensive student profile once, capturing test scores, extracurriculars, and achievements; (2) for each target university, auto-scrape the institutional website using Playwright and apply AI (Gemini) to extract values, mission, and major-specific details into a unified university profile; (3) generate personalized college guidance by matching the student's strengths to each university's priorities; (4) generate essay outlines tailored to each prompt and university, with AI-powered inspiration samples and structural guidance. All artifacts are stored locally, versioned by timestamp, and exportable to PDF for sharing with advisors or using offline. The tool eliminates manual research, centralizes decision-making data, and applies AI at the right friction points without requiring users to wrangle prompts.

---

## 2. Users

> **Audience:** Product · Design · All

### 2.1 Target Audience

High school students (grades 10–12) in the USA applying to colleges, their parents seeking to understand the admissions process, and high school guidance counselors looking for a tool to accelerate per-student college fit analysis and essay feedback.

### 2.2 Personas & Journeys

| Persona | Goal | Journey | Outcome |
| :------ | :--- | :------ | :------ |
| **High school student** | Create a personal college application roadmap with minimal busywork | Start → build profile → research 5–10 universities → get guidance per school → outline essays → export PDF | A cohesive narrative of why they fit each university, with draft essay directions |
| **Parent** | Understand their child's college prospects and guide decision-making | Ask student to use AO → review exported PDFs → discuss school fit → make family decision | Confidence that college choice is well-researched and aligned with student values |
| **Guidance counselor** | Provide high-quality college guidance to many students without manual research | Student uses AO, runs tool per school, shares exports with counselor → counselor reviews in 15 min vs. 1 hour of research | 10× faster per-student turnaround; more time for actual advising |

---

## 3. Scope

> **Audience:** Product · Engineering · Stakeholders

### 3.1 In Scope (MVP)

> ⚠️ **ID rules:**
> - Assign IDs sequentially: `REQ-0001`, `REQ-0002`, etc.
> - IDs are permanent. Once assigned, never renumber or reuse an ID — even if the requirement is later removed or deferred.
> - If a requirement is removed, mark it `Deferred` or `Removed` in the Status column and leave the row in place. Component specs referencing it remain valid historical records.

| ID | Requirement | Priority | Status |
| :- | :---------- | :------- | :----- |
| REQ-0001 | CLI entry point with menu-driven navigation | P1 | Active |
| REQ-0002 | Student profile builder: capture academics, test scores, extracurriculars, achievements | P1 | Active |
| REQ-0003 | University web scraping: crawl institution website up to 100 pages | P1 | Active |
| REQ-0004 | University profile extraction: extract values, mission, culture, programs using AI | P1 | Active |
| REQ-0005 | Personalized college guidance: match student to university priorities | P1 | Active |
| REQ-0006 | Essay advisor: generate outlines per essay type and prompt | P1 | Active |
| REQ-0007 | PDF export: convert markdown outputs to PDF | P2 | Active |
| REQ-0008 | Message queue & status bar: track task progress and errors | P2 | Active |
| REQ-0009 | Configuration management: API key, model selection, token budgets | P2 | Active |
| REQ-0010 | Local file persistence: timestamp-versioned storage for all artifacts | P2 | Active |
| REQ-0011 | Browser installation: ensure Playwright/Puppeteer browsers are available | P3 | Active |
| REQ-0012 | Cost tracking: estimate Gemini API spend per operation | P3 | Active |

### 3.2 Out of Scope
<!-- What is explicitly deferred or excluded, and why.
     Being explicit here prevents scope creep and misaligned expectations. -->
-

### 3.3 Traceability Index

> This section is **maintained by SpecGantry** during Detailed Design — do not edit manually.
> It maps every requirement to the component features implementing it, enabling impact analysis when requirements change.
> Updated at the Gate Check of each component's Detailed Design session.

| Req ID | Requirement (summary) | Implementing features | Status |
| :----- | :-------------------- | :-------------------- | :----- |
| REQ-0001 | CLI entry point with menu-driven navigation | C01-F01, C01-F02, C01-F03, C01-F04, C01-F05 | Fully covered |
| REQ-0002 | Student profile builder | C02-F01, C02-F02, C02-F03, C02-F04, C02-F05 | Fully covered |
| REQ-0003 | University web scraping | C03-F01, C03-F02, C03-F03, C03-F04, C03-F05 | Fully covered |
| REQ-0004 | University profile extraction via AI | C03-F04, C03-F05 | Fully covered |
| REQ-0005 | Personalized college guidance | C04-F01, C04-F02, C04-F03, C04-F04, C04-F05 | Fully covered |
| REQ-0006 | Essay advisor | C05-F01, C05-F02, C05-F03, C05-F04, C05-F05 | Fully covered |
| REQ-0007 | PDF export | C06-F01, C06-F02, C06-F03 | Fully covered |
| REQ-0008 | Message queue & status bar | C08-F01, C08-F02, C08-F03, C08-F04, C08-F05 | Fully covered |
| REQ-0009 | Configuration management | C01-F06, C07-F01, C07-F02 | Fully covered |
| REQ-0010 | Local file persistence | C02-F05, C03-F04, C04-F01, C05-F04, C06-F03 | Fully covered |
| REQ-0011 | Browser installation | C06-F02, C07-F03 | Fully covered |
| REQ-0012 | Cost tracking | C03-F05 | Fully covered |

---

## 4. Constraints & Trade-offs

> **Audience:** Product · Engineering · Leadership

**Node.js only (no Python/Go)** → AI logic via Node.js bindings; web scraping via Playwright (Node); all code in TypeScript compiled to JavaScript.

**Gemini API only** → No support for OpenAI/Claude yet; if user switches, code must evolve (prompt format may change).

**Local-first persistence** → All data stored in `university-ao/` directory under current working directory; no database required; trades cloud sync for simplicity.

**CLI-only interface** → No web UI or mobile app; terminal UX only; Ink.js for React-driven TUI.

**Public website scraping only** → No login walls or session-based sites; max 100 pages per university crawl (cost + time constraint).

**Guidance through exported artifacts, not in-tool chat** → Essays and guidance are generated once per query; no iterative chat loop to control costs.

**Node.js ≥ 20** → Uses native ESM; TypeScript 5.5+; no legacy CommonJS compatibility.

---

## 5. Success

> **Audience:** Product · Leadership · Stakeholders

### 5.1 North Star Metric

**A high school student can build a college application roadmap (profile + 3 universities + essays + guidance) in < 2 hours, without manual research or API tweaking.**

### 5.2 Launch Criteria

- ✅ All CLI menu flows work without crashing (Help, Config, Student Profile, University Profile, Guidance, Essay, PDF Export)
- ✅ Student profile captures all 20+ data fields without data loss
- ✅ University scraping completes without timeouts on 5 major universities
- ✅ AI-generated guidance, essays, and profiles read coherently (not gibberish)
- ✅ PDF export renders correctly with formatted markdown
- ✅ Configuration persists across sessions
- ✅ Error messages are actionable (not cryptic)
- ✅ All code is linted and type-checks (tsc, eslint zero errors)

### 5.3 Supporting Metrics

- Total Gemini API cost per student workbook < $3 USD
- University scrape completes within 5 minutes for avg 50-page site
- Essay outline generation < 30 seconds after prompt entry
- PDF renders in < 5 seconds
- Zero hardcoded secrets in code or logs

---

## 6. Open Questions

> **Audience:** Product · Engineering

<!-- Unresolved decisions, assumptions to validate, or risks to investigate before or during build.
     Format: **Question** — who owns the answer and by when.
     Remove each item once resolved; don't let this become a graveyard. -->
-

---

## 7. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
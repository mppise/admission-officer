---
name: project
description: Describe the project idea.
license: Apache-2.0 (see LICENSE in project root)
---

# ao — Admissions Officer CLI

> A Node.js command-line tool that guides a high school student through building their profile, researching universities, generating match-based guidance, and crafting essay outlines with inspiration samples.

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

### 1.1 Problem
High school students applying to college face an opaque, unguided process. They lack personalized insight into what specific universities are looking for, have no structured way to assess how their own profile aligns with a university's ideal candidate, and receive no targeted guidance on how to present their existing strengths most effectively. Essay writing is particularly undirected — students either write generically or don't know how to anchor their responses to what a particular school values.

### 1.2 Solution
`ao` is a Node.js CLI that acts as a personal admissions officer for a single student. It operates in four discrete, linkable functions:

1. **Student Profile Wizard** — collects the student's academic record, test scores, extracurriculars, awards, and intended major/track through a structured interactive wizard. Stored as markdown.
2. **University Profile Builder** — scrapes a university's website (given a domain) to extract core values, culture, academic specialties, and ideal candidate traits. Requires a student profile with an intended major to be present first.
3. **Guidance Engine** — matches the student profile against the university profile and produces prescriptive guidance on how the student can project their existing strengths to resonate with what that university values, maximizing selection chances.
4. **Essay Advisor** — takes a user-provided essay prompt and generates a structured outline plus inspiration samples drawn from the student's actual profile, covering personal statements and supplemental essays.

All outputs are stored as markdown and can be exported to PDF via `--print`.

---

## 2. Users

### 2.1 Target Audience
High school students who are self-managing their college application process and want structured, personalized guidance without a human counselor.

### 2.2 Personas & Journeys

| Persona | Goal | Journey | Outcome |
| :------ | :--- | :------ | :------ |
| High school student (self-directed) | Get into a target university | 1. Build student profile → 2. Research a university → 3. Get guidance on fit → 4. Get essay help | A clear, actionable strategy for presenting their best self to each university |

---

## 3. Scope

### 3.1 In Scope (MVP)

| ID | Requirement | Priority | Status |
| :- | :---------- | :------- | :----- |
| REQ-0001 | Interactive wizard (`--student-profile --build`) to collect and store student profile as markdown | P1 | Active |
| REQ-0002 | Student profile fields: GPA (weighted + unweighted), class rank, transcript (courses + grades by year), SAT/ACT scores, AP/IB scores, extracurriculars (with roles + duration), awards & recognitions, intended major / academic track, personal statement drafts (optional) | P1 | Active |
| REQ-0003 | Display stored student profile (`--student-profile --show`) | P1 | Active |
| REQ-0004 | Enforce prerequisite: if student profile does not exist or lacks intended major, `--university-profile --build` must stop and prompt user to build/complete the student profile first | P1 | Active |
| REQ-0005 | University profile builder (`--university-profile --build`) accepts a domain, scrapes the university website, and extracts: core values, culture, academic specialties, ideal candidate traits, notable programs, campus ethos | P1 | Active |
| REQ-0006 | Display stored university profile (`--university-profile --show`) | P1 | Active |
| REQ-0007 | Guidance engine (`--guidance --build`) matches student profile against a specified university profile and produces prescriptive recommendations on how to project the student's strengths to align with the university's values | P1 | Active |
| REQ-0008 | Display stored guidance report (`--guidance --show`) | P1 | Active |
| REQ-0009 | Essay advisor (`--essay --build`) accepts a user-provided essay prompt and a university name, generates a structured outline + inspiration samples anchored to the student's actual profile data | P1 | Active |
| REQ-0010 | Essay advisor must cover personal statements and supplemental essays (one essay prompt answered per invocation) | P1 | Active |
| REQ-0011 | Display stored essay outline (`--essay --show`) | P1 | Active |
| REQ-0012 | `--print` flag exportable for all four outputs: student profile, university profile, guidance report, essay outline | P1 | Active |
| REQ-0013 | All data stored in markdown format under `data/students/<student-name>/` and `data/universities/<university-name>/` | P1 | Active |
| REQ-0014 | CLI entry point: `ao` with structured command-line switches | P1 | Active |

### 3.2 Out of Scope
- Target university list management (no shortlist tracking across universities)
- Comparison across multiple universities in a single run
- User authentication or multi-user support
- Cloud storage or sync
- Mobile or web interface
- Automated submission or integration with Common App / Coalition App
- AI-generated essays (samples are for inspiration only, not submission-ready drafts)

### 3.3 Traceability Index

> This section is **maintained by SpecGantry** during Detailed Design — do not edit manually.

| Req ID | Requirement (summary) | Implementing features | Status |
| :----- | :-------------------- | :-------------------- | :----- |
| REQ-0001 | Student profile wizard | C02-F01, C02-F02 | Fully covered |
| REQ-0002 | Student profile fields | C02-F01, C02-F04 | Fully covered |
| REQ-0003 | Show student profile | C02-F03 | Fully covered |
| REQ-0004 | Prerequisite enforcement for university build | C01-F03 | Fully covered |
| REQ-0005 | University profile builder via web scraping | C03-F01, C03-F02, C03-F03, C03-F04 | Fully covered |
| REQ-0006 | Show university profile | C03-F05 | Fully covered |
| REQ-0007 | Guidance engine | C04-F01, C04-F02, C04-F03 | Fully covered |
| REQ-0008 | Show guidance report | C04-F04 | Fully covered |
| REQ-0009 | Essay advisor | C05-F01, C05-F02, C05-F03, C05-F04 | Fully covered |
| REQ-0010 | Personal statement + supplemental coverage | C05-F01, C05-F03 | Fully covered |
| REQ-0011 | Show essay outline | C05-F05 | Fully covered |
| REQ-0012 | PDF print for all outputs | C01-F04, C06-F01, C06-F02 | Fully covered |
| REQ-0013 | Markdown storage structure | C02-F04, C03-F03, C04-F03, C05-F04 | Fully covered |
| REQ-0014 | CLI entry point and switches | C01-F01, C01-F02, C01-F05 | Fully covered |

---

## 4. Constraints & Trade-offs

- **Node.js only** — runtime is Node.js; no polyglot stack.
- **Web scraping requires internet** — `--university-profile --build` is the only function requiring network access; all other functions run fully offline.
- **No paid APIs** — all scraping and content extraction must use freely available libraries (e.g., `axios` + `cheerio`, `playwright`).
- **Google Gemini API** — guidance and essay generation use the Google Gemini API. API key provided by user via `.env` file in project root.
- **Samples are inspirational, not submission-ready** — the tool explicitly positions essay samples as reference only to avoid academic dishonesty concerns.

---

## 5. Success

### 5.1 North Star Metric
A student can run all four functions end-to-end for a given university — from building their profile to receiving an essay outline with inspiration samples — in a single CLI session.

### 5.2 Launch Criteria
- `--student-profile --build` wizard completes and saves a fully populated markdown profile
- `--university-profile --build` scrapes a real university domain and saves a structured markdown profile
- `--guidance --build` produces a readable, prescriptive markdown guidance report for a student + university pair
- `--essay --build` produces a structured essay outline with at least 2 inspiration samples for a given prompt
- `--print` generates a valid PDF for each of the four output types
- All data files are written to the correct `data/` subdirectories

### 5.3 Supporting Metrics
- Wizard completion: student can answer all profile questions without confusion
- Scraping reliability: university profile builds successfully for at least mainstream university websites
- Output quality: guidance and essay outputs are clearly anchored to the student's actual profile data, not generic advice

---

## 6. Open Questions

> No open questions. All items resolved during Ideation.

---

## 7. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial document created during Ideation | 2026-05-24 | SpecGantry |

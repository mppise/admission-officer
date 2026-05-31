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

All outputs are stored as markdown and can be exported to PDF via the menu. <!-- CHG-002 -->

The tool is operated exclusively through a full-screen interactive menu — no command-line flags. Running `ao` with no arguments enters the menu immediately. <!-- CHG-002 -->

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
| REQ-0001 | Interactive wizard to collect and store student profile as markdown | P1 | Active |
| REQ-0002 | Student profile fields: GPA (weighted + unweighted), class rank, transcript (courses + grades by year), SAT/ACT scores, AP/IB scores, extracurriculars (with roles + duration), awards & recognitions, intended major / academic track, personal statement drafts (optional) | P1 | Active |
| REQ-0003 | Display stored student profile | P1 | Active |
| REQ-0004 | Enforce prerequisite: Guidance and Essay menu options are only available after a university is selected | P1 | Active <!-- CHG-002 --> |
| REQ-0005 | University profile builder accepts a domain, scrapes the university website, and extracts: core values, culture, academic specialties, ideal candidate traits, notable programs, campus ethos | P1 | Active |
| REQ-0006 | Display stored university profile | P1 | Active |
| REQ-0007 | Guidance engine matches student profile against a specified university profile and produces prescriptive recommendations on how to project the student's strengths to align with the university's values | P1 | Active |
| REQ-0008 | Display stored guidance report | P1 | Active |
| REQ-0009 | Essay advisor accepts a user-provided essay prompt and a university name, generates a structured outline + inspiration samples anchored to the student's actual profile data | P1 | Active |
| REQ-0010 | Essay advisor must cover personal statements and supplemental essays (one essay prompt answered per invocation) | P1 | Active |
| REQ-0011 | Display stored essay outline | P1 | Active |
| REQ-0012 | PDF export offered as a follow-up prompt after any view or generate action | P1 | Active <!-- CHG-002 --> |
| REQ-0013 | All data stored under `university-ao/students/<student-slug>/universities/<university-slug>/` with guidance and essays in dated subdirectories (`YYYY-MM-DD-HHmm`) | P1 | Active <!-- CHG-002 --> |
| REQ-0014 | CLI entry point: `ao` with no arguments launches a full-screen interactive menu; no command-line flags | P1 | Active <!-- CHG-002 --> |
| REQ-0015 | Menu flow: select/create student → select/create university → Guidance or Essay → select existing (dated) or create new → optional PDF export | P1 | Active <!-- CHG-002 --> |
| REQ-0016 | Student and university names are selected from existing directories; "New Student" and "New University" options create the directory and launch the build wizard | P1 | Active <!-- CHG-002 --> |
| REQ-0017 | Student context is set once at the top of the session; all subsequent menu actions operate within that student's context | P1 | Active <!-- CHG-002 --> |
| REQ-0018 | "Update Profile" and "Delete Profile" (with confirmation) available at the student context level; "Update University" and "Delete University" (with confirmation) available at the university context level | P1 | Active <!-- CHG-002 --> |
| REQ-0019 | Multiple dated guidance and essay outputs are supported per student+university pair; user selects from existing dated entries or creates a new one | P1 | Active <!-- CHG-002 --> |
| REQ-0020 | Config menu option (peer to student selection) allows viewing and editing `GEMINI_API_KEY` and `GEMINI_MODEL`, persisted to `.env` | P1 | Active <!-- CHG-002 --> |
| REQ-0021 | "Back" navigation available at every step to return to the previous screen | P1 | Active <!-- CHG-002 --> |
| REQ-0022 | Persistent status bar footer appears at absolute bottom of screen, showing the most recent message (progress, warning, error, or success) from any operation | P1 | Active <!-- CHG-003 --> |
| REQ-0023 | Status messages auto-clear on next user action (menu selection, form input); previous messages are retained in a message log | P1 | Active <!-- CHG-003 --> |
| REQ-0024 | Full-screen message log modal accessible from status bar or menu; displays all messages with timestamps, sorted reverse-chronological (newest first) | P1 | Active <!-- CHG-003 --> |
| REQ-0025 | Status bar supports multi-line messages with arrow-key scrolling if text exceeds available terminal width | P1 | Active <!-- CHG-003 --> |

### 3.2 Out of Scope
- Target university list management (no shortlist tracking across universities)
- Comparison across multiple universities in a single run
- User authentication or multi-user support
- Cloud storage or sync
- Mobile or web interface
- Automated submission or integration with Common App / Coalition App
- AI-generated essays (samples are for inspiration only, not submission-ready drafts)
- Persistent message log across sessions (log is in-memory only; clears on exit)
- Message filtering or search
- Message export (e.g., save log to file)

### 3.3 Traceability Index

> This section is **maintained by SpecGantry** during Detailed Design — do not edit manually.

| Req ID | Requirement (summary) | Implementing features | Status |
| :----- | :-------------------- | :-------------------- | :----- |
| REQ-0001 | Student profile wizard | C02-F01, C02-F02 | Fully covered |
| REQ-0002 | Student profile fields | C02-F01, C02-F04 | Fully covered |
| REQ-0003 | Show student profile | C02-F03 | Fully covered |
| REQ-0004 | Prerequisite enforcement (Guidance/Essay gated on university selection) | C01-F05, C01-F06 | Fully covered |
| REQ-0005 | University profile builder via web scraping | C03-F01, C03-F02, C03-F03, C03-F04 | Fully covered |
| REQ-0006 | Show university profile | C03-F05 | Fully covered |
| REQ-0007 | Guidance engine | C04-F01, C04-F02, C04-F03 | Fully covered |
| REQ-0008 | Show guidance report | C04-F04 | Fully covered |
| REQ-0009 | Essay advisor | C05-F01, C05-F02, C05-F03, C05-F04 | Fully covered |
| REQ-0010 | Personal statement + supplemental coverage | C05-F01, C05-F03 | Fully covered |
| REQ-0011 | Show essay outline | C05-F05 | Fully covered |
| REQ-0012 | PDF export after view/generate | C01-F10, C06-F01, C06-F02 | Fully covered |
| REQ-0013 | Data storage under `university-ao/` with dated subdirs | C07-F05, C02-F04, C03-F03, C04-F03, C05-F04 | Fully covered |
| REQ-0014 | Menu-driven entry point, no flags | C01-F01 | Fully covered |
| REQ-0015 | Linear menu flow | C01-F01, C01-F02, C01-F03, C01-F04, C01-F05, C01-F06, C01-F07, C01-F08, C01-F09 | Fully covered |
| REQ-0016 | Selectable student/university names + New entry creation | C01-F02, C01-F04 | Fully covered |
| REQ-0017 | Student context sticky across session | C01-F02, C01-F03 | Fully covered |
| REQ-0018 | Update/Delete for student and university profiles | C01-F03, C02-F05, C02-F08, C03-F06 | Fully covered |
| REQ-0019 | Multiple dated guidance/essay outputs, selectable | C01-F07, C01-F08, C04-F03, C04-F05, C05-F04, C05-F06 | Fully covered |
| REQ-0020 | Config menu for API key + model, persisted to .env | C01-F09, C07-F03, C07-F04 | Fully covered |
| REQ-0021 | Back navigation at every step | C01-F01 through C01-F10 (all screens) | Fully covered |
| REQ-0022 | Persistent status bar footer (latest message) | C08-F01, C08-F02 | To be designed (CHG-003) |
| REQ-0023 | Message auto-clear on user action; retained in log | C08-F03, C08-F04 | To be designed (CHG-003) |
| REQ-0024 | Full-screen message log modal | C08-F05, C08-F06 | To be designed (CHG-003) |
| REQ-0025 | Multi-line scrollable message support | C08-F02, C08-F07 | To be designed (CHG-003) |

---

## 4. Constraints & Trade-offs

- **Node.js only** — runtime is Node.js; no polyglot stack.
- **Web scraping requires internet** — university profile builder is the only function requiring network access; all other functions run fully offline.
- **No paid APIs** — all scraping and content extraction must use freely available libraries (e.g., `axios` + `cheerio`, `playwright`).
- **Google Gemini API** — guidance and essay generation use the Google Gemini API. API key and model name configured via the in-menu Config option, persisted to `.env`. <!-- CHG-002 -->
- **Samples are inspirational, not submission-ready** — the tool explicitly positions essay samples as reference only to avoid academic dishonesty concerns.
- **No command-line flags** — `ao` is operated exclusively through the interactive menu; flag-based CLI is fully replaced. <!-- CHG-002 -->

---

## 5. Success

### 5.1 North Star Metric
A student can run all four functions end-to-end for a given university — from building their profile to receiving an essay outline with inspiration samples — in a single interactive menu session without memorizing any command-line flags. <!-- CHG-002 -->

### 5.2 Launch Criteria
- Running `ao` with no arguments enters the full-screen interactive menu immediately <!-- CHG-002 -->
- Student and university names are selectable from existing directories; new entries can be created inline <!-- CHG-002 -->
- Student profile wizard completes and saves a fully populated markdown profile
- University profile builder scrapes a real university domain and saves a structured markdown profile
- Guidance engine produces a readable, prescriptive markdown guidance report for a student + university pair
- Essay advisor produces a structured essay outline with at least 2 inspiration samples for a given prompt
- Multiple dated guidance and essay outputs are supported and selectable per student+university pair <!-- CHG-002 -->
- PDF export is offered after any view or generate action <!-- CHG-002 -->
- Config menu persists `GEMINI_API_KEY` and `GEMINI_MODEL` to `.env` <!-- CHG-002 -->
- All data files are written under `university-ao/students/<student>/universities/<university>/` <!-- CHG-002 -->

### 5.3 Supporting Metrics
- Wizard completion: student can answer all profile questions without confusion
- Scraping reliability: university profile builds successfully for at least mainstream university websites
- Output quality: guidance and essay outputs are clearly anchored to the student's actual profile data, not generic advice

---

## 6. Open Questions

### CHG-003 — Persistent Status Bar (New Feature)

**Decided:**

1. **Message Display:** Status bar shows **last message only**. Separate full-screen modal available to view complete **message log history**.
2. **Message Format:** **Plain text only** (no timestamp, no icon). User can view timestamp in full log if needed.
3. **Message Clearing:** Messages clear **on next user action** (menu selection, form input, navigation).
4. **Footer Layout:** **Scrollable if needed** — supports multi-line messages with arrow-key scrolling for long text.
5. **Positioning:** **Fixed at absolute screen bottom** — menu content stays above; status bar always visible at bottom.

---

## 7. Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial document created during Ideation | 2026-05-24 | SpecGantry |
| CHG-002 | Menu-driven UX overhaul: replace all CLI flags with full-screen interactive menu; rename `data/` to `university-ao/`; restructure data paths; add Config, dated outputs, Back navigation, Delete with confirmation | 2026-05-27 | SpecGantry |
| CHG-003 | Persistent status bar footer: display latest message from all operations (progress, warning, error, success); in-memory log with full-screen modal viewer; auto-clear on user action; multi-line scrollable support; new component C08 to manage status bar and log. REQ-0022–0025 added. | 2026-05-31 | DevAgent |

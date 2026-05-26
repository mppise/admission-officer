# C02 — Student Profile: Core Specification

## Purpose

Collects a student's holistic academic and extracurricular profile through a nested, menu-driven interface and stores it as a structured JSON and markdown file. On finalization, uses Gemini to enhance text fields — correcting spelling/grammar, ensuring consistency, and framing inputs as student strengths in an honest voice — before generating `profile.md`. Raw user input is always preserved in `profile.json`; the LLM enhancement is a rendering step only.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C02-F01 | Navigate and edit the student profile via a full-screen ink-based TUI; track completion status per field/section; gate finalization until all fields are `set` or `skipped` | P1 | REQ-0001, REQ-0002 | - |
| `Complete` | C02-F02 | Load existing `profile.json` on re-entry; resume the full-screen menu with current values pre-filled and completion indicators intact | P1 | REQ-0001 | - |
| `Complete` | C02-F03 | Display the stored student profile markdown to stdout | P1 | REQ-0003 | - |
| `Complete` | C02-F04 | On Finalize: enhance all text fields via Gemini (honest student voice, no marketing tone), then generate `profile.md` from enhanced data — raw `profile.json` is never modified | P1 | REQ-0013 | - |
| `Complete` | C02-F05 | Write `profile.json` after every individual field input — never lose data mid-session | P1 | REQ-0001 | - |
| `Complete` | C02-F06 | Capture shadowing experiences (organization, field, hours, period, description) via list management TUI; skippable per entry and as a whole section | P2 | REQ-0001 | - |
| `Complete` | C02-F07 | Capture research experiences (project title, institution, mentor, period, hours/week, description) via list management TUI; skippable per entry and as a whole section | P2 | REQ-0001 | - |

> ⚠️ Revised 2026-05-25: C02-F01 and C02-F02 revised — `enquirer` replaced with `ink` + `@inkjs/ui` for full-screen, large-font TUI. All menu logic and data flows are preserved; only the rendering layer changes. Decision ref: D-PRODUCT-AO000001, D-TECH-AO000008, D-TECH-AO000009.

---

## Menu Structure

> ⚠️ Revised 2026-05-25: All menus now rendered as full-screen ink components. `enquirer` is no longer used in C02. The menu hierarchy (Level 1 / Level 2 / Level 3) and all completion indicators are preserved; the visual treatment changes to full-screen with a prominent header block.

The interface is fully menu-driven and nested. There is no linear wizard. The same menu is used for both new profiles and edits.

### Screen Layout

Every screen occupies the full terminal viewport. Each screen has three zones:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER ZONE                                                │
│  ── Large app name + context title ──────────────────────  │
│  ── Student name + overall completion status ────────────  │
│                                                             │
│  MENU / CONTENT ZONE                                        │
│  ── Selectable list or input field ──────────────────────  │
│                                                             │
│  FOOTER ZONE                                                │
│  ── Keyboard hint: ↑↓ navigate · Enter select · Esc back  │
└─────────────────────────────────────────────────────────────┘
```

**Header zone:** Always visible. Renders:
- App title `ao — Admissions Officer` in bold large text (via `ink` `<Text bold>`)
- Current screen title (e.g., `Student Profile` or `Academics`) in a dimmed subtitle style
- Student name and overall completion pill (e.g., `Jane Smith  ●  3 sections pending`)

**Menu/content zone:** Scrollable `<SelectInput>` list (from `@inkjs/ui`) or `<TextInput>` for scalar fields.

**Footer zone:** Static keyboard hint row, always at the bottom.

### Level 1 — Main Menu

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Student Profile                                             ║
║                                                              ║
║  Jane Smith                             ● 2 sections pending ║
╚══════════════════════════════════════════════════════════════╝

  ▶  Personal                             ✓ complete
     Academics                            ● 2 fields pending
     Standardized Tests                   ○ not started
     Extracurriculars                     ✓ complete
     Awards & Recognitions                ○ not started
     Shadowing Experiences                ○ not started
     Research Experiences                 ○ not started
     ─────────────────────────────────────────────────────
     Finalize & Save                      (complete all sections first)
     Quit without saving

  ↑↓ navigate · Enter select
```

Completion indicators per section (unchanged from prior spec):
- `✓ complete` — all fields in section are `set` or `skipped`
- `● N fields pending` — section partially answered
- `○ not started` — no fields touched
- `– skipped` — user explicitly skipped entire section

`Finalize & Save` rendered in dimmed style with hint text when not yet enabled.

### Level 2 — Section Menu

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Academics                                                   ║
║                                                              ║
║  Jane Smith                                                  ║
╚══════════════════════════════════════════════════════════════╝

  ▶  GPA (Weighted)              ✓  4.3
     GPA (Unweighted)            ✓  3.9
     Class Rank                  –  skipped
     Transcript                  ●  2 years added
     ──────────────────────────────────────
     Skip entire section
     Back

  ↑↓ navigate · Enter select
```

Field indicators (unchanged):
- `✓  <value>` — set; value shown inline
- `–  skipped` — explicitly skipped
- `●  <summary>` — list with N entries
- `○` — not yet answered

### Level 3 — Scalar Field Input

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Academics › GPA (Weighted)                                  ║
║                                                              ║
║  Jane Smith                                                  ║
╚══════════════════════════════════════════════════════════════╝

  Weighted GPA (e.g., 4.3):  █

  [ Enter value ]   [ Skip this field ]

  ↑↓ select action · Enter confirm · Esc back
```

For skippable fields: two actions are offered after input — `Enter value` and `Skip this field` — rendered as a two-item `<SelectInput>`. For non-skippable fields: `<TextInput>` only.

### Level 3 — List Management

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Extracurriculars                                            ║
║                                                              ║
║  Jane Smith                                                  ║
╚══════════════════════════════════════════════════════════════╝

  ▶  1. Robotics Club — President
     2. Varsity Swimming — Captain
     ──────────────────────────────
     Add activity
     Skip extracurriculars
     Back

  ↑↓ navigate · Enter select
```

---

## Field Catalogue

### Section 1 — Personal

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `name` | `input` | No | Full legal name |
| `gradYear` | `input` | No | Expected graduation year (4-digit) |
| `highSchool` | `input` | No | High school name |
| `intendedMajors` | list | No | One entry per major/track; minimum 1 required |

### Section 2 — Academics

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `gpaWeighted` | `input` | No | Numeric, e.g. 4.3 |
| `gpaUnweighted` | `input` | No | Numeric, e.g. 3.9 |
| `classRank` | `input` | Yes | e.g. "12 of 450" |
| `transcript` | list | Yes | One entry per year; each entry has yearLabel + courses |

### Section 3 — Standardized Tests

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `sat.total` | `input` | Yes | 400–1600 |
| `sat.math` | `input` | Yes | 200–800 |
| `sat.reading` | `input` | Yes | 200–800 |
| `act.composite` | `input` | Yes | 1–36 |
| `apScores` | list | Yes | Subject + score (1–5) per entry |
| `ibScores` | list | Yes | Subject + predicted/final score per entry |

### Section 4 — Extracurriculars

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `extracurriculars` | list | Yes | activityName, role, yearsInvolved, hoursPerWeek, description per entry |

### Section 5 — Awards & Recognitions

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `awards` | list | Yes | awardName, level (select), year, description per entry |

### Section 6 — Shadowing Experiences

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `shadowing` | list | Yes | organization, field, hoursTotal, period, description per entry |

Each shadowing entry sub-fields:

| Sub-field | Prompt type | Skippable? | Notes |
| :-------- | :---------- | :--------- | :---- |
| `organization` | `input` | No | Where the shadowing took place (e.g., "Mass General Hospital") |
| `field` | `input` | No | Discipline or department (e.g., "Cardiology", "Environmental Law") |
| `hoursTotal` | `input` | Yes | Total hours logged (free text, e.g., "40") |
| `period` | `input` | No | Time period (e.g., "Summer 2023") |
| `description` | `input` | No | What the student observed or did; enhanced by LLM at Finalize |

### Section 7 — Research Experiences

| Field | Prompt type | Skippable? | Notes |
| :---- | :---------- | :--------- | :---- |
| `research` | list | Yes | projectTitle, institution, mentorName, period, hoursPerWeek, description per entry |

Each research entry sub-fields:

| Sub-field | Prompt type | Skippable? | Notes |
| :-------- | :---------- | :--------- | :---- |
| `projectTitle` | `input` | No | Title or brief name of the research |
| `institution` | `input` | No | Lab, university, organisation, or "Independent" |
| `mentorName` | `input` | Yes | PI or supervisor name |
| `period` | `input` | No | Time period (e.g., "June–August 2024") |
| `hoursPerWeek` | `input` | Yes | Approximate hours per week |
| `description` | `input` | No | Student's role and key contribution; enhanced by LLM at Finalize |

---

## Completion Model

Each field carries one of three statuses stored in `profile.json`:

| Status | Meaning |
| :----- | :------ |
| `pending` | Never answered in this session or any prior session |
| `set` | Has a value (including empty list explicitly confirmed as done) |
| `skipped` | User explicitly chose to skip |

**Finalization gate:** `Finalize & Save` is enabled only when every field in every section is `set` or `skipped`. The menu shows it as disabled (greyed label) otherwise.

**Section completion:** A section is `✓ complete` when all its fields are `set` or `skipped`.

---

## Data Flows

**F01 — New profile:**
`C01 dispatches buildStudentProfile(name?) → prompt for name if not provided → initialize ProfileData with all fields pending → open Main Menu → user navigates and edits fields → profile.json written after every field input (F05-JSON) → user selects Finalize & Save → write profile.md once (F05-MD) → return { profilePath }`

**F02 — Resume/edit existing:**
`C01 dispatches buildStudentProfile(name) → detect existing profile.json → load full ProfileData (values + field statuses) → open Main Menu with indicators reflecting loaded state → user navigates and edits → profile.json written after every field input (F05-JSON) → user selects Finalize & Save → write profile.md once (F05-MD) → return { profilePath }`

**F03 — Show:**
`C01 dispatches showStudentProfile(name) → resolve data/students/<slug>/profile.md → file exists? → read and print to stdout → return { markdownPath } → else: print "No profile found" + exit(1)`

**F04 — Enhance + generate markdown:**
`On Finalize & Save → load ProfileData from profile.json (raw, unmodified) → call Gemini with full ProfileData → receive EnhancedProfileData (text fields polished, raw values for scalar fields) → renderProfileMarkdown(enhancedData) → write profile.md → profile.json is never written during this step`

**F05-JSON — Incremental save:**
`After every individual field input → JSON.stringify(ProfileData including field statuses) → write to data/students/<slug>/profile.json`

**F05-MD — Final markdown generation:**
`On Finalize & Save → renderProfileMarkdown(data) → write to data/students/<slug>/profile.md`

---

## Execution Mode

Request-driven. Invoked by C01 per user command. Runs within the CLI process. Menu navigation uses `ink` React components rendered to the terminal via `ink`'s `render()` function. Each screen is a discrete `render()` call that resolves a promise when the user makes a selection or submits input — enabling the existing async/await menu loop to be preserved. No background processes.

# C02 — Student Profile: Core Specification

## Purpose

Collects a student's holistic academic and extracurricular profile through a nested, menu-driven interface and stores it as a structured JSON and markdown file. On finalization, uses Gemini to enhance text fields — correcting spelling/grammar, ensuring consistency, and framing inputs as student strengths in an honest voice — before generating `profile.md`. Raw user input is always preserved in `profile.json`; the LLM enhancement is a rendering step only.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Ready` | C02-F01 | Navigate and edit the student profile via a nested menu; track completion status per field/section; gate finalization until all fields are `set` or `skipped` | P1 | REQ-0001, REQ-0002 | - |
| `Ready` | C02-F02 | Load existing `profile.json` on re-entry; resume the same menu with current values pre-filled and completion indicators intact | P1 | REQ-0001 | - |
| `Complete` | C02-F03 | Display the stored student profile markdown to stdout | P1 | REQ-0003 | - |
| `Ready` | C02-F04 | On Finalize: enhance all text fields via Gemini (honest student voice, no marketing tone), then generate `profile.md` from enhanced data — raw `profile.json` is never modified | P1 | REQ-0013 | - |
| `Ready` | C02-F05 | Write `profile.json` after every individual field input — never lose data mid-session | P1 | REQ-0001 | - |

---

## Menu Structure

The interface is fully menu-driven and nested. There is no linear wizard. The same menu is used for both new profiles and edits.

### Level 1 — Main Menu

```
Student Profile: <name>                    ● 3 sections pending

  Personal                                 ✓ complete
  Academics                                ● 2 fields pending
  Standardized Tests                       ○ not started
  Extracurriculars                         ✓ complete
  Awards & Recognitions                    ○ not started
  Personal Statement                       ○ not started
  ─────────────────────────────────────
  Finalize & Save                          (disabled until all ✓ or –)
  Quit without saving
```

Completion indicators per section:
- `✓ complete` — all fields in section are `set` or `skipped`
- `● N fields pending` — section has been partially entered
- `○ not started` — no fields in section have been touched
- `– skipped` — user explicitly skipped the entire section

### Level 2 — Section Menu

Selecting a section opens its field list:

```
Academics

  GPA (Weighted)          ✓  4.3
  GPA (Unweighted)        ✓  3.9
  Class Rank              –  skipped
  Transcript              ●  2 years added
  ─────────────────────────────────────
  Skip entire section
  Back
```

Field indicators:
- `✓  <value>` — field is set; current value shown inline
- `–  skipped` — field was explicitly skipped by user
- `●  <summary>` — list field with N entries
- `○` — not yet answered

### Level 3 — Field Edit / List Management

**Scalar field:** Opens an `input` or `select` prompt pre-filled with current value. User edits and confirms → value saved → back to Section Menu.

**Skippable field:** After any scalar prompt, offer `[Enter value / Skip]` — selecting Skip marks the field `skipped`.

**List field (transcript, ECs, awards, AP/IB scores):** Opens a list management sub-menu:

```
Transcript  (2 entries)

  9th Grade   →  4 courses
  10th Grade  →  3 courses
  ─────────────────────────
  Add entry
  Back
```

Selecting an existing entry opens an edit sub-menu:
```
  Edit entry
  Remove entry
  Back
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

Request-driven. Invoked by C01 per user command. Runs within the CLI process. Menu navigation uses Enquirer prompts (async/await). No background processes.

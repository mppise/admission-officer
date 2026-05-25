# C02 — Student Profile: Core Specification

## Purpose

Collects a student's holistic academic and extracurricular profile through an interactive wizard and stores it as a structured markdown file. Also provides display of the stored profile. Fully offline — no AI or external service calls.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C02-F01 | Run the student profile wizard to collect all profile fields interactively and save to markdown | P1 | REQ-0001, REQ-0002 | - |
| `Complete` | C02-F02 | Detect an existing profile and prompt to update (section by section) rather than overwriting silently | P1 | REQ-0001 | - |
| `Complete` | C02-F03 | Display the stored student profile markdown to stdout | P1 | REQ-0003 | - |
| `Complete` | C02-F04 | Store the profile as a structured markdown file at the canonical path | P1 | REQ-0013 | - |

---

## Wizard Question Sequence

The wizard collects data in sections. Each section is independently re-runnable (for updates). Enquirer prompt types are specified per field.

### Section 1 — Personal

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `name` | `input` | Yes | Full legal name; used as display only — directory slug comes from C01 |
| `gradYear` | `input` | Yes | Expected graduation year (4-digit) |
| `highSchool` | `input` | Yes | High school name |
| `intendedMajor` | `input` | Yes | Major or academic track (e.g., Computer Science, Pre-Med, BS/MD) |

### Section 2 — Academics

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `gpaWeighted` | `input` | Yes | Weighted GPA (numeric, e.g., 4.3) |
| `gpaUnweighted` | `input` | Yes | Unweighted GPA (numeric, e.g., 3.9) |
| `classRank` | `input` | No | e.g., "12 of 450" — free text |
| `transcript` | multi-step loop | Yes | One entry per year: year label + list of courses with letter grades (see Transcript Entry below) |

#### Transcript Entry (per academic year)

Repeated for each year the student has completed:

| Field | Prompt type | Notes |
| :---- | :---------- | :---- |
| `yearLabel` | `input` | e.g., "9th Grade", "10th Grade" |
| `courses` | repeating `input` pairs | Course name + letter grade; loop until student confirms done |

### Section 3 — Standardized Tests

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `sat.total` | `input` | No | Total SAT score (e.g., 1520) |
| `sat.math` | `input` | No | SAT Math subscore |
| `sat.reading` | `input` | No | SAT Evidence-Based Reading & Writing subscore |
| `act.composite` | `input` | No | ACT composite score (e.g., 34) |
| `apScores` | repeating `input` pairs | No | Subject name + score (1–5); loop until done |
| `ibScores` | repeating `input` pairs | No | Subject name + predicted/final score; loop until done |

### Section 4 — Extracurriculars

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `extracurriculars` | repeating structured entry | No | One entry per activity (see below); loop until done |

#### Extracurricular Entry

| Field | Prompt type | Notes |
| :---- | :---------- | :---- |
| `activityName` | `input` | e.g., "Varsity Soccer", "Robotics Club" |
| `role` | `input` | e.g., "Captain", "Member", "President" |
| `yearsInvolved` | `input` | e.g., "2021–2024" |
| `hoursPerWeek` | `input` | Approximate hours per week |
| `description` | `input` | One-sentence description of impact/involvement |

### Section 5 — Awards & Recognitions

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `awards` | repeating structured entry | No | One entry per award; loop until done |

#### Award Entry

| Field | Prompt type | Notes |
| :---- | :---------- | :---- |
| `awardName` | `input` | e.g., "National Merit Scholar Finalist" |
| `level` | `select` | Local / Regional / State / National / International |
| `year` | `input` | Year received |
| `description` | `input` | One-sentence description |

### Section 6 — Personal Statement Drafts (Optional)

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `hasPersonalStatement` | `confirm` | No | Yes/No — if No, section skipped |
| `personalStatementSummary` | `input` | Conditional | Brief summary or key themes (not the full essay) |

---

## Data Flows

**F01 — Build (new profile):**
`C01 dispatches buildStudentProfile(name?) → prompt for name if not provided → run wizard section by section → assemble ProfileData object → serialize to markdown → write to data/students/<slug>/profile.md → return { profilePath }`

**F02 — Build (update existing):**
`C01 dispatches buildStudentProfile(name) → detect existing profile.md → prompt: "Profile exists. Update a section?" → select section → run wizard for that section only → merge with existing data → rewrite profile.md → return { profilePath }`

**F03 — Show:**
`C01 dispatches showStudentProfile(name) → resolve data/students/<slug>/profile.md → file exists? → read and print to stdout → return { markdownPath } → else: print "No profile found" + exit(1)`

**F04 — Write:**
`ProfileData object → renderProfileMarkdown(data) → fs.writeFile(path, markdown, 'utf8') → confirm write`

---

## Execution Mode

Request-driven. Invoked by C01 per user command. Runs synchronously within the CLI process. Interactive wizard uses Enquirer prompts (async/await). No background processes.

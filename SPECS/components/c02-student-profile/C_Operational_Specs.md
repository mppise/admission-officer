# C02 — Student Profile: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C02-F01 Wizard | User-caused (invalid input) | 0 — re-prompt inline | — | Enquirer re-prompts on validation failure |
| C02-F02 Update detection | Permanent (file read error) | 0 | — | Print error + exit(1) |
| C02-F03 Show | Permanent (file not found) | 0 | — | `No profile found for "<name>". Run: ao --student-profile --build --name <name>` |
| C02-F04 Write | Permanent (disk write error) | 0 | — | Print `Failed to save profile: <plain reason>` + exit(1) |

No external calls — no transient errors possible in C02.

---

## UX Detail

### C02-F01 — New Profile Wizard Flow

```
1. Print header: "Let's build your student profile. You can update any section later."
2. Run Section 1 (Personal) — always first
3. Run Section 2 (Academics)
   3a. After GPA fields, enter transcript loop:
       - Prompt: "Add an academic year? (Yes/No)"
       - If Yes: prompt yearLabel, then enter course loop:
           - Prompt: "Add a course? (Yes/No)"
           - If Yes: prompt course name + grade → repeat
           - If No: return to year loop
       - If No: exit transcript loop
4. Run Section 3 (Standardized Tests) — each subsection optional
5. Run Section 4 (Extracurriculars)
   - Enter activity loop: "Add an activity? (Yes/No)"
   - Each entry: name, role, years, hrs/week, description
6. Run Section 5 (Awards)
   - Enter awards loop: "Add an award? (Yes/No)"
   - Each entry: name, level (select), year, description
7. Run Section 6 (Personal Statement)
   - Confirm: "Do you have a personal statement draft or key themes to note? (Yes/No)"
   - If Yes: prompt for summary
8. Print: "Profile saved: data/students/<slug>/profile.md"
```

### C02-F02 — Update Existing Profile Flow

```
1. Detect existing profile.md
2. Print: "A profile already exists for <name>. Which section would you like to update?"
3. Present section select (Enquirer `select`):
   - Personal | Academics | Standardized Tests | Extracurriculars | Awards | Personal Statement | All sections
4. Run wizard for selected section(s) only
5. Merge: existing fields not in selected section are preserved unchanged
6. Rewrite profile.md with merged data
7. Print: "Profile updated: data/students/<slug>/profile.md"
```

### C02-F03 — Show Flow

```
1. Resolve path: data/students/<slug>/profile.md
2. If not found: print error + exit(1)
3. Print full markdown content to stdout (raw markdown — terminal renders it)
```

### Input Validation

| Field | Validation rule | Error message |
| :---- | :-------------- | :------------ |
| `gpaWeighted` | Numeric, 0.0–5.0 | "GPA must be a number between 0.0 and 5.0" |
| `gpaUnweighted` | Numeric, 0.0–4.0 | "Unweighted GPA must be between 0.0 and 4.0" |
| `gradYear` | 4-digit integer, 2020–2035 | "Please enter a valid graduation year (e.g., 2026)" |
| `sat.total` | Integer, 400–1600, or blank | "SAT total must be between 400 and 1600" |
| `act.composite` | Integer, 1–36, or blank | "ACT composite must be between 1 and 36" |
| `apScores[].score` | Integer, 1–5, or blank | "AP scores must be between 1 and 5" |
| `intendedMajor` | Non-empty string | "Intended major is required" |
| `name` | Non-empty string | "Name is required" |

---

## Data Specifics

### Field-Level Schema

| Field | Type | Nullable | Validation | PII? | Notes |
| :---- | :--- | :------- | :--------- | :--- | :---- |
| `name` | string | No | Non-empty | Yes | Display only; not used as path identifier |
| `gradYear` | number | No | 2020–2035 | No | |
| `highSchool` | string | No | Non-empty | No | |
| `intendedMajor` | string | No | Non-empty | No | Critical for prerequisite check |
| `gpaWeighted` | number | No | 0.0–5.0 | No | |
| `gpaUnweighted` | number | No | 0.0–4.0 | No | |
| `classRank` | string | Yes | Free text | No | e.g., "12 of 450" |
| `transcript[].yearLabel` | string | No | Non-empty | No | e.g., "9th Grade" |
| `transcript[].courses[].name` | string | No | Non-empty | No | |
| `transcript[].courses[].grade` | string | No | Non-empty | No | Letter grade e.g., "A", "B+" |
| `sat.total` | number | Yes | 400–1600 | No | |
| `sat.math` | number | Yes | 200–800 | No | |
| `sat.reading` | number | Yes | 200–800 | No | |
| `act.composite` | number | Yes | 1–36 | No | |
| `apScores[].subject` | string | Yes | Non-empty | No | |
| `apScores[].score` | number | Yes | 1–5 | No | |
| `ibScores[].subject` | string | Yes | Non-empty | No | |
| `ibScores[].score` | string | Yes | Non-empty | No | Predicted or final, free text |
| `extracurriculars[].activityName` | string | Yes | Non-empty | No | |
| `extracurriculars[].role` | string | Yes | Non-empty | No | |
| `extracurriculars[].yearsInvolved` | string | Yes | Non-empty | No | e.g., "2021–2024" |
| `extracurriculars[].hoursPerWeek` | string | Yes | Non-empty | No | Approximate, free text |
| `extracurriculars[].description` | string | Yes | Non-empty | No | |
| `awards[].awardName` | string | Yes | Non-empty | No | |
| `awards[].level` | enum | Yes | Local/Regional/State/National/International | No | |
| `awards[].year` | string | Yes | Non-empty | No | |
| `awards[].description` | string | Yes | Non-empty | No | |
| `personalStatementSummary` | string | Yes | Free text | No | Key themes, not full text |

**PII fields:** `name` only. Stored locally on student's own machine — no transmission.

**Retention:** User-managed. No automated deletion or archival.

---

## Security Detail

- No external network calls — no injection surface from remote data.
- Name field (PII) stored in plaintext markdown on local filesystem — user's OS-level protection applies.
- No path traversal possible — directory slug is sanitised by C01 before being passed to C02.
- No `exec`, `spawn`, or `eval` — file I/O only via `fs/promises`.

---

## Compliance Obligations

| Data element | Basis | Notes |
| :----------- | :---- | :---- |
| Student name | User consent (self-entered) | Stored locally; not transmitted |
| Academic record | User consent (self-entered) | Stored locally; not transmitted |

No regulatory obligations apply. All data stored locally.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Wizard start | `Building student profile...` to stdout |
| Section complete | `Section saved.` inline during wizard |
| Save success | `Saved: data/students/<slug>/profile.md` to stdout |
| Update success | `Updated: data/students/<slug>/profile.md` to stdout |
| File not found | Error to stderr with corrective action |
| Write failure | Error to stderr with plain reason |

---

## Infrastructure

No environment variables required. C02 is fully offline.

---

## AI Behavior

Not applicable. C02 makes no AI calls.

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable.

---

## Scalability

Not applicable. Single-user local CLI.

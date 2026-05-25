# C02 — Student Profile: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C02-F01 Menu navigation | User-caused (invalid input) | 0 — re-prompt inline | — | Enquirer re-prompts on validation failure |
| C02-F02 Load existing profile | Permanent (file read / parse error) | 0 | — | Print error + exit(1) |
| C02-F03 Show | Permanent (file not found) | 0 | — | `No profile found for "<name>". Run: ao --student-profile --build --name <name>` |
| C02-F04 Gemini enhancement | Transient (API error) | 1 retry after 30s | 30s fixed | On second failure: skip enhancement, write profile.md from raw ProfileData, print warning |
| C02-F04 Generate markdown | Permanent (disk write error) | 0 | — | Print `Failed to save profile: <plain reason>` + exit(1) |
| C02-F05 Incremental JSON save | Permanent (disk write error) | 0 | — | Print `Failed to save profile: <plain reason>` + exit(1) |

No external calls — no transient errors possible in C02.

---

## UX Detail

### C02-F01 / F02 — Menu Navigation Flow

```
Entry:
1. If name not provided, prompt: "Your full legal name:"
2. Resolve slug → check for profile.json
   - Found: load ProfileData + fieldStatus → resume menu (F02)
   - Not found: initialize ProfileData with all fields empty, all fieldStatus = pending (F01)
3. Open Main Menu (Level 1)

Main Menu loop:
4. Render section list with completion indicators:
     ✓ complete    — all fields in section are set or skipped
     ● N pending   — section partially answered
     ○ not started — no fields touched
     – skipped     — entire section skipped
5. Show "Finalize & Save" — disabled (greyed) if any field is pending
6. Show "Quit without saving"
7. User selects a section → open Section Menu (Level 2)
8. User selects "Finalize & Save" (only when enabled) → F04 + F05-MD → exit
9. User selects "Quit without saving" → exit without writing profile.md

Section Menu loop (Level 2):
10. Render field list with indicators:
      ✓  <value>    — field is set; current value shown inline (truncated if long)
      –  skipped    — field was explicitly skipped
      ●  N entries  — list field with N items
      ○             — not yet answered
11. Show "Skip entire section" — marks all pending fields in section as skipped
12. Show "Back" → return to Main Menu
13. User selects a field → open Field Edit (Level 3)

Field Edit (Level 3 — scalar):
14. Display current value (if set) as prompt initial
15. Prompt: "[Enter value]  or  [Skip]"
    - Value entered → fieldStatus = set → write profile.json (F05-JSON) → back to Section Menu
    - Skip selected → fieldStatus = skipped → write profile.json (F05-JSON) → back to Section Menu

Field Edit (Level 3 — list):
16. Open List Management sub-menu:
      <entry 1 summary>
      <entry 2 summary>
      ─────────────────
      Add entry
      Back
17. Selecting an existing entry opens:
      Edit entry     → re-prompt all sub-fields pre-filled → save → back to list
      Remove entry   → confirm → remove → back to list
      Back           → back to list
18. "Add entry" → prompt all sub-fields → append → fieldStatus = set
    → write profile.json (F05-JSON) after each sub-field input
19. After any list change → back to List Management sub-menu
20. "Back" from list → fieldStatus = set (if ≥1 entry) or skipped (if explicitly emptied)
    → back to Section Menu
```

### C02-F04 / F05-MD — Finalize & Save

```
1. All fields confirmed set or skipped (gate enforced by menu)
2. Set data.lastUpdated = today's ISO date
3. Write profile.json one final time with updated lastUpdated (F05-JSON)
4. Print: "Enhancing your profile..."
5. Call Gemini with full raw ProfileData:
   - Persona: senior college counsellor
   - Task: fix spelling/grammar/capitalisation on all text fields;
           reframe descriptive fields as concrete student strengths
           in honest first-person voice; no superlatives or marketing language;
           preserve all factual/numeric fields exactly as received
   - Output: JSON with same structure as ProfileData
6. On Gemini success: use EnhancedProfileData for rendering
   On Gemini failure (after 1 retry): use raw ProfileData; print warning:
   "Profile enhancement unavailable — saved with original text."
7. renderProfileMarkdown(data) → write profile.md
8. Print: "Profile saved: data/students/<slug>/profile.md"
```

### C02-F05-JSON — Incremental Save

```
1. Triggered after every individual field input (scalar or list sub-field)
2. Serialize full ProfileData + fieldStatus → JSON.stringify(data, null, 2)
3. Write to data/students/<slug>/profile.json
4. Silent on success — no console output
5. Throw on failure — propagates to F01/F02 error handler
```

### C02-F03 — Show Flow

```
1. Resolve path: data/students/<slug>/profile.md
2. If not found: print error + exit(1)
3. Print full markdown content to stdout
```

---

### Input Validation

| Field | Validation rule | Error message |
| :---- | :-------------- | :------------ |
| `name` | Non-empty string | "Name is required" |
| `gradYear` | 4-digit integer, 2020–2035 | "Please enter a valid graduation year (e.g., 2026)" |
| `gpaWeighted` | Numeric, 0.0–5.0 | "GPA must be a number between 0.0 and 5.0" |
| `gpaUnweighted` | Numeric, 0.0–4.0 | "Unweighted GPA must be between 0.0 and 4.0" |
| `sat.total` | Integer, 400–1600, or blank | "SAT total must be between 400 and 1600" |
| `act.composite` | Integer, 1–36, or blank | "ACT composite must be between 1 and 36" |
| `apScores[].score` | Integer, 1–5 | "AP scores must be between 1 and 5" |
| `intendedMajors` | Minimum 1 entry | "At least one intended major or track is required" |

---

## Data Specifics

### Field-Level Schema

| Field | Type | Skippable | Validation | PII? | Notes |
| :---- | :--- | :-------- | :--------- | :--- | :---- |
| `name` | string | No | Non-empty | Yes | Display only; not used as path identifier |
| `gradYear` | string | No | 2020–2035 | No | |
| `highSchool` | string | No | Non-empty | No | |
| `intendedMajors` | string[] | No | Min 1 entry | No | Critical for prerequisite check |
| `gpaWeighted` | string | No | 0.0–5.0 | No | |
| `gpaUnweighted` | string | No | 0.0–4.0 | No | |
| `classRank` | string | Yes | Free text | No | e.g., "12 of 450" |
| `transcript[].yearLabel` | string | Yes | Non-empty | No | e.g., "9th Grade" |
| `transcript[].courses[].name` | string | No | Non-empty | No | |
| `transcript[].courses[].grade` | string | No | Non-empty | No | Letter grade e.g., "A", "B+" |
| `sat.total` | string | Yes | 400–1600 | No | |
| `sat.math` | string | Yes | 200–800 | No | |
| `sat.reading` | string | Yes | 200–800 | No | |
| `act.composite` | string | Yes | 1–36 | No | |
| `apScores[].subject` | string | Yes | Non-empty | No | |
| `apScores[].score` | string | Yes | 1–5 | No | |
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

**PII fields:** `name` only. Stored locally on student's own machine — no transmission.

---

## Security Detail

- No external network calls — no injection surface from remote data.
- Name field (PII) stored in plaintext on local filesystem — user's OS-level protection applies.
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
| Session start | `Building student profile...` or `Resuming student profile...` to stdout |
| Field saved | Silent — no console output (avoids noise during menu navigation) |
| Enhancement start | `Enhancing your profile...` to stdout |
| Enhancement skipped | `Profile enhancement unavailable — saved with original text.` to stdout |
| Finalize success | `Profile saved: data/students/<slug>/profile.md` to stdout |
| File not found | Error to stderr with corrective action |
| Write failure | Error to stderr with plain reason |

---

## Infrastructure

Requires `GEMINI_API_KEY` and `GEMINI_MODEL` environment variables for the F04 enhancement call. All other operations are fully offline.

---

## AI Behavior

One Gemini call per Finalize & Save. Uses `GEMINI_MODEL` and `GEMINI_API_KEY` from environment (same config as C03/C04/C05). Temperature: 0.2. Single retry on failure with 30s delay. Falls back to raw ProfileData if both attempts fail — profile.md is still written.

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable.

---

## Scalability

Not applicable. Single-user local CLI.

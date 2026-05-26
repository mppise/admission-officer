# C02 — Student Profile: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C02-F01 Menu navigation | User-caused (invalid input) | 0 — re-render inline | — | ink `<TextInput>` re-renders with prior value; SelectInput ignores invalid keys |
| C02-F02 Load existing profile | Permanent (file read / parse error) | 0 | — | Print error + exit(1) |
| C02-F03 Show | Permanent (file not found) | 0 | — | `No profile found for "<name>". Run: ao --student-profile --build --name <name>` |
| C02-F04 Gemini enhancement | Transient (API error) | 1 retry after 30s | 30s fixed | On second failure: skip enhancement, write profile.md from raw ProfileData, print warning |
| C02-F04 Generate markdown | Permanent (disk write error) | 0 | — | Print `Failed to save profile: <plain reason>` + exit(1) |
| C02-F05 Incremental JSON save | Permanent (disk write error) | 0 | — | Print `Failed to save profile: <plain reason>` + exit(1) |

No external calls — no transient errors possible in C02.

---

## UX Detail

> ⚠️ Revised 2026-05-25: All menu screens are now full-screen ink components. `enquirer` is no longer used in C02. The async/await menu loop structure is preserved; each screen is implemented as a discrete `ink` `render()` call that resolves a promise on user action.

### ink Component Architecture

Each screen is a functional React component rendered via `ink`'s `render()` wrapped in a `Promise`. The pattern for every interactive screen:

```typescript
function waitForSelection(choices: Choice[], title: string, subtitle: string): Promise<string> {
  return new Promise(resolve => {
    const { unmount } = render(
      <ProfileScreen title={title} subtitle={subtitle}>
        <SelectInput items={choices} onSelect={item => { unmount(); resolve(item.value); }} />
      </ProfileScreen>
    );
  });
}

function waitForInput(prompt: string, initial: string, title: string): Promise<string> {
  return new Promise(resolve => {
    const { unmount } = render(
      <ProfileScreen title={title}>
        <TextInput placeholder={prompt} initialValue={initial}
          onSubmit={val => { unmount(); resolve(val); }} />
      </ProfileScreen>
    );
  });
}
```

`ProfileScreen` is a shared layout component that renders the three-zone layout (header / content / footer) on every screen.

### Shared Layout Component — `ProfileScreen`

```tsx
<Box flexDirection="column" height={process.stdout.rows}>
  {/* HEADER */}
  <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
    <Text bold color="cyan">ao — Admissions Officer</Text>
    <Text dimColor>{subtitle}</Text>
    <Text> </Text>
    <Text bold>{studentName}{'  '}<Text color="yellow">{completionPill}</Text></Text>
  </Box>

  {/* CONTENT */}
  <Box flexGrow={1} flexDirection="column" paddingX={2} paddingY={1}>
    {children}
  </Box>

  {/* FOOTER */}
  <Box paddingX={2}>
    <Text dimColor>↑↓ navigate · Enter select · Esc back</Text>
  </Box>
</Box>
```

`height={process.stdout.rows}` pins the outer box to the full terminal height, ensuring the layout fills the screen on all terminal sizes.

### C02-F01 / F02 — Menu Navigation Flow

```
Entry:
1. If name not provided: render full-screen TextInput → "Your full legal name:"
2. Resolve slug → check for profile.json
   - Found: load ProfileData + fieldStatus → resume menu (F02)
   - Not found: initialize ProfileData with all fields empty, all fieldStatus = pending (F01)
3. Render Main Menu screen (Level 1)

Main Menu loop:
4. Render full-screen SelectInput with section list + completion indicators:
     ✓ complete    — all fields in section are set or skipped
     ● N pending   — section partially answered
     ○ not started — no fields touched
     – skipped     — entire section skipped
5. "Finalize & Save" shown in dimmed style with hint "(complete all sections first)" when not enabled
6. "Quit without saving" always shown
7. User selects a section → render Section Menu screen (Level 2)
8. User selects "Finalize & Save" (enabled only when allComplete) → F04 + F05-MD → exit
9. User selects "Quit without saving" → exit without writing profile.md

Section Menu loop (Level 2):
10. Render full-screen SelectInput with field list + inline indicators
11. "Skip entire section" — marks all pending fields in section as skipped
12. "Back" → return to Main Menu
13. User selects a field → render Field Edit screen (Level 3)

Field Edit (Level 3 — scalar, non-skippable):
14. Render full-screen TextInput pre-filled with current value
15. User submits → fieldStatus = set → write profile.json (F05-JSON) → back to Section Menu

Field Edit (Level 3 — scalar, skippable):
14. Render full-screen SelectInput with choices:
    - "Enter value" → render TextInput → on submit → fieldStatus = set → save → back
    - "Skip this field" → fieldStatus = skipped → save → back
    - "Keep: <current value>" (if already set) → no change → back

Field Edit (Level 3 — list):
16. Render full-screen list management SelectInput:
      <entry 1 summary>
      <entry 2 summary>
      ─────────────────
      Add entry
      [Skip / Remove options]
      Back
17. Selecting an existing entry renders:
      Edit entry     → re-render all sub-field TextInputs pre-filled → save → back to list
      Remove entry   → remove immediately → back to list
      Back           → back to list
18. "Add entry" → render sub-field TextInputs sequentially → append → fieldStatus = set
    → write profile.json (F05-JSON) after each sub-field
19. After any list change → re-render list management screen
20. "Back" from list → back to Section Menu
```

### C02-F04 / F05-MD — Finalize & Save

```
1. All fields confirmed set or skipped (gate enforced by allComplete())
2. Set data.lastUpdated = today's ISO date
3. Write profile.json one final time (F05-JSON)
4. Print to stdout (outside ink): "Enhancing your profile..."
5. Call Gemini with full raw ProfileData
6. On success: use EnhancedProfileData for rendering
   On failure (after 1 retry): use raw ProfileData; print warning:
   "Profile enhancement unavailable — saved with original text."
7. renderProfileMarkdown(data) → write profile.md
8. Print: "Profile saved: data/students/<slug>/profile.md"
```

### C02-F05-JSON — Incremental Save

```
1. Triggered after every individual field input (scalar or list sub-field)
2. Serialize full ProfileData + fieldStatus → JSON.stringify(data, null, 2)
3. Write to data/students/<slug>/profile.json
4. Silent on success
5. Throw on failure — propagates to error handler
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
| `shadowing[].organization` | string | No | Non-empty | No | Where the shadowing took place |
| `shadowing[].field` | string | No | Non-empty | No | Discipline/department (e.g., "Cardiology") |
| `shadowing[].hoursTotal` | string | Yes | Free text | No | Approximate total hours |
| `shadowing[].period` | string | No | Non-empty | No | e.g., "Summer 2023" |
| `shadowing[].description` | string | No | Non-empty | No | |
| `research[].projectTitle` | string | No | Non-empty | No | |
| `research[].institution` | string | No | Non-empty | No | Lab, university, org, or "Independent" |
| `research[].mentorName` | string | Yes | Free text | No | PI or supervisor; skippable |
| `research[].period` | string | No | Non-empty | No | e.g., "June–August 2024" |
| `research[].hoursPerWeek` | string | Yes | Free text | No | Approximate |
| `research[].description` | string | No | Non-empty | No | |

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

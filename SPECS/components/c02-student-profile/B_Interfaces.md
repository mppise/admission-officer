# C02 — Student Profile: Interfaces

## Exposed Functions (called by C01)

```typescript
buildStudentProfile(name?: string): Promise<{ profilePath: string }>
```
- If `name` is undefined, prompts for it as the first input before opening the menu.
- If `profile.json` exists at the resolved path, loads it and resumes the menu with existing values and field statuses.
- Returns the absolute path to the saved `profile.md` (written on Finalize & Save).

```typescript
showStudentProfile(name: string): Promise<{ markdownPath: string }>
```
- Reads and prints `data/students/<slug>/profile.md` to stdout.
- Returns the absolute path to the markdown file (for C06 `--print` composition).
- Throws with actionable message if file does not exist.

---

## JSON Sidecar Schema

**Path:** `data/students/<slug>/profile.json`
**Encoding:** UTF-8
**Role:** Canonical source of truth. Written after every individual field input. Read on every session start. Includes field-level completion statuses alongside values.

```json
{
  "name": "string",
  "gradYear": "string",
  "highSchool": "string",
  "intendedMajors": ["string"],
  "gpaWeighted": "string",
  "gpaUnweighted": "string",
  "classRank": "string",
  "transcript": [
    { "yearLabel": "string", "courses": [{ "name": "string", "grade": "string" }] }
  ],
  "sat": { "total": "string", "math": "string", "reading": "string" },
  "act": { "composite": "string" },
  "apScores": [{ "subject": "string", "score": "string" }],
  "ibScores": [{ "subject": "string", "score": "string" }],
  "extracurriculars": [
    {
      "activityName": "string",
      "role": "string",
      "yearsInvolved": "string",
      "hoursPerWeek": "string",
      "description": "string"
    }
  ],
  "awards": [
    { "awardName": "string", "level": "string", "year": "string", "description": "string" }
  ],
  "shadowing": [
    {
      "organization": "string",
      "field": "string",
      "hoursTotal": "string",
      "period": "string",
      "description": "string"
    }
  ],
  "research": [
    {
      "projectTitle": "string",
      "institution": "string",
      "mentorName": "string",
      "period": "string",
      "hoursPerWeek": "string",
      "description": "string"
    }
  ],
  "generatedDate": "string",
  "lastUpdated": "string",
  "fieldStatus": {
    "name": "pending | set | skipped",
    "gradYear": "pending | set | skipped",
    "highSchool": "pending | set | skipped",
    "intendedMajors": "pending | set | skipped",
    "gpaWeighted": "pending | set | skipped",
    "gpaUnweighted": "pending | set | skipped",
    "classRank": "pending | set | skipped",
    "transcript": "pending | set | skipped",
    "satTotal": "pending | set | skipped",
    "satMath": "pending | set | skipped",
    "satReading": "pending | set | skipped",
    "actComposite": "pending | set | skipped",
    "apScores": "pending | set | skipped",
    "ibScores": "pending | set | skipped",
    "extracurriculars": "pending | set | skipped",
    "awards": "pending | set | skipped",
    "shadowing": "pending | set | skipped",
    "research": "pending | set | skipped"
  }
}
```

---

## Markdown File Schema

**Path:** `data/students/<slug>/profile.md`
**Encoding:** UTF-8
**Role:** Human-readable display and AI prompt input. Written exactly once per session on Finalize & Save. Never parsed back to structured data.

```markdown
# Student Profile: <name>

**Generated:** <ISO date>
**Last Updated:** <ISO date>

---

## Personal

| Field | Value |
| :---- | :---- |
| Full Name | |
| Graduation Year | |
| High School | |
| Intended Majors / Tracks | |

---

## Academic Record

| Metric | Value |
| :----- | :---- |
| GPA (Weighted) | |
| GPA (Unweighted) | |
| Class Rank | |

### Transcript

#### <Year Label>

| Course | Grade |
| :----- | :---- |
| <course> | <grade> |

*(repeated per year)*

---

## Standardized Tests

### SAT
| Section | Score |
| :------ | :---- |
| Total | |
| Math | |
| Evidence-Based Reading & Writing | |

### ACT
| Section | Score |
| :------ | :---- |
| Composite | |

### AP Scores
| Subject | Score |
| :------ | :---- |

### IB Scores
| Subject | Score |
| :------ | :---- |

---

## Extracurricular Activities

| Activity | Role | Years | Hrs/Week | Description |
| :------- | :--- | :---- | :------- | :---------- |

---

## Awards & Recognitions

| Award | Level | Year | Description |
| :---- | :---- | :--- | :---------- |

---

## Shadowing Experiences

| Organization | Field | Hours | Period | Description |
| :----------- | :---- | :---- | :----- | :---------- |

---

## Research Experiences

| Project | Institution | Mentor | Period | Hrs/Week | Description |
| :------ | :---------- | :----- | :----- | :------- | :---------- |

---

## Personal Statement

**Key Themes / Summary:**
<summary text or "Not provided">
```

---

## Consumed By

| Component | What it reads | Field(s) |
| :-------- | :------------ | :------- |
| C01 CLI Shell | Prerequisite check | `intendedMajors` (presence + non-empty) |
| C04 Guidance Engine | Full profile for Gemini prompt | Entire `profile.md` |
| C05 Essay Advisor | Full profile for Gemini prompt | Entire `profile.md` |
| C06 PDF Exporter | Markdown → PDF | `markdownPath` |

Note: C04, C05, C06 consume `profile.md` only. `profile.json` is internal to C02.

---

## LLM Enhancement Contract

**Service:** Gemini (same model as C03/C04/C05 — `GEMINI_MODEL` env var).

**Trigger:** Called once at Finalize & Save, between loading `profile.json` and writing `profile.md`.

**Input:** Full raw `ProfileData` from `profile.json`.

**Output:** `EnhancedProfileData` — structurally identical to `ProfileData`; only text fields are modified.

### Fields passed through unchanged (LLM must not alter)

These are factual/numeric — any change would be a data integrity violation:

`name`, `gradYear`, `highSchool`, `intendedMajors[]`, `gpaWeighted`, `gpaUnweighted`, `classRank`, `sat.*`, `act.*`, `apScores[].subject`, `apScores[].score`, `ibScores[].subject`, `ibScores[].score`, `awards[].level`, `awards[].year`, `extracurriculars[].yearsInvolved`, `extracurriculars[].hoursPerWeek`, `shadowing[].organization`, `shadowing[].field`, `shadowing[].hoursTotal`, `shadowing[].period`, `research[].projectTitle`, `research[].institution`, `research[].mentorName`, `research[].period`, `research[].hoursPerWeek`, `generatedDate`, `lastUpdated`

### Fields enhanced by LLM

| Field | Enhancement goal |
| :---- | :--------------- |
| `highSchool` | Fix spelling/capitalisation only |
| `extracurriculars[].activityName` | Fix spelling/capitalisation only |
| `extracurriculars[].role` | Fix spelling/capitalisation only |
| `extracurriculars[].description` | Correct grammar/spelling; reframe as concrete student strength in honest first-person voice; no superlatives or marketing language |
| `awards[].awardName` | Fix spelling/capitalisation only |
| `awards[].description` | Correct grammar/spelling; highlight significance from student's perspective; honest voice |
| `shadowing[].description` | Correct grammar/spelling; make observations and learning concrete and specific; honest first-person voice |
| `research[].description` | Correct grammar/spelling; highlight the student's specific contribution and skills demonstrated; honest first-person voice |

### Prompt contract

- Persona: senior college counsellor reviewing a student's self-reported profile
- Tone: honest, specific, grounded — never boastful or generic
- Must not: invent facts, add claims not in the original, use phrases like "passionate about", "dedicated to", "driven by"
- Must: preserve the student's intended meaning; fix errors silently; keep descriptions concise
- Output: JSON object with the same structure as `ProfileData` — only the fields listed above may differ from input

---

## Events

C02 produces and consumes no events. All interaction is via direct function calls.

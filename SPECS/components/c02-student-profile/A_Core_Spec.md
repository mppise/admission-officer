---
name: c02-student-profile-core
description: C02 Student Profile Builder — Feature specification
---

Architecture refs: 0_Overview.md, 3_Data.md

# C02 — Student Profile Builder: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C02-F01 | Capture academic profile (GPA, class rank, transcript by year) | Ready | REQ-0002 |
| C02-F02 | Capture test scores (SAT, ACT, AP, IB) | Ready | REQ-0002 |
| C02-F03 | Capture extracurriculars (activity, role, hours/week, years) | Ready | REQ-0002 |
| C02-F04 | Capture awards, shadowing, research entries | Ready | REQ-0002 |
| C02-F05 | Persist profile to JSON; generate readable markdown summary | Ready | REQ-0010 |

---

## Acceptance Criteria

### C02-F01: Academic Profile

- [ ] Capture: Name, graduation year, high school, intended majors
- [ ] Prompt for GPA (weighted + unweighted), class rank
- [ ] Collect transcript: year by year, courses with grades (letter or percentage)
- [ ] Validate: GPA as decimal 0–4.0 (or allow extended for weighted), rank as integer or percentile
- [ ] User can skip fields; field status tracked (pending/set/skipped)
- [ ] Markdown output is human-readable (e.g., "**GPA:** 3.8 (weighted), 3.6 (unweighted)")

### C02-F02: Test Scores

- [ ] Capture: SAT (total + math/reading breakdown), ACT (composite), AP scores (subject + score), IB scores
- [ ] Validate: SAT 400–1600, ACT 1–36, AP 1–5, IB 1–7
- [ ] User can add multiple AP/IB entries
- [ ] Field status tracked separately for each test type
- [ ] Markdown lists all scores with subjects

### C02-F03: Extracurriculars

- [ ] Capture: Activity name, role, years involved, hours/week, description (optional)
- [ ] User can add 0–20+ extracurriculars
- [ ] Validate: Activity name not empty, hours/week as integer
- [ ] Field status: extracurriculars section is "set" if ≥1 entry, else "pending"
- [ ] Markdown outputs table: Activity | Role | Time Commitment | Description

### C02-F04: Awards, Shadowing, Research

- [ ] Awards: Award name, level (school/state/national), year, description
- [ ] Shadowing: Organization, field, total hours, period (e.g., "Summer 2023"), description
- [ ] Research: Project title, institution, mentor, period, hours/week, description
- [ ] User can add 0+ of each type
- [ ] Markdown outputs separate sections for each category

### C02-F05: Persistence

- [ ] Save to JSON: `university-ao/students/<slug>/profile.json` (complete data)
- [ ] Save to Markdown: `university-ao/students/<slug>/profile.md` (human-readable)
- [ ] JSON includes metadata: `generatedDate` (ISO 8601), `lastUpdated` (ISO 8601), `fieldStatus` (all fields)
- [ ] Markdown is formatted for readability (headers, tables, bullet lists)
- [ ] Round-trip: JSON → Markdown → (edit in text editor) → JSON must preserve all data
- [ ] Overwrite detection: If profile exists, ask user before overwriting

---

## Data Model

```typescript
interface TranscriptYear {
  yearLabel: string; // e.g., "Freshman", "10th Grade"
  courses: Array<{ name: string; grade: string }>;
}

interface ProfileData {
  name: string;
  gradYear: string;
  highSchool: string;
  intendedMajors: string[];
  gpaWeighted: string;
  gpaUnweighted: string;
  classRank: string;
  transcript: TranscriptYear[];
  sat: { total: string; math: string; reading: string };
  act: { composite: string };
  apScores: Array<{ subject: string; score: string }>;
  ibScores: Array<{ subject: string; score: string }>;
  extracurriculars: Extracurricular[];
  awards: Award[];
  shadowing: ShadowingEntry[];
  research: ResearchEntry[];
  generatedDate: string; // ISO 8601
  lastUpdated: string;
  fieldStatus: Record<string, FieldStatus>; // pending | set | skipped
}
```

---

## Error Handling

- [ ] Invalid GPA → show error, re-prompt
- [ ] Empty activity name → show error, re-prompt
- [ ] Duplicate major → warn, allow or dedupe
- [ ] File write failure → show error with disk space suggestion

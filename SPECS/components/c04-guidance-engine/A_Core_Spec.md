# C04 — Guidance Engine: Core Specification

> ⚠️ Revised 2026-05-27 (CHG-002): Data paths changed to `university-ao/students/<s>/universities/<u>/guidance/<YYYY-MM-DD-HHmm>/guidance.md`. Multiple dated outputs supported. New function signatures: `buildGuidance` returns `timestamp`; `showGuidance` and `listGuidance` added. All paths via `C07.workspacePath()`.

## Purpose

Reads the student's profile and a university's profile, then calls Gemini to generate a prescriptive, student-specific guidance report. The report tells the student how to project their existing strengths in a way that resonates with what the university values — maximising selection chances. Fully anchored to actual profile data; no generic advice.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Not Started` | C04-F01 | Load and validate student profile and university profile from filesystem before generation | P1 | REQ-0007 | - |
| `Not Started` | C04-F02 | Call Gemini with both profiles to generate a prescriptive, student-anchored guidance report | P1 | REQ-0007 | - |
| `Not Started` | C04-F03 | Store the guidance report as markdown in a dated subdirectory | P1 | REQ-0007, REQ-0013, REQ-0019 | - |
| `Not Started` | C04-F04 | Display a stored guidance report markdown to stdout | P1 | REQ-0008 | - |
| `Not Started` | C04-F05 | List all dated guidance directories for a student+university pair | P1 | REQ-0019 | - |

---

## Guidance Report Structure

The Gemini-generated report must be structured as follows. The prompt enforces this structure.

```
# Guidance Report: <studentName> → <universityName>

**Generated:** <ISO date>
**Student:** <studentName>
**University:** <universityName>
**Intended Major:** <intendedMajor>

---

## University Fit Summary

A 2–3 sentence summary of how well the student's profile aligns with what this university values.

---

## Strengths to Highlight

For each strength, explain specifically HOW to frame it for this university:

### <Strength Title>
**From your profile:** <specific data point from student profile>
**Why it resonates:** <how this maps to a specific university value or trait>
**How to project it:** <concrete, actionable guidance on presentation>

*(3–5 strengths minimum)*

---

## Areas to Strengthen Before Applying

Gaps between the student's profile and the university's ideal candidate — framed constructively:

- **<Gap area>:** <specific, actionable recommendation>

*(Only include if genuine gaps exist — do not fabricate)*

---

## Key Themes to Weave Throughout Your Application

2–4 overarching narrative themes the student should consistently reinforce across essays, activities list, and recommendations.

---

## University-Specific Tips

Concrete tips specific to this university's culture, programs, or application process that the student should know.
```

---

## Data Flows

**F01 — Load & validate:**
`studentSlug + uniSlug → resolve workspacePath('students', s, 'profile.md') → read → resolve workspacePath('students', s, 'universities', u, 'profile.md') → read → both present? → proceed → else: print error + exit(1)`

**F02 — Generate via Gemini:**
`studentProfileText + universityProfileText → [load prompt from src/ai/prompts/c04-guidance-generate.md] → [inject profile content into prompt] → [call Gemini generateContent async] → guidanceMarkdown string`

**F03 — Store:**
`guidanceMarkdown + timestamp → ensure dir workspacePath('students', s, 'universities', u, 'guidance', timestamp) → fs.writeFile('guidance.md') → return { reportPath, timestamp }`

**F04 — Show:**
`studentSlug + uniSlug + timestamp → resolve workspacePath('students', s, 'universities', u, 'guidance', timestamp, 'guidance.md') → read → print to stdout → return { markdownPath }`

**F05 — List:**
`studentSlug + uniSlug → fs.readdir(workspacePath('students', s, 'universities', u, 'guidance')) → return sorted string[] of timestamps (newest first) → empty array if dir doesn't exist`

---

## Execution Mode

Request-driven. Invoked by C01. Async — Gemini call is async/await. Single file read + one Gemini call + one file write. Process completes synchronously from C01's perspective via top-level await.

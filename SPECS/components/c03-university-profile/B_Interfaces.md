# C03 — University Profile: Interfaces

> ⚠️ Revised 2026-05-27 (CHG-002): Signatures updated; `deleteUniversityProfile` added; all data paths updated to `university-ao/students/<s>/universities/<u>/`; `enquirer` removed; domain is now collected by C01 before calling C03.

## Exposed Functions (called by C01)

```typescript
buildUniversityProfile(domain: string, studentSlug: string, uniSlug?: string): Promise<{ profilePath: string; uniSlug: string }>
```
- `domain`: university website domain e.g. `mit.edu` (C03 prepends `https://`).
- `studentSlug`: required — university profile is stored under the student's directory.
- `uniSlug`: optional override; if omitted, derived from domain by stripping TLD.
- Returns the absolute path to the saved `profile.md` and the resolved `uniSlug`.

```typescript
showUniversityProfile(studentSlug: string, uniSlug: string): Promise<{ markdownPath: string }>
```
- Reads and prints `university-ao/students/<s>/universities/<u>/profile.md` to stdout.
- Returns the absolute path (for C06 PDF export).
- Throws with actionable message if file does not exist.

```typescript
deleteUniversityProfile(studentSlug: string, uniSlug: string): Promise<void>
```
- Removes `university-ao/students/<s>/universities/<u>/` recursively.
- Called by C01 **after** delete confirmation — C03 does not confirm.
- Throws on filesystem error; C01 handles display.

---

## Gemini Prompt Contract

**Prompt file:** `src/ai/prompts/c03-university-extract.md`

The prompt instructs Gemini to extract the following structured fields from the batched scraped text. The response must be valid JSON parseable by C03.

**Expected Gemini response schema (JSON):**

```json
{
  "universityName": "string",
  "tagline": "string or null",
  "coreValues": ["string", "..."],
  "mission": "string",
  "culture": "string",
  "academicSpecialties": ["string", "..."],
  "notablePrograms": ["string", "..."],
  "idealCandidateTraits": ["string", "..."],
  "campusEthos": "string",
  "majorSpecificNotes": "string or null"
}
```

`majorSpecificNotes` is populated by including the student's `intendedMajor` in the prompt, asking Gemini to note anything specific about how the university approaches that field.

---

## Markdown File Schema

**Path:** `university-ao/students/<studentSlug>/universities/<uniSlug>/profile.md`
**Encoding:** UTF-8

```markdown
# University Profile: <universityName>

**Domain:** <domain>
**Generated:** <ISO date>
**Student's Intended Major:** <intendedMajor>

---

## Mission

<mission text>

## Tagline

<tagline or "Not available">

## Core Values

- <value 1>
- <value 2>

## Culture & Campus Ethos

<culture text>

<campusEthos text>

## Academic Specialties

- <specialty 1>
- <specialty 2>

## Notable Programs

- <program 1>
- <program 2>

## Ideal Candidate Traits

- <trait 1>
- <trait 2>

## Notes for <intendedMajor> Students

<majorSpecificNotes or "No specific notes available">

---

*Profile generated from public web content. Verify directly with the university.*
```

---

## Failed URLs File Schema

**Path:** `university-ao/students/<studentSlug>/universities/<uniSlug>/failed-urls.md`

```markdown
# Failed Scrape URLs — <universityName>

**Generated:** <ISO date>

The following URLs could not be scraped. You may retry by selecting "Update University" from the menu.

| Category | URL Attempted | Reason |
| :------- | :------------ | :----- |
| Admissions | https://example.edu/admissions | Navigation timeout |
```

---

## Consumed By

| Component | What it reads | Field(s) |
| :-------- | :------------ | :------- |
| C04 Guidance Engine | Full profile for Gemini prompt | Entire `profile.md` |
| C05 Essay Advisor | Full profile for Gemini prompt | Entire `profile.md` |
| C06 PDF Exporter | Markdown → PDF | `markdownPath` |

---

## Events

C03 produces and consumes no events. All interaction is via direct function calls.

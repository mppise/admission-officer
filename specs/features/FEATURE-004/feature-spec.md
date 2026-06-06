# Feature Spec — FEATURE-004: Guidance Engine

**Domain:** guidance_engine
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

Generates a prescriptive admissions guidance report for a specific student–university pair. Reads the student's `profile.md` and the university's `profile.md`, combines them in a single Gemini call using the `c04-guidance-generate` prompt, and persists the output to a timestamped directory.

---

## Implementation Plan

### F01 — Input validation
- Checks both `profile.md` files exist before calling Gemini
- Throws descriptive errors if either is missing

### F02 — Gemini call
- Loads `c04-guidance-generate.prompt.md` via `promptLoader`
- Injects `STUDENT_PROFILE` and `UNIVERSITY_PROFILE` (full markdown file contents)
- Model: from `GEMINI_MODEL` env var; temperature 0.7
- Retries once after 30 seconds on any failure

### F03 — Report persistence
- Creates timestamped directory `guidance/{YYYY-MM-DD-HHmm}/`
- Writes `guidance.md` with the raw Gemini markdown output

### F04 — Show existing guidance
- `showGuidance(studentSlug, uniSlug, timestamp)` reads and writes `guidance.md` to stdout

### F05 — List guidance sessions
- `listGuidance(studentSlug, uniSlug)` returns timestamp strings matching `YYYY-MM-DD-HHmm` pattern, reverse-sorted

---

## API / Interface Contract

```typescript
export async function buildGuidance(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ reportPath: string; timestamp: string }>

export async function showGuidance(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ markdownPath: string }>

export async function listGuidance(
  studentSlug: string,
  uniSlug: string,
): Promise<string[]>
```

### Output path
`university-ao/students/{slug}/universities/{uniSlug}/guidance/{timestamp}/guidance.md`

---

## Guardrail Compliance

Both input files are local — no external data is fetched. The only external call is to the Gemini API. The prompt explicitly instructs Gemini to anchor every recommendation to specific profile data and to omit generic advice. Output is markdown stored locally.

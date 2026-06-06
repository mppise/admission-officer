# Feature Spec — FEATURE-005: Essay Advisor

**Domain:** essay_advisor
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

Interactively collects essay type, prompt text, and word limit from the student via the TUI, then generates a structured essay outline with inspiration samples via Gemini. Output is persisted to a timestamped, content-addressed file to prevent accidental overwrites while allowing the same session to hold multiple essay drafts.

---

## Implementation Plan

### F01 — Essay metadata collection
- Select menu for essay type: Personal Statement, Why `<University>`?, Supplemental — Activity/Accomplishment, Supplemental — Community/Identity, Supplemental — Other
- Text input for essay prompt (truncated to 1000 chars on submission)
- Text input for word limit (optional — defaults to "Not specified")

### F02 — Content addressing
- File slug: `{typeSlug}-{djb2Hash(essayPrompt.trim())}.md`
- `djb2Hash` is a 6-char base-36 hash of the prompt text
- If the file already exists, a confirmation prompt offers to overwrite

### F03 — Gemini call
- Loads `c05-essay-generate.prompt.md` via `promptLoader`
- Injects `ESSAY_TYPE`, `ESSAY_PROMPT`, `WORD_LIMIT`, `STUDENT_PROFILE`, `UNIVERSITY_PROFILE`
- Model: from `GEMINI_MODEL` env var; temperature 0.8
- Retries once after 30 seconds on any failure

### F04 — Disclaimer injection
- Checks if output already contains the "IMPORTANT" disclaimer block
- If absent, prepends the standard disclaimer before saving

### F05 — Show essay
- `showEssay(studentSlug, uniSlug, timestamp)` finds the first `.md` file in the timestamped directory and writes it to stdout

### F06 — List essay sessions
- `listEssays(studentSlug, uniSlug)` returns timestamp strings matching `YYYY-MM-DD-HHmm`, reverse-sorted

---

## API / Interface Contract

```typescript
export async function buildEssay(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ essayPath: string; timestamp: string }>

export async function showEssay(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ markdownPath: string }>

export async function listEssays(
  studentSlug: string,
  uniSlug: string,
): Promise<string[]>
```

### Output path
`university-ao/students/{slug}/universities/{uniSlug}/essays/{timestamp}/{typeSlug}-{hash}.md`

---

## Guardrail Compliance

The disclaimer block ("Do NOT submit as your own work") is always present in the output — injected if Gemini omits it. Essay prompts are truncated to 1000 chars before being sent to Gemini. All output is local. The prompt instructs Gemini to base inspiration samples on the student's actual profile data, not invented content.

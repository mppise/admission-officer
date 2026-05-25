# C05 — Essay Advisor: Core Specification

## Purpose

Collects an essay prompt from the student interactively, reads the student and university profiles, then calls Gemini to produce a structured essay outline plus inspiration samples anchored to the student's actual profile data. Covers personal statements and supplemental essays. One prompt per invocation. Samples are explicitly marked as inspirational — not submission-ready.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C05-F01 | Collect essay prompt and essay type from the student interactively via Enquirer | P1 | REQ-0009, REQ-0010 | - |
| `Complete` | C05-F02 | Load and validate student profile and university profile from filesystem | P1 | REQ-0009 | - |
| `Complete` | C05-F03 | Call Gemini with both profiles and the essay prompt to generate a structured outline plus inspiration samples | P1 | REQ-0009, REQ-0010 | - |
| `Complete` | C05-F04 | Store the essay outline as markdown at the canonical path, with prominent disclaimer | P1 | REQ-0009, REQ-0013 | - |
| `Complete` | C05-F05 | Display the stored essay outline markdown to stdout | P1 | REQ-0011 | - |

---

## Essay Prompt Collection (C05-F01)

When `--essay --build` is invoked, C05 collects the following via Enquirer before making any Gemini call:

| Field | Prompt type | Required? | Notes |
| :---- | :---------- | :-------- | :---- |
| `essayType` | `select` | Yes | Options: `Personal Statement`, `Why <University>?`, `Supplemental — Activity/Accomplishment`, `Supplemental — Community/Identity`, `Supplemental — Other` |
| `essayPrompt` | `input` | Yes | Full prompt text as provided by the university or Common App; free text, max 1000 chars |
| `wordLimit` | `input` | No | Word limit for this essay (e.g., 650); numeric or blank |

### Prompt Slug Generation

The essay filename is derived from `essayType` + a 6-character hash of `essayPrompt`:

- `essayType` → kebab-case prefix (e.g., `personal-statement`, `why-university`, `supplemental-other`)
- Hash: first 6 chars of a simple djb2 hash of the prompt text
- Example: `personal-statement-a3f9c2.md`

If a file already exists at the resolved path, C05 prompts: `"An essay outline already exists for this prompt. Overwrite? (Yes/No)"`. If No, exit gracefully without writing.

---

## Essay Outline Structure

The Gemini-generated output must follow this structure exactly. The prompt enforces it.

```markdown
# Essay Outline: <essayType>
## University: <universityName>
## Student: <studentName>
## Prompt:
> <essayPrompt>

**Word Limit:** <wordLimit or "Not specified">
**Generated:** <ISO date>

---

> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand
> how to draw on your own experiences. Do NOT submit them as your own work.
> Use them only as a reference for tone, structure, and how to connect your
> profile to the prompt. Your essay must be written in your own voice.

---

## Recommended Structure

A paragraph-by-paragraph outline tailored to this specific prompt and university:

### Opening Hook
**Goal:** <what the opening should accomplish for this university>
**From your profile:** <specific data point to draw from>
**Suggested approach:** <concrete guidance on how to open>

### Body — <Section Title>
**Goal:** <what this section develops>
**From your profile:** <specific experience, award, or trait to highlight>
**How it connects:** <why this resonates with this university's values>

*(2–3 body sections as appropriate for the word limit)*

### Closing
**Goal:** <what the closing should leave the reader thinking>
**Tie back to:** <university value or program to reinforce>

---

## Inspiration Samples

> These samples demonstrate tone and structure only. Do not submit them.
> Rewrite entirely in your own voice using your actual experiences.

### Sample 1 — <brief label>
<200–300 word sample response anchored to the student's actual profile data>

### Sample 2 — <brief label>
<200–300 word sample response, different angle or emphasis from Sample 1>

### Sample 3 — <brief label> *(if word limit ≥ 500)*
<200–300 word sample, demonstrating a third narrative approach>

---

## Key Phrases and Themes to Weave In

Based on <universityName>'s profile, these phrases and themes resonate with their values:
- <theme or phrase 1>
- <theme or phrase 2>
- <theme or phrase 3>
```

---

## Data Flows

**F01 — Collect prompt:**
`--essay --build dispatched by C01 → run Enquirer prompts (essayType, essayPrompt, wordLimit) → generate slug → check for existing file → if exists: confirm overwrite → proceed`

**F02 — Load profiles:**
`studentName + universityName → read data/students/<slug>/profile.md → read data/universities/<uniSlug>/profile.md → both present? → proceed → else: print error + exit(1)`

**F03 — Generate via Gemini:**
`studentProfileText + universityProfileText + essayType + essayPrompt + wordLimit → [load prompt from src/ai/prompts/c05-essay-generate.md] → [inject content] → [call Gemini generateContent async] → essayMarkdown string`

**F04 — Store:**
`essayMarkdown → ensure dir data/students/<slug>/<uniSlug>/essays/ exists → fs.writeFile(<slug>.md) → return { essayPath }`

**F05 — Show:**
`studentName + universityName → list available essays or resolve by slug → read → print to stdout → return { markdownPath }`

---

## Show Behaviour (C05-F05)

When `--essay --show` is invoked:
- If no `--essay-file <filename>` flag is provided, list available essay files for the student+university pair and prompt the student to select one via Enquirer `select`.
- If only one essay file exists, open it directly without prompting.
- Print the selected markdown to stdout.

---

## Execution Mode

Request-driven. Invoked by C01. Async — Enquirer prompts + Gemini call both async/await. Single Gemini call per invocation. Process completes synchronously from C01's perspective via top-level await.

---
name: c05-core-spec
description: Core spec for C05 Essay Advisor
---

# C05 Essay Advisor — Core Specification

**Component:** Essay Advisor  
**Purpose:** Collect essay details and generate outline/inspiration based on student + university profiles  
**Status:** Ready (implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C05-F01 | Prompt user for essay type (personal, supplemental, etc.) via SpaciousSelect | Ready | REQ-0009 |
| C05-F02 | Prompt user for essay prompt (max 1000 chars) via waitForText | Ready | REQ-0009 |
| C05-F03 | Prompt user for word limit (optional) via waitForText | Ready | REQ-0009 |
| C05-F04 | Generate essay outline/inspiration via Gemini + inject plagiarism disclaimer | Ready | REQ-0009, REQ-0010 |
| C05-F05 | Deduplicate outlines via prompt hash (avoid re-generating same prompt) | Ready | REQ-0009 |
| C05-F06 | View essay outline (display markdown) | Ready | REQ-0009 |
| C05-F07 | List essays by timestamp | Ready | REQ-0009 |

---

## Acceptance Criteria

### C05-F01–F03: Input Collection
- [ ] Menu: list essay types (Personal Statement, Supplemental, etc.)
- [ ] Prompt: paste essay prompt (up to 1000 chars, trimmed)
- [ ] Word limit: optional (default "Not specified")
- [ ] Validation: non-empty prompt required

### C05-F04: Generation
- [ ] Calls Gemini c05-essay-generate.prompt.md
- [ ] Substitutes {{ESSAY_TYPE}}, {{ESSAY_PROMPT}}, {{WORD_LIMIT}}, {{STUDENT_PROFILE}}, {{UNIVERSITY_PROFILE}}
- [ ] Output: markdown with essay structure, key points, sample opening
- [ ] Prepends plagiarism disclaimer: "⚠️ IMPORTANT: These are inspiration samples..."
- [ ] Persisted to workspace/students/{slug}/universities/{uni_slug}/essays/{timestamp}/{typeSlug}-{hash}.md
- [ ] Retry: 1× after 30s on failure

### C05-F05: Deduplication
- [ ] Hash prompt with djb2Hash(prompt.trim())
- [ ] If essay for same type + hash already exists in timestamp dir: ask overwrite?
- [ ] On cancel: return existing essay without regenerating

### C05-F06–F07: View/List
- [ ] View: display markdown to stdout
- [ ] List: show essays by timestamp, user can select to view

---

## Error Handling

| Scenario | Error Message | Recovery |
|:---|:---|:---|
| Student profile missing | "No student profile found..." | Return to menu |
| University profile missing | "No university profile found..." | Return to menu |
| Empty prompt | "Essay prompt cannot be empty." | Prompt user to enter |
| Gemini fails | "Gemini returned empty response. Try again." | User can retry |

---

## Design Notes

- **Essay types:** Enum ESSAY_TYPE_SLUGS maps display name → slug (e.g., "Personal Statement" → "personal-statement")
- **Prompt hash:** djb2 hash used for deduplication; collision risk minimal for high school essays
- **Disclaimer:** Always included in output; user must copy text (emphasizes that it's not final essay)
- **Temperature:** 0.8 (creative, helps generate varied essay ideas)

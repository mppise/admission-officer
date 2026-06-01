---
name: c05-essay-advisor-impl
description: C05 Essay Advisor — Implementation specification
---

# C05 — Essay Advisor: Implementation Specification

---

## Interfaces

```typescript
export function buildEssay(studentSlug: string, uniSlug: string, timestamp: string): 
  Promise<{ essayPath: string; timestamp: string }>;
export function showEssay(studentSlug: string, uniSlug: string, hash: string): 
  Promise<{ mdPath: string }>;
export function listEssays(studentSlug: string, uniSlug: string): Promise<string[]>;
```

---

## Essay Type Mapping

```typescript
const ESSAY_TYPE_SLUGS: Record<string, string> = {
  "Personal Statement": "personal",
  "Why Us?": "why-us",
  "Why [Major]?": "why-major",
  "Supplemental Essay": "supplemental",
  "CommonApp Prompt 1": "common-1",
  "CommonApp Prompt 2": "common-2",
  "CommonApp Prompt 3": "common-3",
  "CommonApp Prompt 4": "common-4",
  "CommonApp Prompt 5": "common-5",
  "CommonApp Prompt 6": "common-6",
  "CommonApp Prompt 7": "common-7",
};
```

---

## Essay Generation Prompt

```
You are a college essay writing coach. Generate an outline and inspiration samples.

Essay Type: {ESSAY_TYPE}
Prompt: {ESSAY_PROMPT}
Word Limit: {WORD_LIMIT}

Student Background:
{STUDENT_PROFILE}

Target University:
{UNIVERSITY_PROFILE}

Generate a detailed essay outline with:
1. Hook ideas (3–5 different opening approaches)
2. Main body structure (3–4 paragraph themes)
3. Conclusion strategy
4. 2–3 inspiration samples (brief, labeled as "INSPIRATION SAMPLE #1" etc.) showing tone/structure

Inspiration samples should demonstrate how to weave personal experience with the prompt, 
but must not be submitted as-is.
```

---

## File Paths

```
university-ao/students/<slug>/universities/<uni_slug>/essays/
  └─ <iso-timestamp>/
     └─ <type>-<hash>.md
```

Hash calculation: DJB2 hash of `prompt.trim()` (ensures same prompt → same file).

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Missing profiles | "Build student & university profiles first" |
| Empty prompt | Validation error, re-prompt |
| Gemini timeout | "Request timed out. Retry? (y/n)" |
| Empty response | "Essay generation failed. Retry?" |
| Duplicate essay | Ask user: "Essay outline exists for this prompt. Overwrite? (y/n)" |

---

## Operational Requirements

- **Response time:** < 1 minute (Gemini SLA + overhead)
- **Disclaimer:** Always present in output
- **Atomicity:** Only write file after successful generation

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] Generate essay outline → file created, readable markdown
- [ ] Duplicate prompt detection → ask overwrite confirmation
- [ ] List essays → shows all types and hashes
- [ ] Disclaimer present → always appears at top
- [ ] Timeout retry → success after 30s delay

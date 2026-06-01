---
name: c04-guidance-engine-impl
description: C04 Guidance Engine — Implementation specification
---

# C04 — Guidance Engine: Implementation Specification

---

## Interfaces

```typescript
export function buildGuidance(studentSlug: string, uniSlug: string, timestamp: string): 
  Promise<{ reportPath: string; timestamp: string }>;
export function showGuidance(studentSlug: string, uniSlug: string, timestamp: string): 
  Promise<{ markdownPath: string }>;
export function listGuidance(studentSlug: string, uniSlug: string): Promise<string[]>;
```

---

## Guidance Generation Prompt

```
You are a college admissions advisor. Given a student's profile and a target university's 
institutional profile, generate personalized guidance.

Student Profile:
{STUDENT_PROFILE}

University Profile:
{UNIVERSITY_PROFILE}

Guidance should include:
1. How the student's academic strengths align with the university's academic environment
2. How the student's extracurriculars and achievements match the university's ideal student profile
3. Specific areas of the student's profile to highlight in applications
4. Potential weaknesses or concerns to address proactively
5. 2–3 specific examples from the student's profile that resonate with this university

Format as readable markdown. Be constructive and encouraging.
```

---

## File Paths

```
university-ao/students/<slug>/universities/<uni_slug>/guidance/
  └─ <iso-timestamp>/
     └─ guidance.md
```

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Student profile missing | "Build student profile first" |
| University profile missing | "Build university profile first" |
| Gemini timeout | "Request timed out. Retry? (y/n)" |
| Empty response | "Guidance generation failed. Retry?" |

---

## Operational Requirements

- **Response time:** < 1 minute from prompt to display (Gemini SLA + overhead)
- **Retry logic:** Up to 1 retry after 30s delay on timeout
- **Atomicity:** Only write guidance.md after successful generation

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] Build guidance with valid profiles → file created, content readable
- [ ] Retry on timeout → success after 30s wait
- [ ] Missing student profile → error message, no file created
- [ ] List guidance → shows all timestamps in order

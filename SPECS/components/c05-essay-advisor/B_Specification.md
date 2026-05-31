---
name: c05-spec
description: Implementation specification for C05 Essay Advisor
---

# C05 Essay Advisor — Implementation Specification

---

## 1. Interfaces

```typescript
export async function buildEssay(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ essayPath: string; timestamp: string }>

export async function showEssay(studentSlug: string, uniSlug: string, timestamp: string, essayFile: string): Promise<{ markdown: string }>

export async function listEssays(studentSlug: string, uniSlug: string): Promise<Array<{ timestamp: string; typeSlug: string; hash: string }>>

// Constants
export const ESSAY_TYPE_SLUGS: Record<string, string> = {
  "Personal Statement": "personal-statement",
  "Supplemental Essay": "supplemental",
  "Why Us Essay": "why-us",
  "Topic of Your Choice": "topic-choice",
  // ... more types
}
```

---

## 2. Operational Requirements

### 2.1 UX Patterns

- **Flow:** Select essay type → paste prompt → enter word limit → Gemini generates → display markdown
- **Overwrite check:** If essay exists for type+hash in directory, ask before regenerating
- **Progress:** Status bar shows "Generating essay outline..." during Gemini call
- **Output:** Display markdown, offer PDF export

### 2.2 File Naming

```
workspace/students/{slug}/universities/{uni_slug}/essays/
  └─ {timestamp}/
      └─ {typeSlug}-{hash}.md
```

**Example:** `personal-statement-a3f2e1c9.md` (type slug + 8-char hash)

### 2.3 Gemini Call

- **Temperature:** 0.8 (creative)
- **Model:** From env GEMINI_MODEL
- **Timeout:** 30s, retry 1× on failure
- **Prompt:** c05-essay-generate.prompt.md

### 2.4 Disclaimer

Always prepended to output (before any AI-generated content):

```markdown
> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand
> how to draw on your own experiences. Do NOT submit them as your own work.
> Use them only as a reference for tone, structure, and how to connect your
> profile to the prompt. Your essay must be written in your own voice.
```

---

## 3. Testing

**Critical path:** Input collection → deduplication check → Gemini call → markdown with disclaimer → file save

---

## 4. Changes & Revisions

| Date | Description |
|:---|:---|
| 2026-05-31 | Initial spec |

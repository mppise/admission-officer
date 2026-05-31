---
name: c04-spec
description: Implementation specification for C04 Guidance Engine
---

# C04 Guidance Engine — Implementation Specification

---

## 1. Interfaces

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

export async function listGuidance(studentSlug: string, uniSlug: string): Promise<string[]>
```

---

## 2. Operational Requirements

### 2.1 UX Patterns

- **Trigger:** User selects "Generate Guidance" from menu
- **Progress:** Status bar shows "Generating guidance... please wait" during Gemini call
- **Output:** Display markdown report; offer to export to PDF

### 2.2 API Call Details

- **Model:** From env GEMINI_MODEL
- **Temperature:** 0.7 (slightly creative, but grounded)
- **Prompt:** c04-guidance-generate.prompt.md with substitutions
- **Timeout:** 30s; retry 1× after 30s wait on failure

### 2.3 File Paths

```
workspace/students/{slug}/universities/{uni_slug}/
  └─ guidance/
      └─ {timestamp}/
          ├─ guidance.md
          └─ guidance.pdf (created on demand by C06)
```

---

## 3. Testing

**Critical path:** Load profiles → Gemini call → write markdown → success

---

## 4. Changes & Revisions

| Date | Description |
|:---|:---|
| 2026-05-31 | Initial spec |

# C04 — Guidance Engine: Interfaces

## Exposed Functions (called by C01)

```typescript
buildGuidance(studentName: string, universityName: string): Promise<{ reportPath: string }>
```
- `studentName`: sanitised slug (lowercased, hyphenated) — provided by C01
- `universityName`: sanitised slug — provided by C01
- Reads `data/students/<studentName>/profile.md` and `data/universities/<universityName>/profile.md`
- Calls Gemini to generate guidance report
- Writes to `data/students/<studentName>/<universityName>/guidance.md`
- Returns the absolute path to the saved report

```typescript
showGuidance(studentName: string, universityName: string): Promise<{ markdownPath: string }>
```
- Reads and prints `data/students/<studentName>/<universityName>/guidance.md` to stdout
- Returns the absolute path (for C06 `--print` composition)
- Throws with actionable message if file does not exist

---

## Gemini Prompt Contract

**Prompt file:** `src/ai/prompts/c04-guidance-generate.md`

**Prompt template structure:**
```
You are an expert college admissions counselor.

Your task is to generate a detailed, prescriptive guidance report for a student applying to a specific university.

CRITICAL RULES:
- Every recommendation must reference specific data from the student's actual profile.
- Do not give generic advice. If you cannot anchor a recommendation to a specific profile element, omit it.
- Frame everything positively — focus on how to PROJECT existing strengths, not what is missing.
- Gaps section is optional — only include if genuine gaps exist between the profile and the university's ideal candidate traits.

---

STUDENT PROFILE:
{{studentProfileContent}}

---

UNIVERSITY PROFILE:
{{universityProfileContent}}

---

Generate the guidance report using EXACTLY this structure:
[structure as defined in A_Core_Spec.md §Guidance Report Structure]

Use markdown formatting throughout.
```

**Expected output:** Complete markdown document matching the structure in A_Core_Spec.md. No JSON — pure markdown.

---

## Markdown File Schema

**Path:** `data/students/<studentSlug>/<universitySlug>/guidance.md`
**Encoding:** UTF-8
**Content:** Gemini-generated markdown per the structure defined in A_Core_Spec.md

---

## Consumed By

| Component | What it reads | Field(s) |
| :-------- | :------------ | :------- |
| C06 PDF Exporter | Markdown → PDF | `markdownPath` |

---

## Events

C04 produces and consumes no events. All interaction is via direct function calls.

# C05 — Essay Advisor: Interfaces

## Exposed Functions (called by C01)

```typescript
buildEssay(studentName: string, universityName: string): Promise<{ essayPath: string }>
```
- `studentName`: sanitised slug — provided by C01
- `universityName`: sanitised slug — provided by C01
- Runs Enquirer prompts internally to collect `essayType`, `essayPrompt`, `wordLimit`
- Reads `data/students/<studentName>/profile.md` and `data/universities/<universityName>/profile.md`
- Calls Gemini to generate essay outline + samples
- Writes to `data/students/<studentName>/<universityName>/essays/<slug>.md`
- Returns the absolute path to the saved essay file

```typescript
showEssay(studentName: string, universityName: string): Promise<{ markdownPath: string }>
```
- Lists essays under `data/students/<studentName>/<universityName>/essays/` and prompts for selection if multiple exist
- Reads and prints the selected essay markdown to stdout
- Returns the absolute path (for C06 `--print` composition)
- Throws with actionable message if directory or files do not exist

---

## Gemini Prompt Contract

**Prompt file:** `src/ai/prompts/c05-essay-generate.md`

**Prompt template structure:**
```
You are an expert college admissions essay coach.

Your task is to help a student respond to an essay prompt for a specific university.

CRITICAL RULES:
- Every outline section and sample must reference SPECIFIC data from the student's actual profile.
- Do not give generic writing advice. Anchor everything to the student's real experiences, awards, and activities.
- Inspiration samples are for structural reference only — make this explicit in the output.
- Tailor the outline and samples to the university's specific values and culture.
- Generate exactly 2 samples for prompts under 500 words, and 3 samples for prompts 500 words or more.
- Each sample must take a different angle or emphasise a different aspect of the student's profile.

---

ESSAY TYPE: {{essayType}}
ESSAY PROMPT: {{essayPrompt}}
WORD LIMIT: {{wordLimit or "Not specified"}}

---

STUDENT PROFILE:
{{studentProfileContent}}

---

UNIVERSITY PROFILE:
{{universityProfileContent}}

---

Generate the essay outline using EXACTLY this structure:
[structure as defined in A_Core_Spec.md §Essay Outline Structure]

Include the ⚠️ disclaimer block exactly as specified. Use markdown formatting throughout.
```

**Expected output:** Complete markdown document matching the structure in A_Core_Spec.md. No JSON — pure markdown.

---

## Markdown File Schema

**Path:** `data/students/<studentSlug>/<universitySlug>/essays/<essayTypeSlug>-<promptHash>.md`
**Encoding:** UTF-8
**Content:** Gemini-generated markdown per the structure in A_Core_Spec.md

### Slug Examples

| Essay Type | Slug Prefix |
| :--------- | :---------- |
| Personal Statement | `personal-statement` |
| Why `<University>`? | `why-university` |
| Supplemental — Activity/Accomplishment | `supplemental-activity` |
| Supplemental — Community/Identity | `supplemental-community` |
| Supplemental — Other | `supplemental-other` |

---

## Consumed By

| Component | What it reads | Field(s) |
| :-------- | :------------ | :------- |
| C06 PDF Exporter | Markdown → PDF | `markdownPath` |

---

## Events

C05 produces and consumes no events. All interaction is via direct function calls.

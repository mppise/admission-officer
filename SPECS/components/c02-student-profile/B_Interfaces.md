# C02 — Student Profile: Interfaces

## Exposed Functions (called by C01)

```typescript
buildStudentProfile(name?: string): Promise<{ profilePath: string }>
```
- If `name` is undefined, wizard prompts for it as Section 1 first field.
- If profile already exists at resolved path, triggers update flow (C02-F02).
- Returns the absolute path to the saved `profile.md`.

```typescript
showStudentProfile(name: string): Promise<{ markdownPath: string }>
```
- Reads and prints `data/students/<slug>/profile.md` to stdout.
- Returns the absolute path to the markdown file (for C06 `--print` composition).
- Throws with actionable message if file does not exist.

---

## Markdown File Schema

**Path:** `data/students/<slug>/profile.md`
**Encoding:** UTF-8

```markdown
# Student Profile: <name>

**Generated:** <ISO date>
**Last Updated:** <ISO date>

---

## Personal

| Field | Value |
| :---- | :---- |
| Full Name | |
| Graduation Year | |
| High School | |
| Intended Major / Track | |

---

## Academic Record

| Metric | Value |
| :----- | :---- |
| GPA (Weighted) | |
| GPA (Unweighted) | |
| Class Rank | |

### Transcript

#### <Year Label> (e.g., 9th Grade)

| Course | Grade |
| :----- | :---- |
| <course> | <grade> |

*(repeated per year)*

---

## Standardized Tests

### SAT
| Section | Score |
| :------ | :---- |
| Total | |
| Math | |
| Evidence-Based Reading & Writing | |

### ACT
| Section | Score |
| :------ | :---- |
| Composite | |

### AP Scores
| Subject | Score |
| :------ | :---- |

### IB Scores
| Subject | Score |
| :------ | :---- |

---

## Extracurricular Activities

| Activity | Role | Years | Hrs/Week | Description |
| :------- | :--- | :---- | :------- | :---------- |

---

## Awards & Recognitions

| Award | Level | Year | Description |
| :---- | :---- | :--- | :---------- |

---

## Personal Statement

**Key Themes / Summary:**
<summary text or "Not provided">
```

---

## Consumed By

| Component | What it reads | Field(s) |
| :-------- | :------------ | :------- |
| C01 CLI Shell | Prerequisite check | `intendedMajor` (presence + non-empty) |
| C04 Guidance Engine | Full profile for Gemini prompt | Entire `profile.md` |
| C05 Essay Advisor | Full profile for Gemini prompt | Entire `profile.md` |
| C06 PDF Exporter | Markdown → PDF | `markdownPath` |

---

## Events

C02 produces and consumes no events. All interaction is via direct function calls.

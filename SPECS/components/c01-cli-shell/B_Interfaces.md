# C01 — CLI Shell: Interfaces

## Exposed Interface

C01 is the sole public interface of `ao`. It exposes no programmatic API — all interaction is via the CLI.

### Entry Point

```
bin: ao
File: src/cli/index.ts
Invocation: npx ao <flags>  |  ao <flags>
```

---

## Internal Function Contracts

C01 dispatches to component handlers via direct TypeScript async function calls. Each handler signature is defined here as the contract between C01 and the component it calls.

### Student Profile

```typescript
// C02
buildStudentProfile(name?: string): Promise<{ profilePath: string }>
showStudentProfile(name: string): Promise<{ markdownPath: string }>
```

### University Profile

```typescript
// C03
buildUniversityProfile(domain: string, name?: string): Promise<{ profilePath: string }>
showUniversityProfile(name: string): Promise<{ markdownPath: string }>
```

### Guidance Engine

```typescript
// C04
buildGuidance(studentName: string, universityName: string): Promise<{ reportPath: string }>
showGuidance(studentName: string, universityName: string): Promise<{ markdownPath: string }>
```

### Essay Advisor

```typescript
// C05
buildEssay(studentName: string, universityName: string): Promise<{ essayPath: string }>
showEssay(studentName: string, universityName: string): Promise<{ markdownPath: string }>
```

### PDF Exporter

```typescript
// C06
exportToPdf(markdownPath: string): Promise<{ pdfPath: string }>
```

---

## Stdout / Stderr Contract

All component handlers must return a resolved markdown path so C01 can:
1. Print a success message: `Saved: <path>`
2. Pass the path to C06 if `--print` is set

### Standard Output Messages

| Event | Channel | Format |
| :---- | :------ | :----- |
| Operation in progress | stdout | `<Verb>ing <subject>...` e.g. `Building student profile...` |
| Save success | stdout | `Saved: data/students/john-doe/profile.md` |
| Show success | stdout | *(markdown content printed directly)* |
| PDF exported | stdout | `PDF exported: data/students/john-doe/profile.pdf` |
| Retry notice | stdout | `Retrying in 30 seconds... (attempt 2 of 2)` |
| Missing prerequisite | stderr | `No student profile found for "<name>". Run: ao --student-profile --build --name <name>` |
| Missing intended major | stderr | `Student profile for "<name>" has no intended major. Run: ao --student-profile --build --name <name> to update.` |
| Missing .env key | stderr | `Missing required config: GEMINI_API_KEY. Add it to your .env file.` |
| Unknown flag | stderr | *(commander default help output)* |
| Unhandled error | stderr | `Something went wrong: <plain-English message>. No stack trace.` |

---

## Events

C01 produces and consumes no events. All communication is via direct function calls and process exit codes.

### Exit Codes

| Code | Meaning |
| :--- | :------ |
| `0` | Success |
| `1` | Any error (prerequisite failure, missing config, component error) |

# C01 — CLI Shell: Interfaces

> ⚠️ Revised 2026-05-27 (CHG-002): All CLI flag interfaces removed. C01 now exposes no programmatic API. Internal function contracts updated for new signatures required by menu dispatch.

## Entry Point

```
bin: ao
File: src/components/c01-cli-shell/index.tsx
Invocation: ao  (no arguments)
```

C01 is the sole entry point. No flags. No subcommands.

---

## Internal Function Contracts

C01 dispatches to component handlers via direct TypeScript async function calls. Updated signatures for CHG-002:

### Student Profile (C02)

```typescript
// Build new or update existing
buildStudentProfile(studentSlug?: string): Promise<{ profilePath: string; studentSlug: string }>

// Display stored profile — returns path for PDF prompt
showStudentProfile(studentSlug: string): Promise<{ markdownPath: string }>

// Delete student directory
deleteStudentProfile(studentSlug: string): Promise<void>
```

### University Profile (C03)

```typescript
// Build new or update existing
buildUniversityProfile(domain: string, studentSlug: string, uniSlug?: string): Promise<{ profilePath: string; uniSlug: string }>

// Display stored profile
showUniversityProfile(studentSlug: string, uniSlug: string): Promise<{ markdownPath: string }>

// Delete university directory
deleteUniversityProfile(studentSlug: string, uniSlug: string): Promise<void>
```

### Guidance Engine (C04)

```typescript
// Generate new guidance — saves to dated dir
buildGuidance(studentSlug: string, uniSlug: string): Promise<{ reportPath: string; timestamp: string }>

// Display a specific dated guidance
showGuidance(studentSlug: string, uniSlug: string, timestamp: string): Promise<{ markdownPath: string }>

// List available dated guidance dirs
listGuidance(studentSlug: string, uniSlug: string): Promise<string[]>
```

### Essay Advisor (C05)

```typescript
// Generate new essay — saves to dated dir
buildEssay(studentSlug: string, uniSlug: string): Promise<{ essayPath: string; timestamp: string }>

// Display a specific dated essay
showEssay(studentSlug: string, uniSlug: string, timestamp: string): Promise<{ markdownPath: string }>

// List available dated essay dirs
listEssays(studentSlug: string, uniSlug: string): Promise<string[]>
```

### PDF Exporter (C06)

```typescript
exportToPdf(markdownPath: string): Promise<{ pdfPath: string }>
```

### Bootstrap (C07)

```typescript
bootstrap(): Promise<void>
getApiKey(): string | undefined
getModel(): string | undefined
saveConfig(key: string, model: string): Promise<void>
workspacePath(...segments: string[]): string
```

---

## Directory Listing Contracts

C01 reads directories to populate select lists. Expected filesystem layout:

```
university-ao/students/                           → list student slugs (C01-F02)
university-ao/students/<s>/universities/          → list university slugs (C01-F04)
university-ao/students/<s>/universities/<u>/guidance/   → list dated dirs (C01-F06)
university-ao/students/<s>/universities/<u>/essays/     → list dated dirs (C01-F07)
```

Empty directories return an empty array — C01 renders only the "New" option in that case.

---

## Stdout / Stderr Contract

C01 renders all output via ink to the terminal. No raw `console.log` for interactive content. Exceptions:

| Event | Channel | Format |
| :---- | :------ | :----- |
| Bootstrap warning | stderr | `[ao] Warning: <message>` |
| PDF saved | ink screen | `PDF saved: <path>` |
| Delete complete | ink screen | `Deleted.` then navigate back |
| Save success | ink screen | `Saved: <path>` |
| Unhandled error | stderr | `Something went wrong: <plain-English message>` then exit(1) |

---

## Exit Codes

| Code | Meaning |
| :--- | :------ |
| `0` | User exited menu cleanly |
| `1` | Unhandled error during any operation |

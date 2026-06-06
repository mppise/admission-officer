# Feature Spec — FEATURE-002: Student Profile Builder

**Domain:** student_profile
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

Provides a full-screen TUI for building and updating a student's college application profile. Captures personal details, academics, standardised test scores, extracurriculars, awards, shadowing experiences, and research. On finalize, passes the raw profile through Gemini for grammar correction and descriptive field reframing, then renders a markdown profile.

---

## Implementation Plan

### F01 — Main menu
- Ink/React select menu listing all seven sections with completion indicators
- `dotLeader()` aligns section name and status indicator
- "Finalize & Save" locked until all section fields are `'set'` or `'skipped'`

### F02 — Resume existing profile
- If `profile.json` exists for the slug, loads and migrates via `migrateProfile()`
- `migrateProfile()` merges a partial saved object onto a fresh `emptyProfile()` to heal legacy saves

### F03 — Show profile
- `showStudentProfile(slug)` reads `profile.md` and writes to stdout
- Throws if `profile.md` does not exist

### F04 — Gemini enhancement
- After user hits "Finalize & Save" and all sections are complete:
  1. `enhanceProfile(data)` sends raw `ProfileData` JSON to `c02-profile-enhance.prompt.md`
  2. Returns enhanced `ProfileData` with spelling/grammar fixed and descriptive fields reframed
  3. Falls back to original data on two consecutive failures
- Enhanced data is rendered to `profile.md` via `renderProfileMarkdown()`

### F05 — Continuous persistence
- `saveJson(slug, data)` writes `profile.json` after every field edit
- Ensures no data loss on app exit mid-session

### F06 — Shadowing experiences editor
- List-based editor: add / edit / remove entries
- Each entry: organization, field, total hours (optional), period, description
- Hint text distinguishes shadowing (observing) from research (leading)

### F07 — Research experiences editor
- List-based editor: add / edit / remove entries
- Each entry: project title, institution, mentor (optional), period, hours/week (optional), description

### F08 — Delete profile
- `deleteStudentProfile(slug)` removes the entire `university-ao/students/{slug}/` directory recursively

### F09 — Field status tracking
- Per-field `FieldStatus`: `'pending' | 'set' | 'skipped'`
- Section indicator shows: "done", "not started", or "{N} left"
- `allComplete()` checks all section fields are `'set'` or `'skipped'`
- Skip at section level marks all pending fields in that section as `'skipped'`

---

## API / Interface Contract

```typescript
// Build or resume a student profile via full-screen Ink menu
export async function buildStudentProfile(
  nameSlug?: string
): Promise<{ profilePath: string; studentSlug: string }>

// Render profile.md to stdout
export async function showStudentProfile(
  nameSlug: string
): Promise<{ markdownPath: string }>

// Delete the student directory
export async function deleteStudentProfile(nameSlug: string): Promise<void>
```

### Persistence paths
- `university-ao/students/{slug}/profile.json` — raw data
- `university-ao/students/{slug}/profile.md` — rendered markdown (written on Finalize only)

---

## Guardrail Compliance

Raw profile JSON is sent to the Gemini API only on Finalize, scoped to the student's own data. No profile data is stored outside the local `university-ao/` workspace. The Gemini prompt explicitly forbids fabrication — only grammar and reframing are permitted. Numeric and date fields are preserved character-for-character.

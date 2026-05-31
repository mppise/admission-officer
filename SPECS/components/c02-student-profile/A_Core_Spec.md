---
name: c02-core-spec
description: Core spec for C02 Student Profile — features and requirements traceability
---

# C02 Student Profile — Core Specification

**Component:** Student Profile Builder  
**Purpose:** Build, view, edit, delete structured student academic and achievement profiles  
**Status:** Ready (design complete, implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C02-F01 | Interactive form to create new student profile (name, grad year, high school, intended majors) | Ready | REQ-0001 |
| C02-F02 | Form fields for academic record (GPA weighted/unweighted, class rank, transcript by year) | Ready | REQ-0001 |
| C02-F03 | Form fields for test scores (SAT, ACT, AP, IB) | Ready | REQ-0001 |
| C02-F04 | Form fields for extracurriculars, awards, shadowing, research entries | Ready | REQ-0001 |
| C02-F05 | Persist profile to JSON after every field change (live saves) | Ready | REQ-0001 |
| C02-F06 | Export profile to human-readable markdown with Gemini enhancement | Ready | REQ-0001 |
| C02-F07 | View existing student profile (display name, GPA, intended majors, summary) | Ready | REQ-0002 |
| C02-F08 | Edit existing student profile (select field, update, re-save) | Ready | REQ-0002 |
| C02-F09 | Delete student profile (confirm, remove directory) | Ready | REQ-0003 |
| C02-F10 | List all students (show name, grad year, created date) | Ready | REQ-0001, REQ-0002 |

---

## Acceptance Criteria

### C02-F01–F04: Form Intake
- [ ] Each field displays prompt and accepts user input
- [ ] Field validation: GPA range 0.0–4.0+, graduation year valid, major names non-empty
- [ ] User can skip optional fields
- [ ] Navigation: arrow keys to move between fields, Escape to save and exit

### C02-F05: Live Persistence
- [ ] JSON updated in workspace/students/{slug}/profile.json after every field change
- [ ] No data loss on interrupted session
- [ ] fieldStatus tracks which fields are 'set', 'pending', or 'skipped'

### C02-F06: Markdown Export
- [ ] Calls Gemini with c02-profile-enhance.prompt.md to generate markdown summary
- [ ] Output includes sections: Overview, Academic Record, Test Scores, Achievements, Major-Specific Notes
- [ ] Written to workspace/students/{slug}/profile.md
- [ ] Readable by C04/C05 as-is

### C02-F07–F08: View/Edit
- [ ] View shows formatted student name, GPA, majors, key achievements
- [ ] Edit allows selecting field and changing value
- [ ] Changes persisted immediately (C02-F05)

### C02-F09: Delete
- [ ] Confirmation prompt: "Delete student [name]? This cannot be undone."
- [ ] On confirm: Remove entire directory workspace/students/{slug}/
- [ ] On cancel: Return to menu

### C02-F10: List Students
- [ ] Lists all student directories with name, grad year, creation date
- [ ] Sorted alphabetically by name
- [ ] User can select to view/edit

---

## Data Persistence

**JSON Schema:** See Architecture/3_Data.md

**Paths:**
- `{workspace}/students/{slug}/profile.json` — structured data
- `{workspace}/students/{slug}/profile.md` — markdown export
- `{slug}` — kebab-case from student name (e.g., "Alice Johnson" → "alice-johnson")

**Updates:**
- JSON: every field change (sync write)
- Markdown: after all fields collected or on explicit export (async, via Gemini)

---

## Design Notes

- **Form library:** Custom TUI using Ink + TextInput + SpaciousSelect (utils/tui.tsx)
- **Validation:** Client-side in component; server-side validation not applicable (local-only)
- **Markdown generation:** Uses loadPrompt('c02-profile-enhance', {...params}) with student data substituted
- **Error recovery:** If Gemini call fails, user can retry or skip markdown generation

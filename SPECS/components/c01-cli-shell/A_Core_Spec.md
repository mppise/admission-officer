# C01 — CLI Shell: Core Specification

> ⚠️ Revised 2026-05-27 (CHG-002): Full rewrite. `commander` flags removed entirely. All interaction is via full-screen ink menu. Config screen added. Navigation state introduced. C01 source moved from `src/cli/index.ts` to `src/components/c01-cli-shell/index.tsx`.

## Purpose

Entry point for `ao`. Calls the C07 bootstrap, then renders a full-screen ink menu tree that guides the user through the entire workflow — from student selection to PDF export. Manages all navigation state (selected student, selected university). Dispatches to C02–C06 component handlers at the appropriate menu steps. Enforces prerequisites structurally: Guidance and Essay options only appear after a university has been selected.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Not Started` | C01-F01 | On startup: call C07 `bootstrap()`, then render the Student Select screen | P1 | REQ-0014, REQ-0015 | - |
| `Not Started` | C01-F02 | Student Select screen: list existing student slugs from `university-ao/students/` + "New Student" + "Config" options | P1 | REQ-0015, REQ-0016, REQ-0017 | - |
| `Not Started` | C01-F03 | Config screen: display current `GEMINI_API_KEY` (masked), `GEMINI_MODEL`, `GEMINI_TOKEN_WINDOW`, and `GEMINI_CONTENT_BUDGET_PCT`; allow editing all four; call `C07.saveConfig(key, model, tokenWindow, contentBudgetPct)` on confirm; return to Student Select | P1 | REQ-0020 | - |
| `Not Started` | C01-F04 | Student Context screen: after a student is selected, show "Update Profile", "Delete Profile", university list + "New University"; hold selected student slug in navigation state | P1 | REQ-0015, REQ-0017, REQ-0018 | - |
| `Not Started` | C01-F05 | University Context screen: after a university is selected, show "Update University", "Delete University", "Guidance", "Essay"; hold selected university slug in navigation state | P1 | REQ-0004, REQ-0015, REQ-0018, REQ-0019 | - |
| `Not Started` | C01-F06 | Guidance flow: show dated guidance list + "New Guidance"; on "New" dispatch to C04; on existing entry display it; offer PDF prompt; return to University Context | P1 | REQ-0015, REQ-0019 | - |
| `Not Started` | C01-F07 | Essay flow: show dated essay list + "New Essay"; on "New" dispatch to C05; on existing entry display it; offer PDF prompt; return to University Context | P1 | REQ-0015, REQ-0019 | - |
| `Not Started` | C01-F08 | PDF prompt: after any view or generate action, ask "Export to PDF? [Yes / No]"; on Yes invoke C06 and show saved path; on No return to previous screen | P1 | REQ-0012 | - |
| `Not Started` | C01-F09 | Back navigation: every screen has a "Back" option that returns to the previous screen in the flow | P1 | REQ-0021 | - |
| `Not Started` | C01-F10 | Delete confirmation: for "Delete Profile" and "Delete University", show a confirmation prompt before deleting; on confirm delete the directory recursively; on cancel return to context screen | P1 | REQ-0018 | - |

---

## Menu Flow

```
[Startup]
  └─► C07.bootstrap()
        └─► Student Select Screen                          [C01-F02]
              ├─► "Config"        → Config Screen          [C01-F03]
              │                    → back to Student Select
              ├─► "New Student"   → C02.buildStudentProfile()
              │                    → Student Context Screen
              └─► <existing slug> → Student Context Screen [C01-F04]
                    ├─► "Update Profile"   → C02.buildStudentProfile(studentSlug)
                    │                       → Student Context Screen
                    ├─► "Delete Profile"   → Confirm? → delete → Student Select
                    │                       → Cancel → Student Context Screen
                    ├─► "New University"   → prompt domain → C03.buildUniversityProfile(domain, studentSlug)
                    │                       → University Context Screen
                    └─► <existing uni>     → University Context Screen [C01-F05]
                          ├─► "Update University" → C03.buildUniversityProfile(domain, studentSlug, uniSlug)
                          │                         → University Context Screen
                          ├─► "Delete University" → Confirm? → delete → Student Context Screen
                          │                         → Cancel → University Context Screen
                          ├─► "Guidance"  → Guidance Flow  [C01-F06]
                          │                  ├─► "New"       → C04.buildGuidance() → view → PDF prompt → University Context
                          │                  └─► <dated>     → C04.showGuidance()  → PDF prompt → University Context
                          └─► "Essay"     → Essay Flow     [C01-F07]
                                             ├─► "New"       → C05.buildEssay()   → view → PDF prompt → University Context
                                             └─► <dated>     → C05.showEssay()    → PDF prompt → University Context
```

---

## Navigation State

C01 maintains a minimal navigation state object passed through the menu tree:

```typescript
interface NavState {
  studentSlug: string | undefined;
  universitySlug: string | undefined;
}
```

- `studentSlug` is set when a student is selected or created; cleared when returning to Student Select.
- `universitySlug` is set when a university is selected or created; cleared when returning to Student Context.
- State is in-memory only; not persisted between sessions.

---

## Screen Rendering Standard

All screens use the shared `tui.tsx` helpers (`AppScreen`, `SpaciousSelect`, `waitForSelect`, `waitForText`, `waitForConfirm`). Every screen has:
- **Header zone:** `ao — Admissions Officer` title + current context (student name, university name where applicable)
- **Menu/content zone:** `SpaciousSelect` list or text input
- **Footer zone:** keyboard hint `↑↓ navigate · Enter select · Esc / Back to go back`

---

## Data Flows

**F01 — Startup:**
`process start → await C07.bootstrap() → render Student Select screen`

**F02 — Student Select:**
`read university-ao/students/ directory → list slugs → render [slugs... | "New Student" | "Config"] → user selects → dispatch`

**F03 — Config:**
`read getApiKey() + getModel() + getTokenWindow() + getContentBudgetPct() → render masked key + model + tokenWindow + contentBudgetPct → user edits all four → await C07.saveConfig(key, model, tokenWindow, contentBudgetPct) → render success → return to Student Select`

**F04 — Student Context:**
`studentSlug set → read university-ao/students/<slug>/universities/ → list university slugs → render [slugs... | "New University" | "Update Profile" | "Delete Profile" | "Back"] → dispatch`

**F05 — University Context:**
`universitySlug set → render ["Guidance" | "Essay" | "Update University" | "Delete University" | "Back"] → dispatch`

**F06 — Guidance Flow:**
`read university-ao/students/<s>/universities/<u>/guidance/ → list dated dirs → render [dated... | "New Guidance" | "Back"] → on New: await C04.buildGuidance(s, u) → display content → PDF prompt → on existing: await C04.showGuidance(s, u, timestamp) → display content → PDF prompt`

**F07 — Essay Flow:**
`read university-ao/students/<s>/universities/<u>/essays/ → list dated dirs → render [dated... | "New Essay" | "Back"] → on New: await C05.buildEssay(s, u) → display content → PDF prompt → on existing: await C05.showEssay(s, u, timestamp) → display content → PDF prompt`

**F08 — PDF Prompt:**
`render ["Yes — Export to PDF" | "No — Return"] → on Yes: await C06.exportToPdf(markdownPath) → show "PDF saved: <path>" → return to previous screen`

**F09 — Back:**
`pop one level in the flow → re-render previous screen`

**F10 — Delete:**
`render "Are you sure? This cannot be undone. [Yes, delete | No, cancel]" → on Yes: fs.rm(dir, { recursive: true }) → return to parent screen → on No: return to context screen`

---

## Execution Mode

Long-running interactive process. Entry point is `src/components/c01-cli-shell/index.tsx`. A bare `async main()` function calls `bootstrap()` then enters the menu loop. The process exits when the user navigates away from all screens (no active menu) or selects an implicit exit.

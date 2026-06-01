---
name: c01-cli-shell-core
description: C01 CLI Shell — Feature specification and acceptance criteria
---

Architecture refs: 0_Overview.md, 1_Stack.md, 2_UX.md

# C01 — CLI Shell: Core Specification

> **Purpose:** Main entry point; orchestrate user menu navigation and session lifecycle.

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C01-F01 | CLI boot and help text | Ready | REQ-0001 |
| C01-F02 | Main menu (all options visible, keyboard nav) | Ready | REQ-0001 |
| C01-F03 | Student profile menu (build, view, edit, delete) | Ready | REQ-0001 |
| C01-F04 | University profile menu (build, view, delete) | Ready | REQ-0001 |
| C01-F05 | Guidance & essay menus (generate, view, list, export) | Ready | REQ-0001 |
| C01-F06 | Config menu (API key, model, token settings) | Ready | REQ-0009 |

---

## Acceptance Criteria

### C01-F01: CLI Boot & Help

- [ ] `ao` or `ao --help` displays program name, version, and command overview
- [ ] Help text fits on 80-column terminal without truncation
- [ ] First menu appears within 500ms of command execution
- [ ] No crashes on invalid flags

### C01-F02: Main Menu

- [ ] User sees 6 top-level options: Student, University, Guidance, Essay, PDF Export, Config
- [ ] Menu is navigable with ↑/↓ keys; Enter selects
- [ ] Selected option is visually highlighted
- [ ] Escape key returns to parent menu
- [ ] Each option is labeled clearly and takes < 100ms to open submenu

### C01-F03: Student Profile Menu

- [ ] Options: Build, View, Edit, Delete, Back
- [ ] Build → launches C02 profile builder
- [ ] View → lists all student profiles (by slug, creation date, last updated)
- [ ] Edit → select from list, re-enter C02 builder
- [ ] Delete → confirm deletion, remove folder + all data
- [ ] All menu actions complete in < 2 seconds for 20+ profiles

### C01-F04: University Profile Menu

- [ ] Options: Build New, View, Delete, Back
- [ ] Build New → prompts for student slug, university name/URL → launches C03
- [ ] View → select student → list universities → show profile markdown
- [ ] Delete → confirm, remove folder + all data
- [ ] All actions complete in < 2 seconds

### C01-F05: Guidance & Essay Menus

- [ ] Guidance menu: Generate, View, List, Back
- [ ] Essay menu: Generate, View, List, Export to PDF, Back
- [ ] All require valid student + university context
- [ ] User is prompted to select student, then university, then action
- [ ] File listings show creation date and status (complete/incomplete)

### C01-F06: Config Menu

- [ ] Options: Set API Key, Set Model, Set Token Budget, View Current, Test Connection, Back
- [ ] All settings persist in university-ao/.env
- [ ] Test Connection → validate API key by making dummy Gemini call
- [ ] View Current → show masked key, current model, token window
- [ ] All text input fields have validation (no empty keys, model name > 0 chars)

---

## Error Handling

- [ ] Invalid menu selection → beep + redraw menu (no crash)
- [ ] File system errors → display error modal with retry option
- [ ] Missing dependencies (e.g., Node ≥ 20) → early exit with clear message
- [ ] Missing .env on first run → show Config menu automatically

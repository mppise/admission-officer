---
name: c01-core-spec
description: Core spec for C01 CLI Shell — features, status, and requirements traceability
---

# C01 CLI Shell — Core Specification

**Component:** CLI Shell  
**Purpose:** Menu-driven entry point managing navigation, user interaction, and delegation to other components  
**Status:** Ready (design complete, implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C01-F01 | Main menu with options: Student Profile, University Profile, Guidance, Essays, PDF Export, Configuration, Exit | Ready | REQ-0004 |
| C01-F02 | Navigation context tracking: selected student slug, selected university slug, timestamp for reports | Ready | REQ-0004 |
| C01-F03 | Graceful handling of escape key to return to parent menu or exit | Ready | REQ-0004 |
| C01-F04 | Configuration screen: API key input, model name selection, token window, content budget percentage | Ready | REQ-0013 |
| C01-F05 | Validation and storage of configuration to workspace/.env | Ready | REQ-0013 |
| C01-F06 | Configuration display screen showing current settings (API key masked, model, budgets) | Ready | REQ-0013 |
| C01-F07 | Submenu for Student Profile: Create, View, Edit, Delete | Ready | REQ-0001, REQ-0002, REQ-0003 |
| C01-F08 | Submenu for University Profile: Create, View, Delete, List | Ready | REQ-0005 |
| C01-F09 | Submenu for Guidance: Generate, View, List | Ready | REQ-0008 |
| C01-F10 | Submenu for Essays: Create, View, List | Ready | REQ-0009 |
| C01-F11 | Error handling: display error messages to user (e.g., missing profiles, API failures) | Ready | REQ-0015 |

---

## Acceptance Criteria

### C01-F01: Main Menu
- [ ] Menu renders with clear options
- [ ] Each option navigates to corresponding submenu/flow
- [ ] Menu is responsive to arrow keys and Enter
- [ ] Escape returns to parent menu

### C01-F02: Navigation Context
- [ ] Selected student/university tracked and persisted in navigation state
- [ ] Context displayed in screen subtitle/footer
- [ ] Timestamp auto-generated for new reports (YYYY-MM-DD-HHMM format)

### C01-F03: Escape Key Handling
- [ ] Escape from submenu returns to main menu
- [ ] Escape from main menu exits CLI gracefully
- [ ] No dangling processes or unclosed resources on exit

### C01-F04: Configuration Screen
- [ ] Prompts for Gemini API key (hidden input)
- [ ] Prompts for model name (text input with example: "gemini-1.5-pro")
- [ ] Prompts for token window (number, default 1048576)
- [ ] Prompts for content budget % (number 1–100, default 60)
- [ ] Validation: API key non-empty, model non-empty, numbers positive/in range

### C01-F05: Configuration Storage
- [ ] Saves to workspace/.env in format: `GEMINI_API_KEY=...\nGEMINI_MODEL=...\n...`
- [ ] Reloads env via dotenv on save
- [ ] Reflects changes immediately in subsequent API calls (no restart needed)

### C01-F06: Configuration Display
- [ ] Shows current API key (masked except last 4 chars)
- [ ] Shows current model name
- [ ] Shows current token window and content budget
- [ ] Shows "(not configured)" for missing values

### C01-F07–C01-F10: Submenus
- [ ] Each submenu lists available actions
- [ ] User can select an action and trigger corresponding component flow

### C01-F11: Error Handling
- [ ] User sees clear, actionable error message if profile missing
- [ ] User sees clear error if API call fails (with retry suggestion if applicable)
- [ ] No stack traces or cryptic messages visible to user
- [ ] Errors don't crash CLI; user can retry or return to menu

---

## Design Notes

- **Menu library:** Ink + React + custom SpaciousSelect component (defined in utils/tui.tsx)
- **Navigation state:** Managed in CLI component via useState; passed to submenus as context
- **Error display:** AppScreen component with colored error messages; dismissible with Escape
- **Timestamp format:** YYYY-MM-DD-HHMM (e.g., 2026-05-31-1430)

---
name: c01-spec
description: Implementation specification for C01 CLI Shell — interfaces, error handling, operational requirements
---

# C01 CLI Shell — Implementation Specification

---

## 1. Interfaces

### CLI Entry Point

```typescript
// dist/components/c01-cli-shell/index.js
// Executable script (shebang #!/usr/bin/env node)
// Invoked: ao (from npm global install)
// Return: process.exit(0) on success, process.exit(1) on error
```

### showMenu() Helper

```typescript
function showMenu(
  items: Array<{ label: string; value: string; separator?: boolean }>,
  subtitle: string,
  contextLine?: string,
  errorMsg?: string,
  footerEsc?: string,
): Promise<string>
// Renders a SpaciousSelect menu via Ink.render()
// Returns selected value or '__esc' if user presses Escape
// contextLine: optional student name + completion indicator
// errorMsg: optional error message to display (colored red)
// footerEsc: optional custom escape label (default "esc")
```

### Navigation State

```typescript
interface Nav {
  studentSlug: string | undefined
  universitySlug: string | undefined
}
// studentSlug: kebab-case slug of selected student (e.g., "alice-johnson")
// universitySlug: kebab-case slug of selected university (e.g., "mit")
```

### Configuration Screen

```typescript
// Sequence: prompt API key → prompt model → prompt token window → prompt content budget %
// Input validation per C01-F04 acceptance criteria
// On success: call saveConfig(apiKey, model, tokenWindow, budgetPct) from config/bootstrap
// On failure: display validation error, allow user to retry or return to menu
```

### Menu Flow

```
Main Menu
  ├─ Student Profile
  │   ├─ Create (→ C02 buildStudentProfile)
  │   ├─ View/Edit (→ C02 showStudentProfile → list students → select → edit fields)
  │   └─ Delete (→ C02 deleteStudentProfile)
  ├─ University Profile
  │   ├─ Create (→ C03 buildUniversityProfile)
  │   ├─ View (→ C03 showUniversityProfile)
  │   └─ Delete (→ C03 deleteUniversityProfile)
  ├─ Guidance Engine
  │   ├─ Generate (→ C04 buildGuidance)
  │   ├─ View (→ C04 showGuidance)
  │   └─ List (→ C04 listGuidance)
  ├─ Essay Advisor
  │   ├─ Create (→ C05 buildEssay)
  │   ├─ View (→ C05 showEssay)
  │   └─ List (→ C05 listEssays)
  ├─ PDF Export
  │   ├─ Guidance (→ C06 exportToPdf on guidance.md)
  │   └─ Essay (→ C06 exportToPdf on essay.md)
  ├─ Configuration (→ Config screen)
  └─ Exit
```

---

## 2. Error Handling

| Scenario | Error Message | Recovery |
|:---|:---|:---|
| No student profile found (C02 missing) | "No student profile found. Build a student profile first." | Return to menu, trigger C02 create |
| No university profile found (C03 missing) | "No university profile found. Build a university profile first." | Return to menu, trigger C03 create |
| Gemini API key not configured | "Gemini API key or model not configured. Go to Config to set them." | Open Config screen |
| Gemini API call fails (timeout, rate limit, invalid key) | "Gemini request failed: [error detail]. Retrying in 30 seconds..." | Auto-retry 1×, then error if still fails |
| File not found (during read) | "[path] not found." | Return to menu |
| File write fails (permission denied, disk full) | "Could not write to [path]: [error detail]" | Return to menu, user checks disk/permissions |
| Browser launch fails (C06 PDF export) | "PDF export failed: could not launch browser. Try: npx puppeteer browsers install chrome" | User runs recovery command, retry |
| CSS stylesheet missing (C06 PDF) | "PDF export failed: CSS stylesheet not found at [path]" | Report as bug (CSS should be bundled); user retries after npm rebuild |

**Retry Strategy:**
- Network calls (Gemini, Playwright): 1 automatic retry after 30s wait
- File I/O: no retry (permission/disk errors are not transient)
- Browser launch: auto-trigger browser installation, then 1 retry

---

## 3. Operational Requirements

### 3.1 UX Patterns

- **Screen layout:** AppScreen component with header (logo + subtitle), context line, content area, footer (navigation hints)
- **Color scheme:** Magenta/cyan theme (consistent with brand)
- **Input validation:** Real-time feedback (e.g., "Invalid: API key cannot be empty")
- **Navigation hints:** Footer shows [ ↑↓ ] navigate, [ ↵ ] select, [ esc ] exit
- **Loading indicators:** Spinner while async operations (scraping, AI calls) via withSpinner() util
- **Error visibility:** Red text, non-blocking (user can retry or return to menu)

### 3.2 Data Handling

- **Navigation state:** In-memory during session; not persisted between runs
- **Configuration:** Persisted in workspace/.env (encrypted? not for MVP)
- **Student/university slugs:** Kebab-case (lowercase, spaces → hyphens)
- **Timestamp:** YYYY-MM-DD-HHMM format (UTC, consistent across all components)

### 3.3 Security

- **API key:** Stored in workspace/.env; masked in display (show only last 4 chars)
- **No secrets in logs:** Mask API keys before outputting any debug/status messages
- **File permissions:** Default workspace directory permissions (0755 for dirs, 0644 for files)
- **Input validation:** Reject empty strings, invalid characters (for names/majors), extremely long strings (>1000 chars)

### 3.4 Compliance

- **User privacy:** All data stored locally; no external logging, no telemetry
- **Terms of service:** Document that users must have valid Gemini API key and comply with Google's ToS
- **License:** Apache 2.0 per project

### 3.5 Observability

- **Logging:** stdout/stderr for user-facing messages; no structured logging to files for MVP
- **Status messages:** Real-time updates via C08 Status Bar (message queue)
- **Debug mode:** Not implemented for MVP; considered for future

### 3.6 Notifications

- **Async operation status:** "Scraping pages... 23/100 complete" via C08 Status Bar
- **Completion feedback:** "✓ University profile built successfully" on success
- **Error notifications:** Inline error messages (red text) with actionable next steps

### 3.7 Scalability

- **Single student, single device:** No multi-user or multi-device support
- **Data size:** Student profile ~50KB (JSON), university profile ~100KB, guidance/essays ~50KB each
- **Workspace size limit:** Acceptable up to 50 universities × 20 essays per university = ~50MB
- **No database sharding:** Not applicable (local-only, single user)

---

## 4. Testing Requirements

**Coverage threshold:** ≥80% line coverage (per CLAUDE.md Testing Requirements)

### Critical Paths to Test

1. **Navigation:** Main menu → submenu → action → return (all submenus)
2. **Configuration:** Set API key/model → save → reload → verify env vars are used
3. **Error handling:** Missing profile → clear error → user can retry
4. **Context persistence:** Select student → navigate menu → context retained until changed

### Test Strategy

- **Unit tests:** Menu rendering, navigation state transitions, error message formatting
- **Integration tests:** Full flows (config → create student → navigate to student → edit → save)
- **Manual tests:** CLI interactive experience (menu responsiveness, error visibility)

---

## 5. Known Constraints & Future Considerations

- **Ink library limitations:** Some TTY environments may not render TUI correctly (e.g., non-interactive pipes)
- **Keyboard bindings:** Hardcoded to arrow keys + Enter + Escape; no customization in MVP
- **Accessibility:** No screen reader support; requires visual terminal
- **Mobile:** CLI-only, not accessible on mobile devices

---

## 6. Changes & Revisions

| Date | Description | Impact |
|:---|:---|:---|
| 2026-05-31 | Initial spec from reverse engineering | N/A |

# Feature Spec — FEATURE-001: CLI Shell & Navigation

**Domain:** cli_shell
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Last updated:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

The CLI shell is the application entry point and navigation backbone for the `ao` binary. It renders full-screen Ink/React menus, manages a navigation state object, and routes the user between all major application screens. It also owns the Config screen for managing Gemini API credentials.

---

## Implementation Plan

### F01 — Binary entry point
- `src/components/c01-cli-shell/index.tsx` compiled to `dist/components/c01-cli-shell/index.js`
- Registered as `ao` in `package.json#bin`
- `main()` calls `bootstrap()` then starts the student select screen

### F02 — Bootstrap & workspace init
- `bootstrap()` in `src/config/bootstrap.ts` creates the `university-ao/` workspace directory and loads `university-ao/.env` via dotenv
- Missing `.env` is treated as first run (no error)

### F03 — Student Select screen
- Lists existing student slugs from `university-ao/students/` via `listDir()`
- Entries: existing student names, separator, "New Student", "Config"
- Escape on this screen exits the process (no parent screen); footer shows "Ctrl+C" not "esc"

### F04 — Student Context screen
- Lists existing university slugs for the selected student
- Entries: universities, separator, "New University", separator, "View Profile", "Update Profile", "Delete Profile", "Back"
- Delete triggers a confirmation sub-screen

### F05 — University Context screen
- Entries: "Guidance", "Essay", separator, "View University", "Update University", "Delete University", "Back"
- Each action routes to the appropriate sub-screen

### F06 — Guidance List screen
- Lists existing guidance timestamps (format `YYYY-MM-DD-HHmm`) reverse-sorted
- "New Guidance" — validates API key is configured, then generates a new report via C04 wrapped in `withSpinner()`
- Selecting an existing entry — reads the markdown file and displays it in `showMarkdownScreen()`; returns to Guidance List on exit
- API key gate moved to the `__new` branch only; viewing existing guidance does not require an API key

### F07 — Essay List screen
- Lists existing essay timestamps reverse-sorted
- "New Essay" — validates API key is configured, collects type/prompt/word-limit via `collectEssayInputs()`, then generates via C05
- Selecting an existing entry — reads the markdown file and displays it in `showMarkdownScreen()`; returns to Essay List on exit
- API key gate moved to the `__new` branch only

### F08 — Markdown viewer screen (`showMarkdownScreen`)
- `showMarkdownScreen(content: string, subtitle: string, contextLine?: string): Promise<void>`
- Renders markdown content line-by-line in a full-screen Ink component with scroll support
- Keyboard bindings: `↑`/`↓` scroll one line; `PgUp`/`PgDn` scroll one viewport; `↵`/`Esc` returns
- Viewport height = `max(10, process.stdout.rows - 10)`; visible line count displayed in footer
- Column width capped at 100 characters
- Replaces the previous PDF Prompt screen (F08 in prior spec) for guidance and essay viewing

### F09 — Escape and Ctrl+C handling
- Escape on Student Select exits process
- Escape on all other screens returns to the parent screen
- `__esc` sentinel value returned by `showMenu()` and `waitForText()` on Escape

### F10 — Domain prompt (add/update university)
- Text input for university domain (e.g. `mit.edu`)
- Validates API key is configured before proceeding
- Calls `buildUniversityProfile()` wrapped in `withSpinner()`

### F11 — Spinner overlay
- `withSpinner<T>(promise, message, subtitle, contextLine)` in `tui.tsx`
- Renders animated Ink spinner while a long-running promise is in flight

### Config screen
- Displays masked API key, current model, token window, content budget %
- Text inputs for each field (edit in-session via `process.env` mutation)
- "Save & Return" calls `saveConfig()` which writes `university-ao/.env` and reloads env

---

## API / Interface Contract

### Exported functions (none — C01 is the entry point, not imported by others)

### Key internal helpers
```typescript
function showMenu(items, subtitle, contextLine?, errorMsg?, footerEsc?): Promise<string>
// Returns selected value or '__esc'

function showMarkdownScreen(content: string, subtitle: string, contextLine?: string): Promise<void>
// Full-screen scrollable markdown viewer; resolves on Escape or Enter

interface Nav {
  studentSlug: string | undefined;
  universitySlug: string | undefined;
}
```

### Dependencies consumed
- `bootstrap`, `workspacePath`, `getApiKey`, `getModel`, `getTokenWindow`, `getContentBudgetPct`, `saveConfig` from `config/bootstrap.ts`
- `buildStudentProfile`, `deleteStudentProfile`, `showStudentProfile` from C02
- `buildUniversityProfile`, `deleteUniversityProfile`, `showUniversityProfile` from C03
- `buildGuidance`, `showGuidance`, `listGuidance` from C04
- `buildEssay`, `showEssay`, `listEssays` from C05
- `exportToPdf` from C06 (still imported; invoked from Student Profile and University Profile view flows)
- `AppScreen`, `SpaciousSelect`, `waitForText`, `withSpinner` from `utils/tui.tsx`

---

## Guardrail Compliance

All navigation is handled client-side within a single Node.js process. No network I/O from C01 directly. API key stored only in local `.env` file. No PII leaves the machine except via explicit Gemini API calls (C02–C05).

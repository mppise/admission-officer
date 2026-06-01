---
name: c01-cli-shell-impl
description: C01 CLI Shell — Implementation specification
---

# C01 — CLI Shell: Implementation Specification

---

## Interfaces

### CLI Entry Point

```bash
ao                     # Start interactive menu
ao --help              # Show help text
ao --version           # Show version
```

**Exit codes:**
- `0` — Normal exit or user quit
- `1` — Unhandled error
- `2` — Missing dependencies (Node < 20, etc.)

---

## Menu Structure (UX Flow)

```
┌─ Main Menu
├─ Student Profile
│  ├─ Build New → C02 Builder → Save to university-ao/students/<slug>/
│  ├─ View → List → Show profile.md
│  ├─ Edit → Select → C02 Builder
│  └─ Delete → Confirm → Remove folder
├─ University Profile
│  ├─ Build New → (select student) → C03 Scraper → Save
│  ├─ View → (select student) → List → Show profile.md
│  └─ Delete → Confirm → Remove folder
├─ Guidance
│  ├─ Generate → (select student) → (select university) → C04 Engine → Save
│  ├─ View → (select student) → (select university) → List by timestamp → Show .md
│  └─ List → (select student) → (select university) → Show all guidance snapshots
├─ Essay
│  ├─ Generate → (select student) → (select university) → (select essay type) → (paste prompt) → C05 Advisor → Save
│  ├─ View → (select student) → (select university) → List → Show .md
│  ├─ List → (select student) → (select university) → Show all essays
│  └─ Export to PDF → (select artifact) → C06 Exporter → Save .pdf
├─ Config
│  ├─ Set API Key → Prompt (masked input) → Validate → Save to .env
│  ├─ Set Model → Prompt → Validate → Save to .env
│  ├─ Set Token Budget → Prompt → Validate → Save to .env
│  ├─ View Current → Show masked key, current model, token window
│  ├─ Test Connection → Make dummy Gemini call → Show success/error
│  └─ Status → Show bootstrap status (workspace, .env, API key valid?)
└─ Quit
```

---

## Data Structures

### Session State (in-memory, not persisted)

```typescript
interface SessionState {
  currentStudentSlug?: string;
  currentUniversitySlug?: string;
  workspacePath: string;
  configLoaded: boolean;
  apiKeyValid: boolean;
  modelName?: string;
}
```

---

## Error Handling Strategy

| Error | Category | User Message | Retry? |
| :----- | :------- | :----------- | :------ |
| Missing .env on first run | Recoverable | "No configuration found. Configure API key now?" | Y (show Config menu) |
| Invalid API key | Recoverable | "API key invalid. Test Connection to verify." | Y |
| Filesystem error (read) | Recoverable | "Could not read profile. Check file permissions or disk space." | Y |
| Filesystem error (write) | Recoverable | "Could not save profile. Check disk space." | Y |
| Network timeout (Gemini) | Recoverable | "Gemini request timed out. Retry?" | Y (via component) |
| Node < 20 | Fatal | "Node.js 20+ required. Current: X.Y.Z" | N (exit 2) |

---

## Operational Requirements

### UX

- **Terminal size:** Assume minimum 80×24 (80 chars wide, 24 lines tall).
- **Color support:** Auto-detect ANSI color support; fall back to plain text on dumb terminals.
- **Keyboard nav:** Arrow keys (↑/↓/→/←), Enter, Escape; no mouse.
- **Input validation:** All text input trimmed; empty strings rejected with message.
- **Menu responsiveness:** All menus draw within 100ms; no visible lag.

### Data Handling

- **File encoding:** UTF-8 for all text files.
- **Paths:** Use `path.join()` for cross-platform compatibility; never hardcoded `/` or `\`.
- **Atomicity:** Write to temp file first, then atomic rename; prevent partial writes on crash.
- **Slug generation:** Use `toSlug()` utility (lowercase, hyphens, no spaces).

### Security

- **API key masking:** Never log full API key; show only last 4 chars (e.g., `••••••••5678`).
- **No secrets in output:** Scrub API keys from error messages before display.
- **File permissions:** Config file (`.env`) should be readable/writable by owner only (mode 600 on Unix).

### Observability

- **Logging:** All operations logged via C08 postMessage; no console.log except debug mode.
- **Telemetry:** None (local-first; no analytics).
- **Error reporting:** Stack traces shown in dev mode only; user sees actionable message.

---

## Testing Requirements

**Coverage threshold:** 80% line coverage (per CLAUDE.md).

**Critical paths to test:**
- [ ] Menu navigation: Up/down keys, Enter, Escape don't crash
- [ ] Student profile CRUD: Create → View → Edit → Delete works end-to-end
- [ ] University profile CRUD: Requires student context
- [ ] Config save/load: Settings persist across sessions
- [ ] Missing .env: First run prompts for configuration
- [ ] Invalid input: Menu rejects empty strings, invalid choices
- [ ] Filesystem errors: Graceful retry on permission denied
- [ ] Cascading operations: Delete student → all universities also deleted

---

## Deployment Notes

- **Entry point:** `dist/components/c01-cli-shell/index.js` (compiled from TypeScript)
- **npm bin:** `bin.ao` in package.json points to entry point; `npx ao` or `npm -g ao` works
- **Shebang:** `#!/usr/bin/env node` on compiled index.js
- **Postinstall:** C07 config-manager must have been installed (via browser install script)

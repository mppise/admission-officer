# Release Announcement — university-admission-officer v1.2.0

**Release:** rel_2026.05.25.2149
**Date:** 2026-05-25
**Type:** Patch release

---

## What Changed

### Full-screen terminal UI for Student Profile and Essay Advisor

Both the **Student Profile** (`ao --student-profile --build`) and **Essay Advisor** (`ao --essay --build`) screens have been completely redesigned. The terminal now fills the entire viewport for every interactive screen:

- **Large ASCII art header** — `ao — Admissions Officer` displayed in bold cyan block letters with the current screen title inline. Best experienced at a terminal font size of 16pt or larger (configure in your terminal's Preferences).
- **Spacious navigation menus** — ↑↓ arrows to move, Enter to select. Active item highlighted in bold cyan with a `❯` cursor.
- **Dividers are visual only** — section separators in menus are non-selectable; the cursor skips over them. "Back" is always a proper selectable menu item.
- **Footer keyboard hint** always visible at the bottom of every screen.

### What this fixes

- **"Back shown as separator" defect** — in v1.1.0, Back could appear as a greyed-out non-selectable line. This is now fully resolved. Back is always a navigable menu item.

### Consistent experience across the app

The same full-screen TUI treatment now applies to every interactive prompt in the app — essay type selection, word limit input, overwrite confirmation, file selection — not just the top-level menus.

---

## No Breaking Changes

- All CLI commands and flags are unchanged (`ao --student-profile`, `ao --essay`, etc.).
- `profile.json` and `profile.md` formats are unchanged. Existing student data loads correctly.
- C03 University Profile (`ao --university-profile`) is unchanged and uses the same enquirer-based flow as before.

---

## Required Actions

**Users:** No action required. Update with:

```
npm install -g university-admission-officer
```

**Operators:** No configuration changes. No data migration. `go.sh` is version-agnostic and requires no update.

---

## Known Limitations

- Terminal font size cannot be changed from within the app. For the best experience, set your terminal font to 14pt or larger in your terminal application preferences (iTerm2: Preferences → Profiles → Text; Terminal.app: Terminal → Settings → Profiles → Font).
- No automated test suite (consistent with MVP scope). Smoke test plan in `release_audit.md §C`.

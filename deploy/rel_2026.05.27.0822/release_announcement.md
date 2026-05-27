# Release Announcement — university-admission-officer v2.0.2

**Release date:** 2026-05-27
**Type:** Patch
**Audit:** rel_2026.05.27.0822 — PASS

---

## What's New

### View Profile & View University

You can now view a student's finalised profile or a university's scraped profile directly from the menu — without having to re-run the builder.

- From the **Student Context** screen, select **View Profile** to display the student's `profile.md`.
- From the **University Context** screen, select **View University** to display the university's `profile.md`.

After viewing, you'll be offered the usual **Export to PDF** prompt.

### Esc = Back (everywhere)

The `[ esc ] back` hint in the footer now actually works. Pressing Esc on any screen returns to the previous screen — no need to navigate down to the "Back" menu item.

On the **Student Select** screen (the root), Esc exits the app cleanly. The footer on that screen now correctly shows `[ Ctrl+C ] exit` to reflect this.

Pressing Esc while typing a domain name or editing a config field cancels the input and returns to the previous screen without changing anything.

### Progress Spinner

When you trigger a long-running AI or scraping operation — **New University**, **New Guidance**, or **New Essay** — the screen now shows a spinner and a status message while the work is in progress. Previously the screen went blank and appeared hung.

---

## Required Actions

None. This is a drop-in patch update with no configuration changes, no workspace schema changes, and no breaking changes.

---

## Known Limitations

- No automated test suite — manual smoke testing only (see audit for smoke test plan).
- `env.ts` contains dead code from the pre-v2.0.0 CLI flag entry point. No runtime impact.
- `waitForSelect` in C02/C05 internal menus resolves `'__esc'` but does not explicitly handle it. Safe in current flows; noted for a future cleanup release.

---

## Upgrade

```
npm install -g university-admission-officer@2.0.2
```

No post-install steps required.

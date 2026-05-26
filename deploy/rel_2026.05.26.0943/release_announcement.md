# university-admission-officer v1.3.1 — Release Announcement

**Release type:** Patch
**Date:** 2026-05-26
**Supersedes:** v1.3.0 (deployment paused, never published)

---

## What changed

This patch resolves two issues reported against the v1.3.0 candidate:

1. **Resume crash on legacy profiles fixed.** Reopening a `profile.json` created before the Shadowing (F06) and Research (F07) sections were added no longer throws `Cannot read properties of undefined (reading 'map')`. On load, the saved file is now merged over a fresh profile shape, so any field missing from older saves takes its empty default. This is generic — future schema additions will heal the same way without per-release migration code.

2. **TUI visual contrast improved.** Across both `--student-profile` (C02) and `--essay` (C05) menus:
   - Hint callouts, footer pill labels (`navigate`, `select`, `back`), and inactive menu rows are no longer dimmed — they now render at full contrast.
   - The active cursor row is shown as bold **white-on-black** inverted highlight (previously bold magenta) — clearer at a glance, and accessible without relying on color alone.

No other components changed. No schema changes. No new dependencies.

---

## Required actions

**Users:** None. Existing `profile.json` files load as-is; old saves now resume cleanly. No reinstall steps beyond the standard `npm install -g university-admission-officer@1.3.1`.

**Operators:** None. Same Node 20+ runtime; same Gemini / Playwright / Puppeteer prerequisites as v1.3.0.

---

## Known limitations

- Still no automated test coverage — release validation is manual (see audit smoke-test plan).
- Carry-forward SEV-3 maintainability items from prior audits remain open; none affect runtime behavior.
- v1.3.0 was never published; npm rollback target remains v1.2.0.

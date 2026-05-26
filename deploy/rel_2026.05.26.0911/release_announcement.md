# Release Announcement — admission-officer v1.3.0

**Date:** 2026-05-26
**Type:** Minor release
**Audience:** Students and counsellors using `ao` CLI

---

## What's New

### Shadowing & Research — two new profile sections

Your student profile now captures two experience types that admissions officers increasingly look for — and that often don't fit neatly into extracurriculars or awards.

**Shadowing Experiences** — for any time you observed a professional at work: clinical rotations, legal shadowing, engineering site visits, or any field. Captures where, what discipline, how long, and what you took away.

**Research Experiences** — for projects where you investigated a question, analysed data, or built something with intellectual intent — whether in a university lab, at school, or independently. Captures the project, institution, mentor (optional), timeframe, and your specific contribution.

Both sections are fully skippable. Both feed into the Gemini enhancement step at Finalize — descriptions are polished into honest, specific student-voice prose.

### New in-app guidance

Every activity section now shows a short hint explaining what belongs there and what doesn't — so you spend less time wondering "does this go in extracurriculars or awards?" and more time filling in the good stuff.

Field-level hints appear on key inputs (activity name, descriptions, award level) to keep entries concrete and useful.

### Refreshed terminal UI

The interface has been redesigned throughout:

- Compact branded header (`ao  Admissions Officer`) with a magenta gradient accent bar — no more 6-row logo eating half the screen
- Dot-leader alignment in all section and field menus — clean two-column grid at any terminal width
- Emoji completion indicators: ✅ done · 🔲 not started · ⏳ N left · ⏭ skipped · 📋 N entries
- Active item highlighted with a `▌` magenta block cursor
- Pill-key footer: `[ ↑↓ ]  navigate   [ ↵ ]  select   [ esc ]  back`
- Action labels with glyphs: `＋ Add` · `✗ Remove` · `← Back` · `⏭ Skip` · `🚀 Finalize & Save`
- Input screens: prompt label above the field with a `❯` cursor prefix

---

## Required Actions

**Existing users:** No action required. Existing `profile.json` files load normally — the new `shadowing` and `research` sections will appear as `🔲 not started` until you fill them in. You can finalize your profile without completing them (both sections are skippable).

**New installs:** `npm install -g admission-officer` (or follow your local install path).

---

## Known Limitations

- Emoji rendering depends on your terminal and font. On terminals without full Unicode emoji support, indicators degrade to their Unicode base characters. No functional impact.
- The `personalStatementSummary` field referenced in the LLM enhancement prompt has no corresponding input field in the TUI — it will be addressed in a future release.
- No automated tests. Manual smoke test recommended after install (see `release_audit.md` Section C).

---

## Rollback

If issues arise, rollback to v1.2.0:

```
npm dist-tag add admission-officer@1.2.0 latest
```

Existing `profile.json` data is fully compatible with v1.2.0 — the new `shadowing` and `research` keys will be silently ignored.

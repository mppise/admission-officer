# Release Announcement — admission-officer v1.0.2

**Date:** 2026-05-25
**Type:** Patch release
**Audience:** Users and operators of `admission-officer`

---

## What Changed

This release sharpens the AI guidance quality across all four prompts. The tool now operates from the perspective of a **senior admissions officer** — not a generic counselor — giving students more specific, competitive, and actionable output.

### University Profile Builder (C03)

- The page extraction prompt now reads university websites the way an AO would: looking for implicit selection signals, repeated language, and values embedded in non-admissions pages (program descriptions, student life, faculty bios).
- The "Ideal Student Profile" category is now treated as the most critical extraction target — the prompt actively pulls candidate trait signals from all page types, not just admissions pages.
- The synthesis prompt now produces `idealCandidateTraits` that are specific and actionable (not generic virtues like "intellectual curiosity") and a `campusEthos` written from an insider's perspective.

### Guidance Report (C04)

- The guidance report now positions the student's specific profile against what the AO committee actually rewards at that university — not just what the university says it values.
- The "University-Specific Tips" section is replaced by "University-Specific Tactics": concrete moves the student should make, programs to name with authenticity, and signals that differentiate this school from others.
- The gaps section, when included, names real gaps directly and gives a specific, realistic action plan.

### Essay Advisor (C05)

- The essay outline Opening Hook now tells students the exact move to make (not "be engaging").
- Inspiration samples are written to sound like a real student's voice, not a template.
- The "Key Phrases and Themes" section now explains why each phrase signals fit to this specific university's AO committee.

---

## Required Actions

**No migration required.** This is a drop-in upgrade — no data files, configuration, or workflow changes.

Users on v1.0.1 can upgrade with:

```
npm install -g admission-officer@1.0.2
```

Existing student and university profile data files are fully compatible.

---

## Known Limitations

- No automated tests for prompt output quality — smoke testing via live Gemini calls is the verification path.
- The three SEV-3 items carried forward from v1.0.1 remain open (architecture doc staleness, C03 file length, no unit tests). None affect user-facing functionality.

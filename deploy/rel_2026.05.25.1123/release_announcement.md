# Release Announcement — university-admission-officer v1.0.0

**Date:** 2026-05-25
**Package:** `university-admission-officer` on npm
**Install:** `npm install -g university-admission-officer`

> Supersedes the announcement draft in `rel_2026.05.25.1500/` (postinstall step updated to reflect both Chromium binaries).

---

## What is this?

`university-admission-officer` (`ao`) is a CLI tool that gives high school students personalised, AI-powered college admissions guidance — running entirely on their own machine.

---

## What's in v1.0.0

This is the initial public release. All six components ship together:

**Student Profile** — interactive wizard for GPA, transcript, test scores, extracurriculars, awards, and intended majors. Blank-to-skip on every optional field; re-running updates only the sections you choose.

**University Profile** — crawls a university's public site (up to 100 pages), extracts admissions-relevant facts via Gemini, and synthesises a structured profile tailored to the student's majors. Automatically resumes on interruption. Admissions/academics pages prioritised over news/events.

**Guidance Report** — reads student and university profiles to produce a personalised, prescriptive report on positioning strengths against the university's selection criteria.

**Essay Advisor** — accepts any application essay prompt; generates a structured outline with inspiration samples drawn from the student's own profile. Samples are clearly marked as reference material, not submissions.

**PDF Export** — any `--show` or `--build` output can be exported to a formatted PDF with `--print`.

---

## Required actions for users

1. **Install Node.js 20+** if not already present.
2. **Get a Gemini API key** at https://aistudio.google.com/app/apikey (free tier available).
3. **Create a `.env` file** in your working directory:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_TOKEN_WINDOW=1000000
   ```
4. Two Chromium browsers (one for Playwright scraping, one for Puppeteer PDF rendering) install automatically during `npm install` via the `postinstall` hook. Expect a one-time download of ~300–400 MB on first install.

---

## Known limitations

- University profile crawls up to 100 pages. Very large or JS-heavy sites may need a second run to resume.
- No automated tests — this is an MVP; outputs should be reviewed before use.
- Architecture doc (`B_Architecture.md`) reflects an earlier directory layout; the implemented layout is `data/<student>/<university>/`.
- Dual Chromium install increases first-install footprint. A consolidation to a single browser backend is a v1.1 candidate.

---

## What's next (v1.1 candidates)

- Refactor C03 into sub-modules (currently ~690 lines)
- Update architecture doc to match implemented directory structure
- Investigate consolidating Playwright + Puppeteer onto a single browser binary
- Add basic integration tests for CLI entry points
- Strengthen the release-audit checklist with a mandatory clean-install build step

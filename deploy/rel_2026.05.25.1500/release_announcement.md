# Release Announcement — university-admission-officer v1.0.0

**Date:** 2026-05-25
**Package:** `university-admission-officer` on npm
**Install:** `npm install -g university-admission-officer`

---

## What is this?

`university-admission-officer` (`ao`) is a CLI tool that gives high school students personalised, AI-powered college admissions guidance — running entirely on their own machine.

---

## What's in v1.0.0

This is the initial public release. All five core features ship together:

**Student Profile** — an interactive wizard that captures GPA, transcript, test scores, extracurriculars, awards, and intended majors. Blank-to-skip on every optional field; re-running the wizard updates only the sections you choose.

**University Profile** — crawls a university's public website (up to 100 pages), extracts admissions-relevant facts via Gemini, and synthesises a structured profile tailored to the student's intended majors. Automatically resumes if interrupted. Prioritises admissions and academics pages over news and events.

**Guidance Report** — reads the student and university profiles and generates a personalised, prescriptive report on how to position the student's strengths against the university's values and selection criteria.

**Essay Advisor** — accepts any application essay prompt and generates a structured outline with inspiration samples drawn directly from the student's own profile. Samples are clearly marked as reference material, not submissions.

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
4. Playwright (Chromium) installs automatically during `npm install`.

---

## Known limitations

- University profile crawls up to 100 pages. Very large or JavaScript-heavy sites may require a second run to resume.
- No automated tests — this is an MVP; outputs should be reviewed before use.
- Architecture doc (`B_Architecture.md`) reflects an earlier directory layout; the implemented layout is `data/<student>/<university>/`.

---

## What's next (v1.1 candidates)

- Refactor C03 into sub-modules (currently ~700 lines)
- Update architecture doc to match implemented directory structure
- Add basic integration tests for the CLI entry points

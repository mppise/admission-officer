# Feature Spec — FEATURE-003: University Profile Scraper & Synthesiser

**Domain:** university_profile
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

Builds a competitive intelligence profile for a target university by crawling its public website and extracting admissions-relevant facts using a two-pass Gemini pipeline. The profile is student-personalised: fact extraction targets the student's intended majors. Crawls are resumable via incremental `profile.json` persistence.

---

## Implementation Plan

### F01 — BFS crawl with priority queue
- Playwright Chromium (headless) crawls from `https://{domain}` up to `MAX_CRAWL_PAGES = 100`
- Pages extracted via `extractPageText()`: title, meta description, headings, paragraphs, list items
- Internal links extracted via `extractInternalLinks()`: same-origin only, no fragments, no binary extensions
- Priority queue: high-value paths pushed to front of queue; low-value paths (`/news`, `/blog`, `/events`, `/stories`, `/press`, `/media`, `/calendar`, `/commencement`, `/reunion`, `/awards`, `/honors`, `/giving`, `/alumni`, `/donate`, `/directory`) pushed to back
- Pages < 200 chars skipped as empty/nav-only

### F02 — Batched Gemini extraction (Pass 1)
- Pages accumulated into a pending batch until char budget reached (`GEMINI_TOKEN_WINDOW * GEMINI_CONTENT_BUDGET_PCT / 100 * 4`) or crawl ends
- Each batch sent to `c03-university-page-extract.prompt.md` with `PAGE_CONTENT`, `INTENDED_MAJORS`, `PROGRAM_CATEGORIES`
- Returns JSON of category → string array; merged into `profile.json`
- Token-size errors: truncate each page to `TRUNCATE_CHARS = 4000` and retry immediately (no 30s delay)
- Transient errors: retry once after 30 seconds
- Hard failure: pages left as `'scraped'` in `profile.json` for resume on next run

### F03 — Incremental persistence
- Each page marked `'scraped'` (with text) immediately after scraping
- After batch extraction, pages marked `'done'` (text deleted to save space)
- `profile.json` written after each batch flush and after each page save
- Resume: reads existing `profile.json`, skips already-visited URLs, restores unextracted pages to pending batch

### F04 — Synthesis (Pass 2)
- Strips `pages` array and residual text from `profile.json`; sends fact-only view to `c03-university-extract.prompt.md`
- If `profile.md` exists (update case), passes it as `EXISTING_PROFILE` for merge
- Returns `UniversityProfileData`; rendered as `profile.md` via `renderUniversityMarkdown()`

### F05 — Show profile
- `showUniversityProfile(studentSlug, uniSlug)` reads `profile.md` and writes to stdout

### F06 — Delete profile
- `deleteUniversityProfile(studentSlug, uniSlug)` removes the university directory recursively

---

## API / Interface Contract

```typescript
// Build (or update) a university profile
export async function buildUniversityProfile(
  domain: string,
  studentSlug: string,
  uniSlug?: string,
): Promise<{ profilePath: string; uniSlug: string }>

// Render profile.md to stdout
export async function showUniversityProfile(
  studentSlug: string,
  uniSlug: string,
): Promise<{ markdownPath: string }>

// Delete university directory
export async function deleteUniversityProfile(
  studentSlug: string,
  uniSlug: string,
): Promise<void>
```

### Persistence paths
- `university-ao/students/{slug}/universities/{uniSlug}/profile.json` — incremental crawl + extraction state
- `university-ao/students/{slug}/universities/{uniSlug}/profile.md` — final rendered profile

### Categories extracted
```
Static: "Identity & Mission" | "Academic Environment" | "Admissions & Selection" |
        "Student Experience" | "Ideal Student Profile"
Dynamic: "Program: {major}" for each intended major in student's profile
```

---

## Guardrail Compliance

Only public web content is scraped. The Playwright browser uses a standard desktop user-agent. No authentication credentials are collected. Page text is sent to Gemini only in batches — no full page HTML, only extracted text. Crawl is bounded at 100 pages per run. Cost is tracked and reported to the user after each run.

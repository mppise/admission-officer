# C03 — University Profile: Core Specification

## Purpose

Scrapes a university's public website using Playwright (headless Chromium), extracts structured institutional profile data via Gemini API, and stores it as a markdown file. Also provides display of the stored profile. Requires a valid student profile with intended major as a prerequisite (enforced by C01).

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C03-F01 | Scrape a university website across targeted pages using Playwright and extract raw HTML content | P1 | REQ-0005 | - |
| `Complete` | C03-F02 | Send batched scraped content to Gemini API to extract structured university profile data | P1 | REQ-0005 | - |
| `Complete` | C03-F03 | Store the extracted university profile as markdown at the canonical path | P1 | REQ-0005, REQ-0013 | - |
| `Complete` | C03-F04 | Log any URLs that failed to scrape to `failed-urls.md` for manual retry | P1 | REQ-0005 | - |
| `Complete` | C03-F05 | Display the stored university profile markdown to stdout | P1 | REQ-0006 | - |

---

## Scraping Strategy

### Target Pages

Playwright visits the following page categories on the university domain. Each category maps to one or more URL patterns to try:

| Category | URL patterns to attempt | Extraction goal |
| :------- | :---------------------- | :-------------- |
| Home | `/`, `/index.html` | Overall mission, tagline, hero messaging |
| About / Mission | `/about`, `/about-us`, `/mission`, `/our-story` | Core values, founding mission |
| Academics | `/academics`, `/programs`, `/majors`, `/colleges` | Academic specialties, notable programs |
| Admissions | `/admissions`, `/apply`, `/admissions/first-year` | Ideal candidate traits, what they look for |
| Campus Life / Culture | `/campus-life`, `/student-life`, `/culture`, `/traditions` | Campus ethos, student culture |
| Student Profile / Outcomes | `/outcomes`, `/student-success`, `/facts`, `/common-data-set` | Model student characteristics, statistics |

### Page Discovery Logic

1. For each category, try the primary URL pattern first.
2. If a 404 or navigation timeout occurs, try the next pattern in the list.
3. If all patterns for a category fail, log the attempted URLs to `failed-urls.md` and continue to the next category.
4. A scrape is considered **partial** if at least 3 of 6 categories succeed. Proceed with Gemini extraction.
5. A scrape is considered a **failure** if fewer than 3 categories yield content. Stop, log all failed URLs, print error, exit(1).

### Content Extraction Per Page

After navigation, extract:
- Page `<title>`
- All `<h1>`, `<h2>`, `<h3>` headings
- All `<p>` paragraph text (first 3000 characters per page to control token size)
- Any `<meta name="description">` content

Strip all HTML tags before passing to Gemini. Max content per page: 3000 characters. Total batched content across all pages: capped at 20,000 characters before truncation.

---

## Data Flows

**F01 — Scrape:**
`domain → [Playwright launch headless Chromium] → [iterate target page categories] → [navigate to URL] → [wait for DOMContentLoaded] → [extract text content] → [if fail: log to failed-urls list, continue] → raw content map (category → text)`

**F02 — Extract via Gemini:**
`raw content map + student intendedMajor → [batch content under 20k chars] → [load prompt from src/ai/prompts/c03-university-extract.md] → [call Gemini generateContent] → [parse structured response] → UniversityProfileData object`

**F03 — Store:**
`UniversityProfileData → renderUniversityMarkdown(data) → fs.writeFile(data/universities/<slug>/profile.md) → return { profilePath }`

**F04 — Log failed URLs:**
`failedUrls[] → fs.writeFile(data/universities/<slug>/failed-urls.md) → print "X URLs failed — see data/universities/<slug>/failed-urls.md"`

**F05 — Show:**
`name → resolve data/universities/<slug>/profile.md → read → print to stdout → return { markdownPath }`

---

## Execution Mode

Request-driven. Invoked by C01. Async — Playwright and Gemini calls are both async/await. Single-threaded sequential scrape (one page at a time). Process completes synchronously from C01's perspective via top-level await.

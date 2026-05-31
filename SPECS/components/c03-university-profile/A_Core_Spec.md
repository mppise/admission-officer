---
name: c03-core-spec
description: Core spec for C03 University Profile — features and requirements
---

# C03 University Profile — Core Specification

**Component:** University Profile Builder  
**Purpose:** Web scraping + AI-powered extraction of university mission, culture, programs, and ideal candidate traits  
**Status:** Ready (design complete, implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C03-F01 | Web scraping via Playwright: fetch pages from target university website | Ready | REQ-0005 |
| C03-F02 | Batch AI extraction via Gemini: extract mission, culture, programs, ideal student traits from page text | Ready | REQ-0006 |
| C03-F03 | Token budgeting: limit batch size to respect GEMINI_TOKEN_WINDOW and GEMINI_CONTENT_BUDGET_PCT | Ready | REQ-0006 |
| C03-F04 | Major-scoped scraping: identify program-specific pages based on student's intended majors, prioritize them | Ready | REQ-0007 |
| C03-F05 | Cost estimation: predict and display Gemini API cost before scraping | Ready | REQ-0006 |
| C03-F06 | Progress updates: display scraping progress (pages completed, LLM calls made, tokens consumed) | Ready | REQ-0006 |
| C03-F07 | Persist scraped + extracted data to JSON and markdown | Ready | REQ-0006 |
| C03-F08 | View university profile (display name, mission, ideal student traits, program notes) | Ready | REQ-0005 |
| C03-F09 | Delete university profile (confirm, remove directory) | Ready | REQ-0005 |
| C03-F10 | List all universities for a student | Ready | REQ-0005 |

---

## Acceptance Criteria

### C03-F01: Web Scraping
- [ ] Playwright launches headless Chromium
- [ ] Fetches pages from target university domain (e.g., mit.edu, stanford.edu)
- [ ] Respects robots.txt and user-agent headers
- [ ] Handles JavaScript-heavy pages (waits for networkidle0)
- [ ] Timeout: 30s per page, max 100 pages per university
- [ ] Graceful failure: skip page if fetch fails, log failure, continue

### C03-F02: Batch Extraction
- [ ] Categorizes page text by category: Identity & Mission, Academic, Admissions, Student Experience, Ideal Student, Program: {major}
- [ ] Calls Gemini c03-university-extract.prompt.md (per category)
- [ ] Extracts facts: mission statement, culture, academic specialties, notable programs, ideal candidate traits, major-specific notes
- [ ] Output: structured JSON with category keys

### C03-F03: Token Budgeting
- [ ] Reads GEMINI_TOKEN_WINDOW and GEMINI_CONTENT_BUDGET_PCT from env
- [ ] Computes character budget: tokenWindow × (budgetPct / 100) × 4
- [ ] Groups pages into batches: fit as many page texts as possible per batch
- [ ] If single page exceeds budget: truncate to TRUNCATE_CHARS (4000 chars)
- [ ] Retry logic: if Gemini rejects batch due to token limit, resend with truncated pages

### C03-F04: Major-Scoped Scraping
- [ ] Reads student's intendedMajors from student profile
- [ ] Prioritizes pages: main university pages first, then major-specific pages
- [ ] Search URLs for major keywords (e.g., "computer-science", "engineering")
- [ ] Scrape program pages if found; fallback to general pages if not

### C03-F05: Cost Estimation
- [ ] Before scraping: estimate number of pages, estimated tokens (per page ~500 chars)
- [ ] Use MODEL_PRICING table: map model name to $/M tokens
- [ ] Display: "Estimated cost: ~$0.50 (based on 500 pages × 2 batches)"
- [ ] User can proceed or cancel

### C03-F06: Progress Updates
- [ ] Real-time status: "Scraping... 23/100 pages complete"
- [ ] "Extracting... batch 3 of 5, 45,000 tokens used"
- [ ] "Extraction complete. 234,567 input tokens, 45,678 output tokens used. Cost: ~$0.42"

### C03-F07: Persistence
- [ ] JSON: workspace/students/{slug}/universities/{uni_slug}/profile.json
- [ ] Markdown: workspace/students/{slug}/universities/{uni_slug}/profile.md
- [ ] Incremental updates: if scraping interrupted, resume from last successful page

### C03-F08–F10: View/Delete/List
- [ ] View: display university name, mission summary, ideal student traits, program notes
- [ ] Delete: confirmation prompt, remove directory
- [ ] List: show all universities for student, sorted by name

---

## Data Persistence

**Profile JSON structure:**
```typescript
interface UniversityProfileData {
  universityName: string
  tagline: string | null
  coreValues: string[]
  mission: string
  culture: string
  academicSpecialties: string[]
  notablePrograms: string[]
  idealCandidateTraits: string[]
  campusEthos: string
  majorSpecificNotes: Record<string, string | null>
}
```

**Incremental state (during scraping):**
```typescript
interface ProfileJson {
  pages: Array<{ url: string; status: 'scraped' | 'done'; text?: string }>
  [category: string]: any
}
```

---

## Design Notes

- **Scraping robustness:** Playwright + retry logic for transient failures
- **Token budgeting:** GEMINI_TOKEN_WINDOW default 1048576, GEMINI_CONTENT_BUDGET_PCT default 60
- **Model pricing:** Supports gemini-2.5-pro, 2.0-flash, 1.5-flash, 1.5-pro, etc.; add new models to MODEL_PRICING

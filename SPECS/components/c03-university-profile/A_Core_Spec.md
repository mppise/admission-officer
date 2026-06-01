---
name: c03-university-profile-core
description: C03 University Profile Builder — Feature specification
---

Architecture refs: 0_Overview.md, 1_Stack.md

# C03 — University Profile Builder: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C03-F01 | Web scraping (Playwright crawl up to 100 pages) | Ready | REQ-0003 |
| C03-F02 | Page content extraction and tokenization | Ready | REQ-0003 |
| C03-F03 | Batch AI extraction (Gemini) | Ready | REQ-0004 |
| C03-F04 | University profile persistence (JSON + Markdown) | Ready | REQ-0004 |
| C03-F05 | Cost estimation and token tracking | Ready | REQ-0012 |

---

## Acceptance Criteria

### C03-F01: Web Scraping

- [ ] Accept university URL from user
- [ ] Crawl up to 100 pages using Playwright (chromium)
- [ ] Follow internal links only; skip external domains
- [ ] Extract text content from each page (ignore scripts, styles, navigation)
- [ ] Handle timeouts (per-page: 10s, total crawl: 5 min)
- [ ] Show progress: "Page 5/47 crawled, extracting text..." on C08 status bar
- [ ] Store page URLs + text in memory during crawl

### C03-F02: Page Content Extraction

- [ ] Tokenize content: estimate Gemini token count per page using `text.length * 4` approximation
- [ ] Batch pages into chunks that fit within `GEMINI_CONTENT_BUDGET_PCT` of token window
- [ ] Example: 1M token window, 60% budget → 600k tokens available → ~150k chars → ~30 avg pages per batch
- [ ] Validate: No single page truncated to < 1000 chars (preserve context)

### C03-F03: Batch AI Extraction

- [ ] For each batch, send to Gemini: "Extract key facts about university culture, mission, academics, ideal student profile, etc."
- [ ] Parse Gemini response into structured facts (5 static categories + dynamic program-specific notes)
- [ ] Store results incrementally in memory; persist after all batches complete
- [ ] Retry on Gemini timeout (max 1 retry)

### C03-F04: Persistence

- [ ] Save to `university-ao/students/<student_slug>/universities/<uni_slug>/profile.json` (structured)
- [ ] Save to `university-ao/students/<student_slug>/universities/<uni_slug>/profile.md` (human-readable)
- [ ] JSON includes metadata: university name, tagline, crawl stats (pages crawled, failures, tokens spent)
- [ ] Markdown formatted as readable summary with sections per category

### C03-F05: Cost Tracking

- [ ] Estimate Gemini cost based on input/output tokens + model pricing table
- [ ] Display to user: "Estimated cost: ~$0.47 for this university" before confirmation
- [ ] Log actual token counts after API call (for later audit)
- [ ] Warn if estimated cost > $5 (sign of misconfiguration)

---

## Data Model

```typescript
interface UniversityProfileData {
  universityName: string;
  tagline: string | null;
  coreValues: string[];
  mission: string;
  culture: string;
  academicSpecialties: string[];
  notablePrograms: string[];
  idealCandidateTraits: string[];
  campusEthos: string;
  majorSpecificNotes: Record<string, string | null>; // "Computer Science" -> "..."
}

interface RunStats {
  urlsScanned: number;
  urlsFailed: number;
  urlsSkipped: number;
  llmCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}
```

---

## Error Handling

- [ ] Crawl timeout → show partial results, offer continue or abort
- [ ] Gemini token limit exceeded → truncate batch, retry with smaller batch
- [ ] Invalid URL → show error, re-prompt
- [ ] Network error during crawl → retry current page (max 2x), skip if fails

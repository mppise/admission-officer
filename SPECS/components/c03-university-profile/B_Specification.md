---
name: c03-university-profile-impl
description: C03 University Profile Builder — Implementation specification
---

# C03 — University Profile Builder: Implementation Specification

---

## Interfaces

```typescript
export function buildUniversityProfile(
  studentSlug: string,
  uniName: string,
  intendedMajors: string[],
): Promise<{ uniSlug: string; profilePath: string }>;
export function viewUniversityProfile(studentSlug: string, uniSlug: string): Promise<{ mdPath: string }>;
export function deleteUniversityProfile(studentSlug: string, uniSlug: string): Promise<void>;
export function listUniversityProfiles(studentSlug: string): Promise<{ uniSlug: string; universityName: string }[]>;
```

---

## File Paths

```
university-ao/students/<student_slug>/universities/
  └─ <uni_slug>/
     └─ profile.json         # Structured data
     └─ profile.md           # Human-readable
```

---

## Scraping Strategy

### Page Crawl

1. User provides university URL (e.g., https://example.edu/)
2. Playwright crawl starts from URL
3. Extract text from each page (using DOM → plain text extraction)
4. Follow links within same domain; max 100 pages
5. Stop conditions: Max pages, timeout (5 min total), no new links

### Tokenization & Batching

- Estimate tokens: `pageText.length / 4` (conservative, assumes ~4 chars per token)
- Available token budget: `GEMINI_TOKEN_WINDOW * (GEMINI_CONTENT_BUDGET_PCT / 100)`
- Batch pages until total estimated tokens would exceed budget
- If single page > budget, truncate to last 4000 chars

### AI Extraction Prompt

Send batch to Gemini:

```
You are extracting key institutional facts from university website text.
Categorize facts into:
- Identity & Mission (mission statement, values, core principles)
- Academic Environment (strengths, research focus, class sizes)
- Admissions & Selection (what admissions office emphasizes)
- Student Experience (campus culture, student life, traditions)
- Ideal Student Profile (traits universities seek)
- Program: [each major] (major-specific opportunities, resources)

For each category, provide 1–3 concise bullet points. Be factual; infer from text, don't hallucinate.
```

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Invalid URL | Show error, re-prompt |
| Connection timeout | Retry current page (max 2x), skip if fails, continue with next |
| Gemini token limit | Truncate batch to last 4000 chars, retry |
| Gemini rate limit | Wait 30s, retry |
| All pages failed | Show error, offer abort or retry |

---

## Operational Requirements

### UX

- **Progress display:** Show "Page N/M crawled, extracting..." on C08 status bar
- **Cost transparency:** Display estimated cost before starting → "Processing will cost ~$0.47. Continue? (y/n)"
- **Cancellable:** User can Escape to abort crawl in progress

### Data

- **Atomicity:** Write profile only after all extractions complete; don't write partial profiles
- **Slug:** Generated from university name (e.g., "Stanford University" → "stanford-university")
- **Timestamps:** ISO 8601 for generated/last-updated

### Security

- **No secrets in logs:** API key never logged
- **Domain whitelisting:** Only scrape pages within same domain as initial URL

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] Crawl small site (5 pages) → complete successfully
- [ ] Crawl large site (>100 pages) → stop at 100, show count
- [ ] Timeout → show partial results, allow retry
- [ ] Gemini extraction → valid JSON, all required fields present
- [ ] Cost estimation → matches actual token count (within ±10%)
- [ ] File persistence → profile loads correctly after reload

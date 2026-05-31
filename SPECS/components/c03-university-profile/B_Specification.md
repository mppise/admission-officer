---
name: c03-spec
description: Implementation specification for C03 University Profile
---

# C03 University Profile — Implementation Specification

---

## 1. Interfaces

```typescript
export async function buildUniversityProfile(
  studentSlug: string,
  universityName: string,
  universityUrl: string,
): Promise<{ profilePath: string; stats: RunStats }>

export async function showUniversityProfile(studentSlug: string, uniSlug: string): Promise<{ markdown: string }>

export async function deleteUniversityProfile(studentSlug: string, uniSlug: string): Promise<void>

export async function listUniversities(studentSlug: string): Promise<Array<{ name: string; slug: string }>>

interface RunStats {
  urlsScanned: number
  urlsFailed: number
  urlsSkipped: number
  llmCalls: number
  totalInputTokens: number
  totalOutputTokens: number
}
```

---

## 2. Error Handling

| Scenario | Error Message | Recovery |
|:---|:---|:---|
| Invalid university URL | "Invalid URL. Please enter a valid domain (e.g., mit.edu)." | Prompt user to correct |
| Network timeout | "Page fetch timed out. Skipping [url]. Continuing..." | Skip page, accumulate failure stat, continue |
| Gemini API rate limit | "Rate limited. Waiting 60 seconds..." | Auto-wait, then retry |
| Gemini token limit exceeded (batch) | "Batch too large. Truncating pages and retrying..." | Truncate to TRUNCATE_CHARS, resend |
| Student profile not found | "Student [slug] not found. Build student profile first." | Return to menu |
| Disk full (writing JSON) | "Could not save profile: [error]" | Suggest freeing disk space, allow retry |

**Retry strategy:**
- Network failures: retry 1× after 30s
- Gemini rate limits: wait 60s + retry
- Gemini token overflow: truncate + resend (no additional retry)

---

## 3. Operational Requirements

### 3.1 UX Patterns

- **Input:** University name + URL (e.g., "Massachusetts Institute of Technology", "mit.edu")
- **Cost estimation:** Show before scraping; allow user to confirm or cancel
- **Progress display:** Real-time status bar (pages, LLM calls, tokens)
- **Completion:** Summary stats (pages scraped, cost, tokens)

### 3.2 Data Validation

- **University name:** Non-empty, max 200 chars
- **URL:** Valid domain format (validated via URL constructor)
- **Intended majors:** Read from student profile; use to prioritize pages

### 3.3 Scraping Configuration

- **Max crawl pages:** 100 (MAX_CRAWL_PAGES constant)
- **Timeout per page:** 30 seconds
- **User-agent:** Identify as "Mozilla/5.0 (AO University Scanner)" to avoid blocks
- **Respect robots.txt:** Check robots.txt before scraping; skip disallowed paths
- **Rate limiting:** 1-2 second delay between requests to avoid IP bans

### 3.4 Batch Extraction

- **Prompt file:** c03-university-extract.prompt.md
- **Categories:** Identity & Mission, Academic Environment, Admissions & Selection, Student Experience, Ideal Student Profile, Program: {major}
- **Batch size logic:** Group pages until character budget exhausted, then create new batch

### 3.5 Token Budgeting

**Calculation:**
```
charBudget = tokenWindow × (contentBudgetPct / 100) × 4
             = 1048576 × 0.60 × 4
             ≈ 2,516,582 chars
```

**Per batch:**
- Accumulate page texts until next page would exceed charBudget
- Emit batch with accumulated texts
- Proceed to next batch

**Fallback:** If single page > charBudget, truncate to TRUNCATE_CHARS (4000) and send alone

### 3.6 Security

- **User-agent:** Identify as bot (transparency)
- **Rate limiting:** Respect server load; don't hammer with requests
- **No PII logging:** Don't log university names/URLs to files

### 3.7 Scalability

- **Per university:** Max 100 pages, ~5–10 LLM calls (batched by category)
- **All universities:** Bounded by disk + API quota
- **Workspace limit:** ~100MB per 20 universities (acceptable)

---

## 4. Testing Requirements

**Coverage threshold:** ≥80% line coverage

### Critical Paths

1. **Scraping:** Valid URL → fetch pages → success → save JSON
2. **Extraction:** Batch AI calls → token budgeting → cost estimation → output
3. **Error handling:** Network failure → skip page → continue
4. **Major-scoped:** Student majors → prioritize pages → scrape program pages

---

## 5. Changes & Revisions

| Date | Description |
|:---|:---|
| 2026-05-31 | Initial spec |

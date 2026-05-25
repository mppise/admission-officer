# C03 — University Profile: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C03-F01 Playwright navigation | Transient (timeout, network) | 1 | 30s (shown to user: "Retrying in 30 seconds...") | Log URL to failed-urls list; continue to next page |
| C03-F01 Playwright navigation | Permanent (bot-blocked 403/CAPTCHA) | 0 | — | Log URL to failed-urls list with reason "Bot protection detected"; continue |
| C03-F02 Gemini API call | Transient (rate limit, timeout) | 1 | 30s (shown to user: "Retrying Gemini in 30 seconds...") | After retry failure: print error + exit(1) |
| C03-F02 Gemini API call | Permanent (invalid key, quota hard limit) | 0 | — | Print actionable message + exit(1) |
| C03-F02 Gemini JSON parse | Permanent (malformed response) | 0 | — | Print "Gemini returned unexpected format. Try again." + exit(1) |
| C03-F03 File write | Permanent (disk error) | 0 | — | Print error + exit(1) |
| C03-F04 Failed URL log write | Permanent (disk error) | 0 | — | Print warning to stderr; do not exit — profile save can still succeed |
| C03-F05 Show (file not found) | Permanent | 0 | — | "No university profile found for <name>. Run: ao --university-profile --build --domain <domain>" |

### Partial Scrape Behaviour

- If ≥ 3 of 6 page categories succeed → proceed with Gemini extraction, write profile, write failed-urls.md
- If < 3 categories succeed → print "Insufficient content scraped from <domain>. See failed-urls.md for details." + exit(1)

---

## UX Detail

### C03-F01/F02 — Build Flow

```
1. Print: "Scraping <domain>... this may take a minute."
2. For each page category:
   a. Print: "  Fetching <category>..."
   b. Navigate with Playwright
   c. On success: print "  ✓ <category>"
   d. On failure (first attempt): print "  Retrying <URL> in 30 seconds..."
      Wait 30s → retry once
   e. On retry failure: print "  ✗ <category> — logged to failed-urls.md"
3. Print: "Scraping complete. X/6 pages retrieved."
4. Print: "Extracting university profile with Gemini..."
5. On Gemini transient failure: print "  Retrying Gemini in 30 seconds..."
6. Print: "Saved: data/universities/<slug>/profile.md"
7. If failed URLs exist: print "  Note: X pages failed — see data/universities/<slug>/failed-urls.md"
```

### C03-F05 — Show Flow

```
1. Resolve path: data/universities/<slug>/profile.md
2. If not found: print error + exit(1)
3. Print full markdown content to stdout
```

---

## Data Specifics

### University Profile Fields

| Field | Type | Nullable | Source | Notes |
| :---- | :--- | :------- | :----- | :---- |
| `universityName` | string | No | Gemini extraction | Full official name |
| `domain` | string | No | User input | Stored for reference |
| `tagline` | string | Yes | Gemini extraction | May not exist on all sites |
| `coreValues` | string[] | No | Gemini extraction | Min 1 item expected |
| `mission` | string | No | Gemini extraction | |
| `culture` | string | No | Gemini extraction | |
| `academicSpecialties` | string[] | No | Gemini extraction | Min 1 item expected |
| `notablePrograms` | string[] | Yes | Gemini extraction | May be empty for small schools |
| `idealCandidateTraits` | string[] | No | Gemini extraction | Min 1 item expected; critical for C04 |
| `campusEthos` | string | No | Gemini extraction | |
| `majorSpecificNotes` | string | Yes | Gemini extraction | Based on student's intendedMajor |
| `intendedMajor` | string | No | Student profile (C02) | Passed in from C01 prerequisite check |

No PII. All data scraped from public university websites.

**Retention:** User-managed. No automated deletion.

---

## Security Detail

- No user input is passed to Playwright URL navigation without validation. Domain must match pattern `^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` — reject anything else with "Invalid domain format."
- `GEMINI_API_KEY` must never appear in any log output, error message, or markdown file.
- Playwright runs in headless mode with no persistent browser profile — no cookies or session data retained after the process exits.
- All scraped content is text-only — HTML is stripped before passing to Gemini. No raw HTML is stored.

### Playwright Bot-Mitigation Headers

To reduce likelihood of bot-blocking (R-TC-AO000001):
```typescript
await page.setExtraHTTPHeaders({
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
});
```
Add a 1–2 second randomised delay between page navigations to avoid rate-trigger patterns.

---

## Compliance Obligations

No PII collected. All scraped content is from publicly accessible university web pages. No data subject rights apply. No vendor DPA required for scraping public content.

Gemini API: content sent to Gemini is university public web text + student's intended major (non-PII). Governed by Google's standard Gemini API terms.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Scrape start | `Scraping <domain>...` to stdout |
| Per-page status | `  ✓ <category>` or `  ✗ <category> — logged` |
| Scrape summary | `Scraping complete. X/6 pages retrieved.` |
| Gemini call start | `Extracting university profile with Gemini...` |
| Retry notice | `Retrying in 30 seconds... (attempt 2 of 2)` |
| Save success | `Saved: data/universities/<slug>/profile.md` |
| Failed URLs notice | `Note: X pages failed — see data/universities/<slug>/failed-urls.md` |
| Errors | Plain-English to stderr + actionable next step |

---

## Infrastructure / Environment Variables

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `GEMINI_API_KEY` | Authenticates Gemini API calls | `.env` file (validated by C01 at startup) |
| `GEMINI_MODEL` | Specifies Gemini model for extraction | `.env` file (validated by C01 at startup) |

---

## AI Behavior

### C03-F02 — University Profile Extraction

| Concern | Detail |
| :------ | :----- |
| Prompt file | `src/ai/prompts/c03-university-extract.md` |
| Model | `process.env.GEMINI_MODEL` |
| Temperature | `0.2` — low; extraction task requires consistency not creativity |
| Max output tokens | `2048` — sufficient for all profile fields |
| Streaming | No — wait for complete response before parsing |
| Response format | Instruct Gemini to respond with JSON only (no markdown fences) |
| Failure fallback | Retry once after 30s; on second failure print error + exit(1) |
| Content batching | All page text concatenated with category headers; capped at 20,000 chars total |
| Student context | Append `Student's intended major: <intendedMajor>` to prompt for `majorSpecificNotes` |

**Prompt template structure (in `c03-university-extract.md`):**
```
You are an expert college admissions analyst. 
Analyze the following content scraped from a university website and extract a structured profile.

Student's intended major: {{intendedMajor}}

Scraped content:
{{scrapedContent}}

Respond with ONLY valid JSON matching this schema:
{ universityName, tagline, coreValues[], mission, culture, academicSpecialties[], 
  notablePrograms[], idealCandidateTraits[], campusEthos, majorSpecificNotes }

For idealCandidateTraits, extract what this university appears to value in applicants 
based on their language, programs, and messaging. Be specific and concrete.
```

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable.

---

## Scalability

| Bottleneck | Mitigation | Owner |
| :--------- | :--------- | :---- |
| Gemini token limit with many scraped pages | Cap total batched content at 20,000 characters; truncate per-page content at 3,000 chars | C03-F02 |
| Playwright cold start (~3–5s for browser launch) | Acceptable for single-user CLI; no mitigation needed | — |
| Bot-blocked pages reducing content quality | Realistic headers + randomised delay (see Security Detail); failed URLs logged for retry | C03-F01 |

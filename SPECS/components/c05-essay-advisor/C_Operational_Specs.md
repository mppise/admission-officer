# C05 — Essay Advisor: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C05-F01 Enquirer prompts | User-caused (empty prompt) | 0 — re-prompt inline | — | Enquirer re-prompts on empty essayPrompt |
| C05-F02 Load student profile | Permanent (file not found) | 0 | — | "No student profile found for '<name>'. Run: ao --student-profile --build --name <name>" + exit(1) |
| C05-F02 Load university profile | Permanent (file not found) | 0 | — | "No university profile found for '<name>'. Run: ao --university-profile --build --domain <domain>" + exit(1) |
| C05-F03 Gemini API call | Transient (rate limit, timeout) | 1 | 30s (shown: "Retrying Gemini in 30 seconds...") | After retry failure: print error + exit(1) |
| C05-F03 Gemini API call | Permanent (invalid key, quota) | 0 | — | Plain-English message + exit(1) |
| C05-F03 Empty Gemini response | Permanent | 0 | — | "Gemini returned empty response. Try again." + exit(1) |
| C05-F04 File write | Permanent (disk error) | 0 | — | Print "Failed to save essay outline: <reason>" + exit(1) |
| C05-F05 Show — no files | Permanent | 0 | — | "No essay outlines found for '<student>' → '<university>'. Run: ao --essay --build" + exit(1) |

---

## UX Detail

### C05-F01 — Prompt Collection Flow

```
1. Print: "Let's build an essay outline. Answer a few questions first."
2. Prompt: essayType (Enquirer select)
3. Prompt: "Paste the essay prompt:" (Enquirer input, required)
4. Prompt: "Word limit? (leave blank if not specified):" (Enquirer input, optional)
5. Generate slug from essayType + hash of prompt
6. Check for existing file at resolved path
   - If exists: "An essay outline already exists for this prompt. Overwrite? (Yes/No)"
   - If No: print "Cancelled." and exit(0)
7. Print: "Generating essay outline for <essayType>..."
```

### C05-F03/F04 — Build Flow (after prompt collection)

```
1. Load both profiles silently
2. Print: "Calling Gemini..."
3. On transient failure: "Retrying Gemini in 30 seconds... (attempt 2 of 2)"
4. On success: print "Saved: data/students/<slug>/<uniSlug>/essays/<filename>.md"
5. Print: "⚠️  Remember: the samples in this outline are for inspiration only. Write your essay in your own voice."
```

### C05-F05 — Show Flow

```
1. Resolve dir: data/students/<slug>/<uniSlug>/essays/
2. If directory empty or missing: print error + exit(1)
3. If one file: open directly
4. If multiple files: Enquirer select — "Which essay outline would you like to view?"
   - List filenames as options
5. Print full markdown to stdout
```

### Disclaimer Placement

The ⚠️ disclaimer block must appear:
1. **In the Gemini-generated markdown** — as part of the prompt output (enforced by prompt)
2. **In the CLI stdout** — a one-line reminder printed after save (step 5 of build flow above)

This addresses R-BP-AO000001 mitigation requirement.

---

## Data Specifics

| Field | Type | Source | Notes |
| :---- | :--- | :----- | :---- |
| `essayType` | enum string | User (Enquirer select) | One of 5 predefined types |
| `essayPrompt` | string | User (Enquirer input) | Max 1000 chars; required |
| `wordLimit` | string | User (Enquirer input) | Optional; free text e.g. "650" |
| `studentProfileContent` | string (full markdown) | C02 output file | Passed verbatim to Gemini |
| `universityProfileContent` | string (full markdown) | C03 output file | Passed verbatim to Gemini |
| `essayMarkdown` | string (full markdown) | Gemini response | Stored as-is |
| `promptHash` | string (6 chars) | djb2 hash of essayPrompt | Used for filename slug |

**PII:** Student name appears in essay header (Gemini-generated). Stored locally only.

**Retention:** User-managed. No automated deletion.

---

## Security Detail

- `GEMINI_API_KEY` never appears in any output or error message.
- Essay prompt text (user-entered) and both profile files are sent to Gemini (Google's servers) — user consent is implicit via invocation.
- All paths derived from sanitised slugs provided by C01 — no path traversal possible.
- Essay prompt text is not executed or interpreted — treated as a plain string passed to the Gemini prompt template.
- No `exec`, `spawn`, or `eval`.

---

## Compliance Obligations

Student profile content and essay prompt text are sent to the Gemini API. User-initiated and user-consented. No regulatory obligations beyond Google's standard API terms. Same posture as C04.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Prompt collection start | `Let's build an essay outline...` to stdout |
| Build start | `Generating essay outline for <essayType>...` to stdout |
| Gemini call | `Calling Gemini...` to stdout |
| Retry notice | `Retrying Gemini in 30 seconds... (attempt 2 of 2)` to stdout |
| Save success | `Saved: data/students/<slug>/<uniSlug>/essays/<filename>.md` to stdout |
| Disclaimer reminder | `⚠️  Remember: samples are for inspiration only...` to stdout |
| Errors | Plain-English to stderr + corrective action |

---

## Infrastructure / Environment Variables

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `GEMINI_API_KEY` | Authenticates Gemini API calls | `.env` file (validated by C01) |
| `GEMINI_MODEL` | Specifies Gemini model | `.env` file (validated by C01) |

---

## AI Behavior

### C05-F03 — Essay Outline + Sample Generation

| Concern | Detail |
| :------ | :----- |
| Prompt file | `src/ai/prompts/c05-essay-generate.md` |
| Model | `process.env.GEMINI_MODEL` |
| Temperature | `0.8` — highest of all components; creative writing task requiring varied, personal prose |
| Max output tokens | `6144` — essay outlines with 3 samples can be lengthy |
| Streaming | No — wait for complete response |
| Response format | Plain markdown — no JSON, no code fences expected |
| Failure fallback | Retry once after 30s; on second failure: print error + exit(1) |
| Sample count | 2 samples for word limit < 500 or unspecified; 3 samples for word limit ≥ 500 — enforced by prompt instruction |
| Anchoring enforcement | CRITICAL RULES block in prompt; every section must reference specific student profile data |
| Disclaimer enforcement | Prompt instructs Gemini to include ⚠️ disclaimer block verbatim as specified |
| Empty response guard | If Gemini returns empty or whitespace-only: print error + exit(1) |

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
| Large profiles + long prompt exceeding Gemini context | Typical profiles well within 32k token context; no mitigation needed for MVP | — |
| Gemini response latency (6144 tokens ~15–20s) | Acceptable for single-user CLI; progress message shown | C05-F03 |

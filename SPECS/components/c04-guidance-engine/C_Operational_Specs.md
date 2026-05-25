# C04 — Guidance Engine: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C04-F01 Load student profile | Permanent (file not found) | 0 | — | "No student profile found for '<name>'. Run: ao --student-profile --build --name <name>" + exit(1) |
| C04-F01 Load university profile | Permanent (file not found) | 0 | — | "No university profile found for '<name>'. Run: ao --university-profile --build --domain <domain>" + exit(1) |
| C04-F02 Gemini API call | Transient (rate limit, timeout) | 1 | 30s (shown: "Retrying Gemini in 30 seconds...") | After retry failure: print error + exit(1) |
| C04-F02 Gemini API call | Permanent (invalid key, quota hard limit) | 0 | — | Plain-English message + exit(1) |
| C04-F03 File write | Permanent (disk error) | 0 | — | Print "Failed to save guidance report: <reason>" + exit(1) |
| C04-F04 Show (file not found) | Permanent | 0 | — | "No guidance report found for '<student>' → '<university>'. Run: ao --guidance --build --student <name> --university <name>" + exit(1) |

---

## UX Detail

### C04-F02/F03 — Build Flow

```
1. Print: "Generating guidance report for <studentName> → <universityName>..."
2. Load both profiles silently (fast local reads)
3. Print: "Calling Gemini..."
4. On transient failure: print "Retrying Gemini in 30 seconds... (attempt 2 of 2)"
5. On success: print "Saved: data/students/<slug>/<uniSlug>/guidance.md"
```

### C04-F04 — Show Flow

```
1. Resolve path: data/students/<slug>/<uniSlug>/guidance.md
2. If not found: print error + exit(1)
3. Print full markdown content to stdout
```

---

## Data Specifics

| Field | Type | Source | Notes |
| :---- | :--- | :----- | :---- |
| `studentProfileContent` | string (full markdown) | C02 output file | Passed verbatim to Gemini prompt |
| `universityProfileContent` | string (full markdown) | C03 output file | Passed verbatim to Gemini prompt |
| `guidanceMarkdown` | string (full markdown) | Gemini response | Stored as-is to guidance.md |

No structured parsing of the Gemini response — it is stored as raw markdown. C04 only validates that the response is non-empty before writing.

**PII:** Student name appears in the report header (Gemini-generated). Stored locally only.

**Retention:** User-managed. No automated deletion.

---

## Security Detail

- `GEMINI_API_KEY` never appears in any output or error message.
- Both profile paths are resolved from sanitised slugs provided by C01 — no path traversal possible.
- Profile content is passed to Gemini (Google's servers) — user is responsible for reviewing Google's Gemini API data usage policy (surfaced in README).
- No `exec`, `spawn`, or `eval`.

---

## Compliance Obligations

Student profile content (including name and academic record) is sent to the Gemini API. This is user-initiated and user-consented (they invoked the command). No regulatory obligations beyond what Google's standard API terms require. No PII is stored by `ao` beyond the local filesystem.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Build start | `Generating guidance report for <student> → <university>...` to stdout |
| Gemini call | `Calling Gemini...` to stdout |
| Retry notice | `Retrying Gemini in 30 seconds... (attempt 2 of 2)` to stdout |
| Save success | `Saved: data/students/<slug>/<uniSlug>/guidance.md` to stdout |
| Errors | Plain-English to stderr + corrective action |

---

## Infrastructure / Environment Variables

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `GEMINI_API_KEY` | Authenticates Gemini API calls | `.env` file (validated by C01) |
| `GEMINI_MODEL` | Specifies Gemini model | `.env` file (validated by C01) |

---

## AI Behavior

### C04-F02 — Guidance Generation

| Concern | Detail |
| :------ | :----- |
| Prompt file | `src/ai/prompts/c04-guidance-generate.md` |
| Model | `process.env.GEMINI_MODEL` |
| Temperature | `0.7` — moderate; generative task requiring nuanced, personalised prose |
| Max output tokens | `4096` — guidance reports can be lengthy |
| Streaming | No — wait for complete response; guidance is a single coherent document |
| Response format | Plain markdown — no JSON, no code fences expected |
| Failure fallback | Retry once after 30s; on second failure: print error + exit(1) |
| Anchoring enforcement | Prompt explicitly instructs Gemini to reference specific profile data; includes CRITICAL RULES block |
| Empty response guard | If Gemini returns empty or whitespace-only string: print "Gemini returned empty response. Try again." + exit(1) |

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
| Large student profile + large university profile exceeding Gemini context window | Both profiles are markdown files; typical size well within 32k token context. No mitigation needed for MVP. | — |
| Gemini response latency (typically 5–15s for 4096 tokens) | Acceptable for single-user CLI; progress message shown | C04-F02 |

# C06 — PDF Exporter: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C06-F01 Read markdown | Permanent (file not found) | 0 | — | "PDF export failed: source file not found at <path>" + exit(1) |
| C06-F01 marked.parse | Permanent (parse error) | 0 | — | "PDF export failed: could not parse markdown" + exit(1) |
| C06-F02 Puppeteer launch | Transient (browser crash) | 1 | 5s | After retry failure: "PDF export failed: browser could not start. You can open the markdown file directly at <path>" + exit(1) |
| C06-F02 page.pdf() | Permanent (write error) | 0 | — | "PDF export failed: could not write to <pdfPath>" + exit(1) |

Fallback message always includes the markdown path so the user can access the content directly even if PDF export fails. This addresses R-TC-AO000003 contingency.

---

## UX Detail

### C06-F02 — Export Flow

```
1. C01 invokes exportToPdf(markdownPath) after primary command succeeds
2. Print: "Exporting to PDF..."
3. On success: print "PDF exported: <pdfPath>"
4. On failure: print fallback message to stderr; do not exit if primary command already succeeded
   — PDF failure is non-fatal when --show was the primary command
   — PDF failure is fatal when --build was the primary command (since user explicitly requested print output)
```

### Fatal vs Non-Fatal PDF Failure

| Primary command | PDF failure behaviour |
| :-------------- | :-------------------- |
| `--build --print` | Fatal — exit(1) after error message |
| `--show --print` | Non-fatal — print warning to stderr; primary output already shown to stdout |

C01 controls this distinction by catching the error from `exportToPdf` and deciding exit behaviour based on which command was active.

---

## Data Specifics

| Field | Type | Source | Notes |
| :---- | :--- | :----- | :---- |
| `markdownPath` | string (absolute path) | C01 (from component handler return) | Must end in `.md` |
| `pdfPath` | string (absolute path) | Derived: replace `.md` with `.pdf` | Written to same directory |
| `markdownContent` | string | `fs.readFile(markdownPath)` | Full markdown text |
| `htmlContent` | string | `marked.parse(markdownContent)` wrapped in template | Full HTML document |

**PII:** PDF may contain student name and academic data (same as source markdown). Stored locally only — same protections apply.

**Retention:** User-managed. PDF files are never auto-deleted.

---

## Security Detail

- `markdownPath` is provided by C01 from a component handler return value — never from raw user input. No path traversal possible.
- CSS is loaded from a local file at startup and inlined — no external stylesheet fetch during PDF rendering.
- `waitUntil: 'networkidle0'` in `page.setContent()` is safe because the HTML has no network references — it resolves immediately.
- Puppeteer launches with `headless: true` — no visible browser window; no persistent profile.
- No user-supplied HTML is injected — only `marked`-parsed markdown output, which produces safe HTML without script tags.

---

## Compliance Obligations

PDF files contain the same content as the source markdown. Same local-only data handling applies. No regulatory obligations.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Export start | `Exporting to PDF...` to stdout |
| Export success | `PDF exported: <pdfPath>` to stdout |
| Export failure | Plain-English message to stderr + markdown path as fallback |

---

## Infrastructure

No environment variables required. C06 is fully offline. Puppeteer downloads a Chromium binary on `npm install` — this is a one-time setup cost, not a runtime dependency.

---

## AI Behavior

Not applicable. C06 makes no AI calls.

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
| Puppeteer cold start (~1–3s per invocation) | Acceptable for single `--print` call per command; no mitigation needed | — |
| Large markdown files (e.g., verbose guidance report) rendering slowly | `page.pdf()` is synchronous from our perspective; typical `ao` files well within 1s render time | — |

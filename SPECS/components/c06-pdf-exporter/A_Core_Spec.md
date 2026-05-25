# C06 — PDF Exporter: Core Specification

## Purpose

Converts any `ao` markdown output file to a well-formatted PDF by rendering it through an HTML template with a clean CSS stylesheet via Puppeteer. The PDF is written alongside the source markdown file with the same name and a `.pdf` extension. Fully offline — no external service calls.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C06-F01 | Convert a markdown file to HTML using `marked` and a CSS stylesheet | P1 | REQ-0012 | - |
| `Complete` | C06-F02 | Render the HTML to PDF using Puppeteer and write it alongside the source markdown | P1 | REQ-0012 | - |

---

## PDF Pipeline

```
markdownPath
  → read markdown file (fs.readFile)
  → convert to HTML (marked.parse)
  → wrap in HTML template with CSS stylesheet
  → launch Puppeteer (headless Chromium)
  → page.setContent(htmlContent)
  → page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin })
  → browser.close()
  → return { pdfPath }
```

### Output Path Derivation

```
markdownPath: data/students/john-doe/profile.md
pdfPath:      data/students/john-doe/profile.pdf
```

Replace `.md` extension with `.pdf` — same directory, same base name.

---

## HTML Template Structure

The markdown is wrapped in a minimal HTML document before passing to Puppeteer:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    /* inline CSS from src/components/c06-pdf-exporter/styles/pdf.css */
  </style>
</head>
<body>
  <div class="ao-document">
    <!-- marked.parse(markdownContent) output injected here -->
  </div>
</body>
</html>
```

CSS is inlined at build time (read from `src/components/c06-pdf-exporter/styles/pdf.css` and embedded as a `<style>` block) — no external stylesheet references, ensuring the PDF renders correctly without a network call.

---

## CSS Stylesheet Specification

**File:** `src/components/c06-pdf-exporter/styles/pdf.css`

| Property | Value | Rationale |
| :------- | :---- | :-------- |
| Body font | `Georgia, serif` | Readable for long-form academic content |
| Base font size | `11pt` | Standard for printed documents |
| Line height | `1.6` | Comfortable reading |
| Max width | `100%` (A4 flow) | Fills A4 page width |
| `h1` | `18pt`, bold, border-bottom | Clear document title |
| `h2` | `14pt`, bold, margin-top 1.5em | Section separator |
| `h3` | `12pt`, bold | Sub-section |
| `table` | Full width, collapsed borders, alternating row background | Readable data tables |
| `th` | Background `#f0f0f0`, bold | Header row distinction |
| `blockquote` | Left border `4px solid #ccc`, italic, padding-left 1em | Disclaimer/note blocks |
| `code` | Monospace, background `#f8f8f8` | Inline code |
| `a` | Colour `#000`, no underline | Print-friendly links |
| Page breaks | `page-break-inside: avoid` on `table`, `blockquote`, `h2+*` | Prevent awkward splits |

---

## Puppeteer PDF Options

```typescript
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20mm',
    bottom: '20mm',
    left: '20mm',
    right: '20mm',
  },
});
```

---

## Data Flows

**F01 — Markdown to HTML:**
`markdownPath → fs.readFile(markdownPath, 'utf8') → marked.parse(content) → wrap in HTML template with inline CSS → htmlString`

**F02 — HTML to PDF:**
`htmlString → puppeteer.launch({ headless: true }) → page.setContent(htmlString, { waitUntil: 'networkidle0' }) → page.pdf(options) → browser.close() → return { pdfPath }`

---

## Execution Mode

Request-driven. Invoked by C01 after a `--build` or `--show` command completes when `--print` flag is set. Async — Puppeteer launch and PDF render are both async/await. Process completes synchronously from C01's perspective via top-level await.

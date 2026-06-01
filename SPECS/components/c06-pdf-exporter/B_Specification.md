---
name: c06-pdf-exporter-impl
description: C06 PDF Exporter — Implementation specification
---

# C06 — PDF Exporter: Implementation Specification

---

## Interfaces

```typescript
export async function exportToPdf(markdownPath: string, outputPath: string): Promise<void>;
```

---

## Markdown to HTML Conversion

```typescript
// Use marked.parse() to convert markdown
// Inline CSS from ./styles/pdf.css
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="ao-document">
${htmlBody}
  </div>
</body>
</html>`;
```

---

## HTML to PDF Rendering

```typescript
async function renderPdf(htmlContent: string, pdfPath: string): Promise<void> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
  });
  await browser.close();
}
```

---

## File Paths

```
university-ao/students/<slug>/exports/
  ├─ profile.pdf
  ├─ university-<uni_slug>.pdf
  ├─ guidance-<iso_timestamp>.pdf
  └─ essay-<type>-<hash>.pdf
```

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Markdown file not found | "File not found: {path}" |
| Browser launch failed | Attempt `npx puppeteer browsers install chrome`, retry |
| Disk full | "Disk full or write permission denied" |
| Invalid markdown | Fallback: render as-is with minimal styling |

---

## Operational Requirements

- **Response time:** < 5 seconds per page (Puppeteer render + write)
- **Browser management:** Ensure browser closes on success or error
- **CSS styling:** Must be readable on printed page (black text, proper margins)

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] Convert markdown → HTML → valid HTML5
- [ ] Render HTML → PDF → file created, readable
- [ ] Handle long documents (5+ pages) → no truncation
- [ ] Handle tables, code blocks → render correctly
- [ ] Browser auto-install → success on first export after clean install

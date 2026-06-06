# Feature Spec — FEATURE-006: PDF Exporter

**Domain:** pdf_exporter
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Last updated:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

Converts any markdown file produced by the application (student profile, university profile) to a PDF file at the same path with a `.pdf` extension. Uses `marked` for markdown parsing, a custom CSS stylesheet for styling, and Puppeteer for HTML-to-PDF rendering.

Guidance reports and essay outlines are no longer routed through the PDF export flow in the CLI; they are displayed inline via `showMarkdownScreen()` in C01. PDF export for guidance/essay is not available in the web UI. Student profile and university profile export remain functional.

---

## Implementation Plan

### F01 — Markdown to HTML
- `marked.parse()` converts markdown to HTML
- Inline CSS from `dist/components/c06-pdf-exporter/styles/pdf.css` (copied at build time)
- Wraps body in `<div class="ao-document">` for styling scope
- Throws descriptive error if CSS file or source markdown is missing

### F02 — HTML to PDF via Puppeteer
- Launches Puppeteer in headless mode
- Sets page content with `waitUntil: 'networkidle0'` for full render
- Outputs A4 PDF with 20mm margins on all sides, `printBackground: true`
- If browser launch fails: auto-installs Puppeteer Chrome via `ensureBrowsersInstalled()` and retries once
- Browser always closed in `finally` block

---

## API / Interface Contract

```typescript
export async function exportToPdf(
  markdownPath: string
): Promise<{ pdfPath: string }>
// pdfPath = markdownPath.replace(/\.md$/, '.pdf')
```

---

## Guardrail Compliance

PDF export is entirely local — no network calls. Source markdown is read from the local workspace only. The CSS file must be present in the `dist/` directory at runtime (ensured by the build script). `jspdf` and `html2canvas` are listed as dependencies but are not used — they are dead dependencies in v1.0.

**Note:** `btnExportGuidancePdf` and `btnExportAllEssaysPdf` buttons have been removed from the web UI. The `exportGuidancePdf` and `exportAllEssaysPdf` functions no longer exist in `web/public/app.js`. PDF export for guidance and essays is not supported in v1.0.

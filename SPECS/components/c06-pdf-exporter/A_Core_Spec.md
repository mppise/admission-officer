---
name: c06-core-spec
description: Core spec for C06 PDF Exporter
---

# C06 PDF Exporter — Core Specification

**Component:** PDF Exporter  
**Purpose:** Convert markdown (guidance reports, essays) to styled PDF  
**Status:** Ready (implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C06-F01 | Convert markdown to HTML with CSS styling (marked + inline CSS) | Ready | REQ-0011 |
| C06-F02 | Render HTML to PDF via Puppeteer headless browser | Ready | REQ-0011 |

---

## Acceptance Criteria

### C06-F01: Markdown → HTML
- [ ] Read markdown file from disk
- [ ] Parse with marked library
- [ ] Inject CSS (pdf.css) inline in HTML <style> tag
- [ ] Generate valid HTML5 document

### C06-F02: HTML → PDF
- [ ] Launch Puppeteer headless Chrome
- [ ] Set page content to HTML
- [ ] Render to PDF: A4 format, 20mm margins, print background enabled
- [ ] Write to disk: same directory as markdown, .pdf extension
- [ ] Close browser gracefully

---

## Error Handling

| Scenario | Error Message | Recovery |
|:---|:---|:---|
| Markdown file not found | "PDF export failed: source file not found..." | Return to menu |
| CSS file missing | "PDF export failed: CSS stylesheet not found..." | Rebuild npm (CSS should be bundled) |
| Browser launch fails | "PDF export failed: could not launch browser..." + recovery steps | Auto-install browsers, retry |
| Browser timeout | "PDF export failed: rendering timed out" | User can retry |
| Disk full | "PDF export failed: could not write to [path]..." | User checks disk space, retries |
| Markdown parse error | "PDF export failed: could not parse markdown" | Likely markdown corruption; report as bug |

---

## Design Notes

- **CSS styling:** pdf.css defines typography, layout, colors (magenta/cyan theme)
- **Browser management:** Try Puppeteer first; on failure, auto-install browsers + retry
- **Timeout:** 5 seconds per PDF render (generous for small documents)
- **PDF options:** A4, 20mm margins, printBackground: true (captures colored backgrounds)

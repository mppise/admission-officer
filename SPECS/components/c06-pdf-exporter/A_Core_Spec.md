---
name: c06-pdf-exporter-core
description: C06 PDF Exporter — Feature specification
---

Architecture refs: 0_Overview.md, 1_Stack.md

# C06 — PDF Exporter: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C06-F01 | Convert markdown to HTML with inline CSS | Ready | REQ-0007 |
| C06-F02 | Render HTML to PDF via Puppeteer | Ready | REQ-0007 |
| C06-F03 | Export any artifact (profile, guidance, essay) to PDF | Ready | REQ-0007 |

---

## Acceptance Criteria

### C06-F01: Markdown to HTML

- [ ] Use `marked.parse()` to convert markdown → HTML
- [ ] Inline CSS stylesheet (`pdf.css`) for formatting
- [ ] Preserve markdown structure: headers, lists, tables, bold/italic
- [ ] Output valid HTML5 with `<!DOCTYPE html>`
- [ ] No external resources (all CSS inline)

### C06-F02: HTML to PDF

- [ ] Use Puppeteer (Chromium) to render HTML
- [ ] Auto-launch Puppeteer headless browser
- [ ] If browser not installed, run `npx puppeteer browsers install chrome` (post-install script)
- [ ] Render as A4 page, portrait, with 20mm margins on all sides
- [ ] PDF renders correctly (no truncation, readable fonts)
- [ ] Output file created successfully

### C06-F03: Export Any Artifact

- [ ] User selects artifact from menu: Student profile, University profile, Guidance, Essay
- [ ] User selects which instance (if multiple versions exist)
- [ ] Component reads markdown from filesystem
- [ ] Converts and saves PDF to `university-ao/students/<slug>/exports/<name>.pdf`
- [ ] Shows confirmation: "PDF saved to <path>"

---

## Error Handling

- [ ] Markdown file not found → show error, don't attempt conversion
- [ ] Browser launch failed → attempt auto-install, retry, show error if still fails
- [ ] Disk full on write → show error with disk space suggestion
- [ ] Invalid markdown → fallback gracefully (show raw text)

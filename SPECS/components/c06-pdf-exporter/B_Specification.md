---
name: c06-spec
description: Implementation specification for C06 PDF Exporter
---

# C06 PDF Exporter — Implementation Specification

---

## 1. Interfaces

```typescript
export async function exportToPdf(markdownPath: string): Promise<{ pdfPath: string }>
```

---

## 2. Implementation Details

### 2.1 Markdown → HTML

**Function:** markdownToHtml(markdownContent: string): Promise<string>

```typescript
1. Read CSS from dist/components/c06-pdf-exporter/styles/pdf.css
2. Parse markdown with marked.parse(markdownContent)
3. Inject CSS into <style> tag
4. Wrap in HTML5 boilerplate
5. Return full HTML document string
```

### 2.2 HTML → PDF

**Function:** renderPdf(htmlContent: string, pdfPath: string): Promise<void>

```typescript
1. Try: puppeteer.launch({ headless: true })
2. On error: ensureBrowsersInstalled() → retry launch
3. Open new page
4. setContent(htmlContent, { waitUntil: 'networkidle0' })
5. page.pdf({ path: pdfPath, format: 'A4', margin: {20mm}, printBackground: true })
6. Close browser
```

### 2.3 Error Handling

**markdownToHtml errors:**
- CSS file missing: wrap in try/catch, throw with hint
- Markdown parse fails: wrap marked.parse() in try/catch

**renderPdf errors:**
- Browser launch fails: ensureBrowsersInstalled() + retry logic
- setContent fails: check HTML validity; throw with context
- page.pdf() fails: likely disk/permissions; throw with path + hint

---

## 3. File Locations

```
Source markdown: workspace/students/{slug}/universities/{uni_slug}/guidance/{timestamp}/guidance.md
Output PDF:      workspace/students/{slug}/universities/{uni_slug}/guidance/{timestamp}/guidance.pdf

Source markdown: workspace/students/{slug}/universities/{uni_slug}/essays/{timestamp}/{type}-{hash}.md
Output PDF:      workspace/students/{slug}/universities/{uni_slug}/essays/{timestamp}/{type}-{hash}.pdf
```

---

## 4. CSS Styling (pdf.css)

**Requirements:**
- Clear typography (readable on print)
- Magenta/cyan brand colors (headers, links)
- Proper margins and spacing
- Page breaks handled gracefully
- Heading hierarchy visible

**Example structure:**
```css
body { font-family: serif; margin: 0; }
.ao-document { padding: 0; }
h1 { color: #ff00ff; /* magenta */ }
h2 { color: #00ffff; /* cyan */ }
p { line-height: 1.6; }
```

---

## 5. Testing

**Critical path:** Read markdown → parse → render PDF → write file → verify PDF exists

---

## 6. Changes & Revisions

| Date | Description |
|:---|:---|
| 2026-05-31 | Initial spec |

# C06 — PDF Exporter: Interfaces

> ⚠️ Revised 2026-05-27 (CHG-002): Path contract examples updated to `university-ao/` with nested university structure.

## Exposed Function (called by C01)

```typescript
exportToPdf(markdownPath: string): Promise<{ pdfPath: string }>
```
- `markdownPath`: absolute path to the source markdown file — provided by C01 from the component handler's return value
- Reads the markdown file, converts to HTML, renders to PDF via Puppeteer
- PDF is written to the same directory as the source file with `.pdf` extension
- Returns the absolute path to the generated PDF

### Path Contract

| Input | Output |
| :---- | :----- |
| `university-ao/students/john-doe/profile.md` | `university-ao/students/john-doe/profile.pdf` |
| `university-ao/students/john-doe/universities/mit/profile.md` | `university-ao/students/john-doe/universities/mit/profile.pdf` |
| `university-ao/students/john-doe/universities/mit/guidance/<ts>/guidance.md` | `university-ao/students/john-doe/universities/mit/guidance/<ts>/guidance.pdf` |
| `university-ao/students/john-doe/universities/mit/essays/<ts>/essay.md` | `university-ao/students/john-doe/universities/mit/essays/<ts>/essay.pdf` |

---

## Internal Dependencies

| Library | Usage |
| :------ | :---- |
| `marked` | `marked.parse(markdownString)` → HTML string |
| `puppeteer` | `puppeteer.launch()` → `page.setContent()` → `page.pdf()` |
| `fs/promises` | `readFile` for markdown; CSS stylesheet |

---

## Events

C06 produces and consumes no events. Invoked via direct function call from C01.

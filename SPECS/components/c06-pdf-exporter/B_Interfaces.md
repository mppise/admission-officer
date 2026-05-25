# C06 — PDF Exporter: Interfaces

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
| `data/students/john-doe/profile.md` | `data/students/john-doe/profile.pdf` |
| `data/universities/mit/profile.md` | `data/universities/mit/profile.pdf` |
| `data/students/john-doe/mit/guidance.md` | `data/students/john-doe/mit/guidance.pdf` |
| `data/students/john-doe/mit/essays/personal-statement-a3f9c2.md` | `data/students/john-doe/mit/essays/personal-statement-a3f9c2.pdf` |

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

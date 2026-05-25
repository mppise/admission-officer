# C06 PDF Exporter — Spec Reading Guide

## Reading Order
1. `../../artifacts/B_Architecture.md` — system constraints (mandatory first)
2. `A_Core_Spec.md` — what to build and why (includes full PDF pipeline, CSS spec, Puppeteer options)
3. `B_Interfaces.md` — function signature, path contract table, internal dependencies
4. `C_Operational_Specs.md` — error handling, fatal vs non-fatal failure distinction, UX flow

## Authority Rules
- If A_Core_Spec and B_Interfaces conflict: B_Interfaces wins for signatures; A_Core_Spec wins for behavior.
- If any spec conflicts with B_Architecture.md: stop and raise with DevLead before proceeding.
- Do not infer missing details — raise as a spec gap.

## Key Facts for Developers
- C06 is **the simplest component** — one function, one pipeline: markdown → HTML → PDF.
- The **CSS file** lives at `src/components/c06-pdf-exporter/styles/pdf.css` and is **inlined** into the HTML — never referenced as an external URL.
- The **pdfPath** is always derived by replacing `.md` with `.pdf` in the markdownPath — no other logic.
- PDF failure is **fatal for `--build --print`** but **non-fatal for `--show --print`** — C01 controls this distinction, not C06.
- `waitUntil: 'networkidle0'` is safe here because the HTML has no network references.
- Puppeteer uses the same Chromium binary as C03 (Playwright) — both are installed at `npm install` time.

## Spec Version
Last updated: 2026-05-24 | Status: Ready

# Feature Spec — FEATURE-007: Web Server & SSE Streaming

**Domain:** web_server
**Author:** Mangesh Pise (reverse-engineered)
**Date:** 2026-06-06
**Status:** Complete (v1.0)

---

## Scope

An Express web server that exposes the university scraping and AI generation pipeline via REST endpoints. Includes a server-sent events (SSE) endpoint for real-time crawl progress streaming. The web UI (`web/public/`) uses localStorage for data persistence. Launched via `npm run web`.

---

## Implementation Plan

### F01 — Express server setup
- Listens on `PORT` env var (default 3000)
- Serves `web/public/` as static files
- JSON body parser middleware

### F02 — Health check
- `GET /api/health` returns `{ status: 'ok' }`

### F03 — Synchronous university scrape
- `POST /api/scrape-university` body: `{ domain, intendedMajors? }`
- Calls `scrapeUniversity()` from `universityScraper.ts` (blocking — no SSE)
- Returns `UniversityProfileData` JSON on success

### F04 — SSE-streamed university scrape
- `POST /api/scrape-university-stream` body: `{ domain, intendedMajors? }`
- Sets SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `Access-Control-Allow-Origin: *`)
- Calls `scrapeUniversity()` with a progress callback that writes `data: {JSON}\n\n` events
- On completion sends `{ type: 'complete', data: UniversityProfileData }`
- On error sends `{ type: 'error', message: string }`

### F05 — Guidance generation
- `POST /api/generate-guidance` body: `{ studentData, universityData }`
- Uses an inline hardcoded Gemini prompt (not `c04-guidance-generate.prompt.md`)
- Returns Bootstrap-styled HTML (not markdown)
- `enhanceHtmlWithBootstrap()` adds Bootstrap classes to elements lacking them

### F06 — Essay guidance generation
- `POST /api/generate-essay-guidance` body: `{ studentData, universityData, essayPrompt, wordLimit? }`
- Uses an inline hardcoded Gemini prompt (not `c05-essay-generate.prompt.md`)
- Returns Bootstrap-styled HTML

### F07 — Shared scraper utility
- `src/utils/universityScraper.ts` is imported by both C03 (CLI) and the web server
- Provides `crawlUniversityWebsite()`, `extractUniversityInfo()`, `scrapeUniversity()` with `ProgressCallback`

---

## API / Interface Contract

```
GET  /api/health
POST /api/scrape-university          { domain: string, intendedMajors?: string[] }
POST /api/scrape-university-stream   { domain: string, intendedMajors?: string[] }   → SSE
POST /api/generate-guidance          { studentData: object, universityData: object }
POST /api/generate-essay-guidance    { studentData, universityData, essayPrompt, wordLimit? }
```

### Web storage model (browser-side localStorage)
- Student list: `ao_students` → `string[]` (IDs)
- Student data: `ao_student_{id}` → student object
- University list: `ao_uni_{studentId}` → `string[]` (IDs)
- University data: `ao_uni_{studentId}_{uniId}` → university object

---

## Guardrail Compliance

The web server reads `GEMINI_API_KEY` and `GEMINI_MODEL` from the server's environment (not the user's workspace `.env`). CORS is open (`*`) on the SSE endpoint — acceptable for a localhost-only development tool. No student data is persisted server-side; all data lives in the browser's localStorage. The server does not write to `university-ao/` workspace.

**Note:** Web server guidance/essay prompts diverge from CLI `.prompt.md` prompts. The web prompts produce Bootstrap HTML for browser rendering; the CLI prompts produce structured markdown. This is a known architectural divergence (see architecture-spec.md section 9).

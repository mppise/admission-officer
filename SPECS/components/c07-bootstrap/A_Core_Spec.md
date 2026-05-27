# C07 — Bootstrap: Core Specification

## Purpose

Ensures the `university-ao/` workspace directory exists relative to `process.cwd()`, then loads `university-ao/.env` into `process.env`. Called once at process start before C01 renders the menu. Also provides typed config accessors and a write-back function used by the Config screen.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Not Started` | C07-F01 | Ensure `university-ao/` directory exists at `process.cwd()/university-ao/`; create it if absent | P1 | REQ-0013, REQ-0014 | - |
| `Not Started` | C07-F02 | Load `university-ao/.env` via `dotenv`; if the file does not exist, proceed silently (Config screen will create it) | P1 | REQ-0014, REQ-0020 | - |
| `Not Started` | C07-F03 | Expose typed config accessors: `getApiKey()` and `getModel()` — return string or `undefined`; never throw | P1 | REQ-0020 | - |
| `Not Started` | C07-F04 | Expose `saveConfig(key, model)` — write `GEMINI_API_KEY` and `GEMINI_MODEL` to `university-ao/.env`; validate both are non-empty strings before writing | P1 | REQ-0020 | - |
| `Not Started` | C07-F05 | Expose `workspacePath(...segments)` — returns absolute path rooted at `process.cwd()/university-ao/`; replaces current `dataPath()` in `fileUtils.ts` | P1 | REQ-0013 | - |

---

## Data Flows

**F01 — Workspace init:**
`process.cwd() → path.join(cwd, 'university-ao') → fs.mkdir(workspaceDir, { recursive: true }) → done`

**F02 — Env load:**
`workspaceDir/.env exists? → dotenv.config({ path: workspacePath('.env') }) → process.env populated → does not exist: no-op`

**F03 — Config read:**
`process.env.GEMINI_API_KEY → return string | undefined`
`process.env.GEMINI_MODEL → return string | undefined`

**F04 — Config write:**
`key: string (non-empty) + model: string (non-empty) → validate → build .env content string → fs.writeFile(workspacePath('.env'), content, 'utf8') → dotenv.config({ path, override: true }) → update process.env in-process`

**F05 — Path resolution:**
`workspacePath('students', 'john-doe', 'profile.json') → path.join(process.cwd(), 'university-ao', 'students', 'john-doe', 'profile.json')`

---

## Execution Mode

Called once at startup synchronously (top-level await in entry point) before any ink render. `saveConfig` is async (file write). All other functions are synchronous.

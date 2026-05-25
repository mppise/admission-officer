# C01 — CLI Shell: Core Specification

## Purpose

Entry point for all `ao` commands. Parses command-line switches using `commander`, validates the `.env` configuration on startup, enforces component prerequisites, routes to the correct component handler, and composes the `--print` flag across all commands.

---

## Features

| Status | ID | Description | Priority | Req Ref | Doc Level |
| :----- | :- | :---------- | :------- | :------ | :-------- |
| `Complete` | C01-F01 | Parse all CLI flags and route to the correct component handler | P1 | REQ-0014 | - |
| `Complete` | C01-F02 | Validate `.env` on startup — check `GEMINI_API_KEY` and `GEMINI_MODEL` are present for AI-dependent commands | P1 | REQ-0014 | - |
| `Complete` | C01-F03 | Enforce prerequisite: student profile with intended major must exist before `--university-profile --build`, `--guidance --build/--show`, or `--essay --build/--show` | P1 | REQ-0004 | - |
| `Complete` | C01-F04 | Compose `--print` flag — after any `--build` or `--show` command completes, invoke C06 PDF Exporter on the output markdown path | P1 | REQ-0012 | - |
| `Complete` | C01-F05 | Display actionable help text for all commands and flags | P2 | REQ-0014 | - |

---

## CLI Flag Contract

### Commands

```
ao --student-profile  --build [--name <name>]
ao --student-profile  --show  --name <name> [--print]

ao --university-profile  --build --domain <domain> [--name <name>]
ao --university-profile  --show  --name <name> [--print]

ao --guidance  --build --student <name> --university <name>
ao --guidance  --show  --student <name> --university <name> [--print]

ao --essay  --build --student <name> --university <name>
ao --essay  --show  --student <name> --university <name> [--print]
```

### Flag Definitions

| Flag | Type | Required? | Description |
| :--- | :--- | :-------- | :---------- |
| `--student-profile` | command group | mutually exclusive with others | Activates student profile mode |
| `--university-profile` | command group | mutually exclusive with others | Activates university profile mode |
| `--guidance` | command group | mutually exclusive with others | Activates guidance engine mode |
| `--essay` | command group | mutually exclusive with others | Activates essay advisor mode |
| `--build` | action flag | required per group | Triggers wizard/build flow |
| `--show` | action flag | required per group | Displays stored data |
| `--name <name>` | string | varies (see below) | Student or university name; used for directory resolution |
| `--domain <domain>` | string | required for `--university-profile --build` | University website domain (e.g., `mit.edu`) |
| `--student <name>` | string | required for `--guidance`, `--essay` | Student name; resolves to `data/students/<name>/` |
| `--university <name>` | string | required for `--guidance`, `--essay`, `--university-profile --show` | University name; resolves to `data/universities/<name>/` |
| `--print` | boolean flag | optional | Export the output to PDF via C06 |

### Name Resolution Rules

- `--name` on `--student-profile --build`: if omitted, wizard will prompt for it.
- `--name` on `--student-profile --show`: required; fails with actionable message if missing.
- `--name` on `--university-profile --build`: if omitted, derived from `--domain` by stripping TLD (e.g., `mit.edu` → `mit`).
- All names are lowercased and spaces replaced with hyphens for directory resolution.

---

## Data Flows

**F01 — Command routing:**
`CLI args → commander parse → validate flags → prerequisite check (F03) → dispatch to component handler → output result`

**F02 — `.env` validation:**
`Process start → dotenv.config() → check GEMINI_API_KEY present → check GEMINI_MODEL present → if missing and command requires AI: print error + exit(1)`

**F03 — Prerequisite check:**
`Command requires student profile → resolve data/students/<name>/profile.md → file exists? → parse for intendedMajor field → present and non-empty? → pass → else: print actionable message + exit(1)`

**F04 — Print composition:**
`--print flag present → component handler resolves output markdown path → pass path to C06.exportToPdf() → PDF written alongside markdown → print success message`

---

## Execution Mode

Request-driven CLI process. Triggered by user invocation of `npx ao` or `ao`. Single-threaded, sequential execution. Process exits after each command completes (exit code 0 on success, 1 on error).

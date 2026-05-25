# C01 — CLI Shell: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C01-F02 `.env` validation | Permanent | 0 | — | Print missing key name + exit(1) |
| C01-F03 Prerequisite check | Permanent (user-caused) | 0 | — | Print actionable message + exit(1) |
| C01-F01 Component dispatch | Propagated from component | Per component spec | Per component spec | Re-surface component error to stderr + exit(1) |
| C01-F04 `--print` composition | Permanent (file not found) | 0 | — | Print `PDF export failed: <path> not found` + exit(1) |

C01 never retries at its own layer. Retry logic lives in the components that make external calls (C03, C04, C05).

---

## UX Detail

### Help Text

`ao --help` must display a concise command reference. `commander` generates this automatically from flag definitions. No custom help page needed beyond well-named flags and descriptions.

### Prerequisite Error Messages

Messages must be plain English with a concrete corrective action:

```
No student profile found for "john-doe".
Run: ao --student-profile --build --name john-doe
```

```
Student profile for "john-doe" is missing an intended major.
Run: ao --student-profile --build --name john-doe to update your profile.
```

### .env Error Messages

```
Missing required configuration: GEMINI_API_KEY
Add it to your .env file in the project root.

Missing required configuration: GEMINI_MODEL
Add it to your .env file. Example: GEMINI_MODEL=gemini-1.5-pro
```

### Progress Output

Each operation prints a single status line before dispatching:
```
Building student profile...
Scraping university website...
Generating guidance report...
Generating essay outline...
Exporting to PDF...
```

---

## Data Specifics

C01 reads but never writes data files. It reads only:
- `data/students/<name>/profile.md` — to check prerequisite existence and `intendedMajor` field
- Resolved paths returned from component handlers — passed to C06 for `--print`

### Name Sanitisation

Student and university names are sanitised before use as directory paths:

| Rule | Example |
| :--- | :------ |
| Lowercase | `John Doe` → `john doe` |
| Spaces to hyphens | `john doe` → `john-doe` |
| Strip special characters | `MIT!` → `mit` |
| Domain to name (university) | `mit.edu` → `mit` |

---

## Security Detail

- `GEMINI_API_KEY` must never be logged, printed, or included in any error message.
- `GEMINI_MODEL` is safe to include in debug output.
- Name sanitisation (above) prevents path traversal — no `../` or absolute path injection possible after sanitisation.
- No user-supplied input is passed to `exec`, `spawn`, or `eval`.

---

## Compliance Obligations

Not applicable. C01 does not handle PII directly. Student name used as directory slug only — not stored as an identifier.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Progress | One-line stdout per operation start |
| Success | `Saved: <path>` or `PDF exported: <path>` to stdout |
| Error | Plain-English message to stderr |
| Exit code | 0 on success, 1 on any error |

No SLO targets. No alerting. No analytics. Single-user local CLI.

---

## Infrastructure / Environment Variables

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `GEMINI_API_KEY` | Authenticates requests to Gemini API | `.env` file |
| `GEMINI_MODEL` | Specifies which Gemini model to use | `.env` file |

Both are loaded via `dotenv.config()` at process start in `src/config/env.ts`. C01 checks their presence before dispatching any AI-dependent command. Values are never echoed.

---

## AI Behavior

C01 itself makes no AI calls. It only validates that the required config for AI-dependent components is present before dispatching to them.

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable. C01 is a CLI — all output is to stdout/stderr.

---

## Scalability

Not applicable. Single-user CLI; no concurrent load.

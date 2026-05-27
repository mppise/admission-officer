# C07 — Bootstrap: Operational Specifications

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C07-F01 workspace init | Permanent (filesystem) | 0 | — | Log warning to stderr; continue — C01 will surface errors if writes fail later |
| C07-F02 env load | Permanent (file not found) | 0 | — | Silent no-op — missing .env means unconfigured; Config screen handles it |
| C07-F04 config write | Permanent (validation) | 0 | — | Throw `ConfigValidationError`; C01 displays message |
| C07-F04 config write | Permanent (filesystem) | 0 | — | Propagate as generic Error; C01 displays message |

---

## UX Detail

C07 has no direct user-facing output. It is a silent infrastructure module.

- No stdout output during bootstrap.
- A single stderr warning `[ao] Warning: could not create workspace directory: <message>` is emitted only if `fs.mkdir` throws unexpectedly.

---

## Data Specifics

### .env File Format

```
GEMINI_API_KEY=<value>
GEMINI_MODEL=<value>
```

- Written with a trailing newline.
- Exactly two lines — no comments, no blank lines.
- Overwritten completely on each `saveConfig` call (not appended).

### workspacePath Segments

| Segment | Example | Notes |
| :------ | :------ | :---- |
| Root only | `workspacePath()` | Returns `<cwd>/university-ao` |
| Students | `workspacePath('students')` | `<cwd>/university-ao/students` |
| Student dir | `workspacePath('students', slug)` | `<cwd>/university-ao/students/<slug>` |
| University dir | `workspacePath('students', studentSlug, 'universities', uniSlug)` | Full nested path |
| Dated guidance | `workspacePath('students', s, 'universities', u, 'guidance', timestamp)` | |
| Dated essay | `workspacePath('students', s, 'universities', u, 'essays', timestamp)` | |

---

## Security Detail

- `GEMINI_API_KEY` value must never be logged or printed.
- `saveConfig` must strip leading/trailing whitespace from both key and model before writing.
- No path traversal risk — `workspacePath` concatenates only developer-controlled literal segments and user-supplied slugs that have been sanitised by C01 (slugUtils).
- `.env` file in `university-ao/` must be listed in `.gitignore` as `university-ao/.env`.

---

## Compliance Obligations

Not applicable. C07 handles only API credentials and filesystem paths — no PII.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Warning | `[ao] Warning: could not create workspace directory` → stderr only |
| All other operations | Silent |

---

## Infrastructure / Environment Variables

| Name | Purpose | Source |
| :--- | :------ | :----- |
| `GEMINI_API_KEY` | Authenticates Gemini API calls | `university-ao/.env` |
| `GEMINI_MODEL` | Gemini model identifier | `university-ao/.env` |

Both are loaded by C07-F02. Written by C07-F04 via Config screen.

---

## AI Behavior

Not applicable. C07 makes no AI calls.

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable.

---

## Scalability

Not applicable. Single-user local CLI.

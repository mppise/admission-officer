# C01 — CLI Shell: Operational Specifications

> ⚠️ Revised 2026-05-27 (CHG-002): Full rewrite of all operational specs to reflect menu-driven UX, removal of flags, and new Config/delete/navigation features.

## Error Handling

| Feature | Error Class | Retries | Backoff | Fallback |
| :------ | :---------- | :------ | :------ | :------- |
| C01-F01 bootstrap | Permanent (filesystem) | 0 | — | Warn to stderr; continue — missing workspace surfaces later |
| C01-F03 Config save | Permanent (validation) | 0 | — | Display `ConfigValidationError` message inline in Config screen; stay on screen |
| C01-F03 Config save | Permanent (filesystem) | 0 | — | Display error message inline; stay on screen |
| C01-F06/F07 dispatch to C04/C05 | Transient (Gemini/network) | Delegated to C04/C05 | Per C04/C05 spec | C04/C05 surfaces error; C01 returns to University Context screen |
| C01-F08 PDF export | Permanent (file not found) | 0 | — | Display `PDF export failed: <message>`; offer to skip and return |
| C01-F10 Delete | Permanent (filesystem) | 0 | — | Display error; return to context screen without deleting |
| Any unhandled | Permanent | 0 | — | Print `Something went wrong: <message>` to stderr; exit(1) |

C01 never retries at its own layer. Retry logic lives in C03, C04, C05.

---

## UX Detail

### Config Screen

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Configuration                                               ║
╚══════════════════════════════════════════════════════════════╝

  Gemini API Key:    ••••••••••••••••••••••1234  (last 4 shown)
  Gemini Model:      gemini-1.5-pro

  ▶  Edit API Key
     Edit Model
     ─────────────
     Save & Return
     Cancel

  ↑↓ navigate · Enter select
```

- API key masked: show only last 4 characters; replace rest with `•`.
- If key is not set, show `(not configured)`.
- "Edit API Key" and "Edit Model" open inline text input using `waitForText`.
- "Save & Return" calls `C07.saveConfig()` then returns to Student Select.
- Validation error shown as a red inline message above the menu if key or model is empty.

### Delete Confirmation Screen

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Delete Student Profile                                      ║
╚══════════════════════════════════════════════════════════════╝

  Delete "jane-smith"? This cannot be undone.

  ▶  Yes, delete permanently
     No, go back

  ↑↓ navigate · Enter select
```

Same pattern for "Delete University".

### New University Domain Prompt

```
╔══════════════════════════════════════════════════════════════╗
║  ao — Admissions Officer                                     ║
║  Add University                                              ║
╚══════════════════════════════════════════════════════════════╝

  Enter university domain (e.g., mit.edu):  █

  ↑↓ navigate · Enter confirm · Esc back
```

### Dated Entry Lists

Guidance and Essay lists show entries in reverse chronological order (newest first). Display format for dated dirs: `YYYY-MM-DD HH:mm` (rendered from `YYYY-MM-DD-HHmm` directory name).

```
  ▶  2026-05-27 14:30  (latest)
     2026-05-26 09:15
     ─────────────────
     New Guidance
     Back
```

### PDF Prompt

Rendered inline after content is displayed:

```
  Export this to PDF?

  ▶  Yes — Save as PDF
     No — Return to menu
```

---

## Data Specifics

### Name Sanitisation (C01 responsibility)

C01 sanitises all user-supplied names before passing as slugs to components:

| Rule | Example |
| :--- | :------ |
| Lowercase | `John Doe` → `john doe` |
| Spaces to hyphens | `john doe` → `john-doe` |
| Strip non-alphanumeric (except hyphens) | `MIT!` → `mit` |
| Domain to slug | `mit.edu` → `mit` |
| Collapse multiple hyphens | `--` → `-` |
| Trim leading/trailing hyphens | `-mit-` → `mit` |

### Timestamp Generation

Dated directory names use `YYYY-MM-DD-HHmm` format:

```typescript
const now = new Date();
const timestamp = now.getFullYear()
  + '-' + String(now.getMonth() + 1).padStart(2, '0')
  + '-' + String(now.getDate()).padStart(2, '0')
  + '-' + String(now.getHours()).padStart(2, '0')
  + String(now.getMinutes()).padStart(2, '0');
```

C01 generates the timestamp and passes it to C04/C05 so both the directory name and the returned path are consistent.

---

## Security Detail

- `GEMINI_API_KEY` must never be printed in full. Config screen shows only last 4 chars masked.
- No user-supplied input is passed to `exec`, `spawn`, or `eval`.
- Name sanitisation prevents path traversal — no `../` possible after slug conversion.
- `fs.rm(dir, { recursive: true })` for delete is gated behind explicit confirmation — no accidental deletion.

---

## Compliance Obligations

Not applicable. C01 handles only navigation state and slug-based paths — no PII stored or transmitted by C01 itself.

---

## Observability

| Signal | Detail |
| :----- | :----- |
| Bootstrap warning | `[ao] Warning: ...` → stderr |
| Operation success | Inline ink screen message |
| Error | Inline ink screen message or stderr |
| Exit code | 0 on clean exit, 1 on unhandled error |

---

## Infrastructure / Environment Variables

C01 itself reads no environment variables directly. It uses `C07.getApiKey()` and `C07.getModel()` accessors. All env loading is C07's responsibility.

---

## AI Behavior

C01 makes no AI calls. It checks `getApiKey()` is present before dispatching to C03/C04/C05 — if missing, it shows an inline prompt directing the user to the Config screen.

---

## Testing

No automated testing required for MVP.

---

## Notifications

Not applicable. All output is to the terminal via ink.

---

## Scalability

Not applicable. Single-user CLI.

# C07 — Bootstrap: Interfaces

## Exported Functions

C07 exposes a module API consumed by C01 at startup and by the Config screen. No CLI surface.

### bootstrap()

```typescript
// src/config/bootstrap.ts
export async function bootstrap(): Promise<void>
```

- Runs F01 (ensure workspace dir) then F02 (load .env).
- Must complete before C01 renders the menu.
- Never throws — logs a warning to stderr if workspace creation fails, then continues.

---

### workspacePath(...segments)

```typescript
export function workspacePath(...segments: string[]): string
```

- Returns `path.join(process.cwd(), 'university-ao', ...segments)`.
- Pure function — no I/O.
- Replaces the existing `dataPath()` in `src/utils/fileUtils.ts` — all components must migrate to this.

---

### getApiKey() / getModel()

```typescript
export function getApiKey(): string | undefined
export function getModel(): string | undefined
```

- Read from `process.env` (populated by F02).
- Return `undefined` if not set; never throw.
- Consumed by C01 Config screen display and by C03/C04/C05 before making Gemini calls.

---

### saveConfig(key, model)

```typescript
export async function saveConfig(key: string, model: string): Promise<void>
// Throws: ConfigValidationError if key or model is empty string
```

- Validates both args are non-empty trimmed strings.
- Writes `university-ao/.env`:
  ```
  GEMINI_API_KEY=<key>
  GEMINI_MODEL=<model>
  ```
- Calls `dotenv.config({ path: workspacePath('.env'), override: true })` after write to sync `process.env` in-process.
- Throws `ConfigValidationError` (custom error class) if validation fails — C01 displays the message to the user.

---

## Error Types

```typescript
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
```

---

## Events

None. C07 produces no events and consumes none.

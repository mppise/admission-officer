---
name: c07-config-manager-impl
description: C07 Config Manager — Implementation specification
---

# C07 — Config Manager: Implementation Specification

---

## Interfaces

```typescript
export async function showConfig(): Promise<{ apiKeyValid: boolean; model: string }>;
export async function saveConfig(key: string, model: string, tokenWindow: number, contentBudgetPct: number): Promise<void>;
export async function testApiKey(): Promise<{ valid: boolean; error?: string }>;
```

---

## .env File Format

```
GEMINI_API_KEY=<key>
GEMINI_MODEL=<model>
GEMINI_TOKEN_WINDOW=<int>
GEMINI_CONTENT_BUDGET_PCT=<int>
```

**Location:** `university-ao/.env`

**Permissions:** Mode 600 (readable/writable by owner only)

---

## Validation Rules

| Field | Rule | Example |
| :----- | :--- | :------ |
| API Key | Non-empty string | `AIzaSy...` |
| Model | Non-empty string | `gemini-2.5-pro` |
| Token Window | Integer > 0 | `1048576` |
| Budget % | Integer 1–100 | `60` |

---

## API Key Test

Send dummy request to Gemini API:

```typescript
async function testApiKey(): Promise<boolean> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent("Say 'ok'.");
  return result.response.text().length > 0;
}
```

On success: "✓ API key is valid"
On failure: "✗ API key test failed: [error message]"

---

## Error Handling

| Error | Recovery |
| :----- | :------- |
| Invalid API key format (too short) | Show warning but allow (some keys are short) |
| Empty model name | Error: "Model name required" |
| Invalid token window (not int) | Error: "Token window must be a positive integer" |
| Invalid budget (< 1 or > 100) | Error: "Budget must be 1–100" |
| .env file permission denied | Error: "Cannot write to .env; check file permissions" |

---

## Operational Requirements

- **Masked input:** API key entry must not echo characters to terminal
- **Startup validation:** On CLI boot, if .env missing, auto-prompt config setup
- **Persistence:** Settings survive session restart
- **Sensitive logging:** API key never logged; only status messages

---

## Testing Requirements

**Coverage:** 80% line coverage.

**Critical paths:**
- [ ] Save config → .env created with correct format
- [ ] Load config → values persist across restart
- [ ] API key test → success with valid key, error with invalid
- [ ] Validation → rejects invalid integers
- [ ] Masking → key not exposed in output

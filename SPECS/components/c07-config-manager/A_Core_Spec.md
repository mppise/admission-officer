---
name: c07-config-manager-core
description: C07 Config Manager — Feature specification
---

Architecture refs: 0_Overview.md, 5_Security.md

# C07 — Config Manager: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C07-F01 | Manage Gemini API key | Ready | REQ-0009 |
| C07-F02 | Manage Gemini model selection | Ready | REQ-0009 |
| C07-F03 | Manage token budget parameters | Ready | REQ-0009 |

---

## Acceptance Criteria

### C07-F01: API Key Management

- [ ] Prompt for API key (masked input, no echo)
- [ ] Validate: key must be non-empty
- [ ] Save to `university-ao/.env` as `GEMINI_API_KEY=...`
- [ ] Display masked key: `••••••••` + last 4 chars (e.g., `••••5678`)
- [ ] Show: "API key saved and active"
- [ ] No API key exposed in logs or error messages

### C07-F02: Model Selection

- [ ] Prompt for Gemini model name (e.g., `gemini-2.5-pro`, `gemini-2.0-flash`)
- [ ] Validate: model must be non-empty
- [ ] Common models pre-listed for user selection
- [ ] Save to `.env` as `GEMINI_MODEL=...`
- [ ] Show confirmation: "Model set to [model]"

### C07-F03: Token Budget Management

- [ ] Prompt for `GEMINI_TOKEN_WINDOW` (total token capacity, default 1048576)
- [ ] Prompt for `GEMINI_CONTENT_BUDGET_PCT` (0–100, default 60)
- [ ] Validate: both must be integers, content budget 1–100
- [ ] Save to `.env`
- [ ] Show confirmation with calculated budget (e.g., "Content budget: 629,145 tokens available per operation")

---

## Error Handling

- [ ] Invalid model name → show error, re-prompt (don't validate against known list; allow new models)
- [ ] Invalid token window (not int) → show error, re-prompt
- [ ] Invalid budget (not 1–100) → show error, re-prompt
- [ ] .env write failure → show error, offer retry

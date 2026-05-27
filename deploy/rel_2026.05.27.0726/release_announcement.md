# Release Announcement — university-admission-officer v2.0.1

**Release date:** 2026-05-27
**Type:** Patch
**npm:** `npm install -g university-admission-officer`

---

## What changed

This patch extends the Config screen to include the two Gemini batch-sizing environment variables that were previously only configurable by editing `.env` manually.

### Config screen now covers all 4 Gemini settings

When you open **Config** from the main menu, you can now view and edit:

| Setting | Env var | Default |
| :------ | :------ | :------ |
| API Key | `GEMINI_API_KEY` | _(required)_ |
| Model | `GEMINI_MODEL` | _(required)_ |
| Token Window | `GEMINI_TOKEN_WINDOW` | `1048576` |
| Content Budget % | `GEMINI_CONTENT_BUDGET_PCT` | `60` |

**Token Window** is the model's documented context size in tokens. **Content Budget %** is the percentage of that window allocated to page content (the remainder is reserved for the prompt template, instructions, and output JSON).

---

## Required actions

**For existing users (v2.0.0):** No action required. Your existing `university-ao/.env` (with only `GEMINI_API_KEY` and `GEMINI_MODEL`) continues to work — defaults are applied at runtime. The next time you open Config and press "Save & Return", all four vars will be written to `.env`.

**For new users:** Run `ao`, open Config, set your API key and model (token window and content budget have sensible defaults), and save.

---

## Known limitations

- No automated test suite — verification is manual smoke testing only.
- `env.ts` contains dead code (`validateEnv`, `getGeminiApiKey`, `getGeminiModel`) left over from the pre-v2.0.0 CLI flags entry point. No runtime impact; will be cleaned up in a future release.

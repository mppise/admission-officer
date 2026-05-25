import 'dotenv/config';

// [C01-F02] .env validation — called at startup for AI-dependent commands
export function validateEnv(): void {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing required config: GEMINI_API_KEY. Add it to your .env file.');
    process.exit(1);
  }
  if (!process.env.GEMINI_MODEL) {
    console.error('Missing required config: GEMINI_MODEL. Add it to your .env file.');
    process.exit(1);
  }
  if (!process.env.GEMINI_TOKEN_WINDOW) {
    console.error('Missing required config: GEMINI_TOKEN_WINDOW. Add it to your .env file (e.g. 1000000 for gemini-1.5-flash).');
    process.exit(1);
  }
}

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY as string;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL as string;
}

// Returns the usable input char budget for a batch.
// GEMINI_TOKEN_WINDOW: model's documented context size in tokens.
// GEMINI_CONTENT_BUDGET_PCT: % of the window allocated to page content (default 60).
// Remaining % covers prompt template, instructions, program bullets, and output JSON.
// Conversion: 1 token ≈ 4 chars (conservative estimate for English prose).
export function getGeminiBatchCharBudget(): number {
  const tokenWindow = parseInt(process.env.GEMINI_TOKEN_WINDOW ?? '32000', 10);
  const contentPct = parseInt(process.env.GEMINI_CONTENT_BUDGET_PCT ?? '60', 10);
  return Math.floor(tokenWindow * (contentPct / 100) * 4);
}

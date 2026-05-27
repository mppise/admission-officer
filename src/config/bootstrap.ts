import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const WORKSPACE = 'university-ao';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export function workspacePath(...segments: string[]): string {
  return path.join(process.cwd(), WORKSPACE, ...segments);
}

export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || undefined;
}

export function getModel(): string | undefined {
  return process.env.GEMINI_MODEL || undefined;
}

export function getTokenWindow(): number {
  return parseInt(process.env.GEMINI_TOKEN_WINDOW ?? '1048576', 10);
}

export function getContentBudgetPct(): number {
  return parseInt(process.env.GEMINI_CONTENT_BUDGET_PCT ?? '60', 10);
}

export async function saveConfig(key: string, model: string, tokenWindow: number, contentBudgetPct: number): Promise<void> {
  const k = key.trim();
  const m = model.trim();
  if (!k) throw new ConfigValidationError('API key cannot be empty.');
  if (!m) throw new ConfigValidationError('Model name cannot be empty.');
  if (!Number.isInteger(tokenWindow) || tokenWindow <= 0) throw new ConfigValidationError('Token window must be a positive integer.');
  if (!Number.isInteger(contentBudgetPct) || contentBudgetPct < 1 || contentBudgetPct > 100) throw new ConfigValidationError('Content budget must be an integer between 1 and 100.');
  const content = `GEMINI_API_KEY=${k}\nGEMINI_MODEL=${m}\nGEMINI_TOKEN_WINDOW=${tokenWindow}\nGEMINI_CONTENT_BUDGET_PCT=${contentBudgetPct}\n`;
  await fs.writeFile(workspacePath('.env'), content, 'utf8');
  dotenv.config({ path: workspacePath('.env'), override: true });
}

export async function bootstrap(): Promise<void> {
  try {
    await fs.mkdir(workspacePath(), { recursive: true });
  } catch (err) {
    process.stderr.write(`[ao] Warning: could not create workspace directory — ${err instanceof Error ? err.message : String(err)}\n`);
  }
  try {
    dotenv.config({ path: workspacePath('.env') });
  } catch {
    // .env missing is normal on first run; Config screen handles it
  }
}

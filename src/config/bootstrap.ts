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

export async function saveConfig(key: string, model: string): Promise<void> {
  const k = key.trim();
  const m = model.trim();
  if (!k) throw new ConfigValidationError('API key cannot be empty.');
  if (!m) throw new ConfigValidationError('Model name cannot be empty.');
  const content = `GEMINI_API_KEY=${k}\nGEMINI_MODEL=${m}\n`;
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

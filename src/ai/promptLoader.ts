import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Prompts are copied to dist/ai/prompts/ at build time (see package.json build script)
const PROMPTS_DIR = path.join(__dirname, 'prompts');

// Strips YAML frontmatter (--- ... ---) and returns the prompt body
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

// [Appendix] Loads a .prompt.md file, strips frontmatter, injects params
export async function loadPrompt(id: string, params?: Record<string, string>): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, `${id}.prompt.md`);
  const raw = await fs.readFile(filePath, 'utf8');
  let body = stripFrontmatter(raw);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      body = body.replaceAll(`{{${key}}}`, value);
    }
    // Verify no unreplaced tokens remain
    const unreplaced = body.match(/\{\{[A-Z_]+\}\}/g);
    if (unreplaced) {
      throw new Error(`Prompt ${id} has unreplaced tokens: ${unreplaced.join(', ')}`);
    }
  }

  return body;
}

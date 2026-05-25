import Enquirer from 'enquirer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dataPath, writeFile, readFile, fileExists, listFiles } from '../../utils/fileUtils.js';
import { djb2Hash, ESSAY_TYPE_SLUGS } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { getGeminiApiKey, getGeminiModel } from '../../config/env.js';

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch {
    console.log(`Retrying in 30 seconds... (attempt 2 of 2) [${label}]`);
    await new Promise(r => setTimeout(r, 30000));
    return await fn();
  }
}

const enq = new Enquirer();

async function ask(question: { type: string; name: string; message: string; choices?: string[]; initial?: string; validate?: (v: string) => boolean | string }): Promise<string> {
  const response = await enq.prompt(question) as Record<string, string>;
  return response[question.name] ?? '';
}

async function confirm(message: string): Promise<boolean> {
  const response = await enq.prompt({ type: 'confirm', name: 'value', message }) as { value: boolean };
  return response.value;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C05-F01, C05-F02, C05-F03, C05-F04] Build essay outline
export async function buildEssay(studentSlug: string, universitySlug: string): Promise<{ essayPath: string }> {
  // [C05-F02] Validate profiles exist
  const studentProfilePath = dataPath(studentSlug, 'profile.md');
  const universityProfilePath = dataPath(studentSlug, universitySlug, 'profile.md');

  if (!(await fileExists(studentProfilePath))) {
    throw new Error(`No student profile found for "${studentSlug}".`);
  }
  if (!(await fileExists(universityProfilePath))) {
    throw new Error(`No university profile found for "${universitySlug}". Run: ao --university-profile --build --domain <domain>`);
  }

  // [C05-F01] Collect essay details via Enquirer
  console.log('\n── Essay Prompt Collection ───────────────────────────');

  const essayType = await ask({
    type: 'select',
    name: 'essayType',
    message: 'Essay type:',
    choices: Object.keys(ESSAY_TYPE_SLUGS),
  });

  const essayPrompt = await ask({
    type: 'input',
    name: 'essayPrompt',
    message: 'Paste the full essay prompt (max 1000 chars):',
    validate: (v: string) => v.trim().length > 0 ? true : 'Essay prompt is required.',
  });

  const wordLimitRaw = await ask({
    type: 'input',
    name: 'wordLimit',
    message: 'Word limit (press Enter to skip):',
  });
  const wordLimit = wordLimitRaw.trim() || 'Not specified';

  // [C05-F01] Generate slug and check for existing file
  const typeSlug = ESSAY_TYPE_SLUGS[essayType] ?? 'essay';
  const hash = djb2Hash(essayPrompt.trim());
  const fileName = `${typeSlug}-${hash}.md`;
  const essaysDir = dataPath(studentSlug, universitySlug, 'essays');
  const essayPath = `${essaysDir}/${fileName}`;

  if (await fileExists(essayPath)) {
    const overwrite = await confirm('An essay outline already exists for this prompt. Overwrite?');
    if (!overwrite) {
      console.log('No changes made.');
      return { essayPath };
    }
  }

  // [C05-F02] Load profiles
  const studentProfileContent = await readFile(studentProfilePath);
  const universityProfileContent = await readFile(universityProfilePath);

  // [C05-F03] Call Gemini
  const prompt = await loadPrompt('c05-essay-generate', {
    ESSAY_TYPE: essayType,
    ESSAY_PROMPT: essayPrompt.trim().slice(0, 1000),
    WORD_LIMIT: wordLimit,
    STUDENT_PROFILE: studentProfileContent,
    UNIVERSITY_PROFILE: universityProfileContent,
  });

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: { temperature: 0.8 },
  });

  const result = await withRetry(
    () => model.generateContent(prompt),
    'Gemini essay generation'
  );

  const essayMarkdown = result.response.text().trim();

  // [C05-F04] Store with disclaimer already embedded by prompt
  // Add file-level disclaimer if Gemini omitted it (safety net)
  const disclaimer = `> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand\n> how to draw on your own experiences. Do NOT submit them as your own work.\n> Use them only as a reference for tone, structure, and how to connect your\n> profile to the prompt. Your essay must be written in your own voice.`;
  const finalMarkdown = essayMarkdown.includes('⚠️ IMPORTANT') ? essayMarkdown : `${disclaimer}\n\n${essayMarkdown}`;

  await writeFile(essayPath, finalMarkdown + '\n');

  // Print disclaimer to stdout as well
  console.log('\n⚠️  REMINDER: The inspiration samples in this outline are for reference only.');
  console.log('   Do NOT submit them as your own work. Write your essay in your own voice.\n');

  return { essayPath };
}

// [C05-F05] Show stored essay outline
export async function showEssay(studentSlug: string, universitySlug: string): Promise<{ markdownPath: string }> {
  const essaysDir = dataPath(studentSlug, universitySlug, 'essays');
  const files = await listFiles(essaysDir, '.md');

  if (files.length === 0) {
    throw new Error(
      `No essay outlines found for "${studentSlug}" → "${universitySlug}". ` +
      `Run: ao --essay --build --student ${studentSlug} --university ${universitySlug}`
    );
  }

  let selectedFile: string;
  if (files.length === 1) {
    selectedFile = files[0];
  } else {
    const enqInstance = new Enquirer();
    const response = await enqInstance.prompt({
      type: 'select',
      name: 'file',
      message: 'Select an essay outline to view:',
      choices: files,
    }) as { file: string };
    selectedFile = response.file;
  }

  const markdownPath = `${essaysDir}/${selectedFile}`;
  const content = await readFile(markdownPath);
  console.log(content);
  return { markdownPath };
}

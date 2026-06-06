import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { workspacePath } from '../../config/bootstrap.js';
import { writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
import { djb2Hash, ESSAY_TYPE_SLUGS } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { getApiKey, getModel } from '../../config/bootstrap.js';
import { waitForSelect, waitForText, waitForConfirm } from '../../utils/tui.js';
import { postMessage } from '../c08-status-bar/index.js';

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch {
    process.stdout.write(`Retrying in 30 seconds... (attempt 2 of 2) [${label}]\n`);
    await new Promise(r => setTimeout(r, 30000));
    return await fn();
  }
}

export interface EssayInputs {
  essayType: string;
  essayPrompt: string;
  wordLimit: string;
  essayPath: string;
  dir: string;
  alreadyExists: boolean;
}

// [C05-F01] Collect essay inputs interactively — must be called before withSpinner
export async function collectEssayInputs(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<EssayInputs | null> {
  const studentProfilePath = workspacePath('students', studentSlug, 'profile.md');
  const uniProfilePath = workspacePath('students', studentSlug, 'universities', uniSlug, 'profile.md');

  if (!(await fileExists(studentProfilePath))) {
    throw new Error('No student profile found. Build a student profile first.');
  }
  if (!(await fileExists(uniProfilePath))) {
    throw new Error('No university profile found. Build a university profile first.');
  }

  const essayType = await waitForSelect(
    Object.keys(ESSAY_TYPE_SLUGS).map(t => ({ label: t, value: t })),
    'Essay Advisor › Essay Type',
    `Student: ${studentSlug}   University: ${uniSlug}`,
  );

  const essayPrompt = await waitForText(
    'Paste the full essay prompt (max 1000 chars):',
    '',
    'Essay Advisor › Essay Prompt',
    `${essayType}   Student: ${studentSlug}`,
  );

  const wordLimitRaw = await waitForText(
    'Word limit (press Enter to skip):',
    '',
    'Essay Advisor › Word Limit',
    `${essayType}   Student: ${studentSlug}`,
  );
  const wordLimit = wordLimitRaw.trim() || 'Not specified';

  const typeSlug = ESSAY_TYPE_SLUGS[essayType] ?? 'essay';
  const hash = djb2Hash(essayPrompt.trim());
  const dir = workspacePath('students', studentSlug, 'universities', uniSlug, 'essays', timestamp);
  const essayPath = `${dir}/${typeSlug}-${hash}.md`;

  const alreadyExists = await fileExists(essayPath);
  if (alreadyExists) {
    const overwrite = await waitForConfirm(
      'An essay outline already exists for this timestamp. Overwrite?',
      'Essay Advisor › Overwrite?',
      `${essayType}   Student: ${studentSlug}`,
    );
    if (!overwrite) return null;
  }

  return { essayType, essayPrompt, wordLimit, essayPath, dir, alreadyExists };
}

// [C05-F02, C05-F03, C05-F04] Generate essay — call after collectEssayInputs
export async function buildEssay(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
  inputs: EssayInputs,
): Promise<{ essayPath: string; timestamp: string }> {
  const { essayType, essayPrompt, wordLimit, essayPath, dir } = inputs;

  const studentProfilePath = workspacePath('students', studentSlug, 'profile.md');
  const uniProfilePath = workspacePath('students', studentSlug, 'universities', uniSlug, 'profile.md');
  const studentProfileContent = await readFile(studentProfilePath);
  const universityProfileContent = await readFile(uniProfilePath);

  const prompt = await loadPrompt('c05-essay-generate', {
    ESSAY_TYPE: essayType,
    ESSAY_PROMPT: essayPrompt.trim().slice(0, 1000),
    WORD_LIMIT: wordLimit,
    STUDENT_PROFILE: studentProfileContent,
    UNIVERSITY_PROFILE: universityProfileContent,
  });

  const apiKey = getApiKey();
  const modelName = getModel();
  if (!apiKey || !modelName) throw new Error('Gemini API key or model not configured. Go to Config to set them.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.8 } });

  // [C08] Signal essay generation start
  postMessage(`Gemini: generating ${essayType} essay guidance…`, 'progress', 'C05');

  const result = await withRetry(() => model.generateContent(prompt), 'Gemini essay generation');
  const essayMarkdown = result.response.text().trim();
  if (!essayMarkdown) throw new Error('Gemini returned empty response. Try again.');

  const disclaimer = `> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand\n> how to draw on your own experiences. Do NOT submit them as your own work.\n> Use them only as a reference for tone, structure, and how to connect your\n> profile to the prompt. Your essay must be written in your own voice.`;
  const finalMarkdown = essayMarkdown.includes('⚠️ IMPORTANT') ? essayMarkdown : `${disclaimer}\n\n${essayMarkdown}`;

  await fs.mkdir(dir, { recursive: true });
  await writeFile(essayPath, finalMarkdown + '\n');

  // [C08] Signal essay file saved
  postMessage(`Gemini: essay guidance saved (${uniSlug}/${timestamp})`, 'success', 'C05');

  return { essayPath, timestamp };
}

// [C05-F05]
export async function showEssay(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ markdownPath: string }> {
  const dir = workspacePath('students', studentSlug, 'universities', uniSlug, 'essays', timestamp);
  let files: string[] = [];
  try {
    const entries = await fs.readdir(dir);
    files = entries.filter(f => f.endsWith('.md'));
  } catch {
    // dir missing
  }
  if (files.length === 0) {
    throw new Error('No essay outline found for the selected timestamp.');
  }
  const markdownPath = `${dir}/${files[0]}`;
  const content = await readFile(markdownPath);
  process.stdout.write(content + '\n');
  return { markdownPath };
}

// [C05-F06]
export async function listEssays(studentSlug: string, uniSlug: string): Promise<string[]> {
  const dir = workspacePath('students', studentSlug, 'universities', uniSlug, 'essays');
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter(e => /^\d{4}-\d{2}-\d{2}-\d{4}$/.test(e))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

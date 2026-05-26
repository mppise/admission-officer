import { GoogleGenerativeAI } from '@google/generative-ai';
import { dataPath, writeFile, readFile, fileExists, listFiles } from '../../utils/fileUtils.js';
import { djb2Hash, ESSAY_TYPE_SLUGS } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { getGeminiApiKey, getGeminiModel } from '../../config/env.js';
import { waitForSelect, waitForText, waitForConfirm } from '../../utils/tui.js';

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

  // [C05-F01] Collect essay details via full-screen TUI
  const essayType = await waitForSelect(
    Object.keys(ESSAY_TYPE_SLUGS).map(t => ({ label: t, value: t })),
    'Essay Advisor › Essay Type',
    `Student: ${studentSlug}   University: ${universitySlug}`,
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

  // [C05-F01] Generate slug and check for existing file
  const typeSlug = ESSAY_TYPE_SLUGS[essayType] ?? 'essay';
  const hash = djb2Hash(essayPrompt.trim());
  const fileName = `${typeSlug}-${hash}.md`;
  const essaysDir = dataPath(studentSlug, universitySlug, 'essays');
  const essayPath = `${essaysDir}/${fileName}`;

  if (await fileExists(essayPath)) {
    const overwrite = await waitForConfirm(
      'An essay outline already exists for this prompt. Overwrite?',
      'Essay Advisor › Overwrite?',
      `${essayType}   Student: ${studentSlug}`,
    );
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
    'Gemini essay generation',
  );

  const essayMarkdown = result.response.text().trim();

  // [C05-F04] Store with disclaimer
  const disclaimer = `> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand\n> how to draw on your own experiences. Do NOT submit them as your own work.\n> Use them only as a reference for tone, structure, and how to connect your\n> profile to the prompt. Your essay must be written in your own voice.`;
  const finalMarkdown = essayMarkdown.includes('⚠️ IMPORTANT') ? essayMarkdown : `${disclaimer}\n\n${essayMarkdown}`;

  await writeFile(essayPath, finalMarkdown + '\n');

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
      `Run: ao --essay --build --student ${studentSlug} --university ${universitySlug}`,
    );
  }

  let selectedFile: string;
  if (files.length === 1) {
    selectedFile = files[0];
  } else {
    selectedFile = await waitForSelect(
      files.map(f => ({ label: f, value: f })),
      'Essay Advisor › Select Outline',
      `Student: ${studentSlug}   University: ${universitySlug}`,
    );
  }

  const markdownPath = `${essaysDir}/${selectedFile}`;
  const content = await readFile(markdownPath);
  console.log(content);
  return { markdownPath };
}

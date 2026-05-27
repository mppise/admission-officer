import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { workspacePath } from '../../config/bootstrap.js';
import { writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { getApiKey, getModel } from '../../config/bootstrap.js';

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch {
    process.stdout.write(`Retrying in 30 seconds... (attempt 2 of 2) [${label}]\n`);
    await new Promise(r => setTimeout(r, 30000));
    return await fn();
  }
}

// [C04-F01, C04-F02, C04-F03]
export async function buildGuidance(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ reportPath: string; timestamp: string }> {
  const studentProfilePath = workspacePath('students', studentSlug, 'profile.md');
  const uniProfilePath = workspacePath('students', studentSlug, 'universities', uniSlug, 'profile.md');

  if (!(await fileExists(studentProfilePath))) {
    throw new Error(`No student profile found. Build a student profile first.`);
  }
  if (!(await fileExists(uniProfilePath))) {
    throw new Error(`No university profile found. Build a university profile first.`);
  }

  const studentProfileContent = await readFile(studentProfilePath);
  const universityProfileContent = await readFile(uniProfilePath);

  const prompt = await loadPrompt('c04-guidance-generate', {
    STUDENT_PROFILE: studentProfileContent,
    UNIVERSITY_PROFILE: universityProfileContent,
  });

  const apiKey = getApiKey();
  const modelName = getModel();
  if (!apiKey || !modelName) throw new Error('Gemini API key or model not configured. Go to Config to set them.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.7 } });

  const result = await withRetry(() => model.generateContent(prompt), 'Gemini guidance generation');
  const guidanceMarkdown = result.response.text().trim();
  if (!guidanceMarkdown) throw new Error('Gemini returned empty response. Try again.');

  const dir = workspacePath('students', studentSlug, 'universities', uniSlug, 'guidance', timestamp);
  await fs.mkdir(dir, { recursive: true });
  const reportPath = `${dir}/guidance.md`;
  await writeFile(reportPath, guidanceMarkdown + '\n');
  return { reportPath, timestamp };
}

// [C04-F04]
export async function showGuidance(
  studentSlug: string,
  uniSlug: string,
  timestamp: string,
): Promise<{ markdownPath: string }> {
  const markdownPath = workspacePath('students', studentSlug, 'universities', uniSlug, 'guidance', timestamp, 'guidance.md');
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No guidance report found for the selected timestamp.`);
  }
  const content = await readFile(markdownPath);
  process.stdout.write(content + '\n');
  return { markdownPath };
}

// [C04-F05]
export async function listGuidance(studentSlug: string, uniSlug: string): Promise<string[]> {
  const dir = workspacePath('students', studentSlug, 'universities', uniSlug, 'guidance');
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

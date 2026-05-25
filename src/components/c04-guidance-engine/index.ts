import { GoogleGenerativeAI } from '@google/generative-ai';
import { dataPath, writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
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

// ─── Public API ───────────────────────────────────────────────────────────────

// [C04-F01, C04-F02, C04-F03] Generate and store guidance report
export async function buildGuidance(studentSlug: string, universitySlug: string): Promise<{ reportPath: string }> {
  // [C04-F01] Load and validate both profiles
  const studentProfilePath = dataPath(studentSlug, 'profile.md');
  const universityProfilePath = dataPath(studentSlug, universitySlug, 'profile.md');

  if (!(await fileExists(studentProfilePath))) {
    throw new Error(`No student profile found for "${studentSlug}". Run: ao --student-profile --build --name ${studentSlug}`);
  }
  if (!(await fileExists(universityProfilePath))) {
    throw new Error(`No university profile found for "${universitySlug}". Run: ao --university-profile --build --domain <domain>`);
  }

  const studentProfileContent = await readFile(studentProfilePath);
  const universityProfileContent = await readFile(universityProfilePath);

  // [C04-F02] Call Gemini
  const prompt = await loadPrompt('c04-guidance-generate', {
    STUDENT_PROFILE: studentProfileContent,
    UNIVERSITY_PROFILE: universityProfileContent,
  });

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: { temperature: 0.7 },
  });

  const result = await withRetry(
    () => model.generateContent(prompt),
    'Gemini guidance generation'
  );

  const guidanceMarkdown = result.response.text().trim();

  // [C04-F03] Store
  const reportPath = dataPath(studentSlug, universitySlug, 'guidance.md');
  await writeFile(reportPath, guidanceMarkdown + '\n');
  return { reportPath };
}

// [C04-F04] Show stored guidance report
export async function showGuidance(studentSlug: string, universitySlug: string): Promise<{ markdownPath: string }> {
  const markdownPath = dataPath(studentSlug, universitySlug, 'guidance.md');
  if (!(await fileExists(markdownPath))) {
    throw new Error(
      `No guidance report found for "${studentSlug}" → "${universitySlug}". ` +
      `Run: ao --guidance --build --student ${studentSlug} --university ${universitySlug}`
    );
  }
  const content = await readFile(markdownPath);
  console.log(content);
  return { markdownPath };
}

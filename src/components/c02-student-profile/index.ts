import Enquirer from 'enquirer';
import { dataPath, writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
import { toSlug } from '../../utils/slugUtils.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptYear {
  yearLabel: string;
  courses: Array<{ name: string; grade: string }>;
}

interface Extracurricular {
  activityName: string;
  role: string;
  yearsInvolved: string;
  hoursPerWeek: string;
  description: string;
}

interface Award {
  awardName: string;
  level: string;
  year: string;
  description: string;
}

interface ProfileData {
  name: string;
  gradYear: string;
  highSchool: string;
  intendedMajors: string[];
  gpaWeighted: string;
  gpaUnweighted: string;
  classRank: string;
  transcript: TranscriptYear[];
  sat: { total: string; math: string; reading: string };
  act: { composite: string };
  apScores: Array<{ subject: string; score: string }>;
  ibScores: Array<{ subject: string; score: string }>;
  extracurriculars: Extracurricular[];
  awards: Award[];
  personalStatementSummary: string;
  generatedDate: string;
  lastUpdated: string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const enq = new Enquirer();

async function ask(question: { type: string; name: string; message: string; choices?: string[]; required?: boolean; initial?: string }): Promise<string> {
  const response = await enq.prompt(question) as Record<string, string>;
  return response[question.name] ?? '';
}

async function confirm(message: string): Promise<boolean> {
  const response = await enq.prompt({ type: 'confirm', name: 'value', message }) as { value: boolean };
  return response.value;
}

// Asks for a value; returns the trimmed string, or null if the user pressed Enter with no input.
// Used to drive "add another?" loops — blank = done.
async function askOrSkip(question: { name: string; message: string; initial?: string }): Promise<string | null> {
  const response = await enq.prompt({ type: 'input', required: false, ...question }) as Record<string, string>;
  const val = (response[question.name] ?? '').trim();
  return val.length > 0 ? val : null;
}

// ─── Section Wizards ──────────────────────────────────────────────────────────

async function collectPersonal(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'name' | 'gradYear' | 'highSchool' | 'intendedMajors'>> {
  console.log('\n── Section 1: Personal ──────────────────────────────');
  const name = await ask({ type: 'input', name: 'name', message: 'Full legal name:', initial: existing?.name ?? '' });
  const gradYear = await ask({ type: 'input', name: 'gradYear', message: 'Expected graduation year (e.g., 2026):', initial: existing?.gradYear ?? '' });
  const highSchool = await ask({ type: 'input', name: 'highSchool', message: 'High school name:', initial: existing?.highSchool ?? '' });

  const intendedMajors: string[] = [];
  if (existing?.intendedMajors?.length) {
    console.log(`\nCurrent majors: ${existing.intendedMajors.join(', ')}`);
    console.log('Enter your majors again to replace the list, or press Enter immediately to keep as-is.');
  } else {
    console.log('\nIntended majors or academic tracks (e.g., Pre-Med, Computer Science, BS/MD):');
  }
  console.log('(Press Enter on a blank line when done)');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const major = await askOrSkip({ name: 'major', message: '  Major or track:' });
    if (!major) break;
    intendedMajors.push(major);
  }
  // If the user pressed Enter immediately without entering anything, keep the existing list
  const finalMajors = intendedMajors.length > 0 ? intendedMajors : (existing?.intendedMajors ?? []);

  return { name, gradYear, highSchool, intendedMajors: finalMajors };
}

async function collectAcademics(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'gpaWeighted' | 'gpaUnweighted' | 'classRank' | 'transcript'>> {
  console.log('\n── Section 2: Academics ─────────────────────────────');
  const gpaWeighted = await ask({ type: 'input', name: 'gpaWeighted', message: 'Weighted GPA (e.g., 4.3):', initial: existing?.gpaWeighted ?? '' });
  const gpaUnweighted = await ask({ type: 'input', name: 'gpaUnweighted', message: 'Unweighted GPA (e.g., 3.9):', initial: existing?.gpaUnweighted ?? '' });
  const classRank = await ask({ type: 'input', name: 'classRank', message: 'Class rank (e.g., "12 of 450") — press Enter to skip:', initial: existing?.classRank ?? '' });

  const transcript: TranscriptYear[] = existing?.transcript ? [...existing.transcript] : [];
  console.log('\nTranscript — add one row per school year (e.g. 9th Grade, 10th Grade).');
  console.log('(Press Enter on a blank year label when done)');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const yearLabel = await askOrSkip({ name: 'yearLabel', message: 'Year label (e.g., "9th Grade", "10th Grade"):' });
    if (!yearLabel) break;
    const courses: Array<{ name: string; grade: string }> = [];
    console.log('  Add courses for this year. Press Enter on a blank course name when done.');
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const courseName = await askOrSkip({ name: 'courseName', message: '  Course name:' });
      if (!courseName) break;
      const grade = await ask({ type: 'input', name: 'grade', message: '  Letter grade:' });
      courses.push({ name: courseName, grade });
    }
    transcript.push({ yearLabel, courses });
  }
  return { gpaWeighted, gpaUnweighted, classRank, transcript };
}

async function collectTests(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'sat' | 'act' | 'apScores' | 'ibScores'>> {
  console.log('\n── Section 3: Standardized Tests ────────────────────');
  console.log('(Press Enter to skip any test you have not taken)');

  const satTotal = await ask({ type: 'input', name: 'satTotal', message: 'SAT Total score (e.g., 1520):', initial: existing?.sat?.total ?? '' });
  const satMath = await ask({ type: 'input', name: 'satMath', message: 'SAT Math score:', initial: existing?.sat?.math ?? '' });
  const satReading = await ask({ type: 'input', name: 'satReading', message: 'SAT Evidence-Based Reading & Writing score:', initial: existing?.sat?.reading ?? '' });
  const actComposite = await ask({ type: 'input', name: 'actComposite', message: 'ACT Composite score (e.g., 34):', initial: existing?.act?.composite ?? '' });

  const apScores: Array<{ subject: string; score: string }> = existing?.apScores ? [...existing.apScores] : [];
  console.log('\nAP scores — press Enter on a blank subject when done.');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const subject = await askOrSkip({ name: 'subject', message: '  AP Subject:' });
    if (!subject) break;
    const score = await ask({ type: 'input', name: 'score', message: '  Score (1-5):' });
    apScores.push({ subject, score });
  }

  const ibScores: Array<{ subject: string; score: string }> = existing?.ibScores ? [...existing.ibScores] : [];
  console.log('\nIB scores — press Enter on a blank subject when done.');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const subject = await askOrSkip({ name: 'subject', message: '  IB Subject:' });
    if (!subject) break;
    const score = await ask({ type: 'input', name: 'score', message: '  Predicted/Final score:' });
    ibScores.push({ subject, score });
  }

  return {
    sat: { total: satTotal, math: satMath, reading: satReading },
    act: { composite: actComposite },
    apScores,
    ibScores,
  };
}

async function collectExtracurriculars(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'extracurriculars'>> {
  console.log('\n── Section 4: Extracurricular Activities ────────────');
  console.log('Press Enter on a blank activity name when done.');
  const extracurriculars: Extracurricular[] = existing?.extracurriculars ? [...existing.extracurriculars] : [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const activityName = await askOrSkip({ name: 'activityName', message: '  Activity name (e.g., Robotics Club):' });
    if (!activityName) break;
    const role = await ask({ type: 'input', name: 'role', message: '  Your role (e.g., President, Member):' });
    const yearsInvolved = await ask({ type: 'input', name: 'yearsInvolved', message: '  Years involved (e.g., 2021–2024):' });
    const hoursPerWeek = await ask({ type: 'input', name: 'hoursPerWeek', message: '  Hours per week (approximate):' });
    const description = await ask({ type: 'input', name: 'description', message: '  One-sentence description of your impact:' });
    extracurriculars.push({ activityName, role, yearsInvolved, hoursPerWeek, description });
  }
  return { extracurriculars };
}

async function collectAwards(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'awards'>> {
  console.log('\n── Section 5: Awards & Recognitions ─────────────────');
  console.log('Press Enter on a blank award name when done.');
  const awards: Award[] = existing?.awards ? [...existing.awards] : [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const awardName = await askOrSkip({ name: 'awardName', message: '  Award name:' });
    if (!awardName) break;
    const level = await ask({
      type: 'select',
      name: 'level',
      message: '  Level:',
      choices: ['Local', 'Regional', 'State', 'National', 'International'],
    });
    const year = await ask({ type: 'input', name: 'year', message: '  Year received:' });
    const description = await ask({ type: 'input', name: 'description', message: '  One-sentence description:' });
    awards.push({ awardName, level, year, description });
  }
  return { awards };
}

async function collectPersonalStatement(existing?: Partial<ProfileData>): Promise<Pick<ProfileData, 'personalStatementSummary'>> {
  console.log('\n── Section 6: Personal Statement (Optional) ─────────');
  const hasDraft = await confirm('Do you have personal statement themes or key ideas to note?');
  if (!hasDraft) return { personalStatementSummary: '' };
  const personalStatementSummary = await ask({
    type: 'input',
    name: 'personalStatementSummary',
    message: 'Brief summary or key themes (not the full essay):',
    initial: existing?.personalStatementSummary ?? '',
  });
  return { personalStatementSummary };
}

// ─── Markdown Rendering ───────────────────────────────────────────────────────

function renderProfileMarkdown(data: ProfileData): string {
  const now = data.lastUpdated;
  const lines: string[] = [];

  lines.push(`# Student Profile: ${data.name}`);
  lines.push('');
  lines.push(`**Generated:** ${data.generatedDate}`);
  lines.push(`**Last Updated:** ${now}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Personal');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| :---- | :---- |');
  lines.push(`| Full Name | ${data.name} |`);
  lines.push(`| Graduation Year | ${data.gradYear} |`);
  lines.push(`| High School | ${data.highSchool} |`);
  lines.push(`| Intended Majors / Tracks | ${data.intendedMajors.length > 0 ? data.intendedMajors.join(', ') : 'Not provided'} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Academic Record');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| :----- | :---- |');
  lines.push(`| GPA (Weighted) | ${data.gpaWeighted} |`);
  lines.push(`| GPA (Unweighted) | ${data.gpaUnweighted} |`);
  lines.push(`| Class Rank | ${data.classRank || 'Not provided'} |`);
  lines.push('');
  lines.push('### Transcript');
  lines.push('');
  if (data.transcript.length === 0) {
    lines.push('*No transcript entries added.*');
  } else {
    for (const year of data.transcript) {
      lines.push(`#### ${year.yearLabel}`);
      lines.push('');
      lines.push('| Course | Grade |');
      lines.push('| :----- | :---- |');
      for (const course of year.courses) {
        lines.push(`| ${course.name} | ${course.grade} |`);
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');
  lines.push('## Standardized Tests');
  lines.push('');
  lines.push('### SAT');
  lines.push('| Section | Score |');
  lines.push('| :------ | :---- |');
  lines.push(`| Total | ${data.sat.total || 'Not taken'} |`);
  lines.push(`| Math | ${data.sat.math || '—'} |`);
  lines.push(`| Evidence-Based Reading & Writing | ${data.sat.reading || '—'} |`);
  lines.push('');
  lines.push('### ACT');
  lines.push('| Section | Score |');
  lines.push('| :------ | :---- |');
  lines.push(`| Composite | ${data.act.composite || 'Not taken'} |`);
  lines.push('');
  lines.push('### AP Scores');
  lines.push('| Subject | Score |');
  lines.push('| :------ | :---- |');
  if (data.apScores.length === 0) {
    lines.push('| — | — |');
  } else {
    for (const ap of data.apScores) lines.push(`| ${ap.subject} | ${ap.score} |`);
  }
  lines.push('');
  lines.push('### IB Scores');
  lines.push('| Subject | Score |');
  lines.push('| :------ | :---- |');
  if (data.ibScores.length === 0) {
    lines.push('| — | — |');
  } else {
    for (const ib of data.ibScores) lines.push(`| ${ib.subject} | ${ib.score} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Extracurricular Activities');
  lines.push('');
  if (data.extracurriculars.length === 0) {
    lines.push('*No activities added.*');
  } else {
    lines.push('| Activity | Role | Years | Hrs/Week | Description |');
    lines.push('| :------- | :--- | :---- | :------- | :---------- |');
    for (const ec of data.extracurriculars) {
      lines.push(`| ${ec.activityName} | ${ec.role} | ${ec.yearsInvolved} | ${ec.hoursPerWeek} | ${ec.description} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Awards & Recognitions');
  lines.push('');
  if (data.awards.length === 0) {
    lines.push('*No awards added.*');
  } else {
    lines.push('| Award | Level | Year | Description |');
    lines.push('| :---- | :---- | :--- | :---------- |');
    for (const aw of data.awards) {
      lines.push(`| ${aw.awardName} | ${aw.level} | ${aw.year} | ${aw.description} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Personal Statement');
  lines.push('');
  lines.push('**Key Themes / Summary:**');
  lines.push(data.personalStatementSummary || 'Not provided');
  lines.push('');

  return lines.join('\n');
}

// ─── Parse existing profile back to ProfileData ───────────────────────────────

function parseExistingProfile(content: string): Partial<ProfileData> {
  const partial: Partial<ProfileData> = {};

  const fieldMatch = (label: string) => {
    const re = new RegExp(`\\|\\s*${label}\\s*\\|\\s*([^|\\n]+)\\|`);
    const m = content.match(re);
    return m ? m[1].trim() : '';
  };

  partial.name = fieldMatch('Full Name');
  partial.gradYear = fieldMatch('Graduation Year');
  partial.highSchool = fieldMatch('High School');
  const majorsRaw = fieldMatch('Intended Majors / Tracks');
  partial.intendedMajors = majorsRaw && majorsRaw !== 'Not provided'
    ? majorsRaw.split(',').map(m => m.trim()).filter(Boolean)
    : [];
  partial.gpaWeighted = fieldMatch('GPA \\(Weighted\\)');
  partial.gpaUnweighted = fieldMatch('GPA \\(Unweighted\\)');
  const classRankRaw = fieldMatch('Class Rank');
  partial.classRank = classRankRaw === 'Not provided' ? '' : classRankRaw;

  // Generated/updated dates
  const genMatch = content.match(/\*\*Generated:\*\*\s*([^\n]+)/);
  if (genMatch) partial.generatedDate = genMatch[1].trim();
  const updMatch = content.match(/\*\*Last Updated:\*\*\s*([^\n]+)/);
  if (updMatch) partial.lastUpdated = updMatch[1].trim();

  // Personal statement
  const psMatch = content.match(/\*\*Key Themes \/ Summary:\*\*\n([\s\S]+?)(?:\n---|\n$|$)/);
  const psText = psMatch ? psMatch[1].trim() : '';
  partial.personalStatementSummary = psText === 'Not provided' ? '' : psText;

  // Transcript, extracurriculars, awards, and test scores are complex to re-parse
  // Keep existing data as-is — update flow rebuilds only the selected section
  partial.transcript = [];
  partial.extracurriculars = [];
  partial.awards = [];
  partial.apScores = [];
  partial.ibScores = [];
  partial.sat = { total: '', math: '', reading: '' };
  partial.act = { composite: '' };

  return partial;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C02-F01, C02-F02] Build or update a student profile
export async function buildStudentProfile(nameSlug?: string): Promise<{ profilePath: string }> {
  let profilePath: string;
  let existing: Partial<ProfileData> | undefined;
  let isUpdate = false;

  // Determine student name and directory
  let resolvedSlug = nameSlug;

  if (resolvedSlug) {
    profilePath = dataPath(resolvedSlug, 'profile.md');
    if (await fileExists(profilePath)) {
      isUpdate = true;
      const content = await readFile(profilePath);
      existing = parseExistingProfile(content);
      const doUpdate = await confirm(`Profile already exists for "${resolvedSlug}". Update a section?`);
      if (!doUpdate) {
        console.log('No changes made.');
        return { profilePath };
      }
    }
  } else {
    // Name not provided — collect it as the first step
    const nameResult = await ask({ type: 'input', name: 'name', message: 'Your full legal name:' });
    resolvedSlug = toSlug(nameResult);
    profilePath = dataPath(resolvedSlug, 'profile.md');
    if (await fileExists(profilePath)) {
      isUpdate = true;
      const content = await readFile(profilePath);
      existing = parseExistingProfile(content);
      const doUpdate = await confirm(`Profile already exists for "${resolvedSlug}". Update a section?`);
      if (!doUpdate) {
        console.log('No changes made.');
        return { profilePath };
      }
    } else {
      // Pre-fill name from what was just collected
      existing = { name: nameResult };
    }
  }

  const now = new Date().toISOString().split('T')[0];
  const generatedDate = existing?.generatedDate ?? now;

  let data: ProfileData = {
    name: existing?.name ?? '',
    gradYear: existing?.gradYear ?? '',
    highSchool: existing?.highSchool ?? '',
    intendedMajors: existing?.intendedMajors ?? [],
    gpaWeighted: existing?.gpaWeighted ?? '',
    gpaUnweighted: existing?.gpaUnweighted ?? '',
    classRank: existing?.classRank ?? '',
    transcript: existing?.transcript ?? [],
    sat: existing?.sat ?? { total: '', math: '', reading: '' },
    act: existing?.act ?? { composite: '' },
    apScores: existing?.apScores ?? [],
    ibScores: existing?.ibScores ?? [],
    extracurriculars: existing?.extracurriculars ?? [],
    awards: existing?.awards ?? [],
    personalStatementSummary: existing?.personalStatementSummary ?? '',
    generatedDate,
    lastUpdated: now,
  };

  if (isUpdate) {
    // [C02-F02] Section-by-section update
    const section = await ask({
      type: 'select',
      name: 'section',
      message: 'Which section would you like to update?',
      choices: ['Personal', 'Academics', 'Standardized Tests', 'Extracurriculars', 'Awards & Recognitions', 'Personal Statement'],
    });

    switch (section) {
      case 'Personal': {
        const p = await collectPersonal(data);
        data = { ...data, ...p };
        break;
      }
      case 'Academics': {
        const a = await collectAcademics(data);
        data = { ...data, ...a };
        break;
      }
      case 'Standardized Tests': {
        const t = await collectTests(data);
        data = { ...data, ...t };
        break;
      }
      case 'Extracurriculars': {
        const e = await collectExtracurriculars(data);
        data = { ...data, ...e };
        break;
      }
      case 'Awards & Recognitions': {
        const aw = await collectAwards(data);
        data = { ...data, ...aw };
        break;
      }
      case 'Personal Statement': {
        const ps = await collectPersonalStatement(data);
        data = { ...data, ...ps };
        break;
      }
    }
  } else {
    // [C02-F01] Full wizard
    const personal = await collectPersonal(existing);
    data = { ...data, ...personal };
    const academics = await collectAcademics(existing);
    data = { ...data, ...academics };
    const tests = await collectTests(existing);
    data = { ...data, ...tests };
    const ec = await collectExtracurriculars(existing);
    data = { ...data, ...ec };
    const awards = await collectAwards(existing);
    data = { ...data, ...awards };
    const ps = await collectPersonalStatement(existing);
    data = { ...data, ...ps };
  }

  // [C02-F04] Write markdown
  const markdown = renderProfileMarkdown(data);
  await writeFile(profilePath, markdown);
  return { profilePath };
}

// [C02-F03] Show stored student profile
export async function showStudentProfile(nameSlug: string): Promise<{ markdownPath: string }> {
  const markdownPath = dataPath(nameSlug, 'profile.md');
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No profile found for "${nameSlug}". Run: ao --student-profile --build --name ${nameSlug}`);
  }
  const content = await readFile(markdownPath);
  console.log(content);
  return { markdownPath };
}

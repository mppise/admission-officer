import Enquirer from 'enquirer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dataPath, writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
import { toSlug } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { getGeminiApiKey, getGeminiModel } from '../../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldStatus = 'pending' | 'set' | 'skipped';

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
  generatedDate: string;
  lastUpdated: string;
  fieldStatus: Record<string, FieldStatus>;
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

// Enquirer separator choice — rendered as a non-selectable divider line
const SEP = { role: 'separator', value: '─────────────' };
type Choice = string | typeof SEP;

async function ask(question: {
  type: string;
  name: string;
  message: string;
  choices?: Choice[];
  initial?: string;
}): Promise<string> {
  // Fresh instance per call — prevents Enquirer from caching choices across prompts
  const instance = new Enquirer();
  const response = await instance.prompt(question) as Record<string, unknown>;
  const val = response[question.name];
  // Enquirer select can return a choice object instead of the string value
  if (val !== null && typeof val === 'object' && 'value' in (val as object)) {
    return String((val as Record<string, unknown>)['value'] ?? '');
  }
  return String(val ?? '');
}

async function confirm(message: string): Promise<boolean> {
  const instance = new Enquirer();
  const response = await instance.prompt({ type: 'confirm', name: 'value', message }) as { value: boolean };
  return response.value;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function jsonPath(slug: string): string {
  return dataPath(slug, 'profile.json');
}

function mdPath(slug: string): string {
  return dataPath(slug, 'profile.md');
}

// [C02-F05-JSON] Write profile.json after every field input — called after every mutation
async function saveJson(slug: string, data: ProfileData): Promise<void> {
  await writeFile(jsonPath(slug), JSON.stringify(data, null, 2));
}

function emptyProfile(name: string, slug: string): ProfileData {
  const now = new Date().toISOString().split('T')[0];
  return {
    name,
    gradYear: '',
    highSchool: '',
    intendedMajors: [],
    gpaWeighted: '',
    gpaUnweighted: '',
    classRank: '',
    transcript: [],
    sat: { total: '', math: '', reading: '' },
    act: { composite: '' },
    apScores: [],
    ibScores: [],
    extracurriculars: [],
    awards: [],
    generatedDate: now,
    lastUpdated: now,
    fieldStatus: {
      name: 'set', // already collected before menu opens
      gradYear: 'pending',
      highSchool: 'pending',
      intendedMajors: 'pending',
      gpaWeighted: 'pending',
      gpaUnweighted: 'pending',
      classRank: 'pending',
      transcript: 'pending',
      satTotal: 'pending',
      satMath: 'pending',
      satReading: 'pending',
      actComposite: 'pending',
      apScores: 'pending',
      ibScores: 'pending',
      extracurriculars: 'pending',
      awards: 'pending',
    },
  };
}

// ─── Completion helpers ───────────────────────────────────────────────────────

const SECTION_FIELDS: Record<string, string[]> = {
  Personal:             ['gradYear', 'highSchool', 'intendedMajors'],
  Academics:            ['gpaWeighted', 'gpaUnweighted', 'classRank', 'transcript'],
  'Standardized Tests': ['satTotal', 'satMath', 'satReading', 'actComposite', 'apScores', 'ibScores'],
  Extracurriculars:     ['extracurriculars'],
  'Awards & Recognitions': ['awards'],
};

function sectionIndicator(section: string, fs: Record<string, FieldStatus>): string {
  const fields = SECTION_FIELDS[section];
  const statuses = fields.map(f => fs[f]);
  if (statuses.every(s => s === 'set' || s === 'skipped')) return '✓ complete';
  if (statuses.every(s => s === 'pending')) return '○ not started';
  const pending = statuses.filter(s => s === 'pending').length;
  return `● ${pending} field${pending > 1 ? 's' : ''} pending`;
}

function allComplete(fs: Record<string, FieldStatus>): boolean {
  const activeFields = Object.values(SECTION_FIELDS).flat();
  return activeFields.every(f => fs[f] === 'set' || fs[f] === 'skipped');
}

function fieldLabel(key: string, data: ProfileData): string {
  const s = data.fieldStatus[key];
  if (s === 'skipped') return '–  skipped';
  if (s === 'pending') return '○';

  // Show inline value summary
  switch (key) {
    case 'gradYear':   return `✓  ${data.gradYear}`;
    case 'highSchool': return `✓  ${data.highSchool}`;
    case 'intendedMajors': return `✓  ${data.intendedMajors.join(', ')}`;
    case 'gpaWeighted':    return `✓  ${data.gpaWeighted}`;
    case 'gpaUnweighted':  return `✓  ${data.gpaUnweighted}`;
    case 'classRank':      return `✓  ${data.classRank}`;
    case 'transcript':     return `●  ${data.transcript.length} year${data.transcript.length !== 1 ? 's' : ''}`;
    case 'satTotal':       return `✓  ${data.sat.total}`;
    case 'satMath':        return `✓  ${data.sat.math}`;
    case 'satReading':     return `✓  ${data.sat.reading}`;
    case 'actComposite':   return `✓  ${data.act.composite}`;
    case 'apScores':       return `●  ${data.apScores.length} subject${data.apScores.length !== 1 ? 's' : ''}`;
    case 'ibScores':       return `●  ${data.ibScores.length} subject${data.ibScores.length !== 1 ? 's' : ''}`;
    case 'extracurriculars': return `●  ${data.extracurriculars.length} activit${data.extracurriculars.length !== 1 ? 'ies' : 'y'}`;
    case 'awards':           return `●  ${data.awards.length} award${data.awards.length !== 1 ? 's' : ''}`;
    default: return '✓';
  }
}

// ─── Scalar field editor ──────────────────────────────────────────────────────

async function editScalar(
  slug: string,
  data: ProfileData,
  key: string,
  message: string,
  current: string,
  skippable: boolean,
  choices?: string[],
): Promise<void> {
  const type = choices ? 'select' : 'input';
  const question: Parameters<typeof ask>[0] = { type, name: 'value', message, initial: current };
  if (choices) question.choices = choices;

  if (skippable) {
    const action = await ask({
      type: 'select',
      name: 'action',
      message,
      choices: current ? [`Keep: ${current}`, 'Enter new value', 'Skip this field'] : ['Enter value', 'Skip this field'],
    });
    if (action === 'Skip this field') {
      data.fieldStatus[key] = 'skipped';
      await saveJson(slug, data);
      return;
    }
    if (action.startsWith('Keep:')) {
      // no change
      return;
    }
  }

  const value = await ask(question);
  if (value.trim()) {
    // Update the actual field
    switch (key) {
      case 'gradYear':    data.gradYear = value.trim(); break;
      case 'highSchool':  data.highSchool = value.trim(); break;
      case 'gpaWeighted': data.gpaWeighted = value.trim(); break;
      case 'gpaUnweighted': data.gpaUnweighted = value.trim(); break;
      case 'classRank':   data.classRank = value.trim(); break;
      case 'satTotal':    data.sat.total = value.trim(); break;
      case 'satMath':     data.sat.math = value.trim(); break;
      case 'satReading':  data.sat.reading = value.trim(); break;
      case 'actComposite': data.act.composite = value.trim(); break;
    }
    data.fieldStatus[key] = 'set';
    await saveJson(slug, data);
  }
}

// ─── List editors ─────────────────────────────────────────────────────────────

async function editIntendedMajors(slug: string, data: ProfileData): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entries = data.intendedMajors;
    const choices = [
      ...entries.map((m, i) => `${i + 1}. ${m}`),
      SEP,
      'Add major / track',
      ...(entries.length > 0 ? ['Remove a major / track'] : []),
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: 'Intended Majors / Tracks', choices });

    if (choice === 'Back') break;

    if (choice === 'Add major / track') {
      const val = await ask({ type: 'input', name: 'val', message: 'Major or track (e.g., Computer Science, Pre-Med):' });
      if (val.trim()) {
        data.intendedMajors.push(val.trim());
        data.fieldStatus['intendedMajors'] = 'set';
        await saveJson(slug, data);
      }
    } else if (choice === 'Remove a major / track') {
      if (entries.length === 0) continue;
      const toRemove = await ask({ type: 'select', name: 'idx', message: 'Remove which?', choices: [...entries] });
      const idx = entries.indexOf(toRemove);
      if (idx >= 0) {
        data.intendedMajors.splice(idx, 1);
        data.fieldStatus['intendedMajors'] = data.intendedMajors.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
    // Selecting an existing entry — no edit for plain strings, offer remove instead
  }
}

async function editTranscript(slug: string, data: ProfileData): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const years = data.transcript;
    const choices = [
      ...years.map((y, i) => `${i + 1}. ${y.yearLabel} (${y.courses.length} course${y.courses.length !== 1 ? 's' : ''})`),
      SEP,
      'Add year',
      ...(years.length > 0 ? ['Remove a year'] : []),
      'Skip transcript',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: 'Transcript', choices });

    if (choice === 'Back') break;

    if (choice === 'Skip transcript') {
      data.fieldStatus['transcript'] = 'skipped';
      await saveJson(slug, data);
      break;
    }

    if (choice === 'Add year') {
      const yearLabel = await ask({ type: 'input', name: 'yearLabel', message: 'Year label (e.g., "9th Grade"):' });
      if (!yearLabel.trim()) continue;
      const courses: Array<{ name: string; grade: string }> = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const courseName = await ask({ type: 'input', name: 'course', message: '  Course name (blank to finish):' });
        if (!courseName.trim()) break;
        const grade = await ask({ type: 'input', name: 'grade', message: '  Letter grade:' });
        courses.push({ name: courseName.trim(), grade: grade.trim() });
        data.transcript = data.transcript.filter(y => y.yearLabel !== yearLabel);
        data.transcript.push({ yearLabel: yearLabel.trim(), courses });
        data.fieldStatus['transcript'] = 'set';
        await saveJson(slug, data);
      }
    } else if (choice === 'Remove a year') {
      const toRemove = await ask({ type: 'select', name: 'yr', message: 'Remove which year?', choices: years.map(y => y.yearLabel) });
      data.transcript = data.transcript.filter(y => y.yearLabel !== toRemove);
      data.fieldStatus['transcript'] = data.transcript.length > 0 ? 'set' : 'pending';
      await saveJson(slug, data);
    } else if (choice.includes('.')) {
      // Selected an existing year — offer course management
      const idx = parseInt(choice.split('.')[0]) - 1;
      const year = data.transcript[idx];
      if (!year) continue;
      await editCourses(slug, data, year);
    }
  }
}

async function editCourses(slug: string, data: ProfileData, year: TranscriptYear): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      ...year.courses.map((c, i) => `${i + 1}. ${c.name} — ${c.grade}`),
      SEP,
      'Add course',
      ...(year.courses.length > 0 ? ['Remove a course'] : []),
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: `Courses: ${year.yearLabel}`, choices });
    if (choice === 'Back') break;

    if (choice === 'Add course') {
      const name = await ask({ type: 'input', name: 'name', message: '  Course name:' });
      if (!name.trim()) continue;
      const grade = await ask({ type: 'input', name: 'grade', message: '  Letter grade:' });
      year.courses.push({ name: name.trim(), grade: grade.trim() });
      await saveJson(slug, data);
    } else if (choice === 'Remove a course') {
      const toRemove = await ask({ type: 'select', name: 'c', message: 'Remove which?', choices: year.courses.map(c => `${c.name} — ${c.grade}`) });
      const idx = year.courses.findIndex(c => `${c.name} — ${c.grade}` === toRemove);
      if (idx >= 0) { year.courses.splice(idx, 1); await saveJson(slug, data); }
    } else if (choice.includes('.')) {
      const idx = parseInt(choice.split('.')[0]) - 1;
      const course = year.courses[idx];
      if (!course) continue;
      const newName = await ask({ type: 'input', name: 'name', message: 'Course name:', initial: course.name });
      const newGrade = await ask({ type: 'input', name: 'grade', message: 'Letter grade:', initial: course.grade });
      if (newName.trim()) course.name = newName.trim();
      if (newGrade.trim()) course.grade = newGrade.trim();
      await saveJson(slug, data);
    }
  }
}

async function editScorePairs(
  slug: string,
  data: ProfileData,
  key: 'apScores' | 'ibScores',
  subjectLabel: string,
  scoreLabel: string,
): Promise<void> {
  const list = data[key];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      ...list.map((s, i) => `${i + 1}. ${s.subject} — ${s.score}`),
      SEP,
      `Add ${subjectLabel}`,
      ...(list.length > 0 ? [`Remove a ${subjectLabel}`] : []),
      `Skip ${subjectLabel}`,
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: subjectLabel, choices });
    if (choice === 'Back') break;

    if (choice.startsWith('Skip')) {
      data.fieldStatus[key] = 'skipped';
      await saveJson(slug, data);
      break;
    }

    if (choice.startsWith('Add')) {
      const subject = await ask({ type: 'input', name: 'subject', message: `  ${subjectLabel} subject:` });
      if (!subject.trim()) continue;
      const score = await ask({ type: 'input', name: 'score', message: `  ${scoreLabel}:` });
      list.push({ subject: subject.trim(), score: score.trim() });
      data.fieldStatus[key] = 'set';
      await saveJson(slug, data);
    } else if (choice.startsWith('Remove')) {
      const toRemove = await ask({ type: 'select', name: 's', message: 'Remove which?', choices: list.map(s => `${s.subject} — ${s.score}`) });
      const idx = list.findIndex(s => `${s.subject} — ${s.score}` === toRemove);
      if (idx >= 0) {
        list.splice(idx, 1);
        data.fieldStatus[key] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    } else if (choice.includes('.')) {
      const idx = parseInt(choice.split('.')[0]) - 1;
      const entry = list[idx];
      if (!entry) continue;
      const newSubject = await ask({ type: 'input', name: 'subject', message: `${subjectLabel} subject:`, initial: entry.subject });
      const newScore = await ask({ type: 'input', name: 'score', message: `${scoreLabel}:`, initial: entry.score });
      if (newSubject.trim()) entry.subject = newSubject.trim();
      if (newScore.trim()) entry.score = newScore.trim();
      await saveJson(slug, data);
    }
  }
}

async function editExtracurriculars(slug: string, data: ProfileData): Promise<void> {
  const list = data.extracurriculars;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      ...list.map((e, i) => `${i + 1}. ${e.activityName} — ${e.role}`),
      SEP,
      'Add activity',
      ...(list.length > 0 ? ['Edit an activity', 'Remove an activity'] : []),
      'Skip extracurriculars',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: 'Extracurricular Activities', choices });
    if (choice === 'Back') break;

    if (choice === 'Skip extracurriculars') {
      data.fieldStatus['extracurriculars'] = 'skipped';
      await saveJson(slug, data);
      break;
    }

    if (choice === 'Add activity') {
      const entry = await collectActivityEntry();
      list.push(entry);
      data.fieldStatus['extracurriculars'] = 'set';
      await saveJson(slug, data);
    } else if (choice === 'Edit an activity') {
      const summary = await ask({ type: 'select', name: 's', message: 'Edit which?', choices: list.map(e => `${e.activityName} — ${e.role}`) });
      const idx = list.findIndex(e => `${e.activityName} — ${e.role}` === summary);
      if (idx >= 0) {
        list[idx] = await collectActivityEntry(list[idx]);
        await saveJson(slug, data);
      }
    } else if (choice === 'Remove an activity') {
      const summary = await ask({ type: 'select', name: 's', message: 'Remove which?', choices: list.map(e => `${e.activityName} — ${e.role}`) });
      const idx = list.findIndex(e => `${e.activityName} — ${e.role}` === summary);
      if (idx >= 0) {
        list.splice(idx, 1);
        data.fieldStatus['extracurriculars'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectActivityEntry(existing?: Extracurricular): Promise<Extracurricular> {
  const activityName = await ask({ type: 'input', name: 'activityName', message: '  Activity name:', initial: existing?.activityName ?? '' });
  const role = await ask({ type: 'input', name: 'role', message: '  Your role:', initial: existing?.role ?? '' });
  const yearsInvolved = await ask({ type: 'input', name: 'yearsInvolved', message: '  Years involved (e.g., 2021–2024):', initial: existing?.yearsInvolved ?? '' });
  const hoursPerWeek = await ask({ type: 'input', name: 'hoursPerWeek', message: '  Hours per week (approx):', initial: existing?.hoursPerWeek ?? '' });
  const description = await ask({ type: 'input', name: 'description', message: '  One-sentence description of your impact:', initial: existing?.description ?? '' });
  return { activityName: activityName.trim(), role: role.trim(), yearsInvolved: yearsInvolved.trim(), hoursPerWeek: hoursPerWeek.trim(), description: description.trim() };
}

async function editAwards(slug: string, data: ProfileData): Promise<void> {
  const list = data.awards;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      ...list.map((a, i) => `${i + 1}. ${a.awardName} — ${a.level} (${a.year})`),
      SEP,
      'Add award',
      ...(list.length > 0 ? ['Edit an award', 'Remove an award'] : []),
      'Skip awards',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'action', message: 'Awards & Recognitions', choices });
    if (choice === 'Back') break;

    if (choice === 'Skip awards') {
      data.fieldStatus['awards'] = 'skipped';
      await saveJson(slug, data);
      break;
    }

    if (choice === 'Add award') {
      const entry = await collectAwardEntry();
      list.push(entry);
      data.fieldStatus['awards'] = 'set';
      await saveJson(slug, data);
    } else if (choice === 'Edit an award') {
      const summary = await ask({ type: 'select', name: 's', message: 'Edit which?', choices: list.map(a => `${a.awardName} — ${a.level} (${a.year})`) });
      const idx = list.findIndex(a => `${a.awardName} — ${a.level} (${a.year})` === summary);
      if (idx >= 0) {
        list[idx] = await collectAwardEntry(list[idx]);
        await saveJson(slug, data);
      }
    } else if (choice === 'Remove an award') {
      const summary = await ask({ type: 'select', name: 's', message: 'Remove which?', choices: list.map(a => `${a.awardName} — ${a.level} (${a.year})`) });
      const idx = list.findIndex(a => `${a.awardName} — ${a.level} (${a.year})` === summary);
      if (idx >= 0) {
        list.splice(idx, 1);
        data.fieldStatus['awards'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectAwardEntry(existing?: Award): Promise<Award> {
  const awardName = await ask({ type: 'input', name: 'awardName', message: '  Award name:', initial: existing?.awardName ?? '' });
  const level = await ask({ type: 'select', name: 'level', message: '  Level:', choices: ['Local', 'Regional', 'State', 'National', 'International'] });
  const year = await ask({ type: 'input', name: 'year', message: '  Year received:', initial: existing?.year ?? '' });
  const description = await ask({ type: 'input', name: 'description', message: '  One-sentence description:', initial: existing?.description ?? '' });
  return { awardName: awardName.trim(), level, year: year.trim(), description: description.trim() };
}

// ─── Section menus (Level 2) ──────────────────────────────────────────────────

async function sectionPersonal(slug: string, data: ProfileData): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      `Graduation Year          ${fieldLabel('gradYear', data)}`,
      `High School              ${fieldLabel('highSchool', data)}`,
      `Intended Majors / Tracks ${fieldLabel('intendedMajors', data)}`,
      SEP,
      'Skip entire section',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'personal', message: 'Personal', choices });
    if (choice === 'Back') break;

    if (choice === 'Skip entire section') {
      for (const f of SECTION_FIELDS['Personal']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }

    if (choice.startsWith('Graduation Year')) {
      await editScalar(slug, data, 'gradYear', 'Expected graduation year (e.g., 2026):', data.gradYear, false);
    } else if (choice.startsWith('High School')) {
      await editScalar(slug, data, 'highSchool', 'High school name:', data.highSchool, false);
    } else if (choice.startsWith('Intended Majors')) {
      await editIntendedMajors(slug, data);
    }
  }
}

async function sectionAcademics(slug: string, data: ProfileData): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      `GPA (Weighted)   ${fieldLabel('gpaWeighted', data)}`,
      `GPA (Unweighted) ${fieldLabel('gpaUnweighted', data)}`,
      `Class Rank       ${fieldLabel('classRank', data)}`,
      `Transcript       ${fieldLabel('transcript', data)}`,
      SEP,
      'Skip entire section',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'academics', message: 'Academics', choices });
    if (choice === 'Back') break;

    if (choice === 'Skip entire section') {
      for (const f of SECTION_FIELDS['Academics']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }

    if (choice.startsWith('GPA (Weighted)')) {
      await editScalar(slug, data, 'gpaWeighted', 'Weighted GPA (e.g., 4.3):', data.gpaWeighted, false);
    } else if (choice.startsWith('GPA (Unweighted)')) {
      await editScalar(slug, data, 'gpaUnweighted', 'Unweighted GPA (e.g., 3.9):', data.gpaUnweighted, false);
    } else if (choice.startsWith('Class Rank')) {
      await editScalar(slug, data, 'classRank', 'Class rank (e.g., "12 of 450"):', data.classRank, true);
    } else if (choice.startsWith('Transcript')) {
      await editTranscript(slug, data);
    }
  }
}

async function sectionTests(slug: string, data: ProfileData): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choices = [
      `SAT Total        ${fieldLabel('satTotal', data)}`,
      `SAT Math         ${fieldLabel('satMath', data)}`,
      `SAT Reading/Writing ${fieldLabel('satReading', data)}`,
      `ACT Composite    ${fieldLabel('actComposite', data)}`,
      `AP Scores        ${fieldLabel('apScores', data)}`,
      `IB Scores        ${fieldLabel('ibScores', data)}`,
      SEP,
      'Skip entire section',
      'Back',
    ];
    const choice = await ask({ type: 'select', name: 'tests', message: 'Standardized Tests', choices });
    if (choice === 'Back') break;

    if (choice === 'Skip entire section') {
      for (const f of SECTION_FIELDS['Standardized Tests']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }

    if (choice.startsWith('SAT Total'))           await editScalar(slug, data, 'satTotal', 'SAT Total score (e.g., 1520):', data.sat.total, true);
    else if (choice.startsWith('SAT Math'))        await editScalar(slug, data, 'satMath', 'SAT Math score:', data.sat.math, true);
    else if (choice.startsWith('SAT Reading'))     await editScalar(slug, data, 'satReading', 'SAT Evidence-Based Reading & Writing score:', data.sat.reading, true);
    else if (choice.startsWith('ACT Composite'))   await editScalar(slug, data, 'actComposite', 'ACT Composite score (e.g., 34):', data.act.composite, true);
    else if (choice.startsWith('AP Scores'))       await editScorePairs(slug, data, 'apScores', 'AP Scores', 'Score (1–5)');
    else if (choice.startsWith('IB Scores'))       await editScorePairs(slug, data, 'ibScores', 'IB Scores', 'Predicted/Final score');
  }
}

async function sectionExtracurriculars(slug: string, data: ProfileData): Promise<void> {
  await editExtracurriculars(slug, data);
}

async function sectionAwards(slug: string, data: ProfileData): Promise<void> {
  await editAwards(slug, data);
}

// ─── LLM Enhancement (C02-F04) ───────────────────────────────────────────────

async function enhanceProfile(data: ProfileData): Promise<ProfileData> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: getGeminiModel(), generationConfig: { temperature: 0.2 } });

  const prompt = await loadPrompt('c02-profile-enhance', {
    PROFILE_JSON: JSON.stringify(data, null, 2),
  });

  async function attempt(): Promise<ProfileData> {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(jsonStr) as ProfileData;
  }

  try {
    return await attempt();
  } catch {
    console.log('Retrying enhancement in 30 seconds...');
    await new Promise(r => setTimeout(r, 30000));
    try {
      return await attempt();
    } catch {
      console.log('Profile enhancement unavailable — saved with original text.');
      return data;
    }
  }
}

// ─── Markdown rendering ───────────────────────────────────────────────────────

function renderProfileMarkdown(data: ProfileData): string {
  const lines: string[] = [];

  lines.push(`# Student Profile: ${data.name}`);
  lines.push('');
  lines.push(`**Generated:** ${data.generatedDate}`);
  lines.push(`**Last Updated:** ${data.lastUpdated}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Personal');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| :---- | :---- |');
  lines.push(`| Full Name | ${data.name} |`);
  lines.push(`| Graduation Year | ${data.gradYear || 'Not provided'} |`);
  lines.push(`| High School | ${data.highSchool || 'Not provided'} |`);
  lines.push(`| Intended Majors / Tracks | ${data.intendedMajors.length > 0 ? data.intendedMajors.join(', ') : 'Not provided'} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Academic Record');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| :----- | :---- |');
  lines.push(`| GPA (Weighted) | ${data.gpaWeighted || 'Not provided'} |`);
  lines.push(`| GPA (Unweighted) | ${data.gpaUnweighted || 'Not provided'} |`);
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
  if (data.apScores.length === 0) lines.push('| — | — |');
  else for (const ap of data.apScores) lines.push(`| ${ap.subject} | ${ap.score} |`);
  lines.push('');
  lines.push('### IB Scores');
  lines.push('| Subject | Score |');
  lines.push('| :------ | :---- |');
  if (data.ibScores.length === 0) lines.push('| — | — |');
  else for (const ib of data.ibScores) lines.push(`| ${ib.subject} | ${ib.score} |`);
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

  return lines.join('\n');
}

// ─── Main menu (Level 1) ──────────────────────────────────────────────────────

async function mainMenu(slug: string, data: ProfileData): Promise<void> {
  const sections = Object.keys(SECTION_FIELDS);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const complete = allComplete(data.fieldStatus);
    const choices = [
      ...sections.map(s => `${s.padEnd(28)} ${sectionIndicator(s, data.fieldStatus)}`),
      { role: 'separator', value: '─────────────────────────────────────' },
      complete ? 'Finalize & Save' : 'Finalize & Save  (disabled — complete all sections first)',
      'Quit without saving',
    ];

    const choice = await ask({
      type: 'select',
      name: 'section',
      message: `Student Profile: ${data.name}`,
      choices,
    });

    if (choice === 'Quit without saving') {
      console.log('No changes saved to profile.md.');
      return;
    }

    if (choice === 'Finalize & Save') {
      if (!complete) {
        console.log('Please complete or skip all sections before finalizing.');
        continue;
      }
      data.lastUpdated = new Date().toISOString().split('T')[0];
      await saveJson(slug, data);
      console.log('Enhancing your profile...');
      const enhanced = await enhanceProfile(data);
      const markdown = renderProfileMarkdown(enhanced);
      await writeFile(mdPath(slug), markdown);
      console.log(`Profile saved: data/students/${slug}/profile.md`);
      return;
    }

    // Disabled finalize selected — ignore
    if (choice.startsWith('Finalize & Save  (disabled')) continue;

    // Section selected
    const section = sections.find(s => choice.startsWith(s));
    if (!section) continue;

    switch (section) {
      case 'Personal':             await sectionPersonal(slug, data); break;
      case 'Academics':            await sectionAcademics(slug, data); break;
      case 'Standardized Tests':   await sectionTests(slug, data); break;
      case 'Extracurriculars':     await sectionExtracurriculars(slug, data); break;
      case 'Awards & Recognitions': await sectionAwards(slug, data); break;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C02-F01, C02-F02] Build or resume a student profile via nested menu
export async function buildStudentProfile(nameSlug?: string): Promise<{ profilePath: string }> {
  let slug = nameSlug;
  let data: ProfileData;

  if (slug) {
    const jp = jsonPath(slug);
    if (await fileExists(jp)) {
      console.log('Resuming student profile...');
      data = JSON.parse(await readFile(jp)) as ProfileData;
    } else {
      // New profile — name not yet in data
      const nameInput = await ask({ type: 'input', name: 'name', message: 'Your full legal name:' });
      data = emptyProfile(nameInput.trim(), slug);
      data.name = nameInput.trim();
      await saveJson(slug, data);
    }
  } else {
    const nameInput = await ask({ type: 'input', name: 'name', message: 'Your full legal name:' });
    slug = toSlug(nameInput.trim());
    const jp = jsonPath(slug);
    if (await fileExists(jp)) {
      console.log('Resuming student profile...');
      data = JSON.parse(await readFile(jp)) as ProfileData;
    } else {
      console.log('Building student profile...');
      data = emptyProfile(nameInput.trim(), slug);
      await saveJson(slug, data);
    }
  }

  await mainMenu(slug, data);
  return { profilePath: mdPath(slug) };
}

// [C02-F03] Show stored student profile
export async function showStudentProfile(nameSlug: string): Promise<{ markdownPath: string }> {
  const markdownPath = mdPath(nameSlug);
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No profile found for "${nameSlug}". Run: ao --student-profile --build --name ${nameSlug}`);
  }
  const content = await readFile(markdownPath);
  console.log(content);
  return { markdownPath };
}

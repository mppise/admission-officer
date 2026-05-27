import React from 'react';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { workspacePath, getApiKey, getModel } from '../../config/bootstrap.js';
import { writeFile, readFile, fileExists } from '../../utils/fileUtils.js';
import { toSlug } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { waitForSelect, waitForText, dotLeader, type SelectItem } from '../../utils/tui.js';

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

interface ShadowingEntry {
  organization: string;
  field: string;
  hoursTotal: string;
  period: string;
  description: string;
}

interface ResearchEntry {
  projectTitle: string;
  institution: string;
  mentorName: string;
  period: string;
  hoursPerWeek: string;
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
  shadowing: ShadowingEntry[];
  research: ResearchEntry[];
  generatedDate: string;
  lastUpdated: string;
  fieldStatus: Record<string, FieldStatus>;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function jsonPath(slug: string): string {
  return workspacePath('students', slug, 'profile.json');
}

function mdPath(slug: string): string {
  return workspacePath('students', slug, 'profile.md');
}

// [C02-F05] Write profile.json after every field input
async function saveJson(slug: string, data: ProfileData): Promise<void> {
  await writeFile(jsonPath(slug), JSON.stringify(data, null, 2));
}

function emptyProfile(name: string): ProfileData {
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
    shadowing: [],
    research: [],
    generatedDate: now,
    lastUpdated: now,
    fieldStatus: {
      name: 'set',
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
      shadowing: 'pending',
      research: 'pending',
    },
  };
}

// ─── Completion helpers ───────────────────────────────────────────────────────

const SECTION_FIELDS: Record<string, string[]> = {
  Personal:                ['gradYear', 'highSchool', 'intendedMajors'],
  Academics:               ['gpaWeighted', 'gpaUnweighted', 'classRank', 'transcript'],
  'Standardized Tests':    ['satTotal', 'satMath', 'satReading', 'actComposite', 'apScores', 'ibScores'],
  Extracurriculars:        ['extracurriculars'],
  'Awards & Recognitions': ['awards'],
  'Shadowing Experiences': ['shadowing'],
  'Research Experiences':  ['research'],
};

function sectionIndicator(section: string, fs: Record<string, FieldStatus>): string {
  const fields = SECTION_FIELDS[section];
  const statuses = fields.map(f => fs[f]);
  if (statuses.every(s => s === 'set' || s === 'skipped')) return '✅ done';
  if (statuses.every(s => s === 'pending')) return '🔲 not started';
  const pending = statuses.filter(s => s === 'pending').length;
  return `⏳ ${pending} left`;
}

function allComplete(fs: Record<string, FieldStatus>): boolean {
  return Object.values(SECTION_FIELDS).flat().every(f => fs[f] === 'set' || fs[f] === 'skipped');
}

function fieldLabel(key: string, data: ProfileData): string {
  const s = data.fieldStatus[key];
  if (s === 'skipped') return '⏭  skipped';
  if (s === 'pending') return '🔲';
  switch (key) {
    case 'gradYear':          return `✅  ${data.gradYear}`;
    case 'highSchool':        return `✅  ${data.highSchool}`;
    case 'intendedMajors':    return `✅  ${data.intendedMajors.join(', ')}`;
    case 'gpaWeighted':       return `✅  ${data.gpaWeighted}`;
    case 'gpaUnweighted':     return `✅  ${data.gpaUnweighted}`;
    case 'classRank':         return `✅  ${data.classRank}`;
    case 'transcript':        return `📋  ${data.transcript.length} year${data.transcript.length !== 1 ? 's' : ''}`;
    case 'satTotal':          return `✅  ${data.sat.total}`;
    case 'satMath':           return `✅  ${data.sat.math}`;
    case 'satReading':        return `✅  ${data.sat.reading}`;
    case 'actComposite':      return `✅  ${data.act.composite}`;
    case 'apScores':          return `📋  ${data.apScores.length} subject${data.apScores.length !== 1 ? 's' : ''}`;
    case 'ibScores':          return `📋  ${data.ibScores.length} subject${data.ibScores.length !== 1 ? 's' : ''}`;
    case 'extracurriculars':  return `📋  ${data.extracurriculars.length} activit${data.extracurriculars.length !== 1 ? 'ies' : 'y'}`;
    case 'awards':            return `📋  ${data.awards.length} award${data.awards.length !== 1 ? 's' : ''}`;
    case 'shadowing':         return `📋  ${data.shadowing.length} entr${data.shadowing.length !== 1 ? 'ies' : 'y'}`;
    case 'research':          return `📋  ${data.research.length} entr${data.research.length !== 1 ? 'ies' : 'y'}`;
    default: return '✅';
  }
}

// ─── Scalar field editor ──────────────────────────────────────────────────────

async function editScalar(
  slug: string,
  data: ProfileData,
  key: string,
  prompt: string,
  current: string,
  skippable: boolean,
  subtitle: string,
): Promise<void> {
  if (skippable && current) {
    const action = await waitForSelect(
      [
        { label: `Keep: ${current}`, value: 'keep' },
        { label: 'Enter new value', value: 'edit' },
        { label: 'Skip this field', value: 'skip' },
      ],
      subtitle,
      data.name,
    );
    if (action === 'keep') return;
    if (action === 'skip') {
      data.fieldStatus[key] = 'skipped';
      await saveJson(slug, data);
      return;
    }
  } else if (skippable && !current) {
    const action = await waitForSelect(
      [
        { label: 'Enter value', value: 'edit' },
        { label: 'Skip this field', value: 'skip' },
      ],
      subtitle,
      data.name,
    );
    if (action === 'skip') {
      data.fieldStatus[key] = 'skipped';
      await saveJson(slug, data);
      return;
    }
  }

  const value = await waitForText(prompt, current, subtitle, data.name);
  if (value.trim()) {
    switch (key) {
      case 'gradYear':      data.gradYear = value.trim(); break;
      case 'highSchool':    data.highSchool = value.trim(); break;
      case 'gpaWeighted':   data.gpaWeighted = value.trim(); break;
      case 'gpaUnweighted': data.gpaUnweighted = value.trim(); break;
      case 'classRank':     data.classRank = value.trim(); break;
      case 'satTotal':      data.sat.total = value.trim(); break;
      case 'satMath':       data.sat.math = value.trim(); break;
      case 'satReading':    data.sat.reading = value.trim(); break;
      case 'actComposite':  data.act.composite = value.trim(); break;
    }
    data.fieldStatus[key] = 'set';
    await saveJson(slug, data);
  }
}

// ─── List editors ─────────────────────────────────────────────────────────────

async function editIntendedMajors(slug: string, data: ProfileData): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      ...data.intendedMajors.map((m, i) => ({ label: `${i + 1}. ${m}`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: 'Add major / track', value: 'add' },
      ...(data.intendedMajors.length > 0 ? [{ label: '✗  Remove a major / track', value: 'remove' }] : []),
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Personal › Intended Majors', data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'add') {
      const val = await waitForText('Major or track (e.g., Computer Science):', '', 'Personal › Add Major', data.name);
      if (val.trim()) {
        data.intendedMajors.push(val.trim());
        data.fieldStatus['intendedMajors'] = 'set';
        await saveJson(slug, data);
      }
    } else if (choice === 'remove') {
      const removeItems = data.intendedMajors.map((m, i) => ({ label: m, value: String(i) }));
      removeItems.push({ label: '←  Back', value: 'back' });
      const idxStr = await waitForSelect(removeItems, 'Personal › Remove Major', data.name);
      if (idxStr !== 'back') {
        const idx = parseInt(idxStr);
        data.intendedMajors.splice(idx, 1);
        data.fieldStatus['intendedMajors'] = data.intendedMajors.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    } else if (choice.startsWith('entry:')) {
      // existing entry selected — offer remove
      const idx = parseInt(choice.split(':')[1]);
      const action = await waitForSelect(
        [{ label: '✗  Remove this entry', value: 'remove' }, { label: '←  Back', value: 'back' }],
        `Personal › Major: ${data.intendedMajors[idx]}`,
        data.name,
      );
      if (action === 'remove') {
        data.intendedMajors.splice(idx, 1);
        data.fieldStatus['intendedMajors'] = data.intendedMajors.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function editTranscript(slug: string, data: ProfileData): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      ...data.transcript.map((y, i) => ({
        label: `${i + 1}. ${y.yearLabel} (${y.courses.length} course${y.courses.length !== 1 ? 's' : ''})`,
        value: `year:${i}`,
      })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add year', value: 'add' },
      ...(data.transcript.length > 0 ? [{ label: '✗  Remove a year', value: 'remove' }] : []),
      { label: '⏭  Skip transcript', value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Academics › Transcript', data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus['transcript'] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const yearLabel = await waitForText('Year label (e.g., "9th Grade"):', '', 'Academics › Add Year', data.name);
      if (!yearLabel.trim()) continue;
      const courses: Array<{ name: string; grade: string }> = [];
      while (true) {
        const courseName = await waitForText('Course name (blank to finish):', '', `Academics › ${yearLabel} › Courses`, data.name);
        if (!courseName.trim()) break;
        const grade = await waitForText('Letter grade:', '', `Academics › ${yearLabel} › ${courseName}`, data.name);
        courses.push({ name: courseName.trim(), grade: grade.trim() });
      }
      if (courses.length > 0) {
        data.transcript = data.transcript.filter(y => y.yearLabel !== yearLabel.trim());
        data.transcript.push({ yearLabel: yearLabel.trim(), courses });
        data.fieldStatus['transcript'] = 'set';
        await saveJson(slug, data);
      }
    } else if (choice === 'remove') {
      const removeItems = data.transcript.map((y, i) => ({ label: y.yearLabel, value: String(i) }));
      removeItems.push({ label: '←  Back', value: 'back' });
      const idxStr = await waitForSelect(removeItems, 'Academics › Remove Year', data.name);
      if (idxStr !== 'back') {
        data.transcript.splice(parseInt(idxStr), 1);
        data.fieldStatus['transcript'] = data.transcript.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    } else if (choice.startsWith('year:')) {
      const idx = parseInt(choice.split(':')[1]);
      const year = data.transcript[idx];
      if (!year) continue;
      await editCourses(slug, data, year);
    }
  }
}

async function editCourses(slug: string, data: ProfileData, year: TranscriptYear): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      ...year.courses.map((c, i) => ({ label: `${i + 1}. ${c.name} — ${c.grade}`, value: `course:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add course', value: 'add' },
      ...(year.courses.length > 0 ? [{ label: '✗  Remove a course', value: 'remove' }] : []),
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, `Academics › ${year.yearLabel} › Courses`, data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'add') {
      const name = await waitForText('Course name:', '', `Academics › ${year.yearLabel} › Add Course`, data.name);
      if (!name.trim()) continue;
      const grade = await waitForText('Letter grade:', '', `Academics › ${year.yearLabel} › ${name}`, data.name);
      year.courses.push({ name: name.trim(), grade: grade.trim() });
      await saveJson(slug, data);
    } else if (choice === 'remove') {
      const removeItems = year.courses.map((c, i) => ({ label: `${c.name} — ${c.grade}`, value: String(i) }));
      removeItems.push({ label: '←  Back', value: 'back' });
      const idxStr = await waitForSelect(removeItems, `Academics › ${year.yearLabel} › Remove Course`, data.name);
      if (idxStr !== 'back') {
        year.courses.splice(parseInt(idxStr), 1);
        await saveJson(slug, data);
      }
    } else if (choice.startsWith('course:')) {
      const idx = parseInt(choice.split(':')[1]);
      const course = year.courses[idx];
      if (!course) continue;
      const newName = await waitForText('Course name:', course.name, `Academics › ${year.yearLabel} › Edit`, data.name);
      const newGrade = await waitForText('Letter grade:', course.grade, `Academics › ${year.yearLabel} › Edit`, data.name);
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
  label: string,
  scoreLabel: string,
  subtitle: string,
): Promise<void> {
  const list = data[key];
  while (true) {
    const items: SelectItem[] = [
      ...list.map((s, i) => ({ label: `${i + 1}. ${s.subject} — ${s.score}`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: `＋  Add ${label}`, value: 'add' },
      ...(list.length > 0 ? [{ label: `✗  Remove a ${label}`, value: 'remove' }] : []),
      { label: `⏭  Skip ${label}`, value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, subtitle, data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus[key] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const subject = await waitForText(`${label} subject:`, '', `${subtitle} › Add`, data.name);
      if (!subject.trim()) continue;
      const score = await waitForText(`${scoreLabel}:`, '', `${subtitle} › ${subject}`, data.name);
      list.push({ subject: subject.trim(), score: score.trim() });
      data.fieldStatus[key] = 'set';
      await saveJson(slug, data);
    } else if (choice === 'remove') {
      const removeItems = list.map((s, i) => ({ label: `${s.subject} — ${s.score}`, value: String(i) }));
      removeItems.push({ label: '←  Back', value: 'back' });
      const idxStr = await waitForSelect(removeItems, `${subtitle} › Remove`, data.name);
      if (idxStr !== 'back') {
        list.splice(parseInt(idxStr), 1);
        data.fieldStatus[key] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    } else if (choice.startsWith('entry:')) {
      const idx = parseInt(choice.split(':')[1]);
      const entry = list[idx];
      if (!entry) continue;
      const newSubject = await waitForText(`${label} subject:`, entry.subject, `${subtitle} › Edit`, data.name);
      const newScore = await waitForText(`${scoreLabel}:`, entry.score, `${subtitle} › Edit`, data.name);
      if (newSubject.trim()) entry.subject = newSubject.trim();
      if (newScore.trim()) entry.score = newScore.trim();
      await saveJson(slug, data);
    }
  }
}

async function editExtracurriculars(slug: string, data: ProfileData): Promise<void> {
  const list = data.extracurriculars;
  while (true) {
    const items: SelectItem[] = [
      ...list.map((e, i) => ({ label: `${i + 1}. ${e.activityName} — ${e.role}`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add activity', value: 'add' },
      { label: '⏭  Skip extracurriculars', value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Extracurriculars', data.name, undefined, HINTS.extracurriculars);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus['extracurriculars'] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const entry = await collectActivityEntry(data.name);
      list.push(entry);
      data.fieldStatus['extracurriculars'] = 'set';
      await saveJson(slug, data);
    } else if (choice.startsWith('entry:')) {
      const idx = parseInt(choice.split(':')[1]);
      const existing = list[idx];
      if (!existing) continue;
      const action = await waitForSelect(
        [{ label: '✏️  Edit', value: 'edit' }, { label: '✗  Remove', value: 'remove' }, { label: '←  Back', value: 'back' }],
        `Extracurriculars › ${existing.activityName}`,
        data.name,
      );
      if (action === 'edit') {
        list[idx] = await collectActivityEntry(data.name, existing);
        await saveJson(slug, data);
      } else if (action === 'remove') {
        list.splice(idx, 1);
        data.fieldStatus['extracurriculars'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectActivityEntry(studentName: string, existing?: Extracurricular): Promise<Extracurricular> {
  const activityName = await waitForText('Activity name:', existing?.activityName ?? '', 'Extracurriculars › Activity Name', studentName, HINTS.activityName);
  const role = await waitForText('Your role or position (e.g., Captain, Treasurer, Member):', existing?.role ?? '', 'Extracurriculars › Role', studentName);
  const yearsInvolved = await waitForText('Years involved (e.g., 2021–2024):', existing?.yearsInvolved ?? '', 'Extracurriculars › Years Involved', studentName);
  const hoursPerWeek = await waitForText('Approximate hours per week:', existing?.hoursPerWeek ?? '', 'Extracurriculars › Hours/Week', studentName);
  const description = await waitForText('Your specific impact in one sentence:', existing?.description ?? '', 'Extracurriculars › Description', studentName, HINTS.ecDescription);
  return {
    activityName: activityName.trim(),
    role: role.trim(),
    yearsInvolved: yearsInvolved.trim(),
    hoursPerWeek: hoursPerWeek.trim(),
    description: description.trim(),
  };
}

async function editAwards(slug: string, data: ProfileData): Promise<void> {
  const list = data.awards;
  while (true) {
    const items: SelectItem[] = [
      ...list.map((a, i) => ({ label: `${i + 1}. ${a.awardName} — ${a.level} (${a.year})`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add award', value: 'add' },
      { label: '⏭  Skip awards', value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Awards & Recognitions', data.name, undefined, HINTS.awards);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus['awards'] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const entry = await collectAwardEntry(data.name);
      list.push(entry);
      data.fieldStatus['awards'] = 'set';
      await saveJson(slug, data);
    } else if (choice.startsWith('entry:')) {
      const idx = parseInt(choice.split(':')[1]);
      const existing = list[idx];
      if (!existing) continue;
      const action = await waitForSelect(
        [{ label: '✏️  Edit', value: 'edit' }, { label: '✗  Remove', value: 'remove' }, { label: '←  Back', value: 'back' }],
        `Awards › ${existing.awardName}`,
        data.name,
      );
      if (action === 'edit') {
        list[idx] = await collectAwardEntry(data.name, existing);
        await saveJson(slug, data);
      } else if (action === 'remove') {
        list.splice(idx, 1);
        data.fieldStatus['awards'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectAwardEntry(studentName: string, existing?: Award): Promise<Award> {
  const awardName = await waitForText('Award or recognition name:', existing?.awardName ?? '', 'Awards › Award Name', studentName);
  const level = await waitForSelect(
    ['Local', 'Regional', 'State', 'National', 'International'].map(l => ({ label: l, value: l })),
    'Awards › Level',
    studentName,
    undefined,
    'Select the broadest reach of this award.',
  );
  const year = await waitForText('Year received:', existing?.year ?? '', 'Awards › Year', studentName);
  const description = await waitForText('What was this award for? (one sentence):', existing?.description ?? '', 'Awards › Description', studentName, HINTS.awardDescription);
  return { awardName: awardName.trim(), level, year: year.trim(), description: description.trim() };
}

// [C02-F06] Shadowing experiences list editor
async function editShadowing(slug: string, data: ProfileData): Promise<void> {
  const list = data.shadowing;
  while (true) {
    const items: SelectItem[] = [
      ...list.map((s, i) => ({ label: `${i + 1}. ${s.organization} — ${s.field}`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add shadowing experience', value: 'add' },
      { label: '⏭  Skip shadowing experiences', value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Shadowing Experiences', data.name, undefined, HINTS.shadowing);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus['shadowing'] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const entry = await collectShadowingEntry(data.name);
      list.push(entry);
      data.fieldStatus['shadowing'] = 'set';
      await saveJson(slug, data);
    } else if (choice.startsWith('entry:')) {
      const idx = parseInt(choice.split(':')[1]);
      const existing = list[idx];
      if (!existing) continue;
      const action = await waitForSelect(
        [{ label: '✏️  Edit', value: 'edit' }, { label: '✗  Remove', value: 'remove' }, { label: '←  Back', value: 'back' }],
        `Shadowing › ${existing.organization}`,
        data.name,
      );
      if (action === 'edit') {
        list[idx] = await collectShadowingEntry(data.name, existing);
        await saveJson(slug, data);
      } else if (action === 'remove') {
        list.splice(idx, 1);
        data.fieldStatus['shadowing'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectShadowingEntry(studentName: string, existing?: ShadowingEntry): Promise<ShadowingEntry> {
  const organization = await waitForText('Where did you shadow? (hospital, firm, lab, etc.):', existing?.organization ?? '', 'Shadowing › Organization', studentName);
  const field = await waitForText('Specialty or field (e.g., Cardiology, Environmental Law):', existing?.field ?? '', 'Shadowing › Field', studentName);

  const hourChoice = await waitForSelect(
    [{ label: 'Enter total hours', value: 'enter' }, { label: 'Skip total hours', value: 'skip' }],
    'Shadowing › Total Hours',
    studentName,
    undefined,
    'Total hours across all visits, not per week.',
  );
  const hoursTotal = hourChoice === 'enter'
    ? (await waitForText('Total hours logged (e.g., 40):', existing?.hoursTotal ?? '', 'Shadowing › Total Hours', studentName)).trim()
    : '';

  const period = await waitForText('When did this take place? (e.g., Summer 2023):', existing?.period ?? '', 'Shadowing › Period', studentName);
  const description = await waitForText('What did you observe or do? (one sentence):', existing?.description ?? '', 'Shadowing › Description', studentName, HINTS.shadowDescription);
  return {
    organization: organization.trim(),
    field: field.trim(),
    hoursTotal,
    period: period.trim(),
    description: description.trim(),
  };
}

// [C02-F07] Research experiences list editor
async function editResearch(slug: string, data: ProfileData): Promise<void> {
  const list = data.research;
  while (true) {
    const items: SelectItem[] = [
      ...list.map((r, i) => ({ label: `${i + 1}. ${r.projectTitle} — ${r.institution}`, value: `entry:${i}` })),
      { label: '', value: '__sep__', separator: true },
      { label: '＋  Add research experience', value: 'add' },
      { label: '⏭  Skip research experiences', value: 'skip' },
      { label: '←  Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Research Experiences', data.name, undefined, HINTS.research);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      data.fieldStatus['research'] = 'skipped';
      await saveJson(slug, data);
      break;
    }
    if (choice === 'add') {
      const entry = await collectResearchEntry(data.name);
      list.push(entry);
      data.fieldStatus['research'] = 'set';
      await saveJson(slug, data);
    } else if (choice.startsWith('entry:')) {
      const idx = parseInt(choice.split(':')[1]);
      const existing = list[idx];
      if (!existing) continue;
      const action = await waitForSelect(
        [{ label: '✏️  Edit', value: 'edit' }, { label: '✗  Remove', value: 'remove' }, { label: '←  Back', value: 'back' }],
        `Research › ${existing.projectTitle}`,
        data.name,
      );
      if (action === 'edit') {
        list[idx] = await collectResearchEntry(data.name, existing);
        await saveJson(slug, data);
      } else if (action === 'remove') {
        list.splice(idx, 1);
        data.fieldStatus['research'] = list.length > 0 ? 'set' : 'pending';
        await saveJson(slug, data);
      }
    }
  }
}

async function collectResearchEntry(studentName: string, existing?: ResearchEntry): Promise<ResearchEntry> {
  const projectTitle = await waitForText('Project title or brief name:', existing?.projectTitle ?? '', 'Research › Project Title', studentName);
  const institution = await waitForText('Institution, lab, or "Independent":', existing?.institution ?? '', 'Research › Institution', studentName);

  const mentorChoice = await waitForSelect(
    [{ label: 'Enter mentor name', value: 'enter' }, { label: 'Skip mentor name', value: 'skip' }],
    'Research › Mentor',
    studentName,
    undefined,
    'Skip if self-directed or if you prefer not to name them.',
  );
  const mentorName = mentorChoice === 'enter'
    ? (await waitForText('Mentor or PI name:', existing?.mentorName ?? '', 'Research › Mentor Name', studentName)).trim()
    : '';

  const period = await waitForText('When did this take place? (e.g., June–August 2024):', existing?.period ?? '', 'Research › Period', studentName);

  const hpwChoice = await waitForSelect(
    [{ label: 'Enter hours per week', value: 'enter' }, { label: 'Skip hours per week', value: 'skip' }],
    'Research › Hours/Week',
    studentName,
    undefined,
    'Approximate average — skip if highly variable.',
  );
  const hoursPerWeek = hpwChoice === 'enter'
    ? (await waitForText('Approximate hours per week:', existing?.hoursPerWeek ?? '', 'Research › Hours/Week', studentName)).trim()
    : '';

  const description = await waitForText('Your role and key contribution (one sentence):', existing?.description ?? '', 'Research › Description', studentName, HINTS.researchDescription);
  return {
    projectTitle: projectTitle.trim(),
    institution: institution.trim(),
    mentorName,
    period: period.trim(),
    hoursPerWeek,
    description: description.trim(),
  };
}

// ─── Section guidance hints ───────────────────────────────────────────────────

const HINTS = {
  extracurriculars: 'Clubs, sports, jobs, volunteering — recurring commitments outside class. Not competitions or one-off recognition (use Awards), shadowing, or research.',
  awards:           'Competitions won, scholarships, honor societies, or formal recognition. Not everyday participation — use Extracurriculars for that.',
  shadowing:        'Observing a professional at work — clinical, legal, research, or any field. You watched and learned; you did not lead a project (use Research for that).',
  research:         'A project where you investigated a question, collected or analysed data, or built something with intellectual intent — with a mentor or independently.',
  activityName:     'Use the official name, e.g. "Varsity Soccer" or "Model United Nations".',
  ecDescription:    'Describe your specific contribution or impact, not just your title. What changed because you were there?',
  awardDescription: 'What was the award for and why does it matter to you? Keep it factual.',
  shadowDescription:'What did you observe or do? Include the specialty and what you took away from it.',
  researchDescription: 'What was your specific role? What did you find, build, or contribute?',
};

async function sectionPersonal(slug: string, data: ProfileData): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      { label: dotLeader('Graduation Year',          fieldLabel('gradYear', data),        26), value: 'gradYear' },
      { label: dotLeader('High School',              fieldLabel('highSchool', data),       26), value: 'highSchool' },
      { label: dotLeader('Intended Majors / Tracks', fieldLabel('intendedMajors', data),   26), value: 'intendedMajors' },
      { label: '', value: '__sep__', separator: true },
      { label: '⏭   Skip entire section', value: 'skip' },
      { label: '←   Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Personal', data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      for (const f of SECTION_FIELDS['Personal']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }
    if (choice === 'gradYear') await editScalar(slug, data, 'gradYear', 'Expected graduation year (e.g., 2026):', data.gradYear, false, 'Personal › Graduation Year');
    else if (choice === 'highSchool') await editScalar(slug, data, 'highSchool', 'High school name:', data.highSchool, false, 'Personal › High School');
    else if (choice === 'intendedMajors') await editIntendedMajors(slug, data);
  }
}

async function sectionAcademics(slug: string, data: ProfileData): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      { label: dotLeader('GPA (Weighted)',   fieldLabel('gpaWeighted', data),   26), value: 'gpaWeighted' },
      { label: dotLeader('GPA (Unweighted)', fieldLabel('gpaUnweighted', data), 26), value: 'gpaUnweighted' },
      { label: dotLeader('Class Rank',       fieldLabel('classRank', data),     26), value: 'classRank' },
      { label: dotLeader('Transcript',       fieldLabel('transcript', data),    26), value: 'transcript' },
      { label: '', value: '__sep__', separator: true },
      { label: '⏭   Skip entire section', value: 'skip' },
      { label: '←   Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Academics', data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      for (const f of SECTION_FIELDS['Academics']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }
    if (choice === 'gpaWeighted') await editScalar(slug, data, 'gpaWeighted', 'Weighted GPA (e.g., 4.3):', data.gpaWeighted, false, 'Academics › GPA (Weighted)');
    else if (choice === 'gpaUnweighted') await editScalar(slug, data, 'gpaUnweighted', 'Unweighted GPA (e.g., 3.9):', data.gpaUnweighted, false, 'Academics › GPA (Unweighted)');
    else if (choice === 'classRank') await editScalar(slug, data, 'classRank', 'Class rank (e.g., "12 of 450"):', data.classRank, true, 'Academics › Class Rank');
    else if (choice === 'transcript') await editTranscript(slug, data);
  }
}

async function sectionTests(slug: string, data: ProfileData): Promise<void> {
  while (true) {
    const items: SelectItem[] = [
      { label: dotLeader('SAT Total',           fieldLabel('satTotal', data),      26), value: 'satTotal' },
      { label: dotLeader('SAT Math',            fieldLabel('satMath', data),       26), value: 'satMath' },
      { label: dotLeader('SAT Reading/Writing', fieldLabel('satReading', data),    26), value: 'satReading' },
      { label: dotLeader('ACT Composite',       fieldLabel('actComposite', data),  26), value: 'actComposite' },
      { label: dotLeader('AP Scores',           fieldLabel('apScores', data),      26), value: 'apScores' },
      { label: dotLeader('IB Scores',           fieldLabel('ibScores', data),      26), value: 'ibScores' },
      { label: '', value: '__sep__', separator: true },
      { label: '⏭   Skip entire section', value: 'skip' },
      { label: '←   Back', value: 'back' },
    ];
    const choice = await waitForSelect(items, 'Standardized Tests', data.name);
    if (choice === 'back' || choice === '__sep__') break;

    if (choice === 'skip') {
      for (const f of SECTION_FIELDS['Standardized Tests']) {
        if (data.fieldStatus[f] === 'pending') data.fieldStatus[f] = 'skipped';
      }
      await saveJson(slug, data);
      break;
    }
    if (choice === 'satTotal') await editScalar(slug, data, 'satTotal', 'SAT Total score (e.g., 1520):', data.sat.total, true, 'Standardized Tests › SAT Total');
    else if (choice === 'satMath') await editScalar(slug, data, 'satMath', 'SAT Math score:', data.sat.math, true, 'Standardized Tests › SAT Math');
    else if (choice === 'satReading') await editScalar(slug, data, 'satReading', 'SAT Reading & Writing score:', data.sat.reading, true, 'Standardized Tests › SAT Reading');
    else if (choice === 'actComposite') await editScalar(slug, data, 'actComposite', 'ACT Composite score (e.g., 34):', data.act.composite, true, 'Standardized Tests › ACT Composite');
    else if (choice === 'apScores') await editScorePairs(slug, data, 'apScores', 'AP Scores', 'Score (1–5)', 'Standardized Tests › AP Scores');
    else if (choice === 'ibScores') await editScorePairs(slug, data, 'ibScores', 'IB Scores', 'Predicted/Final score', 'Standardized Tests › IB Scores');
  }
}

// ─── LLM Enhancement (C02-F04) ───────────────────────────────────────────────

async function enhanceProfile(data: ProfileData): Promise<ProfileData> {
  const apiKey = getApiKey();
  const modelName = getModel();
  if (!apiKey || !modelName) throw new Error('Gemini API key or model not configured. Go to Config to set them.');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.2 } });
  const prompt = await loadPrompt('c02-profile-enhance', { PROFILE_JSON: JSON.stringify(data, null, 2) });

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
  lines.push('## Shadowing Experiences');
  lines.push('');
  if (data.shadowing.length === 0) {
    lines.push('*No shadowing experiences added.*');
  } else {
    lines.push('| Organization | Field | Hours | Period | Description |');
    lines.push('| :----------- | :---- | :---- | :----- | :---------- |');
    for (const sh of data.shadowing) {
      lines.push(`| ${sh.organization} | ${sh.field} | ${sh.hoursTotal || '—'} | ${sh.period} | ${sh.description} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Research Experiences');
  lines.push('');
  if (data.research.length === 0) {
    lines.push('*No research experiences added.*');
  } else {
    lines.push('| Project | Institution | Mentor | Period | Hrs/Week | Description |');
    lines.push('| :------ | :---------- | :----- | :----- | :------- | :---------- |');
    for (const re of data.research) {
      lines.push(`| ${re.projectTitle} | ${re.institution} | ${re.mentorName || '—'} | ${re.period} | ${re.hoursPerWeek || '—'} | ${re.description} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ─── Main menu (Level 1) ──────────────────────────────────────────────────────

// [C02-F01, C02-F02] Full-screen ink main menu
async function mainMenu(slug: string, data: ProfileData): Promise<void> {
  const sections = Object.keys(SECTION_FIELDS);

  while (true) {
    const complete = allComplete(data.fieldStatus);
    const pendingSections = sections.filter(s => sectionIndicator(s, data.fieldStatus) !== '✅ done').length;
    const completionPill = pendingSections === 0
      ? '✅ all sections complete'
      : `⏳ ${pendingSections} section${pendingSections > 1 ? 's' : ''} left`;

    const items: SelectItem[] = [
      ...sections.map(s => ({
        label: dotLeader(s, sectionIndicator(s, data.fieldStatus), 30),
        value: s,
      })),
      { label: '', value: '__sep__', separator: true },
      {
        label: complete
          ? '🚀  Finalize & Save'
          : '🔒  Finalize & Save  (complete all sections first)',
        value: 'finalize',
      },
      { label: '✗   Quit without saving', value: 'quit' },
    ];

    const choice = await waitForSelect(items, 'Student Profile', data.name, completionPill);

    if (choice === '__sep__') continue;

    if (choice === 'quit') {
      console.log('No changes saved to profile.md.');
      return;
    }

    if (choice === 'finalize') {
      if (!complete) continue;
      data.lastUpdated = new Date().toISOString().split('T')[0];
      await saveJson(slug, data);
      console.log('Enhancing your profile...');
      const enhanced = await enhanceProfile(data);
      const markdown = renderProfileMarkdown(enhanced);
      await writeFile(mdPath(slug), markdown);
      console.log(`Profile saved: data/students/${slug}/profile.md`);
      return;
    }

    switch (choice) {
      case 'Personal':              await sectionPersonal(slug, data); break;
      case 'Academics':             await sectionAcademics(slug, data); break;
      case 'Standardized Tests':    await sectionTests(slug, data); break;
      case 'Extracurriculars':      await editExtracurriculars(slug, data); break;
      case 'Awards & Recognitions': await editAwards(slug, data); break;
      case 'Shadowing Experiences': await editShadowing(slug, data); break;
      case 'Research Experiences':  await editResearch(slug, data); break;
    }
  }
}

// Merge a parsed (possibly legacy) profile.json over a fresh emptyProfile shape
// so any fields absent from older saves take their empty defaults. Heals files
// written before later schema additions (e.g., F06 shadowing, F07 research).
function migrateProfile(parsed: Partial<ProfileData>): ProfileData {
  const base = emptyProfile(parsed.name ?? '');
  return {
    ...base,
    ...parsed,
    sat: { ...base.sat, ...(parsed.sat ?? {}) },
    act: { ...base.act, ...(parsed.act ?? {}) },
    fieldStatus: { ...base.fieldStatus, ...(parsed.fieldStatus ?? {}) },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C02-F01, C02-F02] Build or resume a student profile via full-screen ink menu
export async function buildStudentProfile(nameSlug?: string): Promise<{ profilePath: string; studentSlug: string }> {
  let slug = nameSlug;
  let data: ProfileData;

  if (slug) {
    const jp = jsonPath(slug);
    if (await fileExists(jp)) {
      console.log('Resuming student profile...');
      data = migrateProfile(JSON.parse(await readFile(jp)) as Partial<ProfileData>);
    } else {
      const nameInput = await waitForText('Your full legal name:', '', 'Student Profile', '');
      data = emptyProfile(nameInput.trim());
      data.name = nameInput.trim();
      await saveJson(slug, data);
    }
  } else {
    const nameInput = await waitForText('Your full legal name:', '', 'Student Profile', '');
    slug = toSlug(nameInput.trim());
    const jp = jsonPath(slug);
    if (await fileExists(jp)) {
      console.log('Resuming student profile...');
      data = migrateProfile(JSON.parse(await readFile(jp)) as Partial<ProfileData>);
    } else {
      console.log('Building student profile...');
      data = emptyProfile(nameInput.trim());
      await saveJson(slug, data);
    }
  }

  await mainMenu(slug, data);
  return { profilePath: mdPath(slug), studentSlug: slug };
}

// [C02-F03] Show stored student profile
export async function showStudentProfile(nameSlug: string): Promise<{ markdownPath: string }> {
  const markdownPath = mdPath(nameSlug);
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No profile found for "${nameSlug}". Build a student profile first.`);
  }
  const content = await readFile(markdownPath);
  process.stdout.write(content + '\n');
  return { markdownPath };
}

// [C02-F08] Delete student directory
export async function deleteStudentProfile(nameSlug: string): Promise<void> {
  const dir = workspacePath('students', nameSlug);
  await fs.rm(dir, { recursive: true, force: true });
}

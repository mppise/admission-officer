#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { promises as fs } from 'fs';

import { bootstrap, workspacePath, getApiKey, getModel, saveConfig, ConfigValidationError } from '../../config/bootstrap.js';
import { buildStudentProfile, deleteStudentProfile } from '../c02-student-profile/index.js';
import { buildUniversityProfile, deleteUniversityProfile } from '../c03-university-profile/index.js';
import { buildGuidance, showGuidance, listGuidance } from '../c04-guidance-engine/index.js';
import { buildEssay, showEssay, listEssays } from '../c05-essay-advisor/index.js';
import { exportToPdf } from '../c06-pdf-exporter/index.js';
import { AppScreen, SpaciousSelect, waitForText } from '../../utils/tui.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTimestamp(): string {
  const now = new Date();
  return (
    now.getFullYear() +
    '-' + String(now.getMonth() + 1).padStart(2, '0') +
    '-' + String(now.getDate()).padStart(2, '0') +
    '-' + String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0')
  );
}

function formatTimestamp(ts: string): string {
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/);
  if (!m) return ts;
  return `${m[1]} ${m[2]}:${m[3]}`;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
}

function maskApiKey(key: string | undefined): string {
  if (!key) return '(not configured)';
  if (key.length <= 4) return '•'.repeat(key.length);
  return '•'.repeat(key.length - 4) + key.slice(-4);
}

// ─── Ink screen helper ────────────────────────────────────────────────────────
// Renders a SpaciousSelect menu and resolves with the selected value.

function showMenu(
  items: Array<{ label: string; value: string; separator?: boolean }>,
  subtitle: string,
  contextLine?: string,
  errorMsg?: string,
): Promise<string> {
  return new Promise(resolve => {
    let resolved = false;
    function MenuScreen() {
      const [, bump] = useState(0);
      void bump;
      return (
        <AppScreen subtitle={subtitle} contextLine={contextLine}>
          {errorMsg && (
            <Box paddingX={5} paddingBottom={1}>
              <Text color="red">  ⚠ {errorMsg}</Text>
            </Box>
          )}
          <SpaciousSelect
            items={items}
            onSelect={val => {
              if (!resolved) {
                resolved = true;
                resolve(val);
              }
            }}
          />
        </AppScreen>
      );
    }
    render(<MenuScreen />);
  });
}

// ─── Navigation state ─────────────────────────────────────────────────────────

interface Nav {
  studentSlug: string | undefined;
  universitySlug: string | undefined;
}

function ctx(nav: Nav): string | undefined {
  if (!nav.studentSlug) return undefined;
  if (nav.universitySlug) return `${nav.studentSlug} › ${nav.universitySlug}`;
  return nav.studentSlug;
}

// ─── Screen functions (imperative async) ─────────────────────────────────────

async function screenStudentSelect(nav: Nav, error?: string): Promise<Nav> {
  const students = await listDir(workspacePath('students'));
  const items = [
    ...students.map(s => ({ label: s, value: s })),
    ...(students.length > 0 ? [{ label: '──────────────────────', value: '', separator: true }] : []),
    { label: 'New Student', value: '__new' },
    { label: 'Config', value: '__config' },
  ];
  const val = await showMenu(items, 'Select Student', undefined, error);

  if (val === '__config') {
    return screenConfig(nav);
  }
  if (val === '__new') {
    const { studentSlug } = await buildStudentProfile();
    return screenStudentContext({ ...nav, studentSlug }, undefined);
  }
  return screenStudentContext({ ...nav, studentSlug: val }, undefined);
}

async function screenConfig(nav: Nav, error?: string): Promise<Nav> {
  const maskedKey = maskApiKey(getApiKey());
  const currentModel = getModel() ?? '(not set)';
  const items = [
    { label: `Edit API Key   ${maskedKey}`, value: '__edit-key' },
    { label: `Edit Model     ${currentModel}`, value: '__edit-model' },
    { label: '──────────────────────', value: '', separator: true },
    { label: 'Save & Return', value: '__save' },
    { label: 'Cancel', value: '__back' },
  ];
  const val = await showMenu(items, 'Config', undefined, error);

  if (val === '__back') return screenStudentSelect(nav);
  if (val === '__edit-key') {
    const newKey = await waitForText('Gemini API Key:', getApiKey() ?? '', 'Config › Edit API Key');
    try {
      await saveConfig(newKey.trim(), getModel() ?? '');
    } catch (err) {
      // Partial save — will be caught at __save time; just update in-memory for display
    }
    process.env.GEMINI_API_KEY = newKey.trim();
    return screenConfig(nav);
  }
  if (val === '__edit-model') {
    const newModel = await waitForText('Gemini Model:', getModel() ?? '', 'Config › Edit Model');
    process.env.GEMINI_MODEL = newModel.trim();
    return screenConfig(nav);
  }
  if (val === '__save') {
    try {
      await saveConfig(getApiKey() ?? '', getModel() ?? '');
      return screenStudentSelect(nav);
    } catch (err) {
      const msg = err instanceof ConfigValidationError ? err.message : String(err);
      return screenConfig(nav, msg);
    }
  }
  return screenStudentSelect(nav);
}

async function screenStudentContext(nav: Nav, error?: string): Promise<Nav> {
  const universities = await listDir(workspacePath('students', nav.studentSlug!, 'universities'));
  const items = [
    ...universities.map(u => ({ label: u, value: u })),
    ...(universities.length > 0 ? [{ label: '──────────────────────', value: '', separator: true }] : []),
    { label: 'New University', value: '__new-uni' },
    { label: '──────────────────────', value: '', separator: true },
    { label: 'Update Profile', value: '__update' },
    { label: 'Delete Profile', value: '__delete' },
    { label: 'Back', value: '__back' },
  ];
  const val = await showMenu(items, 'Student', ctx(nav), error);

  if (val === '__back') return screenStudentSelect({ studentSlug: undefined, universitySlug: undefined });
  if (val === '__update') {
    await buildStudentProfile(nav.studentSlug);
    return screenStudentContext(nav);
  }
  if (val === '__delete') return screenDeleteStudent(nav);
  if (val === '__new-uni') return screenDomainPrompt(nav, 'build');
  return screenUniversityContext({ ...nav, universitySlug: val });
}

async function screenDeleteStudent(nav: Nav): Promise<Nav> {
  const items = [
    { label: `Yes, delete "${nav.studentSlug}" permanently`, value: 'yes' },
    { label: 'No, go back', value: 'no' },
  ];
  const val = await showMenu(items, 'Delete Student Profile?', ctx(nav));
  if (val === 'yes') {
    await deleteStudentProfile(nav.studentSlug!);
    return screenStudentSelect({ studentSlug: undefined, universitySlug: undefined });
  }
  return screenStudentContext(nav);
}

async function screenUniversityContext(nav: Nav, error?: string): Promise<Nav> {
  const items = [
    { label: 'Guidance', value: '__guidance' },
    { label: 'Essay', value: '__essay' },
    { label: '──────────────────────', value: '', separator: true },
    { label: 'Update University', value: '__update' },
    { label: 'Delete University', value: '__delete' },
    { label: 'Back', value: '__back' },
  ];
  const val = await showMenu(items, 'University', ctx(nav), error);

  if (val === '__back') return screenStudentContext({ ...nav, universitySlug: undefined });
  if (val === '__update') return screenDomainPrompt(nav, 'update');
  if (val === '__delete') return screenDeleteUniversity(nav);
  if (val === '__guidance') return screenGuidanceList(nav);
  if (val === '__essay') return screenEssayList(nav);
  return screenUniversityContext(nav);
}

async function screenDeleteUniversity(nav: Nav): Promise<Nav> {
  const items = [
    { label: `Yes, delete "${nav.universitySlug}" permanently`, value: 'yes' },
    { label: 'No, go back', value: 'no' },
  ];
  const val = await showMenu(items, 'Delete University?', ctx(nav));
  if (val === 'yes') {
    await deleteUniversityProfile(nav.studentSlug!, nav.universitySlug!);
    return screenStudentContext({ ...nav, universitySlug: undefined });
  }
  return screenUniversityContext(nav);
}

async function screenDomainPrompt(nav: Nav, purpose: 'build' | 'update'): Promise<Nav> {
  const subtitle = purpose === 'update' ? 'Update University' : 'Add University';
  if (!getApiKey()) {
    return screenStudentContext(nav, 'Gemini API key not configured. Go to Config to set it.');
  }
  const domain = await waitForText('Enter university domain (e.g. mit.edu):', '', subtitle, ctx(nav));
  if (!domain.trim()) return screenStudentContext(nav);
  try {
    const uniSlug = purpose === 'update' ? nav.universitySlug : undefined;
    const result = await buildUniversityProfile(domain.trim(), nav.studentSlug!, uniSlug);
    return screenUniversityContext({ ...nav, universitySlug: result.uniSlug });
  } catch (err) {
    return screenStudentContext(nav, err instanceof Error ? err.message : String(err));
  }
}

async function screenGuidanceList(nav: Nav, error?: string): Promise<Nav> {
  const timestamps = await listGuidance(nav.studentSlug!, nav.universitySlug!);
  const items = [
    ...timestamps.map(ts => ({ label: formatTimestamp(ts), value: ts })),
    ...(timestamps.length > 0 ? [{ label: '──────────────────────', value: '', separator: true }] : []),
    { label: 'New Guidance', value: '__new' },
    { label: 'Back', value: '__back' },
  ];
  const val = await showMenu(items, 'Guidance', ctx(nav), error);

  if (val === '__back') return screenUniversityContext(nav);
  if (!getApiKey()) return screenUniversityContext(nav, 'Gemini API key not configured. Go to Config to set it.');

  try {
    let markdownPath: string;
    if (val === '__new') {
      const timestamp = makeTimestamp();
      const result = await buildGuidance(nav.studentSlug!, nav.universitySlug!, timestamp);
      markdownPath = result.reportPath;
    } else {
      const result = await showGuidance(nav.studentSlug!, nav.universitySlug!, val);
      markdownPath = result.markdownPath;
    }
    return screenPdfPrompt(nav, markdownPath);
  } catch (err) {
    return screenUniversityContext(nav, err instanceof Error ? err.message : String(err));
  }
}

async function screenEssayList(nav: Nav, error?: string): Promise<Nav> {
  const timestamps = await listEssays(nav.studentSlug!, nav.universitySlug!);
  const items = [
    ...timestamps.map(ts => ({ label: formatTimestamp(ts), value: ts })),
    ...(timestamps.length > 0 ? [{ label: '──────────────────────', value: '', separator: true }] : []),
    { label: 'New Essay', value: '__new' },
    { label: 'Back', value: '__back' },
  ];
  const val = await showMenu(items, 'Essays', ctx(nav), error);

  if (val === '__back') return screenUniversityContext(nav);
  if (!getApiKey()) return screenUniversityContext(nav, 'Gemini API key not configured. Go to Config to set it.');

  try {
    let markdownPath: string;
    if (val === '__new') {
      const timestamp = makeTimestamp();
      const result = await buildEssay(nav.studentSlug!, nav.universitySlug!, timestamp);
      markdownPath = result.essayPath;
    } else {
      const result = await showEssay(nav.studentSlug!, nav.universitySlug!, val);
      markdownPath = result.markdownPath;
    }
    return screenPdfPrompt(nav, markdownPath);
  } catch (err) {
    return screenUniversityContext(nav, err instanceof Error ? err.message : String(err));
  }
}

async function screenPdfPrompt(nav: Nav, markdownPath: string): Promise<Nav> {
  const items = [
    { label: 'Yes — Export to PDF', value: 'yes' },
    { label: 'No — Return to menu', value: 'no' },
  ];
  const val = await showMenu(items, 'Export to PDF?', ctx(nav));
  if (val === 'yes') {
    try {
      const { pdfPath } = await exportToPdf(markdownPath);
      process.stdout.write(`\nPDF saved: ${pdfPath}\n`);
    } catch (err) {
      process.stderr.write(`PDF export failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
  return screenUniversityContext(nav);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  try {
    await bootstrap();
  } catch (err) {
    process.stderr.write(`[ao] Bootstrap failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }

  const nav: Nav = { studentSlug: undefined, universitySlug: undefined };
  await screenStudentSelect(nav);
}

main().catch(err => {
  process.stderr.write(`Something went wrong: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

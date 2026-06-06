import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { workspacePath, getApiKey, getModel } from '../../config/bootstrap.js';
import { writeFile, readFile, fileExists, ensureDir } from '../../utils/fileUtils.js';
import { toSlug } from '../../utils/slugUtils.js';
import { loadPrompt } from '../../ai/promptLoader.js';
import { postMessage } from '../c08-status-bar/index.js';

// GEMINI_TOKEN_WINDOW / GEMINI_CONTENT_BUDGET_PCT still read from env for C03 batch sizing
function getGeminiApiKey(): string { return getApiKey() ?? ''; }
function getGeminiModel(): string { return getModel() ?? ''; }
function getGeminiBatchCharBudget(): number {
  const tokenWindow = parseInt(process.env.GEMINI_TOKEN_WINDOW ?? '1048576', 10);
  const contentPct = parseInt(process.env.GEMINI_CONTENT_BUDGET_PCT ?? '60', 10);
  return Math.floor(tokenWindow * (contentPct / 100) * 4);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UniversityProfileData {
  universityName: string;
  tagline: string | null;
  coreValues: string[];
  mission: string;
  culture: string;
  academicSpecialties: string[];
  notablePrograms: string[];
  idealCandidateTraits: string[];
  campusEthos: string;
  majorSpecificNotes: Record<string, string | null>;
}

// Persistent state file written/updated throughout the crawl.
// Category keys are fixed except the last ones which are dynamic: "Program: <major>"
// Page status: 'scraped' = text collected, pending batch extraction; 'done' = facts extracted
interface ProfileJson {
  pages: Array<{ url: string; status: 'scraped' | 'done'; text?: string }>;
  [category: string]: string[] | Array<{ url: string; status: 'scraped' | 'done'; text?: string }>;
}

interface RunStats {
  urlsScanned: number;
  urlsFailed: number;
  urlsSkipped: number;
  llmCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CRAWL_PAGES = 100;
const TRUNCATE_CHARS = 4000; // fallback only — used if Gemini rejects a batch due to token limits

const STATIC_CATEGORIES = [
  'Identity & Mission',
  'Academic Environment',
  'Admissions & Selection',
  'Student Experience',
  'Ideal Student Profile',
] as const;

function programCategory(major: string): string {
  return `Program: ${major}`;
}

function allCategories(intendedMajors: string[]): string[] {
  return [...STATIC_CATEGORIES, ...intendedMajors.map(programCategory)];
}

// ─── Cost estimation ──────────────────────────────────────────────────────────

// Pricing in USD per 1M tokens (input / output). Add new models as needed.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash':         { input: 0.15,  output: 0.60  },
  'gemini-2.5-pro':           { input: 1.25,  output: 10.00 },
  'gemini-2.0-flash':         { input: 0.10,  output: 0.40  },
  'gemini-2.0-flash-lite':    { input: 0.075, output: 0.30  },
  'gemini-1.5-flash':         { input: 0.075, output: 0.30  },
  'gemini-1.5-flash-8b':      { input: 0.0375,output: 0.15  },
  'gemini-1.5-pro':           { input: 1.25,  output: 5.00  },
};

function estimateCost(modelName: string, inputTokens: number, outputTokens: number): string {
  const key = Object.keys(MODEL_PRICING).find(k => modelName.includes(k));
  if (!key) return 'unknown (model not in pricing table)';
  const p = MODEL_PRICING[key];
  const cost = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return `~$${cost.toFixed(4)}`;
}

// ─── profile.json helpers ─────────────────────────────────────────────────────

function emptyProfileJson(intendedMajors: string[]): ProfileJson {
  const data: ProfileJson = { pages: [] };
  for (const cat of allCategories(intendedMajors)) {
    data[cat] = [];
  }
  return data;
}

async function loadProfileJson(jsonPath: string, intendedMajors: string[]): Promise<ProfileJson> {
  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(raw) as ProfileJson;
    // Ensure all current categories exist (handles resume after majors change)
    for (const cat of allCategories(intendedMajors)) {
      if (!Array.isArray(data[cat])) data[cat] = [];
    }
    return data;
  } catch {
    return emptyProfileJson(intendedMajors);
  }
}

async function saveProfileJson(jsonPath: string, data: ProfileJson): Promise<void> {
  await ensureDir(path.dirname(jsonPath));
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

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

// ─── Scraping ─────────────────────────────────────────────────────────────────

async function extractPageText(page: import('playwright').Page): Promise<string> {
  return page.evaluate(() => {
    const title = document.title || '';
    const meta = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim() || '')
      .filter(Boolean)
      .join('\n');
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent?.trim() || '')
      .filter(Boolean)
      .join('\n');
    const listItems = Array.from(document.querySelectorAll('li'))
      .map(li => li.textContent?.trim() || '')
      .filter(Boolean)
      .join('\n');
    return `TITLE: ${title}\nDESCRIPTION: ${meta}\nHEADINGS:\n${headings}\nCONTENT:\n${paragraphs}\nLISTS:\n${listItems}`;
  });
}

async function extractInternalLinks(page: import('playwright').Page, origin: string): Promise<string[]> {
  const hrefs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.getAttribute('href') ?? '')
      .filter(h => h.length > 0)
  );

  const seen = new Set<string>();
  for (const href of hrefs) {
    try {
      const resolved = new URL(href, origin).href;
      if (
        resolved.startsWith(origin) &&
        !resolved.includes('#') &&
        !resolved.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|zip|docx?|xlsx?|pptx?)(\?|$)/i)
      ) {
        const clean = resolved.split('?')[0].replace(/\/$/, '');
        seen.add(clean);
      }
    } catch {
      // ignore malformed hrefs
    }
  }
  return Array.from(seen);
}

// ─── Pass 1: batched Gemini extraction ────────────────────────────────────────

// [C03-F01] Extract admissions-relevant facts from a batch of pages via one Gemini call.
// Retries with each page truncated to TRUNCATE_CHARS if Gemini rejects due to token limits.
// Returns null on hard failure (all retries exhausted) so flushBatch can leave pages as 'scraped'.
async function extractBatchFacts(
  pages: Array<{ url: string; text: string }>,
  intendedMajors: string[],
  genAI: GoogleGenerativeAI,
  stats: RunStats,
): Promise<Record<string, string[]> | null> {
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: { temperature: 0.1 },
  });

  // Build stable param strings once — reused across attempts and retries
  const intendedMajorsStr = intendedMajors.length > 0 ? intendedMajors.join(', ') : 'Undecided';
  const programCategories = intendedMajors.map(m =>
    `- **Program: ${m}** — extract anything relevant to a student interested in ${m}, regardless of what the university calls it. Include: curriculum details, prerequisites, related departments or tracks, affiliated hospitals/labs/research centers, dual-degree or pre-professional pathways, advising resources, faculty, career outcomes, student support. Do not require an exact name match — capture related content even if labeled differently (e.g. "pre-health", "biomedical sciences", "pre-law advising").`
  ).join('\n');

  function buildBatchContent(items: Array<{ url: string; text: string }>): string {
    return items.map(p => `[${p.url}]\n${p.text}`).join('\n\n---\n\n');
  }

  async function attempt(content: string): Promise<Record<string, string[]>> {
    const prompt = await loadPrompt('c03-university-page-extract', {
      PAGE_CONTENT: content,
      INTENDED_MAJORS: intendedMajorsStr,
      PROGRAM_CATEGORIES: programCategories,
    });
    const result = await model.generateContent(prompt);
    stats.llmCalls++;
    const usage = result.response.usageMetadata;
    if (usage) {
      stats.totalInputTokens += usage.promptTokenCount ?? 0;
      stats.totalOutputTokens += usage.candidatesTokenCount ?? 0;
    }
    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    try {
      return JSON.parse(jsonStr) as Record<string, string[]>;
    } catch {
      return {};
    }
  }

  function isTokenError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('token') || msg.includes('size') || msg.includes('too long') || msg.includes('400');
  }

  const fullContent = buildBatchContent(pages);

  // Attempt 1 — no retry on token-size errors (deterministic, truncation handles them)
  try {
    return await attempt(fullContent);
  } catch (err) {
    if (isTokenError(err)) {
      // Fall through to truncation immediately — no 30s wait
      process.stdout.write(` [truncating batch...]`);
      const truncated = pages.map(p => ({ url: p.url, text: p.text.slice(0, TRUNCATE_CHARS) }));
      try {
        return await withRetry(() => attempt(buildBatchContent(truncated)), 'batch extract (truncated)');
      } catch {
        return null;
      }
    }
  }

  // Transient error — retry once after 30s
  console.log(`Retrying in 30 seconds... (attempt 2 of 2) [batch extract]`);
  await new Promise(r => setTimeout(r, 30000));
  try {
    return await attempt(fullContent);
  } catch {
    return null;
  }
}

// ─── Pass 1: batch flush ──────────────────────────────────────────────────────

async function flushBatch(
  pendingBatch: Array<{ url: string; text: string }>,
  pendingBatchChars: number,
  batchCount: number,
  profileData: ProfileJson,
  intendedMajors: string[],
  genAI: GoogleGenerativeAI,
  jsonPath: string,
  stats: RunStats,
): Promise<{ pendingBatch: Array<{ url: string; text: string }>; pendingBatchChars: number; batchCount: number }> {
  if (pendingBatch.length === 0) return { pendingBatch, pendingBatchChars, batchCount };
  batchCount++;
  process.stdout.write(`\n  Extracting batch ${batchCount} (${pendingBatch.length} pages, ~${Math.round(pendingBatchChars / 1000)}k chars)...`);
  // [C08] Signal batch extraction start
  postMessage(`Gemini: extracting facts from batch ${batchCount} (${pendingBatch.length} pages)…`, 'progress', 'C03');
  const facts = await extractBatchFacts(pendingBatch, intendedMajors, genAI, stats);
  if (facts === null) {
    // Hard failure — leave pages as 'scraped' with text intact so next resume retries this batch
    await saveProfileJson(jsonPath, profileData);
    process.stdout.write(` FAILED (Gemini unreachable — will retry on next run)`);
    // [C08] Signal batch failure
    postMessage(`Gemini: batch ${batchCount} extraction failed — will retry on next run`, 'error', 'C03');
    return { pendingBatch: [], pendingBatchChars: 0, batchCount };
  }
  let totalFacts = 0;
  for (const cat of allCategories(intendedMajors)) {
    const incoming = facts[cat];
    if (incoming && incoming.length > 0) {
      (profileData[cat] as string[]).push(...incoming);
    }
    totalFacts += (profileData[cat] as string[]).length;
  }
  // Build a URL→entry map for O(1) lookups instead of O(n) find per page
  const pageMap = new Map(profileData.pages.map(p => [p.url, p]));
  for (const bp of pendingBatch) {
    const entry = pageMap.get(bp.url);
    if (entry) { entry.status = 'done'; delete entry.text; }
  }
  await saveProfileJson(jsonPath, profileData);
  process.stdout.write(` done. (${totalFacts} facts total)`);
  // [C08] Signal batch extraction complete
  postMessage(`Gemini: batch ${batchCount} done — ${totalFacts} facts accumulated`, 'success', 'C03');
  return { pendingBatch: [], pendingBatchChars: 0, batchCount };
}

// [C03-F01] BFS crawl — extract and accumulate facts page by page into profile.json
async function crawlAndExtract(
  domain: string,
  jsonPath: string,
  profileData: ProfileJson,
  intendedMajors: string[],
  stats: RunStats,
): Promise<ProfileJson> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const origin = new URL(baseUrl).origin;

  // Pending batch — accumulates scraped pages until the char budget is reached
  let pendingBatch: Array<{ url: string; text: string }> = [];
  let pendingBatchChars = 0;
  let batchCount = 0;

  // Restore visited set from profile.json — all recorded pages skip re-scraping
  const visited = new Set<string>(profileData.pages.map(p => p.url));
  const queued = new Set<string>(visited);

  // Restore any pages that were scraped but not yet extracted (interrupted mid-batch)
  const unextracted = profileData.pages.filter(p => p.status === 'scraped' && p.text);
  if (unextracted.length > 0) {
    console.log(`  Restoring ${unextracted.length} unextracted page(s) from previous run into pending batch.`);
    for (const p of unextracted) {
      pendingBatch.push({ url: p.url, text: p.text! });
      pendingBatchChars += p.text!.length;
    }
  }

  // Seed queue: if resuming, we need to reconstruct it — start from home + unvisited
  // We can't fully restore queue order, but seeding from home re-discovers everything
  const queue: string[] = [];
  const startUrl = baseUrl.replace(/\/$/, '');
  if (!queued.has(startUrl)) {
    queue.push(startUrl);
    queued.add(startUrl);
  }

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const batchCharBudget = getGeminiBatchCharBudget();

  // If there are no new pages to crawl, flush any pending batch without launching a browser
  const noCrawlNeeded = visited.size >= MAX_CRAWL_PAGES || queue.length === 0;
  if (noCrawlNeeded) {
    if (pendingBatch.length > 0) {
      console.log('  No new pages to crawl — flushing pending batch from previous run.');
      ({ pendingBatch, pendingBatchChars, batchCount } = await flushBatch(
        pendingBatch, pendingBatchChars, batchCount, profileData, intendedMajors, genAI, jsonPath, stats,
      ));
      process.stdout.write('\n');
    } else {
      console.log('  All pages already processed — skipping crawl.');
    }
    return profileData;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  const page = await context.newPage();

  try {
    while (queue.length > 0 && visited.size < MAX_CRAWL_PAGES) {
      const url = queue.shift()!;
      visited.add(url);

      let succeeded = false;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        succeeded = true;
      } catch {
        // page unreachable or timed out
      }

      if (!succeeded) {
        profileData.pages.push({ url, status: 'done' });
        stats.urlsFailed++;
        process.stdout.write(`\r  [${visited.size}/${MAX_CRAWL_PAGES}] FAILED (timeout): ${url.replace(origin, '') || '/'}\n`);
        continue;
      }

      // Always extract links first so BFS grows regardless of page relevance.
      // Admissions-relevant paths go to the front; low-value paths (news, events) go to the back.
      const links = await extractInternalLinks(page, origin);
      const highPriority: string[] = [];
      const lowPriority: string[] = [];
      const LOW_VALUE = /\/(news|blog|events?|stories|press|media|calendar|commencement|reunion|awards?|honors?|giving|alumni|donate|directory)\b/i;
      for (const link of links) {
        if (!queued.has(link)) {
          queued.add(link);
          if (LOW_VALUE.test(link)) lowPriority.push(link);
          else highPriority.push(link);
        }
      }
      queue.unshift(...highPriority);
      queue.push(...lowPriority);

      process.stdout.write(`\r  [${visited.size}/${MAX_CRAWL_PAGES}] Scraping: ${url.replace(origin, '') || '/'}...         `);
      // [C08] Post scraper progress every 10 pages to avoid flooding the queue
      if (visited.size % 10 === 0 || visited.size === 1) {
        postMessage(`Playwright: scraped ${visited.size}/${MAX_CRAWL_PAGES} pages — ${url.replace(origin, '') || '/'}`, 'progress', 'C03');
      }

      const text = await extractPageText(page);

      // Skip near-empty pages (nav-only, error pages, redirects) — not worth a batch slot
      if (text.length < 200) {
        profileData.pages.push({ url, status: 'done' });
        stats.urlsSkipped++;
        process.stdout.write(`\r  [${visited.size}/${MAX_CRAWL_PAGES}] SKIPPED (empty): ${url.replace(origin, '') || '/'}\n`);
        continue;
      }

      stats.urlsScanned++;

      // Mark as 'scraped' with text so resume can recover it if batch flush is interrupted
      profileData.pages.push({ url, status: 'scraped', text });
      await saveProfileJson(jsonPath, profileData);

      pendingBatch.push({ url, text });
      pendingBatchChars += text.length;

      // Flush when batch hits the char budget or this is the last page
      const isLast = visited.size >= MAX_CRAWL_PAGES || queue.length === 0;
      if (pendingBatchChars >= batchCharBudget || isLast) {
        ({ pendingBatch, pendingBatchChars, batchCount } = await flushBatch(
          pendingBatch, pendingBatchChars, batchCount, profileData, intendedMajors, genAI, jsonPath, stats,
        ));
      }
    }
    // Flush any batch that accumulated but wasn't flushed inside the loop
    // (e.g. last page was a failure/skip and isLast never triggered inside the scraped path)
    if (pendingBatch.length > 0) {
      ({ pendingBatch, pendingBatchChars, batchCount } = await flushBatch(
        pendingBatch, pendingBatchChars, batchCount, profileData, intendedMajors, genAI, jsonPath, stats,
      ));
    }
    // Persist any failed/skipped page entries that weren't covered by a batch flush save
    await saveProfileJson(jsonPath, profileData);
    process.stdout.write('\n');
  } finally {
    await browser.close();
  }

  return profileData;
}

// ─── Pass 2: synthesis ────────────────────────────────────────────────────────

// [C03-F02] Synthesise structured profile from completed profile.json via Gemini.
// Strips page metadata before sending — Pass 2 only needs the category fact arrays.
async function synthesiseProfile(
  profileData: ProfileJson,
  intendedMajor: string,
  existingProfile: string,
  stats: RunStats,
): Promise<UniversityProfileData> {
  // Build a clean fact-only view — omit pages array and any residual text fields
  const factsOnly: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(profileData)) {
    if (key === 'pages') continue;
    if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      factsOnly[key] = value as string[];
    }
  }

  const prompt = await loadPrompt('c03-university-extract', {
    PROFILE_JSON: JSON.stringify(factsOnly, null, 2),
    INTENDED_MAJOR: intendedMajor,
    EXISTING_PROFILE: existingProfile,
  });

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: { temperature: 0.2 },
  });

  // [C08] Signal synthesis start
  postMessage('Gemini: synthesising university profile…', 'progress', 'C03');

  const result = await withRetry(
    () => model.generateContent(prompt),
    'Gemini university synthesis',
  );

  stats.llmCalls++;
  const usage = result.response.usageMetadata;
  if (usage) {
    stats.totalInputTokens += usage.promptTokenCount ?? 0;
    stats.totalOutputTokens += usage.candidatesTokenCount ?? 0;
  }

  const raw = result.response.text().trim();
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const profileResult = JSON.parse(jsonStr) as UniversityProfileData;
    // [C08] Signal synthesis complete
    postMessage('Gemini: university profile synthesis complete', 'success', 'C03');
    return profileResult;
  } catch {
    throw new Error('Gemini returned unparseable JSON for university synthesis.');
  }
}

// ─── Markdown rendering ───────────────────────────────────────────────────────

function renderUniversityMarkdown(
  data: UniversityProfileData,
  domain: string,
  intendedMajor: string,
  generatedDate: string,
): string {
  const now = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# University Profile: ${data.universityName}`);
  lines.push('');
  lines.push(`**Domain:** ${domain}`);
  lines.push(`**Generated:** ${generatedDate}`);
  lines.push(`**Last Updated:** ${now}`);
  lines.push(`**Student's Intended Major:** ${intendedMajor}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Mission');
  lines.push('');
  lines.push(data.mission);
  lines.push('');
  lines.push('## Tagline');
  lines.push('');
  lines.push(data.tagline ?? 'Not available');
  lines.push('');
  lines.push('## Core Values');
  lines.push('');
  for (const v of data.coreValues) lines.push(`- ${v}`);
  lines.push('');
  lines.push('## Culture & Campus Ethos');
  lines.push('');
  lines.push(data.culture);
  lines.push('');
  lines.push(data.campusEthos);
  lines.push('');
  lines.push('## Academic Specialties');
  lines.push('');
  for (const s of data.academicSpecialties) lines.push(`- ${s}`);
  lines.push('');
  lines.push('## Notable Programs');
  lines.push('');
  for (const p of data.notablePrograms) lines.push(`- ${p}`);
  lines.push('');
  lines.push('## Ideal Candidate Traits');
  lines.push('');
  for (const t of data.idealCandidateTraits) lines.push(`- ${t}`);
  lines.push('');

  // One section per intended major
  const majorEntries = Object.entries(data.majorSpecificNotes);
  if (majorEntries.length > 0) {
    for (const [major, notes] of majorEntries) {
      lines.push(`## Notes for ${major} Students`);
      lines.push('');
      lines.push(notes ?? 'No specific notes available.');
      lines.push('');
    }
  } else {
    lines.push(`## Notes for ${intendedMajor} Students`);
    lines.push('');
    lines.push('No specific notes available.');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Profile generated from public web content. Verify directly with the university.*');
  lines.push('');

  return lines.join('\n');
}

// ─── Read student intended majors ─────────────────────────────────────────────

async function readIntendedMajors(studentSlug: string): Promise<string[]> {
  const profilePath = workspacePath('students', studentSlug, 'profile.md');
  const content = await readFile(profilePath);
  const match = content.match(/\|\s*Intended Majors \/ Tracks\s*\|\s*([^|\n]+)\|/);
  if (!match) return [];
  const raw = match[1].trim();
  return raw === 'Not provided' ? [] : raw.split(',').map(m => m.trim()).filter(Boolean);
}

// ─── Public API ───────────────────────────────────────────────────────────────

// [C03-F01..F04] Build a university profile using two-pass extraction + synthesis
export async function buildUniversityProfile(
  domain: string,
  studentSlug: string,
  uniSlug?: string,
): Promise<{ profilePath: string; uniSlug: string }> {
  const apiKey = getApiKey();
  const modelName = getModel();
  if (!apiKey || !modelName) throw new Error('Gemini API key or model not configured. Go to Config to set them.');

  const rawName = uniSlug ?? domain.replace(/\.[^.]+$/, '');
  const slug = toSlug(rawName);

  const intendedMajors = await readIntendedMajors(studentSlug);
  const intendedMajorsLabel = intendedMajors.length > 0 ? intendedMajors.join(', ') : 'Undecided';

  const profilePath = workspacePath('students', studentSlug, 'universities', slug, 'profile.md');
  const jsonFilePath = workspacePath('students', studentSlug, 'universities', slug, 'profile.json');

  // Read existing profile.md for merge in Pass 2
  const existingProfile = (await fileExists(profilePath)) ? await readFile(profilePath) : '';
  const isUpdate = existingProfile.length > 0;

  const generatedDate = isUpdate
    ? (existingProfile.match(/\*\*Generated:\*\*\s*([^\n]+)/))?.[1]?.trim() ?? new Date().toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const stats: RunStats = {
    urlsScanned: 0,
    urlsFailed: 0,
    urlsSkipped: 0,
    llmCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  // Load or initialise profile.json once — passed to crawlAndExtract to avoid double load
  let profileData: ProfileJson;
  if (await fileExists(jsonFilePath)) {
    profileData = await loadProfileJson(jsonFilePath, intendedMajors);
    const doneCount = profileData.pages.filter(p => p.status === 'done').length;
    const scrapedCount = profileData.pages.filter(p => p.status === 'scraped').length;
    console.log(`Resuming: ${doneCount} pages extracted, ${scrapedCount} scraped but pending extraction.`);

    const newProgramCats = intendedMajors
      .map(programCategory)
      .filter(cat => (profileData[cat] as string[]).length === 0 && doneCount > 0);
    if (newProgramCats.length > 0) {
      console.log(`  New program categories detected: ${newProgramCats.join(', ')}`);
      console.log(`  Resetting all pages and facts for re-crawl.`);
      profileData.pages = profileData.pages.filter(p => p.status === 'scraped');
      for (const cat of allCategories(intendedMajors)) {
        (profileData[cat] as string[]) = [];
      }
      await saveProfileJson(jsonFilePath, profileData);
    }
  } else {
    profileData = emptyProfileJson(intendedMajors);
  }
  if (isUpdate) {
    console.log('Existing profile.md found — will merge during synthesis.');
  }

  // Pass 1 — BFS crawl + per-page Gemini extraction → profile.json
  console.log(`Crawling ${domain} (up to ${MAX_CRAWL_PAGES} pages)...`);
  // [C08] Signal crawl start
  postMessage(`Playwright: starting crawl of ${domain}…`, 'progress', 'C03');
  const crawledData = await crawlAndExtract(domain, jsonFilePath, profileData, intendedMajors, stats);
  console.log(`  Pass 1 complete: ${crawledData.pages.length} pages processed.`);
  // [C08] Signal Pass 1 complete
  postMessage(`Playwright: crawl complete — ${crawledData.pages.length} pages processed`, 'success', 'C03');

  // Report category coverage
  for (const cat of allCategories(intendedMajors)) {
    const count = (crawledData[cat] as string[]).length;
    console.log(`  ${count > 0 ? '✓' : '✗'} ${cat}: ${count} fact(s)`);
  }

  // Pass 2 — synthesise profile.json → profile.md
  console.log('Synthesising university profile...');
  // synthesiseProfile() posts its own progress/success messages
  const profileJsonData = await synthesiseProfile(crawledData, intendedMajorsLabel, existingProfile, stats);

  // [C03-F03] Write profile.md
  const markdown = renderUniversityMarkdown(profileJsonData, domain, intendedMajorsLabel, generatedDate);
  await writeFile(profilePath, markdown);
  // [C08] Signal overall university profile save
  postMessage(`University profile saved: ${slug}/profile.md`, 'success', 'C03');

  // Run statistics summary
  const modelUsed = getGeminiModel();
  console.log('\n── Run Statistics ────────────────────────────────────');
  console.log(`  URLs scanned:    ${stats.urlsScanned}`);
  console.log(`  URLs failed:     ${stats.urlsFailed}`);
  console.log(`  URLs skipped:    ${stats.urlsSkipped}`);
  console.log(`  LLM calls:       ${stats.llmCalls}`);
  console.log(`  Input tokens:    ${stats.totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens:   ${stats.totalOutputTokens.toLocaleString()}`);
  console.log(`  Estimated cost:  ${estimateCost(modelUsed, stats.totalInputTokens, stats.totalOutputTokens)} (${modelUsed})`);
  console.log('──────────────────────────────────────────────────────');

  return { profilePath, uniSlug: slug };
}

// [C03-F05] Show stored university profile
export async function showUniversityProfile(studentSlug: string, uniSlug: string): Promise<{ markdownPath: string }> {
  const markdownPath = workspacePath('students', studentSlug, 'universities', uniSlug, 'profile.md');
  if (!(await fileExists(markdownPath))) {
    throw new Error(`No university profile found for "${uniSlug}". Build a university profile first.`);
  }
  const content = await readFile(markdownPath);
  process.stdout.write(content + '\n');
  return { markdownPath };
}

// [C03-F06] Delete university directory
export async function deleteUniversityProfile(studentSlug: string, uniSlug: string): Promise<void> {
  const dir = workspacePath('students', studentSlug, 'universities', uniSlug);
  await fs.rm(dir, { recursive: true, force: true });
}

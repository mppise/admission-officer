/**
 * Shared university scraping utility
 * Used by both CLI (c03) and Web server for consistent behavior
 */

import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface UniversityProfileData {
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
  scrapedDate: string;
}

export interface ProgressCallback {
  (progress: {
    stage: 'crawling' | 'extracting' | 'synthesizing';
    pagesProcessed?: number;
    totalPages?: number;
    currentPage?: string;
    status?: string;
  }): void;
}

const MAX_CRAWL_PAGES = 100;
const STATIC_CATEGORIES = ['Identity & Mission', 'Academic Environment', 'Admissions & Selection', 'Student Experience', 'Ideal Student Profile'] as const;

/**
 * Crawl university website and extract text content
 */
export async function crawlUniversityWebsite(domain: string, onProgress?: ProgressCallback): Promise<string> {
  console.log(`[Scraper] Launching browser for domain: ${domain}`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  });

  const page = await context.newPage();

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const visited = new Set<string>();
  const allText: string[] = [];
  const queue = [baseUrl];

  let processed = 0;
  console.log(`[Scraper] Starting crawl of ${baseUrl}`);
  onProgress?.({ stage: 'crawling', pagesProcessed: 0, totalPages: MAX_CRAWL_PAGES, status: 'Starting crawl...' });

  while (queue.length > 0 && processed < MAX_CRAWL_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;

    visited.add(url);
    processed++;

    console.log(`[Scraper] (${processed}/${MAX_CRAWL_PAGES}) Loading: ${url}`);
    onProgress?.({ stage: 'crawling', pagesProcessed: processed, totalPages: MAX_CRAWL_PAGES, currentPage: url });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const text = await page.evaluate(() => document.body.innerText);
      allText.push(text);
      console.log(`[Scraper] ✓ Loaded successfully (${text.length} chars)`);

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href)
      );

      let newLinksAdded = 0;
      for (const link of links) {
        try {
          const linkUrl = new URL(link, baseUrl).href;
          const baseDomain = new URL(baseUrl).hostname;
          const linkDomain = new URL(linkUrl).hostname;

          // Check if domains match (ignoring www prefix)
          const normalizedBaseDomain = baseDomain?.replace(/^www\./, '') || '';
          const normalizedLinkDomain = linkDomain?.replace(/^www\./, '') || '';

          if (normalizedBaseDomain && normalizedLinkDomain === normalizedBaseDomain && !visited.has(linkUrl)) {
            queue.push(linkUrl);
            newLinksAdded++;
          }
        } catch {
          // Invalid URL, skip
        }
      }
      console.log(`[Scraper] Found ${links.length} links, queued ${newLinksAdded} new ones (queue size: ${queue.length})`);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.log(`[Scraper] ✗ Failed to load ${url}: ${error}`);
    }
  }

  console.log(`[Scraper] Crawl complete. Visited ${visited.size} pages, collected ${allText.length} pages of content`);
  onProgress?.({ stage: 'crawling', pagesProcessed: processed, totalPages: MAX_CRAWL_PAGES, status: 'Crawl complete' });
  await context.close();
  await browser.close();
  return allText.join('\n\n');
}

/**
 * Pass 1: Extract facts from scraped pages into categories
 */
async function extractPageFacts(
  scrapedText: string,
  intendedMajors: string[],
  genAI: GoogleGenerativeAI,
  modelName: string,
): Promise<Record<string, string[]>> {
  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.1 } });

  const programCategories = intendedMajors.map(m =>
    `- **Program: ${m}** — extract anything relevant to a student interested in ${m}, regardless of what the university calls it. Include: curriculum details, prerequisites, related departments or tracks, affiliated hospitals/labs/research centers, dual-degree or pre-professional pathways, advising resources, faculty, career outcomes, student support. Do not require an exact name match — capture related content even if labeled differently.`
  ).join('\n');

  const prompt = `You are a senior admissions officer extracting competitive intelligence from university web pages.

**Page Content:**
${scrapedText}

Extract and classify all admissions-relevant facts into these categories:

- **Identity & Mission** — founding story, mission statement, core values, institutional philosophy
- **Academic Environment** — curriculum philosophy, research culture, faculty-student dynamic
- **Admissions & Selection** — application requirements, deadlines, selection criteria, acceptance rate
- **Student Experience** — campus culture, housing, traditions, clubs, athletics, diversity
- **Ideal Student Profile** — traits, values, and qualities the university seeks in applicants (be aggressive—extract from ALL pages if traits are implied)
${programCategories ? `\n${programCategories}` : ''}

**Rules:**
- Extract only explicitly stated or clearly implied facts. Do not fabricate.
- Each fact is 1-2 sentences max.
- For Ideal Student Profile: extract traits from mission statements, program descriptions, and student life pages.
- Only include categories with relevant content.
- Use exact category names.
- Respond with ONLY valid JSON, no markdown.

{
  "Identity & Mission": ["fact1", "fact2"],
  "Ideal Student Profile": ["trait1", "trait2"],
  "Program: Biology": ["fact3"]
}`;

  console.log(`[Pass 1] Extracting facts from scraped content...`);
  const result = await model.generateContent(prompt);
  const jsonStr = result.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log(`[Pass 1] ⚠ Could not parse facts: ${e}`);
    return {};
  }
}

/**
 * Pass 2: Synthesize facts into final UniversityProfileData
 */
async function synthesizeProfile(
  facts: Record<string, string[]>,
  intendedMajors: string[],
  genAI: GoogleGenerativeAI,
  modelName: string,
): Promise<UniversityProfileData> {
  const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.2 } });

  const prompt = `You are a senior admissions officer synthesizing a competitive intelligence profile on a university.

**Fact Inventory:**
${JSON.stringify(facts, null, 2)}

**Student's Intended Majors:** ${intendedMajors.join(', ')}

Use ONLY facts from the inventory. Do not invent. For missing fields, use null or empty arrays. Be aggressive extracting traits from ALL categories.

For majorSpecificNotes, create one key per intended major with extracted curriculum/program details, or null if nothing found.

Respond with ONLY valid JSON, no explanation:

{
  "universityName": "string",
  "tagline": "string or null",
  "coreValues": ["string array"],
  "mission": "string (2-4 sentences)",
  "culture": "string",
  "academicSpecialties": ["string array"],
  "notablePrograms": ["string array"],
  "idealCandidateTraits": ["string array — be specific"],
  "campusEthos": "string",
  "majorSpecificNotes": { "Major": "string or null" }
}`;

  console.log(`[Pass 2] Synthesizing profile from facts...`);
  const result = await model.generateContent(prompt);
  const jsonStr = result.response.text().trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  const profileJson = JSON.parse(jsonStr);

  return {
    universityName: profileJson.universityName || '',
    tagline: profileJson.tagline || null,
    coreValues: profileJson.coreValues || [],
    mission: profileJson.mission || '',
    culture: profileJson.culture || '',
    academicSpecialties: profileJson.academicSpecialties || [],
    notablePrograms: profileJson.notablePrograms || [],
    idealCandidateTraits: profileJson.idealCandidateTraits || [],
    campusEthos: profileJson.campusEthos || '',
    majorSpecificNotes: profileJson.majorSpecificNotes || {},
    scrapedDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Extract university information from scraped text using Gemini API (2-pass approach)
 */
export async function extractUniversityInfo(
  scrapedText: string,
  intendedMajors: string[],
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  onProgress?: ProgressCallback
): Promise<UniversityProfileData> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not configured');
  }

  console.log(`[Extractor] Starting 2-pass extraction with ${modelName}`);
  onProgress?.({ stage: 'extracting', status: 'Pass 1: Extracting facts...' });

  const genAI = new GoogleGenerativeAI(apiKey);

  // Pass 1: Extract facts into categories
  const facts = await extractPageFacts(scrapedText, intendedMajors, genAI, modelName);
  console.log(`[Extractor] ✓ Pass 1 complete: extracted ${Object.keys(facts).length} categories`);

  // Pass 2: Synthesize facts into final profile
  onProgress?.({ stage: 'synthesizing', status: 'Pass 2: Synthesizing profile...' });
  const profile = await synthesizeProfile(facts, intendedMajors, genAI, modelName);
  console.log(`[Extractor] ✓ Pass 2 complete: ${profile.universityName}`);
  console.log(`[Extractor] ✓ Traits: ${profile.idealCandidateTraits.length}, Core Values: ${profile.coreValues.length}`);

  onProgress?.({ stage: 'synthesizing', status: 'Complete!' });

  return profile;
}

/**
 * Complete university scraping pipeline
 */
export async function scrapeUniversity(
  domain: string,
  intendedMajors: string[] = [],
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  onProgress?: ProgressCallback
): Promise<UniversityProfileData> {
  console.log(`\n========================================`);
  console.log(`[Pipeline] Starting university scrape for: ${domain}`);
  console.log(`[Pipeline] Model: ${modelName}, Majors: ${intendedMajors.length > 0 ? intendedMajors.join(', ') : 'none'}`);
  console.log(`========================================\n`);

  const startTime = Date.now();
  const scrapedText = await crawlUniversityWebsite(domain, onProgress);
  const crawlTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n[Pipeline] Crawling took ${crawlTime}s, collected ${scrapedText.length} characters\n`);

  const extractStart = Date.now();
  const universityInfo = await extractUniversityInfo(scrapedText, intendedMajors, apiKey, modelName, onProgress);
  const extractTime = ((Date.now() - extractStart) / 1000).toFixed(2);
  console.log(`\n[Pipeline] Extraction took ${extractTime}s`);
  console.log(`[Pipeline] ✓ Scraping complete! Result: ${universityInfo.universityName}`);
  console.log(`[Pipeline] Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);

  return universityInfo;
}

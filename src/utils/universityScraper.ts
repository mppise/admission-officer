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

const MAX_CRAWL_PAGES = 100;
const TRUNCATE_CHARS = 4000;

/**
 * Crawl university website and extract text content
 */
export async function crawlUniversityWebsite(domain: string): Promise<string> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const visited = new Set<string>();
  const allText: string[] = [];
  const queue = [baseUrl];

  let processed = 0;

  while (queue.length > 0 && processed < MAX_CRAWL_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;

    visited.add(url);
    processed++;

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const text = await page.evaluate(() => document.body.innerText);
      allText.push(text);

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href)
      );

      for (const link of links) {
        try {
          const linkUrl = new URL(link, baseUrl).href;
          if (linkUrl.startsWith(baseUrl) && !visited.has(linkUrl)) {
            queue.push(linkUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    } catch (e) {
      console.log(`Failed to load ${url}`);
    }
  }

  await browser.close();
  return allText.join('\n\n');
}

/**
 * Extract university information from scraped text using Gemini API
 */
export async function extractUniversityInfo(
  scrapedText: string,
  intendedMajors: string[],
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<UniversityProfileData> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const truncatedText = scrapedText.slice(0, TRUNCATE_CHARS);

  const prompt = `Extract key information about this university from the provided text.

Return a JSON object with these exact fields:
{
  "universityName": "Full name of the university",
  "tagline": "One-line description if available, or null",
  "coreValues": ["list", "of", "core", "values"],
  "mission": "University's mission statement",
  "culture": "Description of campus culture",
  "academicSpecialties": ["areas", "of", "academic", "strength"],
  "notablePrograms": ["well-known", "programs"],
  "idealCandidateTraits": ["traits", "they", "seek"],
  "campusEthos": "Overall feeling/character of campus"
}

University website content:
${truncatedText}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  const extracted = JSON.parse(jsonMatch[0]);

  const majorSpecificNotes: Record<string, string | null> = {};
  for (const major of intendedMajors) {
    try {
      const majorPrompt = `Based on the university website content below, provide any specific notes about the "${major}" program. Return just the notes as plain text, or null if no specific information found. Keep it to 1-2 sentences max.

Content:
${truncatedText}`;

      const majorResult = await model.generateContent(majorPrompt);
      const majorText = majorResult.response.text().trim();
      majorSpecificNotes[major] = majorText && majorText !== 'null' && majorText.length > 0 ? majorText : null;
    } catch (e) {
      console.log(`Failed to extract notes for major: ${major}`);
      majorSpecificNotes[major] = null;
    }
  }

  return {
    universityName: extracted.universityName || '',
    tagline: extracted.tagline || null,
    coreValues: extracted.coreValues || [],
    mission: extracted.mission || '',
    culture: extracted.culture || '',
    academicSpecialties: extracted.academicSpecialties || [],
    notablePrograms: extracted.notablePrograms || [],
    idealCandidateTraits: extracted.idealCandidateTraits || [],
    campusEthos: extracted.campusEthos || '',
    majorSpecificNotes,
    scrapedDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Complete university scraping pipeline
 */
export async function scrapeUniversity(
  domain: string,
  intendedMajors: string[] = [],
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<UniversityProfileData> {
  console.log(`Starting to scrape university: ${domain}`);
  const scrapedText = await crawlUniversityWebsite(domain);
  console.log(`Crawled ${scrapedText.length} characters`);
  const universityInfo = await extractUniversityInfo(scrapedText, intendedMajors, apiKey, modelName);
  return universityInfo;
}

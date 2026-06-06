import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Scrape university endpoint
app.post('/api/scrape-university', async (req, res) => {
  const { domain, intendedMajors = [] } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const result = await scrapeUniversity(domain, intendedMajors);
    res.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      error: 'Failed to scrape university',
      message: error.message
    });
  }
});

async function crawlUniversityWebsite(domain) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const visited = new Set();
  const allText = [];
  const queue = [baseUrl];

  const MAX_CRAWL_PAGES = 100;

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
        Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
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

async function extractUniversityInfo(scrapedText, intendedMajors) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const TRUNCATE_CHARS = 4000;
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

  const majorSpecificNotes = {};
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

async function scrapeUniversity(domain, intendedMajors = []) {
  console.log(`Starting to scrape university: ${domain}`);
  const scrapedText = await crawlUniversityWebsite(domain);
  console.log(`Crawled ${scrapedText.length} characters`);
  const universityInfo = await extractUniversityInfo(scrapedText, intendedMajors);
  return universityInfo;
}

app.listen(PORT, () => {
  console.log(`Admission Officer Web - running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});

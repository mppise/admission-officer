import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { scrapeUniversity } from '../utils/universityScraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Add Bootstrap classes to generated HTML
function enhanceHtmlWithBootstrap(html) {
  // Strip markdown code blocks if present
  let content = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();

  // Add Bootstrap classes to elements that don't have them
  return content
    .replace(/<h2(?!\s+class)/g, '<h2 class="text-primary fw-bold mb-3"')
    .replace(/<h3(?!\s+class)/g, '<h3 class="fw-bold text-secondary mb-2"')
    .replace(/<p(?!\s+class)/g, '<p class="mb-2"')
    .replace(/<ul(?!\s+class)/g, '<ul class="list-unstyled ms-3"')
    .replace(/<li(?!\s+class)/g, '<li class="mb-2"')
    .replace(/<div>(?![^<]*class=)/g, '<div class="mb-4">');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Scrape university endpoint (traditional)
app.post('/api/scrape-university', async (req, res) => {
  const { domain, intendedMajors = [] } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return res.status(400).json({
        error: 'University scraping not configured',
        message: 'GEMINI_API_KEY environment variable is required'
      });
    }

    const result = await scrapeUniversity(domain, intendedMajors, apiKey, modelName);
    res.json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      error: 'Failed to scrape university',
      message: error.message
    });
  }
});

// Generate guidance endpoint
app.post('/api/generate-guidance', async (req, res) => {
  const { studentData, universityData } = req.body;

  if (!studentData || !universityData) {
    return res.status(400).json({ error: 'Student and university data required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key not configured' });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Build student profile
    const studentProfileText = `# Student Profile
**Name:** ${studentData.name || 'Student'}
**Intended Majors:** ${studentData.intendedMajors?.join(', ') || 'Undecided'}
**GPA:** ${studentData.gpa || 'Not provided'}
**Test Scores:** ${studentData.testScores || 'Not provided'}
**Activities:** ${studentData.activities?.join(', ') || 'Not provided'}
**Essays:** ${studentData.essays || 'Not provided'}`;

    // Build university profile
    const universityProfileText = `# University Profile
**Name:** ${universityData.universityName}
**Mission:** ${universityData.mission || 'Not provided'}
**Culture:** ${universityData.culture || 'Not provided'}
**Ideal Candidate Traits:** ${universityData.idealCandidateTraits?.join(', ') || 'Not provided'}
**Core Values:** ${universityData.coreValues?.join(', ') || 'Not provided'}
**Academic Specialties:** ${universityData.academicSpecialties?.join(', ') || 'Not provided'}`;

    const prompt = `You are a senior admissions officer who has read thousands of applications. You now work as an independent admissions strategist to maximize this student's chances of admission.

CRITICAL RULES:
- Every recommendation MUST reference specific data from the student's actual profile.
- Do not give generic advice.
- Cross-reference the student's profile against the university's ideal candidate traits.
- Be prescriptive and concrete.

STUDENT PROFILE:
${studentProfileText}

UNIVERSITY PROFILE:
${universityProfileText}

---

OUTPUT FORMAT: Plain markdown only. No HTML tags.

SECTIONS REQUIRED:
## University Fit Summary
## Strengths to Highlight
## Key Themes
## University-Specific Tactics`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.7 } });
    const result = await model.generateContent(prompt);
    const guidance = result.response.text().trim();

    res.json({
      success: true,
      guidance,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Guidance generation error:', error);
    res.status(500).json({
      error: 'Failed to generate guidance',
      message: error.message,
    });
  }
});

// Generate essay guidance endpoint
app.post('/api/generate-essay-guidance', async (req, res) => {
  const { studentData, universityData, essayPrompt, wordLimit } = req.body;

  if (!studentData || !universityData || !essayPrompt) {
    return res.status(400).json({ error: 'Student data, university data, and essay prompt required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key not configured' });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const studentProfileText = `**Name:** ${studentData.name || 'Student'}\n**Majors:** ${studentData.intendedMajors?.join(', ') || 'Undecided'}\n**Profile:** ${studentData.about || 'Not provided'}`;
    const universityProfileText = `**University:** ${universityData.universityName}\n**Values:** ${universityData.coreValues?.join(', ')}\n**Culture:** ${universityData.culture}`;

    const prompt = `You are a senior admissions officer providing essay guidance. Your goal is to help the student write an authentic, strategic essay that demonstrates fit with this university.

**Essay Prompt:**
${essayPrompt}

${wordLimit ? `**Word Limit:** ${wordLimit}` : '**Word Limit:** Not specified'}

**Student Profile:**
${studentProfileText}

**University Profile:**
${universityProfileText}

---

OUTPUT FORMAT: Plain markdown only. No HTML tags.

> ⚠️ IMPORTANT: The inspiration samples below are provided to help you understand how to draw on your own experiences. Do NOT submit them as your own work. Use them only as a reference for tone, structure, and how to connect your profile to the prompt. Your essay must be written in your own voice.

SECTIONS REQUIRED:
## Key Themes to Explore
## University Connection
## Structure & Tone
## Show, Don't Tell
## What to Avoid`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.8 } });
    const result = await model.generateContent(prompt);
    const essayGuidance = result.response.text().trim();

    res.json({
      success: true,
      guidance: essayGuidance,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Essay guidance generation error:', error);
    res.status(500).json({
      error: 'Failed to generate essay guidance',
      message: error.message,
    });
  }
});

// Scrape university endpoint with real-time progress (Server-Sent Events)
app.post('/api/scrape-university-stream', async (req, res) => {
  const { domain, intendedMajors = [] } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return res.status(400).json({
      error: 'University scraping not configured',
      message: 'GEMINI_API_KEY environment variable is required'
    });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await scrapeUniversity(domain, intendedMajors, apiKey, modelName, sendProgress);

    // Send final result
    sendProgress({
      type: 'complete',
      data: result
    });

    res.end();
  } catch (error) {
    console.error('Scraping error:', error);
    sendProgress({
      type: 'error',
      message: error.message
    });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Admission Officer Web - running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});

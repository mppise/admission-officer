import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeUniversity } from '../utils/universityScraper.js';

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

app.listen(PORT, () => {
  console.log(`Admission Officer Web - running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});

# Admission Officer Web Server

Web-based interface for the Admission Officer application. Replaces the CLI with a modern, browser-based form system with Bootstrap styling and localStorage persistence.

## Quick Start

### 1. Setup Environment Variables

Copy the example file and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env` and add your values:
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

### 2. Build the Project

```bash
npm install
npm run build
```

### 3. Start the Web Server

```bash
npm run web
```

You'll see:
```
🚀 Starting Admission Officer Web Server

Configuration:
  Port:           3000
  Gemini API Key: ✓ configured
  Gemini Model:   gemini-2.5-flash
```

Then open your browser to **http://localhost:3000**

## Features

### Student Profile Management
- Create and manage multiple student profiles
- Fill out comprehensive academic and extracurricular information
- Auto-save all changes to browser localStorage
- View student list in sidebar with quick selection

### University Profiles
- Enter university domain to scrape university website
- Automatically extracts:
  - University name and mission
  - Academic specialties and programs
  - Campus culture and core values
  - Ideal candidate traits
  - Major-specific notes
- Edit and refine scraped information
- Store university profiles per student

### Data Export
- Export student profile as PDF
- Export university profile as PDF
- All data formatted for easy reading and sharing

### Data Persistence
- All data stored in browser **localStorage**
- No server-side database required
- Data persists across browser sessions
- Each browser/device has isolated data
- Recommend exporting PDFs as backup

## Environment Variables

All optional - defaults provided:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | (none) | Required for university scraping |
| `GEMINI_MODEL` | gemini-2.5-flash | Model for scraping & extraction |
| `PORT` | 3000 | Server port |
| `GEMINI_TOKEN_WINDOW` | 1048576 | Token budget for Gemini API |
| `GEMINI_CONTENT_BUDGET_PCT` | 60 | % of token window for content |

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API key"
3. Copy the key and paste it in `.env`

## Architecture

```
├── web/
│   ├── server.js              # Express server (loads .env, starts web server)
│   └── public/
│       ├── index.html         # Single-page application
│       └── app.js             # Client-side logic & localStorage manager
├── dist/
│   └── web/
│       ├── server.js          # Compiled server
│       └── public/            # Static assets
└── scripts/
    └── start-web.js           # Startup script (loads .env, logs config)
```

## Storage

All data stored in browser **localStorage** with these keys:

- `ao_students` — array of student IDs
- `ao_student_[id]` — full student profile JSON
- `ao_uni_[studentId]` — array of university IDs for that student
- `ao_uni_[studentId]_[uniId]` — full university profile JSON

**Clear data:** Open browser DevTools → Application → LocalStorage → Remove all entries

## Troubleshooting

### Port already in use
```bash
# Change port in .env
PORT=3001 npm run web
```

### University scraping fails
- Check `GEMINI_API_KEY` is set in `.env`
- Check your API quota at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check the domain is reachable (e.g., `www.stanford.edu`)

### Data not saving
- Check browser console (F12) for JavaScript errors
- Ensure localStorage is not disabled
- Try incognito/private mode to test

### Server won't start
```bash
# Rebuild the project
npm run build
npm run web
```

## Development

Start server with auto-reload:
```bash
npm run build && npm run web
```

Server code: `web/server.js` (JavaScript)
Client code: `web/public/app.js` (Vanilla JavaScript, no frameworks)
HTML: `web/public/index.html` (Bootstrap 5)

## Notes

- **CLI vs Web:** The web interface completely replaces the CLI. Both cannot run simultaneously.
- **Backup data:** Export profiles as PDF to create backups
- **Browser compatibility:** Works on modern browsers (Chrome, Firefox, Safari, Edge)
- **Multi-device:** Each device/browser has separate localStorage
- **No authentication:** Currently single-user per browser (designed for personal use)

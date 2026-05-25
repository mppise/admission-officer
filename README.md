# Admission Officer (`ao`)

A CLI tool that provides personalised college admissions guidance for high school students — powered by Google Gemini.

## What it does

- Builds a **student profile** capturing academics, test scores, activities, and goals
- Crawls university websites and builds a **university profile** tailored to the student's intended majors
- Generates a **guidance report** analysing fit between the student and each university
- Drafts **essay outlines** with inspiration samples for each application prompt

## Requirements

- Node.js >= 20
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Setup

After installing, create a `.env` file in the directory where you run `ao`:

```
GEMINI_API_KEY=your_api_key_here
```

Playwright (used for university web crawling) will install Chromium automatically during `npm install`.

## Usage

```
# Step 1 — Create your student profile
ao --student-profile --build

# Step 2 — Build a university profile (crawls the university website)
ao --university-profile --build --domain brown.edu --student <your-name>

# Step 3 — Generate a guidance report
ao --guidance --build --student <your-name> --university brown

# Step 4 — Draft an essay outline
ao --essay --build --student <your-name> --university brown
```

Run `ao --help` for the full command reference.

## Data storage

All profiles and outputs are saved under a `data/` directory wherever you run `ao`. Nothing is sent to any server other than the Gemini API.

## License

Apache-2.0

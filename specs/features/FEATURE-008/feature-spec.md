# FEATURE-008: Web Forms & Browser Interface

**Feature Title:** Web Forms & Browser Interface  
**Domain:** infrastructure  
**Size:** l (Large)  
**Status:** In Progress  
**Assignee:** Mangesh Pise  

---

## Overview

Convert the CLI-based Admission Officer application into a web-based interface with Bootstrap-styled forms. Persist all data to browser localStorage instead of the filesystem. Maintain the server-side university web scraping functionality while integrating it with the browser-based UI. Remove LLM-based guidance and essay generation features (out of scope). Add PDF export capability for student and university profile data.

---

## User Stories

### US-001: Student Management
**As a** student using the web interface  
**I want to** create, view, and manage my student profile  
**So that** I can organize and track my college application data

**Acceptance Criteria:**
- Create new student via modal with name input
- List all students in a left sidebar with selection capability
- Load/unload student profile data from localStorage on selection
- Auto-save profile form fields on blur
- Display welcome screen when no student is selected
- Delete student with confirmation (removes all associated data)

### US-002: Student Profile Form
**As a** student  
**I want to** fill out comprehensive profile information in organized sections  
**So that** I can track my academic and extracurricular achievements

**Acceptance Criteria:**
- Personal Information section: name, graduation year, high school, intended majors
- Academic Information section: weighted/unweighted GPA, class rank
- Standardized Tests section: SAT scores (total, math, reading), ACT composite
- AP/IB Scores: ability to add/remove multiple scores per subject
- Extracurriculars: add/remove activities with fields for name, role, years involved, hours/week, description
- Awards & Recognitions: add/remove with fields for award name, level, year, description
- Shadowing Experiences: add/remove with organization, field, total hours, period, description
- Research Experiences: add/remove with project title, institution, mentor name, period, hours/week, description
- All array fields support inline delete buttons
- Form saves to localStorage on each field blur event
- Display indicates number of items in array fields (e.g., "2 activities")

### US-003: University Profiles
**As a** student  
**I want to** scrape university information by domain and view/edit it  
**So that** I can compare universities and track their requirements

**Acceptance Criteria:**
- Input field for university domain (https:// prefix optional)
- Click "Scrape" button sends POST to `/api/scrape-university` endpoint
- Server performs Playwright-based web crawling (reuses c03 logic)
- Server extracts university info via Gemini API (name, mission, culture, programs, etc.)
- Results auto-save to localStorage immediately after scraping
- Display list of scraped universities in sidebar under student
- Select university to view/edit details in form
- University form includes:
  - Core values (array)
  - Mission statement (textarea)
  - Culture description (textarea)
  - Campus ethos (textarea)
  - Academic specialties (array)
  - Notable programs (array)
  - Ideal candidate traits (array)
  - Major-specific notes (one textarea per intended major)
- All fields auto-save on blur
- Delete university with confirmation

### US-004: PDF Export
**As a** student  
**I want to** export my student and university profiles as PDF  
**So that** I can share or print the information

**Acceptance Criteria:**
- Export tab in main form with two export options
- "Student Profile PDF" button generates PDF containing:
  - Student name, graduation year, high school, intended majors
  - GPA scores, class rank
  - Test scores (SAT, ACT)
  - AP/IB scores list
  - Extracurricular activities with details
  - Awards, shadowing, research entries
  - Formatted with headers and readable layout
- "University Profile PDF" button (enabled only when university selected) generates PDF containing:
  - University name and tagline
  - Mission and culture
  - Core values list
  - Academic specialties and programs
  - Ideal candidate traits
  - Major-specific notes
  - Professional formatting with sections
- Both exports use jsPDF library
- Filenames: `{StudentName}_profile.pdf` and `{UniversityName}_profile.pdf`

### US-005: Navigation & Menu Structure
**As a** student  
**I want to** navigate between student, university, and export sections  
**So that** I can work with different parts of the application

**Acceptance Criteria:**
- Tab-based interface: Profile | University | Export
- Left sidebar for student and university selection
- Right main panel for form content
- Welcome screen shown when no student selected
- Responsive design that works on desktop browsers
- Bootstrap 5 styling throughout

---

## Technical Requirements

### Architecture

**Stack:**
- **Backend:** Node.js + Express.js
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Styling:** Bootstrap 5 + custom CSS
- **Storage:** Browser localStorage (key-value pairs per student/university)
- **PDF Generation:** jsPDF (client-side)
- **Web Scraping:** Reuse existing Playwright + Gemini from c03-university-profile

**Directory Structure:**
```
web/
├── server.js                 # Express server entry point
├── public/
│   ├── index.html           # Single page app
│   ├── app.js               # Main application logic
│   └── styles.css           # Additional custom styles (if needed)
├── api/
│   └── scraper.ts           # University scraping logic (wrapped from c03)
```

### Data Models

**Student Profile (localStorage key: `ao_student_[id]`):**
```typescript
{
  name: string
  gradYear: string
  highSchool: string
  intendedMajors: string[]
  gpaWeighted: string
  gpaUnweighted: string
  classRank: string
  transcript: { yearLabel: string; courses: { name: string; grade: string }[] }[]
  sat: { total: string; math: string; reading: string }
  act: { composite: string }
  apScores: { subject: string; score: string }[]
  ibScores: { subject: string; score: string }[]
  extracurriculars: { activityName: string; role: string; yearsInvolved: string; hoursPerWeek: string; description: string }[]
  awards: { awardName: string; level: string; year: string; description: string }[]
  shadowing: { organization: string; field: string; hoursTotal: string; period: string; description: string }[]
  research: { projectTitle: string; institution: string; mentorName: string; period: string; hoursPerWeek: string; description: string }[]
  generatedDate: string
  lastUpdated: string
}
```

**University Profile (localStorage key: `ao_uni_[studentId]_[uniId]`):**
```typescript
{
  universityName: string
  tagline: string | null
  coreValues: string[]
  mission: string
  culture: string
  academicSpecialties: string[]
  notablePrograms: string[]
  idealCandidateTraits: string[]
  campusEthos: string
  majorSpecificNotes: Record<string, string | null>
  scrapedDate: string
}
```

**Students Index (localStorage key: `ao_students`):**
```typescript
string[]  // Array of student IDs
```

**Universities Index per Student (localStorage key: `ao_uni_[studentId]`):**
```typescript
string[]  // Array of university IDs for that student
```

### API Endpoints

**POST /api/scrape-university**
- Request body: `{ domain: string; intendedMajors: string[] }`
- Response: `UniversityProfile` object (as defined above)
- Server-side:
  1. Validates domain input
  2. Runs Playwright crawler on university website (max 100 pages)
  3. Extracts text content
  4. Sends to Gemini API with extraction prompt
  5. For each intended major, queries for major-specific notes
  6. Returns structured university data
- Error handling: 400 for missing domain, 500 for scraping/API failures

**GET /api/health**
- Simple health check returning `{ status: "ok" }`

### Storage Strategy

**localStorage Breakdown:**
- `ao_students`: JSON array of student IDs
- `ao_student_[id]`: Full student profile JSON
- `ao_uni_[studentId]`: JSON array of university IDs for that student
- `ao_uni_[studentId]_[uniId]`: Full university profile JSON

**Auto-Save Behavior:**
- Every form field has `blur` event listener
- On blur, gather all form data for that section
- Serialize to JSON and save to appropriate localStorage key
- No confirmation dialog; silent save
- No intermediate save files; only latest version stored

### UI/UX Requirements

**Bootstrap Integration:**
- Primary color: Indigo (#4f46e5)
- Card-based layout with shadows and hover effects
- Responsive grid: 3-column layout (sidebar, main form)
- Form controls with rounded borders and focus states
- Success/warning/danger alerts for user feedback
- Modal for new student creation
- Loading spinner during university scraping

**Navigation:**
- Tab interface: Profile | University | Export
- Sidebar with student list and add button
- Active student highlighted
- Display student name and graduation year in list items
- University list appears within University tab

**Form Usability:**
- Clear section headers with visual hierarchy
- Array fields displayed as styled items with delete buttons
- "Add" buttons below array sections for easy discovery
- Input fields with placeholders for guidance
- Textarea fields for longer descriptions
- Badge-style display for simple list items (majors, specialties, etc.)
- Loading spinner overlay during scraping

---

## Out of Scope (Explicitly Excluded)

- LLM-based guidance generation (remove all Gemini calls from c04)
- LLM-based essay generation and advising (remove all c05)
- JSON to Markdown conversion pipeline
- PDF report generation from guidance/essays
- CLI interface (fully replaced by web UI)
- Database or server-side persistence (localStorage only)
- User authentication or multi-user isolation
- Data import/export beyond PDF (no JSON/CSV export)

---

## Dependencies & Integrations

**New npm packages required:**
- `express@^4.18.2`
- `jspdf@^2.5.1`
- `html2canvas@^1.4.1`

**Reused Components:**
- `src/components/c03-university-profile/index.ts` → extract scraping logic into `web/api/scraper.ts`
- `src/config/bootstrap.ts` → import for Gemini API key/model
- Playwright (already in dependencies)
- Google Generative AI (already in dependencies)

**Removed/Deprecated:**
- Ink.js TUI rendering (c01 CLI)
- All Gemini calls for guidance/essay generation (c04, c05)
- Markdown rendering and file output
- CLI-based menu navigation

---

## Acceptance Criteria for Completion

### Build Phase
- [ ] Express server created and serves static files
- [ ] Single-page HTML with all form sections
- [ ] localStorage manager with CRUD operations
- [ ] Student profile form with all fields
- [ ] University profile form with all fields
- [ ] Array field handling (add/remove items)
- [ ] Auto-save on blur implemented for all fields
- [ ] University scraping API endpoint working
- [ ] PDF export for student profile
- [ ] PDF export for university profile
- [ ] Tab navigation between sections
- [ ] Student list sidebar with add/delete
- [ ] University list with add/select/delete
- [ ] Loading spinner during scraping
- [ ] Bootstrap styling applied throughout
- [ ] Welcome screen on startup

### Testing Phase
- [ ] Student creation and selection works
- [ ] All form fields save and load correctly
- [ ] Auto-save doesn't lose data on rapid changes
- [ ] University scraping completes without errors
- [ ] Scraping results display in form correctly
- [ ] PDF export generates valid PDFs
- [ ] Student deletion removes all data
- [ ] University deletion removes only that university
- [ ] Multiple majors trigger major-specific notes
- [ ] Responsive design on common screen sizes
- [ ] No JavaScript console errors during normal use

### Deployment Phase
- [ ] `npm install` includes new dependencies
- [ ] Web server runs on `http://localhost:3000`
- [ ] All files committed to git
- [ ] Version bumped appropriately

---

## Notes

- The web interface is a complete replacement for the CLI; both cannot coexist in the same session
- localStorage is browser-specific; switching browsers loses data
- Users should be advised to export PDFs for long-term data backup
- University scraping requires valid Gemini API key (same as CLI)
- Maximum of 100 pages crawled per university to prevent resource exhaustion
- Intended majors list drives the major-specific notes rendering

---

## Sign-Off

**Spec Written By:** Claude Code  
**Date:** 2026-06-05  
**Status:** Ready for Developer Review

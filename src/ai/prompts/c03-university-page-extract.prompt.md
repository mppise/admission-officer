---
id: c03-university-page-extract
description: Instructs Gemini to extract admissions-relevant facts from a batch of scraped university web pages and classify them into predefined categories
loader_params:
  - name: PAGE_CONTENT
    format: "plain text — one or more pages separated by '---', each prefixed with [URL]"
    injected_by: src/components/c03-university-profile/index.ts
    purpose: The batch of page content to extract facts from
  - name: INTENDED_MAJORS
    format: "string — comma-separated list of the student's intended majors or academic tracks"
    injected_by: src/components/c03-university-profile/index.ts
    purpose: Tells Gemini which programs to look for specifically
  - name: PROGRAM_CATEGORIES
    format: "string — one bullet line per intended major, formatted as a category definition"
    injected_by: src/components/c03-university-profile/index.ts
    purpose: Dynamically injects per-program category definitions into the prompt
---

You are extracting admissions-relevant facts from one or more university web pages for a prospective undergraduate applicant.

**Student's Intended Majors:** {{INTENDED_MAJORS}}

---

**Page Content** (one or more pages, each prefixed by its URL):

{{PAGE_CONTENT}}

---

Extract facts relevant to prospective applicants across all pages above and classify them into these categories. Merge facts from all pages into a single flat list per category — do not duplicate facts that appear on multiple pages.

- **Identity & Mission** — founding story, mission statement, core values, motto, institutional philosophy, what the university believes it stands for
- **Academic Environment** — curriculum philosophy (e.g. open curriculum, core requirements), research culture, faculty approach, interdisciplinary opportunities, academic strengths
- **Admissions & Selection** — application requirements, deadlines, test policies, what they look for in applicants, selection criteria, yield, acceptance rate, financial aid, scholarships
- **Student Experience** — campus culture, housing, dining, traditions, clubs, athletics, arts, diversity, community feel, what daily student life looks like
- **Ideal Student Profile** — traits, values, and qualities the university explicitly or implicitly seeks in applicants: intellectual curiosity, leadership, community involvement, collaborative spirit, specific personality traits mentioned in admissions materials, what kind of person thrives here
{{PROGRAM_CATEGORIES}}

**Rules:**
- Extract only what is explicitly stated in the content. Do not invent or infer.
- Each fact must be a concise, self-contained statement (1-2 sentences max).
- Only include categories that have relevant content — omit empty ones.
- If no pages contain admissions-relevant content, return an empty object {}.
- For **Program:** categories: use broad relevance — extract anything useful to a student interested in that field, even if the page uses different terminology. Use the exact key name as defined above (e.g. `"Program: Pre-Med"` not `"Pre-Med Program"`).
- Respond with ONLY valid JSON — no markdown fences, no explanation.

Respond with a JSON object where keys are exact category names and values are arrays of fact strings:

{
  "Identity & Mission": ["fact1", "fact2"],
  "Admissions & Selection": ["fact3"],
  "Program: Pre-Med": ["fact4", "fact5"]
}

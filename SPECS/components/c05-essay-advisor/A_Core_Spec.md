---
name: c05-essay-advisor-core
description: C05 Essay Advisor — Feature specification
---

Architecture refs: 0_Overview.md, 2_UX.md

# C05 — Essay Advisor: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C05-F01 | Collect essay type, prompt, word limit | Ready | REQ-0006 |
| C05-F02 | Validate essay type and prompt length | Ready | REQ-0006 |
| C05-F03 | Generate essay outline with AI | Ready | REQ-0006 |
| C05-F04 | Include disclaimer on AI inspiration samples | Ready | REQ-0006 |
| C05-F05 | Persist essay outlines (timestamped) | Ready | REQ-0010 |

---

## Acceptance Criteria

### C05-F01: Essay Collection

- [ ] Prompt for essay type (dropdown: Personal Statement, Why Us, Common App Prompt 1–7, Supplemental, etc.)
- [ ] Prompt for full essay prompt text (up to 1000 chars)
- [ ] Prompt for word limit (optional; user can skip)
- [ ] Show summary before generation

### C05-F02: Validation

- [ ] Essay type must be selected (not empty)
- [ ] Prompt must be > 20 chars (not a stub)
- [ ] Word limit (if provided) must be integer > 0
- [ ] Show error + re-prompt on validation failure

### C05-F03: Outline Generation

- [ ] Load student + university profiles
- [ ] Send to Gemini: "Generate an essay outline for [essay type] to this prompt: [prompt]. Student background: [profile]. Target university: [profile]. Provide: (1) hook/opening ideas; (2) main body structure (3–4 paragraphs); (3) conclusion; (4) 2–3 inspiration samples (labeled as INSPIRATION, not to be submitted)."
- [ ] Response is readable markdown with clear sections

### C05-F04: Disclaimer

- [ ] If response lacks disclaimer, prepend: "⚠️ IMPORTANT: The inspiration samples below are provided to help you understand how to draw on your own experiences. Do NOT submit them as your own work. Use them only as a reference for tone, structure, and how to connect your profile to the prompt. Your essay must be written in your own voice."
- [ ] Disclaimer appears at top of generated markdown

### C05-F05: Persistence

- [ ] Save to `university-ao/students/<slug>/universities/<uni_slug>/essays/<timestamp>/<type>-<hash>.md`
- [ ] Hash is DJB2 hash of prompt text (stable, allows dedup)
- [ ] User can list all essays per university, view each, export to PDF

---

## Error Handling

- [ ] Missing profiles → show error, don't generate
- [ ] Gemini timeout → offer retry
- [ ] Empty prompt → validation error, re-prompt

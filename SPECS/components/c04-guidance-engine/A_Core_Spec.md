---
name: c04-guidance-engine-core
description: C04 Guidance Engine — Feature specification
---

Architecture refs: 0_Overview.md, 2_UX.md

# C04 — Guidance Engine: Core Specification

---

## Features

| Feature ID | Description | Status | Req Ref |
| :--------- | :---------- | :----- | :------ |
| C04-F01 | Load student + university profiles | Ready | REQ-0005 |
| C04-F02 | Analyze student fit to university | Ready | REQ-0005 |
| C04-F03 | Generate personalized guidance via Gemini | Ready | REQ-0005 |
| C04-F04 | Display guidance in markdown format | Ready | REQ-0005 |
| C04-F05 | Persist guidance (timestamped snapshots) | Ready | REQ-0010 |

---

## Acceptance Criteria

### C04-F01: Load Profiles

- [ ] Verify student profile exists
- [ ] Verify university profile exists
- [ ] Load both as markdown (human-readable for AI)
- [ ] Show error if either missing

### C04-F02: Fit Analysis

- [ ] Extract key strengths from student profile (GPA, test scores, top activities)
- [ ] Extract university priorities from university profile (ideal traits, academic focus)
- [ ] Identify overlaps and gaps

### C04-F03: Guidance Generation

- [ ] Send prompt to Gemini: "Student [name] with [profile summary] is applying to [university name] which seeks [university priorities]. Generate personalized college guidance covering: (1) how student's strengths align with university values; (2) areas to highlight in essays; (3) potential concerns and how to address them."
- [ ] Gemini response is 3–5 paragraphs of readable markdown
- [ ] Include actionable advice (e.g., "Emphasize your leadership in Math Club, which matches Stanford's collaborative research environment")

### C04-F04: Display Guidance

- [ ] Show generated markdown to user (paginated if > 80 cols)
- [ ] Offer: Save, Edit, Discard, Share (PDF export)

### C04-F05: Persistence

- [ ] Save to `university-ao/students/<slug>/universities/<uni-slug>/guidance/<timestamp>/guidance.md`
- [ ] Timestamp format: ISO 8601
- [ ] User can view all guidance versions per university (list by timestamp)

---

## Error Handling

- [ ] Missing profile → show clear error, don't attempt guidance
- [ ] Gemini timeout → offer retry (with 30s delay)
- [ ] Empty response from Gemini → show error, offer retry

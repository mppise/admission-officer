---
name: c04-core-spec
description: Core spec for C04 Guidance Engine
---

# C04 Guidance Engine — Core Specification

**Component:** Guidance Engine  
**Purpose:** Generate personalized fit analysis matching student profile to university profile  
**Status:** Ready (implementation in progress)

---

## Features

| Feature ID | Description | Status | Req Ref |
|:---|:---|:---|:---|
| C04-F01 | Generate guidance report: student strengths → university fit analysis | Ready | REQ-0008 |
| C04-F02 | View guidance report (display markdown) | Ready | REQ-0008 |
| C04-F03 | List guidance reports by timestamp | Ready | REQ-0008 |

---

## Acceptance Criteria

### C04-F01: Generate Guidance
- [ ] Requires student profile.md and university profile.md to exist
- [ ] Calls Gemini with c04-guidance-generate.prompt.md
- [ ] Substitutes {{STUDENT_PROFILE}} and {{UNIVERSITY_PROFILE}} into prompt
- [ ] Output: markdown report with sections: Overview, Strengths, Opportunities, Key Messages for Essay
- [ ] Persisted to workspace/students/{slug}/universities/{uni_slug}/guidance/{timestamp}/guidance.md
- [ ] Timestamp: YYYY-MM-DD-HHMM format
- [ ] Retry: 1 automatic retry after 30s if Gemini fails

### C04-F02: View Guidance
- [ ] Display markdown to stdout
- [ ] User can copy/paste or export to PDF (via C06)

### C04-F03: List Guidance
- [ ] List all timestamps in reverse chronological order
- [ ] User can select timestamp to view

---

## Error Handling

| Scenario | Error Message | Recovery |
|:---|:---|:---|
| Student profile missing | "No student profile found. Build a student profile first." | Return to menu |
| University profile missing | "No university profile found. Build a university profile first." | Return to menu |
| Gemini API fails | "Guidance generation failed. Retrying in 30 seconds..." | Auto-retry 1×, then error |
| Empty Gemini response | "Gemini returned empty response. Try again." | User can retry |
| File write fails | "Could not save guidance: [error]" | User can retry or skip |

---

## Design Notes

- **Prompt file:** c04-guidance-generate.prompt.md with {{STUDENT_PROFILE}}, {{UNIVERSITY_PROFILE}} placeholders
- **Output:** Markdown formatted for human reading + PDF export (via C06)
- **Tone:** Constructive, emphasizing student's strengths; actionable for essay writing

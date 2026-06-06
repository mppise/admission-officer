# Ideation Artifact — university-admission-officer v1.0

**Date:** 2026-06-06
**Source:** Reverse-engineered from existing codebase

---

## Problem Statement

High school students navigating selective college admissions lack personalised, data-anchored guidance. Generic advice cannot account for a student's actual profile (GPA, activities, awards, research) or a specific university's stated and implied selection criteria. Students need a tool that:

1. Captures their complete academic and extracurricular profile in structured form
2. Extracts what each target university truly values from public web content
3. Generates specific, actionable guidance that cross-references the student's real data against each university's ideal candidate profile
4. Helps students frame their essays in ways that signal genuine fit

---

## Solution Summary

A local-first CLI tool (with optional web UI) that guides a student through:
- Building a structured profile (academics, tests, activities, awards, shadowing, research)
- Scraping each target university's public website to build a competitive intelligence profile
- Generating a prescriptive guidance report per university
- Producing essay outlines with inspiration samples anchored to the student's real experiences

All AI calls use Google Gemini. All data persists locally in a `university-ao/` workspace. No cloud accounts, no data upload beyond Gemini API calls.

---

## Recommendation

**proceed**

The problem is real, the solution is technically feasible, and a v1.0 implementation exists and is functional.

---

## Ideation Blockers

None.

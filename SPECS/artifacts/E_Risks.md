---
name: risks
description: Living register of all risks identified during specification. Review and mark each as accepted [X], mitigated [M], rejected [-], deferred [>], or pending [ ].
license: Apache-2.0 (see LICENSE in project root)
---

# Risks

> An unreviewed risk is an unmanaged risk. This register must be reviewed before dependent work begins.
> High-severity risks with no mitigation or owner must be escalated before implementation proceeds.
>
> **Status codes:** `[ ]` Pending · `[X]` Accepted · `[M]` Mitigated · `[-]` Dismissed · `[>]` Deferred
>
> **Likelihood:** `H` High · `M` Medium · `L` Low
>
> **Severity:** `H` High · `M` Medium · `L` Low
>
> **Risk score** = Likelihood × Severity → `HH` = critical · `HM` / `MH` = significant · `MM` = moderate · anything with `L` = low

---

## Summary

| Total | Pending `[ ]` | Accepted `[X]` | Mitigated `[M]` | Dismissed `[-]` | Deferred `[>]` | Critical `HH` |
| :---: | :-----------: | :------------: | :-------------: | :-------------: | :------------: | :-----------: |
| 5 | 0 | 5 | 0 | 0 | 0 | 0 |

---

## Critical & High Priority

> Risks scored `HH`, `HM`, or `MH`. Must be resolved or have an active mitigation plan before work begins.

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-TC-AO000001 | University websites use bot-protection (Cloudflare, CAPTCHA) that blocks Playwright | M | H | MH | Use Playwright with realistic browser headers and user-agent; respect rate limits | Log failed URLs to `failed-urls.md`; surface actionable message to user | DevAgent | Planning gate |

---

## Technical

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-TC-AO000002 | Gemini API quota exceeded mid-session (e.g., during university profile build with many pages) | M | M | MM | Batch page content before sending to Gemini; minimize API calls per command | Retry once after 30s; surface quota error with link to Google AI Studio quota page | DevAgent | Planning gate |
| `[X]` | R-TC-AO000003 | Puppeteer PDF rendering produces poorly formatted output for complex markdown | L | M | LM | Use a clean CSS template for the HTML→PDF pipeline; test with real profile data | Allow user to open the source markdown directly as fallback | DevAgent | Detailed Design |

## Business & Product

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-BP-AO000001 | Students use Gemini-generated essay samples as direct submission content despite inspiration-only labeling | M | M | MM | Label samples prominently in output and PDF; include disclaimer in CLI output | Out of scope to prevent technically; handled via UX messaging | DevAgent | Planning gate |

## External Dependencies & Integrations

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |
| `[X]` | R-EX-AO000001 | Google Gemini API deprecates the model specified in `.env` or changes the SDK interface | L | H | LH | Pin SDK version in `package.json`; document model upgrade path in README | User updates `GEMINI_MODEL` in `.env`; bump SDK version | DevAgent | Deployment Readiness |

## People & Process

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |

## Security & Compliance

| Status | ID | Risk | Likelihood | Severity | Score | Mitigation | Contingency | Owner | Review by |
| :----: | :- | :--- | :--------: | :------: | :---: | :--------- | :---------- | :---- | :-------: |

---

## Dismissed Risks Log

| ID | Risk | Dismissed by | Date | Rationale |
| :- | :--- | :----------- | :--: | :-------- |

---

## Change History

| ID | Description | Date | Author |
| :- | :---------- | :--: | :----- |
| CHG-001 | Initial risks identified during Planning | 2026-05-24 | SpecGantry |

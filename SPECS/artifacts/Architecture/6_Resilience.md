---
name: b-architecture-resilience
description: Error handling patterns, resilience strategies, and failure classification
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Resilience & Error Handling

> **Audience:** Backend · SRE
> Define the system-wide resilience pattern. Components implement against this pattern; specific thresholds are set per component.

---

## 1. Chosen Pattern

<!-- State the resilience approach adopted system-wide.
     e.g., "All calls to external or inter-component dependencies use circuit breakers with exponential backoff and jitter."
     e.g., "Retry is permitted for transient errors only; permanent errors fail fast and surface to the caller." -->

---

## 2. Error Classification (System-Wide)

| Class | Definition | Retry allowed? | User-visible? |
| :---- | :--------- | :------------- | :------------ |
| Transient | network blip, timeout | Y | N |
| Permanent | invalid input, 404 | N | Y |
| Upstream | third-party outage | Y (circuit break) | Degraded |
| User-caused | auth failure, bad input | N | Y |

---

## 3. User-Facing Error Tone

<!-- Global standard: tone, detail level, actionability.
     e.g., "Friendly, non-technical, always actionable. Never expose internal error codes to end users." -->

> 🔽 **Deferred to Detailed Design:** Retry counts, backoff durations, circuit breaker thresholds, specific fallback behaviors, and per-feature degradation modes — resolved per component in `C_Operational_Specs.md`.

---
name: b-architecture-observability
description: Observability standards — logging, tracing, analytics, and SLO targets
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Observability Standards

> **Audience:** SRE · Engineers
> Define the system-wide standards. Components implement against these; SLO targets are set per component.

---

## 1. Logging Standard

| Concern | Standard |
| :------ | :------- |
| Format | <!-- structured JSON --> |
| Required fields | <!-- service, traceId, level, timestamp, correlationId --> |
| Centralized sink | <!-- CloudWatch / Datadog / ELK --> |
| PII in logs | Prohibited |

---

## 2. Distributed Tracing

| Concern | Standard |
| :------ | :------- |
| Framework | <!-- OpenTelemetry --> |
| Correlation ID propagation | |
| Sampling rate | |

---

## 3. Product Analytics Platform

<!-- Platform choice only (e.g., Mixpanel, PostHog). Key events and funnel definitions are per component. -->

> 🔽 **Deferred to Detailed Design:** SLO targets, alert thresholds, on-call ownership, dashboard design, and key analytics events tracked — resolved per component in `C_Operational_Specs.md`.

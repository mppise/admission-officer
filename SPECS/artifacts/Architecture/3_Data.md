---
name: b-architecture-data
description: Data architecture, storage strategy, and entity relationships
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Data Architecture

> **Audience:** Backend · Data

---

## 1. Core Entities & Relationships

<!-- Identify core entities and their relationships at a high level.
     e.g., User —< Order >— Product  (one-to-many, many-to-many)
     Detailed schemas live in component specs. -->

---

## 2. Storage Strategy

| Store type | Technology | Used for | Owning component(s) |
| :--------- | :--------- | :------- | :------------------ |
| Primary DB | | | |
| Cache | | | |
| Object / blob | | | |
| Vector store | | | |
| Queue / stream | | | |

---

## 3. Data Ownership Rules

<!-- Which component owns each core entity?
     Who may write vs. read? State the rule, not the implementation.
     Avoid shared mutable state across components. -->

> 🔽 **Deferred to Detailed Design:** Field-level schemas, retention periods, archival pipelines, PII-specific handling — resolved per component in `C_Operational_Specs.md`.

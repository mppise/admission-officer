---
name: decisions
description: Living register of actionable, deferred, and actioned decisions. Updated conversationally during Design and Development phases.
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Decisions & Assumptions

Latest gate: [Phase name] · [Date]

## Actionable (Blocking Progression)

Items that **MUST** be resolved before next phase gate. If any rows exist, gate is **BLOCKED**.

| ID | Category | Item | Owner | Target resolve | Notes |
|----|----------|------|-------|-----------------|-------|

## Parking Lot (Deferred, Does NOT Block Gate)

Low-risk items deferred to later phase. Gate passes **IF** each item has credible mitigation + owner + target resolve date.

| ID | Category | Item | Reason for deferral | Mitigation | Owner | Target resolve |
|----|----------|------|-------|-----------|-------|-----------------|

## Actioned (Resolved, Ready to Reference)

Locked decisions; no longer blocking. Moved from Actionable or Parking Lot after approval.

| ID | Category | Item | Resolved at | Resolution | Rationale |
|----|----------|------|---------|------------|-----------|

## Archive

Historical decisions from prior releases: see [_Decisions.md](./_Decisions.md)

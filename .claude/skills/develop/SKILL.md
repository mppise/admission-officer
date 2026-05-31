---
name: develop
description: Unified Development + inline audit phase. Implements components per spec, runs tests, audits for traceability + compliance, and marks release ready. No separate Deployment Readiness phase.
author: Mangesh Pise <mppise@anthropic.com>
license: Apache-2.0
---

# Develop Skill

## SKILL STARTUP: Auto-Compact Check

```bash
if bash .claude/hooks/compact-check.sh; then
  echo "⏳ Context compaction required. Running /compact..."
  # Invoke /compact, then resume below after SESSION HANDSHAKE re-runs
fi
```

---

**Phase:** Development (includes inline audit; no separate Deployment Readiness)

**Entry:** All components have Ready specs in `./SPECS/components/`

**Exit:** All components Complete + inline audits PASS + Decisions.md Actionable empty + release marked ready in VERSION History

**Deliverables:**
- Full implementation of all components in `./src/`
- Tests passing at thresholds defined in component specs
- Inline audit results (PASS/FAIL) per component + system
- Release assigned + marked ready in `./STATUS.md` Version History
- Deployment scripts created (if audit PASS)

---

## Startup Checklist (Phase Gating — STRICT)

**CRITICAL RULE:** No code changes without Design gate passing. This is non-negotiable.

1. Read `./STATUS.md` — check current phase
   - If Design = ✅ Complete: Proceed to Development
   - If Design = ⬜ or 🔄: **BLOCK.** "Design not complete. Resume `/design` first to create/finalize component specs."
   - If Ideation = ⬜ or 🔄: **BLOCK.** "Ideation not complete. Run `/ideate` first."
   - If Development = 🔄 In progress: Resume Development, continue with incomplete components
   - If Development = ✅ Complete: Development done. Release ready. You can re-iterate in future phase.

2. Verify all component specs exist and are Ready:
   - For each component in Project.md:
     - Check `./SPECS/components/<component>/A_Core_Spec.md` exists
     - Check `./SPECS/components/<component>/B_Specification.md` exists
     - Check STATUS.md shows component status = ✅ Ready (not ⬜ or 🔄)
   - If any missing or not Ready: **BLOCK.** "Component spec `<name>` not ready. Resume `/design` to complete it. Cannot start `/develop` until all specs are Ready."

3. Read each component spec in `./SPECS/components/` — these are your requirements

4. Review `./SPECS/artifacts/Decisions.md` Actionable + Parking Lot tables, escalate blockers

5. Confirm with DevLead: code structure (languages, frameworks, build system)

**If any gating check fails, refuse to proceed and explain which artifact is missing.**

---

## Stage 1: Implementation

For each in-scope component, implement all features per spec using TDD (test first, implement to pass, refactor):

1. Read component spec (A_Core_Spec.md, B_Specification.md)
2. Implement all features in `./src/` per spec. Apply CLAUDE.md Definition of Done for each feature:
   - Add feature ID in code comments at entry point: `// [C01-F01] Handles login` (per CLAUDE.md Code-Level Traceability)
   - Implement inline code documentation per CLAUDE.md "Inline Code Documentation" standards
   - Match all interfaces exactly per B_Specification.md
   - Satisfy all B_Specification.md requirements (error handling, security, observability, etc.)
3. Write tests at coverage thresholds (per CLAUDE.md Testing Requirements; e.g., 80% line coverage from B_Specification.md). All tests pass.
4. Run formatter + linter. Zero errors required.
5. Manually test all features from component spec.
6. Mark Feature Status in A_Core_Spec.md as `In Progress` (per CLAUDE.md Feature Status Values table)

**Fast-tracks during this stage:**
- **Hotfix (<20 LOC):** Write 1-page spec, get DevLead approval, implement + test, add decision to Decisions.md (move to Actioned after approval)
- **Lightweight Enhancement (<50 LOC):** Same as hotfix
- **Spec Amendment:** Tag with `CHG-XXX`, get DevLead approval, update spec + code, re-run tests

---

## Stage 2: Component Inline Audit

For each completed component, perform audit using CLAUDE.md Definition of Done as checklist:

1. **Spec-Code Match:** Every feature in code maps back to A_Core_Spec.md (verify feature ID in comments per CLAUDE.md Code-Level Traceability)
2. **Interface Match:** All request/response envelopes match B_Specification.md exactly (parameter names, error codes, event formats)
3. **Operational Match:** All B_Specification.md requirements satisfied (per CLAUDE.md Definition of Done):
   - Error handling strategy applied
   - Security controls in place
   - Observability (logging/tracing) in place per CLAUDE.md standards
   - Notifications sent per spec
   - Data handled per spec (formats, validation, storage)
   - Scalability/performance considerations addressed
4. **Secrets Audit:** Scan code for hardcoded secrets, API keys, PII per CLAUDE.md Definition of Done. **FAIL if any found.** Do not proceed.
5. **Tests:** All tests passing at thresholds per CLAUDE.md Testing Requirements; coverage tool confirms threshold met
6. **Documentation:** User docs (if UI) or API docs (if service) generated per CLAUDE.md Definition of Done
7. **Traceability:** Every feature in code traces backward to Project.md REQ-NNNN via component spec Req Ref column per CLAUDE.md Requirement Traceability
8. Mark component audit result (PASS or FAIL) in `./STATUS.md` Component Status Tracker

If FAIL: Fix, re-audit. Do not mark Complete until PASS.
If PASS: Mark Feature Status `Complete` (per CLAUDE.md Feature Status Values), proceed to Stage 3.

---

## Stage 3: System Audit & Deployment

After all components Complete with component audits PASS:

1. **Integration:** Test all components together (cross-component interfaces, data flows)
2. **End-to-End:** Run E2E tests defined in B_Specification.md
3. **Decisions:** Decisions.md Actionable table must be empty before release. Escalate blockers.
4. **Release Assignment:** Assign release number (major.minor.patch per Architecture/ versioning)
5. **Version History:** Update `./STATUS.md` Version History:
   - Version = release number
   - Status = 🔄
   - Audit Status = PASS (all audits PASS) or FAIL (any failure)
   - Deployment ready on = [today] (if PASS)
6. **Deployment Scripts (if PASS):** Generate/update scripts in `./deploy/` (e.g., `./deploy/rel_2024.01.15.1400/go.sh`)

Overall verdict: PASS (all + system audit PASS) or FAIL (any failure).

If FAIL: Fix failures, re-audit affected components (back to Stage 2), return to Stage 3.

---

## Stage 4: Gate Confirm

1. All in-scope components show Complete in STATUS.md Component Status Tracker
2. All inline audits show PASS. System audit = PASS. Deployment scripts created.
3. Decisions.md Actionable table empty. Parking Lot items have mitigations.
4. Version History entry shows release number + Audit Status PASS + marked ready on [today]
5. User docs generated (if UI features). API docs updated (if service features).
6. Confirm: "Ship phase complete, ready for deployment" and await DevLead final confirmation

---

## Key Points

- **Spec wins:** Spec always wins over personal preference. If code diverges from spec, update spec first (via amendment), then update code.
- **Audit is mandatory:** Every component + system must PASS before release. You catch spec-code mismatches, secrets, traceability gaps before DevLead sees them.
- **Maintain STATUS.md:** Move components In Progress → Complete as audits PASS. Update Project Status to Development: Complete when all done.
- **Fast-track handling:** Record hotfix/enhancement decisions in Decisions.md. Mark escalation rule if pattern emerges (so next release DevLead considers full Design).
- **Secrets block release:** Scan for secrets, API keys, PII. If any found, FAIL audit immediately and report to DevLead before proceeding.
- **Validate inline:** Surface conflicts early, don't batch for end-of-phase review.

---

## Scope

**Files in scope (created/modified):**
- `./src/` (full implementation)
- `./STATUS.md` — Component Status Tracker, Version History
- `./deploy/` (deployment scripts if audit PASS)
- Component specs A_Core_Spec.md (Feature Status, Change History if amended)
- `./SPECS/artifacts/Decisions.md` (fast-track decisions if applicable)

**Files read-only:**
- `./SPECS/artifacts/Architecture/` (locked; no amendments)
- `./SPECS/components/<component>/B_Specification.md` (locked unless amended per Stage 1)

**Standards:** CONTRACT.md §4.5.1 (artifact IDs), CLAUDE.md (feature status, Definition of Done, testing requirements)

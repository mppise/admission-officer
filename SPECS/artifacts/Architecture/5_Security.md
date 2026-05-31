---
name: b-architecture-security
description: Security model, authentication, authorization, encryption, and compliance obligations
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Security Model & Compliance

---

## 1. Security Model

> **Audience:** Security · Backend
> 🔒 Every section must be explicitly addressed. If a concern does not apply, state why.

### 1.1 Authentication

| Concern | Detail |
| :------ | :----- |
| Mechanism | <!-- JWT / OAuth2 / API key / mTLS / session --> |
| Provider | <!-- Auth0 / Cognito / Firebase / internal IdP --> |
| Token expiry & refresh | |
| Revocation mechanism | |
| Intentionally public surfaces | <!-- list or "none" --> |

### 1.2 Authorization

| Concern | Detail |
| :------ | :----- |
| Model | <!-- RBAC / ABAC / ACL / policy-based --> |
| Roles & permissions | <!-- high-level role names and what they govern --> |
| Enforcement layer | <!-- middleware / service layer / DB RLS --> |
| Least-privilege confirmation | |

### 1.3 Encryption Standards

| Concern | Standard |
| :------ | :------- |
| In transit | <!-- TLS 1.2+ minimum --> |
| At rest | <!-- AES-256, KMS --> |

### 1.4 Secrets Management

| Concern | Detail |
| :------ | :----- |
| Secret store | <!-- AWS Secrets Manager / Vault / GitHub Actions --> |
| No secrets in source / logs | Confirmed |
| Rotation policy | |

> 🔽 **Deferred to Detailed Design:** Per-endpoint input validation, field-level encryption needs, XSS/injection controls, file upload handling, full threat surface assessment, and per-vendor security obligations — resolved per component in `C_Operational_Specs.md`.

---

## 2. Compliance & Privacy

> **Audience:** Legal · Compliance
> ⚖️ Identify binding obligations here. Components resolve the implementation details.

### 2.1 Applicable Regulations

<!-- Check all that apply and note the primary obligation triggered:
     - [ ] GDPR
     - [ ] CCPA / CPRA
     - [ ] HIPAA
     - [ ] PCI-DSS
     - [ ] SOC 2
     - [ ] ISO 27001
     - [ ] COPPA
     - [ ] Other: ___
     If none apply: state the basis for that conclusion explicitly. -->

### 2.2 Cross-Border Transfer Rules

<!-- If data crosses jurisdictions: transfer mechanism (SCCs / adequacy decision / BCRs) and storage restrictions. -->

> 🔽 **Deferred to Detailed Design:** PII/sensitive data inventory, lawful basis and consent implementation, data subject rights mechanisms, audit logging specifics, incident response procedures, and per-vendor DPA/BAA status — resolved per component in `C_Operational_Specs.md`.

---
name: b-architecture-stack
description: Technical stack, AI technologies, and deployment topology decisions
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Technical Stack & AI Technologies

---

## 1. Technical Stack

> Standardize wherever possible. Per-component deviations must be explicitly flagged in the component spec.

| Layer | Technology | Rationale | Source Path |
| :---- | :--------- | :-------- | :---------- |
| **Data** | | | `./src/db` |
| **API / Middleware** | | | `./src/api` |
| **AI** | | | `./src/ai` |
| **Configuration** | JSON | Central behaviour config | `./src/config` |
| **App credentials** | | | `./src/credentials` |
| **External service credentials** | | | `./src/credentials` |
| **User experience** | | | `./src/ui` |
| **Container** | Docker | | `Dockerfile` |

> 🔽 **Deferred to Detailed Design:** Version pinning rationale, per-component library additions (proposed in component spec, approved via `Decisions.md`).

---

## 2. AI Technologies

> **Audience:** Engineers · AI/ML

| Concern | Choice | Notes |
| :------ | :----- | :---- |
| **LLM** | <!-- Anthropic Claude / Google Gemini / OpenAI GPT --> | |
| **Text-embedding model** | | |
| **Vector database** | | |
| **Prompt storage** | Markdown files in `./src/ai/prompts/` | One file per prompt, versioned in source control |
| **MCP servers deployed** | <!-- Y / N — if Y, list --> | |
| **MCP servers consumed** | <!-- Y / N — if Y, list --> | |

> 🔽 **Deferred to Detailed Design:** Prompt design, model parameters, streaming behavior, confidence indicators, and AI failure fallbacks — resolved per component in `B_Specification.md`.

---

## 3. Deployment Topology

> **Audience:** DevOps · SRE

### 3.1 Environment Matrix

| Environment | Purpose | Mirrors prod? | Access |
| :---------- | :------ | :------------ | :----- |
| dev | local development | N | engineers |
| staging | pre-release validation | Y | engineers + QA |
| prod | live system | — | ops + on-call |

### 3.2 Component Deployment Map

| Component | Platform | Region | Scaling model |
| :-------- | :------- | :----- | :------------ |

### 3.3 Containerization Standard

<!-- Base image policy, multi-stage build requirement, image registry. -->

### 3.4 Deploy Mechanism

| Concern | Detail |
| :------ | :----- |
| Trigger | <!-- merge to main / manual / tagged release --> |
| Deploy tool | <!-- GitHub Actions / ArgoCD / Terraform --> |
| Rollback strategy | <!-- previous image tag / blue-green / feature flags --> |

> 🔽 **Deferred to Detailed Design:** Health check implementation, runtime env var names, secrets injection specifics, component deploy ordering, and infrastructure pre-requisites — resolved per component in `B_Specification.md`.

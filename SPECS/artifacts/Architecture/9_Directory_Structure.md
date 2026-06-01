---
name: a-architecture-directory-structure
description: Source code directory structure, file organization conventions, and validation rules
author: Mangesh Pise <mppise@gmail.com>
license: Apache-2.0 (see LICENSE in project root)
---

# Directory Structure & Conventions

This section defines the canonical source tree layout, file organization by domain, and enforcement rules for consistent architecture across development.

---

## Source Code Tree

```
src/
├── ai/                        # AI & LLM components
│   ├── prompts/              # All system prompts (Markdown format)
│   │   ├── system.md         # Base system prompt
│   │   ├── extraction.md     # Domain-specific prompts
│   │   └── *.md              # One prompt per file
│   ├── client.ts             # LLM API client wrapper
│   ├── models.ts             # Type definitions & model enums
│   └── reasoning.ts          # Prompt composition & reasoning loops
│
├── db/                        # Database layer
│   ├── migrations/           # Schema migrations (versioned)
│   │   ├── 001_init.sql
│   │   └── *.sql
│   ├── schema.ts             # TypeScript type definitions from DB
│   ├── queries.ts            # Query builders & prepared statements
│   └── client.ts             # Database connection management
│
├── api/                       # HTTP API layer
│   ├── handlers/             # Route handlers per endpoint
│   │   ├── users.ts
│   │   ├── resources.ts
│   │   └── *.ts
│   ├── middleware.ts         # Auth, logging, error handling
│   ├── routes.ts             # Route registration
│   └── server.ts             # Server initialization
│
├── types/                     # Global TypeScript types
│   ├── index.ts              # Type re-exports
│   ├── requests.ts           # Request/response envelopes
│   ├── errors.ts             # Error code enums
│   └── domain.ts             # Domain-specific types
│
├── utils/                     # Shared utilities
│   ├── logger.ts             # Logging abstraction
│   ├── errors.ts             # Error factory
│   ├── validators.ts         # Input validation
│   └── *.ts                  # Other utilities
│
├── config/                    # Configuration & environment
│   ├── index.ts              # Config loading & validation
│   └── defaults.ts           # Default values
│
└── index.ts                  # Entry point / exports
```

---

## Component Ownership & Directory Allocation

Each component in `./SPECS/components/` has exclusive ownership of its implementation directory:

| Component | Owned Directory | Scope |
|-----------|-----------------|-------|
| AI Engine | `src/ai/` | Prompts, model clients, reasoning |
| Database | `src/db/` | Migrations, schema, queries |
| API Server | `src/api/` | Routes, handlers, middleware |
| Shared Types | `src/types/` | Global types used across components |
| Utilities | `src/utils/` | Shared functions, logging, errors |

---

## Naming Conventions

### Files

- **TypeScript:** kebab-case (`.ts`)
  - `user-service.ts`, `auth-middleware.ts`
  - Exception: `index.ts` for barrel exports

- **SQL:** PascalCase with version prefix (`.sql`)
  - `001_InitSchema.sql`, `002_AddUsersTable.sql`
  - Versions immutable—never edit existing migration; create new one

- **Markdown Prompts:** lowercase-kebab-case (`.md`)
  - `system.md`, `user-extraction.md`, `reasoning-chain.md`
  - Organize into `src/ai/prompts/` flat or by category subdirectory

### Directories

- lowercase-kebab-case for functional grouping: `src/api/handlers/`, `src/db/migrations/`
- PascalCase discouraged; use lowercase unless migrating legacy code

---

## Enforcement Rules

### Rule 1: Prompts — Markdown Only

**Requirement:** Every system prompt, chain-of-thought template, or LLM instruction **must** be stored in `src/ai/prompts/*.md`.

**Rationale:** Prompts are living specifications; markdown enables version control, diff reviews, and auditing. Inline strings in code hide prompt changes from spec review.

**Violation detection:**
- Code review: grep for string literals containing `"You are"` or `"System:"` in `src/ai/`
- Inline audit: verify no prompt content in TypeScript files, all prompts in `src/ai/prompts/`

**Format:** Each prompt in its own `.md` file with frontmatter (optional):
```markdown
---
purpose: User input extraction for contract analysis
version: 1.0
---

# Extract Contract Entities

You are a contract analysis assistant. Extract the following entities...
```

### Rule 2: Database Migrations — Immutable

**Requirement:** All schema changes in `src/db/migrations/*.sql`, versioned sequentially and never edited.

**Rationale:** Immutability ensures audit trail and prevents accidental rollback corruption.

**Violation detection:**
- Hook (optional): Prevent edits to `src/db/migrations/*.sql` — only allows new files
- Code review: Verify all schema changes are CREATE/ALTER statements, no UPDATE/DELETE on schema

**Format:** One logical change per file. Examples:
```sql
-- 001_InitSchema.sql
CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255));

-- 002_AddRoles.sql
ALTER TABLE users ADD COLUMN role VARCHAR(50);
```

### Rule 3: API Routes — Centralized Registration

**Requirement:** All HTTP routes registered in `src/api/routes.ts`; handlers in `src/api/handlers/`.

**Rationale:** Single source of truth for endpoint inventory; handlers remain testable and isolated.

**Violation detection:**
- Grep: No `app.get()`, `app.post()` outside `src/api/routes.ts`
- Code review: Verify all handlers in `src/api/handlers/`, not inline in routes file

### Rule 4: Feature-to-File Traceability

**Requirement:** Every feature in `A_Core_Spec.md` has a corresponding entry point in code with Feature ID comment.

**Format at entry point:**
```typescript
// [C01-F01] Extract contract clauses from uploaded documents
export async function extractClauses(contractText: string): Promise<Clause[]> {
  // ...
}
```

**Violation detection:**
- Inline audit: Every feature in `A_Core_Spec.md` must have a code location with `// [CXX-FXX]` comment
- Grep: `grep -r '\[C[0-9]{2}-F[0-9]{2}\]' src/`

---

## Deferred to Detailed Design

Per-component details (file-level APIs, interface contracts, error handling) are specified in component `B_Specification.md` documents in `./SPECS/components/<component>/`.

---

## Updating Directory Structure

**During Design Phase:**
- Finalize structure before component specs are written
- Document component ownership (which owns which directory)
- Update this file with changes, tag with version/decision ID

**During Development Phase:**
- Structure must match this spec exactly
- Bounded amendments require inline audit review (no separate gate)
- Moving files requires updating all Feature ID comments and Req Ref mappings

**During Code Review:**
- Verify new code lands in correct directory per ownership
- Verify Feature ID comments at entry points
- Reject files outside designated directories (e.g., handler in `src/ai/` not `src/api/handlers/`)

---

## Related Standards

- **Feature Traceability:** See CLAUDE.md § Requirement Traceability for Feature ID format
- **Definition of Done:** See CLAUDE.md § Definition of Done (Feature ID in code is required)
- **Component Specs:** See `./SPECS/components/<component>/A_Core_Spec.md` for per-component feature inventory
- **API Contracts:** See `./SPECS/components/<component>/B_Specification.md` for interface details

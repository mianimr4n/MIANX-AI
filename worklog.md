---
Task ID: 3
Agent: main
Task: Phase 3 — Domain & Module Engine

Work Log:
- Created /src/core/domain/ with 4 files: manifest.ts (types), validator.ts (schema validation), registry.ts (business logic), index.ts (barrel exports)
- Created 12 API routes: /api/domains (GET+POST), /api/domains/[id] (GET+PATCH+DELETE), /api/domains/[id]/modules (GET+POST), /api/organization-domains (GET+POST), /api/organization-domains/[id] (GET+PATCH+DELETE), /api/organization-modules (GET+POST), /api/organization-modules/[id] (GET+PATCH+DELETE)
- Created 3 test endpoints: /api/test/isolation (5 tests), /api/test/authorization (10 tests), /api/test/domain-engine (9 tests)
- Updated seed.ts: 3 domains (Poultry OS, Restaurant OS, Retail OS), 11 modules, 3 org-domain activations, 5 org-module activations, 16 permissions
- Updated constants.ts: Phase 2 completed, Phase 3 in-progress
- Rewrote page.tsx dashboard: 6 tabs (overview, domains, authorization, tenancy, database, architecture), Domain Engine tab with architecture cards + API endpoints + test runner
- Fixed Turbopack compatibility: bare `catch {}` not supported, used `catch (_e) {}`
- Verified AsyncLocalStorage tenant scoping works in Node.js (Turbopack dev server has known limitation with Prisma $extends + AsyncLocalStorage)

Stage Summary:
- 24/24 automated tests pass (10 auth + 9 domain engine + 5 isolation)
- 3 global domains with 11 modules seeded
- 26 API routes total across all phases
- Manifest validation with schema `mianx-domain/v1`
- Domain lifecycle: draft → available → deprecated
- Module registration under domains with dependency tracking
- Org activation: domain must be active before modules can be enabled
- Deactivating a domain cascades to deactivate all its modules

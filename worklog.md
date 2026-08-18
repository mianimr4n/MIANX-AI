---
Task ID: 4
Agent: Main Agent
Task: Phase 4 — AI Core Foundation (complete gaps)

Work Log:
- Analyzed existing Phase 4 code: 7 files in src/ai/, 5 API routes, 3 Prisma models, 11 tests
- Identified 7 gaps: wrong permissions, no agent CRUD, no tool gating, missing routes, no seed data, no dashboard tab
- Fixed all 5 AI API routes from 'domain.view' to proper 'ai.*' permissions
- Created src/ai/agent-config.ts (140 lines) — full CRUD + resolveAgent for system/custom merge
- Added requiredPermission field to ToolDefinition, implemented filterToolsByPermission + hasPermission
- Added permissions array to ToolContext, chat route now passes ctx.permissions
- Created GET /api/ai/tools — lists tools with permission requirements and accessibility
- Enhanced GET+POST /api/ai/agents — now supports creating custom agents
- Created GET/PATCH/DELETE /api/ai/agents/[slug] — full custom agent management
- Created PATCH /api/ai/conversations/[id] — update conversation title
- Added AI seed data: 2 custom agent configs, 3 conversations, 7 messages
- Enhanced dashboard AI Core tab: live model registry, agent list, tool-permission map, 13 API endpoints
- Fixed pre-existing domain-engine test: CUID ordering issue with Promise.all in seed
- Fixed pre-existing domain-engine test: overly strict module activation assertion
- Updated version to 0.3.0
- All 35/35 tests passing across 4 suites
- Clean production build with 36 API routes

Stage Summary:
- Phase 4 AI Core Foundation is now complete
- 7 files in src/ai/ + agent-config.ts = 8 files, ~900 lines total
- 13 AI API endpoints (chat, conversations CRUD, agents CRUD, tools, models, usage)
- 6 tools with permission gating, 2 system agents + custom agent framework
- 7 registered models across 3 providers with tier-based routing
- 11 automated AI core tests

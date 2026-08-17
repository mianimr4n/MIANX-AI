# Mianx.ai Roadmap - Body Part 2: Phases 0-5
def add_phases_0_5(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption, make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether, HRFlowable, ACCENT, TEXT_MUTED, add_heading):
    # ══════════════════════════════════════════════════════════
    # PHASE 0: PROJECT FOUNDATION
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('3. Phase 0: Project Foundation', s_h1, 0))
    story.append(Paragraph('Duration: Week 1-2', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(0, 'PROJECT FOUNDATION', 'Week 1-2'))
    story.append(Spacer(1, 8))

    story.append(add_heading('3.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'The Foundation phase establishes the development environment, repository structure, and all tooling required for subsequent phases. This includes scaffolding the Next.js application with TypeScript, configuring the Supabase connection, setting up Prisma as the ORM, establishing environment variable management, and creating the basic folder structure that mirrors the conceptual architecture defined in the specification documents. No business logic is implemented in this phase; the sole focus is on creating a clean, well-organized, and runnable development environment that every subsequent phase can build upon reliably.',
        s_body))

    story.append(add_heading('3.2 Tasks', s_h2, 1))
    tasks_0 = [
        'Initialize Next.js 16 project with TypeScript, Tailwind CSS, and App Router configuration',
        'Configure Supabase client (both browser and server-side) with environment variables',
        'Set up Prisma ORM with PostgreSQL connection and migration framework',
        'Establish repository folder structure: apps/web, core/, ai/, automation/, domains/, database/',
        'Configure ESLint, Prettier, Husky pre-commit hooks, and TypeScript strict mode',
        'Set up environment variable management with .env.local and validation schema',
        'Create basic health-check API route and verify full dev-to-deploy pipeline',
        'Set up Vercel deployment configuration and verify preview/production deployments',
        'Install core dependencies: shadcn/ui, Vercel AI SDK, and utility libraries',
        'Document development workflow, branching strategy, and PR templates',
    ]
    for t in tasks_0:
        story.append(Paragraph(t, s_bullet, bulletText='-'))

    story.append(add_heading('3.3 Deliverables', s_h2, 1))
    deliv_0 = [
        ['Next.js project scaffold', 'Runnable app with /health endpoint returning 200'],
        ['Repository structure', 'All directories created per architecture spec section 25'],
        ['CI/CD pipeline', 'Vercel preview deployments on PR, production on merge to main'],
        ['Development documentation', 'README with setup instructions and architecture overview'],
    ]
    story.append(make_table(['Deliverable', 'Acceptance Criteria'], deliv_0,
        col_widths=[140, 315]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 2: Phase 0 deliverables', s_caption))

    story.append(add_heading('3.4 Dependencies', s_h2, 1))
    story.append(Paragraph(
        'No prior phases are required. This phase depends only on having a Supabase project provisioned and a Vercel account configured. The developer must have Node.js 20+, PostgreSQL access credentials, and appropriate Supabase and Vercel authentication tokens available in the local environment before starting this phase.',
        s_body))
    story.append(Spacer(1, 6))

    # ══════════════════════════════════════════════════════════
    # PHASE 1: DATABASE AND TENANCY
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('4. Phase 1: Database and Tenancy Foundation', s_h1, 0))
    story.append(Paragraph('Duration: Week 2-4', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(1, 'DATABASE AND TENANCY', 'Week 2-4'))
    story.append(Spacer(1, 8))

    story.append(add_heading('4.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase establishes the PostgreSQL database schema as the authoritative system of record for all Mianx.ai data. Every tenant-owned record must carry an explicit organization_id, and Row Level Security (RLS) policies must enforce tenant isolation at the database level. The database architecture follows the conceptual separation defined in the Data Platform specification: Core tables (organizations, users, memberships, roles, permissions) live alongside Domain tables in a single PostgreSQL cluster with logical separation. This phase also implements the Prisma data-access layer, the UUID-based ID strategy, and the audit log table that will capture all meaningful mutations throughout the platform lifecycle.',
        s_body))

    story.append(add_heading('4.2 Database Tables', s_h2, 1))
    tables_1 = [
        ['organizations', 'id (UUID), name, slug, status, timezone, locale, currency, created_at, updated_at'],
        ['profiles', 'id, display_name, avatar_url, locale, timezone, created_at, updated_at'],
        ['organization_memberships', 'id, organization_id, user_id, status, joined_at, UNIQUE(org, user)'],
        ['teams', 'id, organization_id, name, description, created_at, updated_at'],
        ['team_members', 'team_id, membership_id, UNIQUE(team, membership)'],
        ['roles', 'id, organization_id (nullable), name, slug, description, is_system'],
        ['permissions', 'id, key (e.g. organization.view), description, created_at'],
        ['role_permissions', 'role_id, permission_id, UNIQUE(role, permission)'],
        ['membership_roles', 'membership_id, role_id, UNIQUE(membership, role)'],
        ['settings', 'id, organization_id, scope_type, scope_id, key, value'],
        ['files', 'id, organization_id, uploaded_by, name, storage_path, mime_type, size'],
        ['audit_logs', 'id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata'],
        ['notifications', 'id, organization_id, recipient_user_id, type, title, body, data, read_at'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_1,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 3: Core database tables created in Phase 1', s_caption))

    story.append(add_heading('4.3 RLS Policies', s_h2, 1))
    story.append(Paragraph(
        'Every tenant-owned table receives Row Level Security policies. The core pattern uses a PostgreSQL helper function user_has_org_access(user_id, organization_id) that checks for an active membership record. SELECT policies use the USING clause, INSERT policies use WITH CHECK to validate the new row organization_id belongs to the authorized organization, and UPDATE policies use both USING and WITH CHECK to prevent cross-tenant data movement. DELETE policies verify organization ownership before allowing removal. These policies are defense in depth and complement the application-level authorization implemented in Phase 2, not replace it.',
        s_body))

    story.append(add_heading('4.4 Tasks', s_h2, 1))
    tasks_1 = [
        'Create initial Prisma schema with all Core tables and UUID primary keys',
        'Implement organization_id foreign key relationships and unique constraints',
        'Write and test RLS policies for all tenant-owned tables (SELECT, INSERT, UPDATE, DELETE)',
        'Create user_has_org_access() PostgreSQL helper function',
        'Implement Prisma client extensions for tenant-scoped queries',
        'Set up database migration workflow: design, migrate, validate, review, production',
        'Create seed script for development data (test organizations, users, roles)',
        'Write cross-tenant isolation tests: 5 mandatory test categories per spec',
        'Implement audit_logs trigger function for automatic mutation tracking',
        'Verify all indexes on organization_id, composite keys, and frequently queried columns',
    ]
    for t in tasks_1:
        story.append(Paragraph(t, s_bullet, bulletText='-'))

    story.append(add_heading('4.5 Definition of Done', s_h2, 1))
    story.append(Paragraph(
        'Phase 1 is complete when all Core tables exist in the PostgreSQL database with proper constraints and indexes, every tenant-owned table has working RLS policies verified by automated tests, the Prisma client can perform CRUD operations within a tenant scope, cross-tenant access tests pass with zero failures, audit logging captures all mutations, and the migration pipeline works reliably from development through to production deployment.',
        s_body))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 2: IDENTITY AND AUTHORIZATION
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('5. Phase 2: Identity and Authorization', s_h1, 0))
    story.append(Paragraph('Duration: Week 4-6', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(2, 'IDENTITY AND AUTHORIZATION', 'Week 4-6'))
    story.append(Spacer(1, 8))

    story.append(add_heading('5.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase implements the complete identity and authorization system that every subsequent phase depends on. Authentication is handled by Supabase Auth (email/password initially, with extensibility for OAuth and SSO), while authorization is a layered system built on top of the database tables created in Phase 1. The authorization context resolution follows a strict chain: Authentication, then Organization Membership, then Role, then Permission, then Resource Ownership, then Action. The permission format follows the pattern domain.resource.action (e.g., poultry.flock.view). AI agents use the same authorization system and are never granted administrator access by default. The fail-closed principle is enforced throughout: any missing authorization information results in an automatic denial.',
        s_body))

    story.append(add_heading('5.2 Authorization Architecture', s_h2, 1))
    auth_layers = [
        ['Authentication', 'Supabase Auth verifies user identity (JWT token validation)'],
        ['Organization Membership', 'Active membership record links user to organization'],
        ['Role Assignment', 'Membership has one or more roles (system or custom)'],
        ['Permission Check', 'Role maps to permissions (domain.resource.action format)'],
        ['Resource Ownership', 'User must own or be authorized for the specific resource'],
        ['Action Authorization', 'The requested action must be in the allowed permission set'],
    ]
    story.append(make_table(['Layer', 'Description'], auth_layers,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 4: Authorization layer chain', s_caption))

    story.append(add_heading('5.3 Tasks', s_h2, 1))
    tasks_2 = [
        'Implement Supabase Auth integration (sign-up, sign-in, sign-out, session management)',
        'Build organization creation flow with slug generation and initial admin role assignment',
        'Implement invitation system: email invite, accept/reject, membership activation',
        'Create RBAC middleware for Next.js API routes (resolve user, org, roles, permissions)',
        'Build permission-check utility: has_permission(user, org, permission_key)',
        'Implement organization context middleware (reject client-supplied organization_id)',
        'Create role management UI (system roles: Owner, Admin, Member, Viewer)',
        'Build team management: create teams, add/remove members, team-scoped permissions',
        'Implement session management with revocation support and secure cookie handling',
        'Write authorization test suite: RBAC, ABAC, cross-tenant denial, role isolation',
        'Create service-role boundary enforcement: no service key in browser or AI context',
        'Implement storage authorization with path pattern: organizations/{org_id}/files/{file_id}',
    ]
    for t in tasks_2:
        story.append(Paragraph(t, s_bullet, bulletText='-'))

    story.append(add_heading('5.4 Security Tests Required', s_h2, 1))
    sec_tests = [
        ['Cross-tenant SELECT', 'User from Org A cannot read Org B data via API or direct DB'],
        ['Cross-tenant UPDATE', 'Cannot change organization_id to move records between tenants'],
        ['Permission denial', 'User without poultry.flock.view gets 403 on flock endpoints'],
        ['AI agent denial', 'AI agent without finance permissions cannot access financial data'],
        ['Suspended membership', 'Suspended member cannot access any organization resources'],
        ['Removed membership', 'Immediately after removal, all access is revoked'],
        ['Session revocation', 'Revoked sessions cannot make authenticated requests'],
        ['Role escalation', 'Member role cannot promote itself to Owner or Admin'],
    ]
    story.append(make_table(['Test', 'Description'], sec_tests,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 5: Mandatory security tests for Phase 2', s_caption))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 3: DOMAIN AND MODULE ENGINE
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('6. Phase 3: Domain and Module Engine', s_h1, 0))
    story.append(Paragraph('Duration: Week 6-8', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(3, 'DOMAIN AND MODULE ENGINE', 'Week 6-8'))
    story.append(Spacer(1, 8))

    story.append(add_heading('6.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'The Domain Engine is what makes Mianx.ai a multi-domain platform rather than a single-application product. A domain is a self-contained business capability package that registers itself with the Core through a manifest file. The manifest declares the domain name, version, modules, permissions, workflows, agents, dashboards, and settings. This phase implements the domain registry, the manifest validation system, the module lifecycle (draft, available, enabled, disabled, deprecated), and the organization-level activation/deactivation flow. The critical architectural constraint is that the Core must never contain domain-specific business rules. If the Poultry domain is activated and functions correctly without any poultry-specific code existing inside Core, the architecture is working as designed.',
        s_body))

    story.append(add_heading('6.2 Database Tables', s_h2, 1))
    tables_3 = [
        ['domains', 'id, name, slug, version, description, status, manifest (JSONB), created_at'],
        ['organization_domains', 'id, organization_id, domain_id, status, configuration (JSONB), activated_at, UNIQUE(org, domain)'],
        ['modules', 'id, domain_id, name, slug, version, description, manifest (JSONB), status'],
        ['organization_modules', 'id, organization_id, module_id, status, configuration (JSONB), activated_at, UNIQUE(org, module)'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_3,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 6: Domain and Module engine database tables', s_caption))

    story.append(add_heading('6.3 Domain Manifest Structure', s_h2, 1))
    story.append(Paragraph(
        'Each domain ships with a manifest JSON that describes its complete capability set. The manifest includes the domain name, slug, version, description, an array of module definitions (each with its own name, slug, permissions, and settings schema), workflow definitions, agent definitions, dashboard configurations, and a list of Core dependencies. When an organization activates a domain, the system validates the manifest, checks Core version compatibility, verifies dependencies, creates the organization_domain record, initializes default configuration, registers all modules, runs any required setup migrations, and finally activates the domain. Deactivation follows the reverse process but never automatically destroys business data; data remains recoverable in the archived state.',
        s_body))

    story.append(add_heading('6.4 Tasks', s_h2, 1))
    tasks_3 = [
        'Create domain and module database tables with RLS policies',
        'Build domain registry service: register, update, deprecate, archive domains',
        'Implement manifest validation engine (schema validation, dependency checking)',
        'Create organization domain activation flow with entitlement checking',
        'Build module lifecycle management: enable, disable, configure per organization',
        'Implement domain-scoped settings system (organization-level overrides)',
        'Create permission registration API (domains declare permissions on activation)',
        'Build navigation generation from active domain modules',
        'Write domain isolation tests (cross-domain access denied by default)',
        'Create a skeleton "Poultry" domain as architectural validation',
    ]
    for t in tasks_3:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 4: AI CORE FOUNDATION
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('7. Phase 4: AI Core Foundation', s_h1, 0))
    story.append(Paragraph('Duration: Week 8-12', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(4, 'AI CORE FOUNDATION', 'Week 8-12'))
    story.append(Spacer(1, 8))

    story.append(add_heading('7.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'The AI Core is what transforms Mianx.ai from a traditional SaaS platform into an AI-native Business Operating System. This phase implements the provider-agnostic AI abstraction layer, the model router, the agent registry, the tool system with typed input/output contracts, the agent permission system, execution limits, AI usage tracking, and the foundations of memory and knowledge retrieval. AI agents are first-class security principals with scoped capabilities, not unrestricted chatbots. Every AI action is governed by the same authorization system used for human users, and every AI run produces an auditable usage record. The AI architecture supports multiple agent types: internal, customer-facing, domain-specific, workflow-integrated, analytics, and autonomous background agents.',
        s_body))

    story.append(add_heading('7.2 AI Architecture Components', s_h2, 1))
    ai_components = [
        ['Provider Abstraction', 'Unified interface wrapping OpenAI, Anthropic, Google, and local models'],
        ['Model Router', 'Selects model based on task type, quality, latency, cost, and policy'],
        ['Agent Registry', 'Stores agent definitions: identity, instructions, tools, permissions, limits'],
        ['Tool System', 'Typed tools with server-side execution and authorization checks'],
        ['Memory Engine', 'Tenant-scoped memory: user, organization, agent, conversation levels'],
        ['Knowledge Retrieval', 'Authorized RAG pipeline with organization-scoped vector search'],
        ['Usage Tracking', 'Per-organization, per-agent, per-model token and cost recording'],
        ['Governance Layer', 'Policy checks, risk classification, approval requirements, audit trail'],
    ]
    story.append(make_table(['Component', 'Description'], ai_components,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 7: AI Core architecture components', s_caption))

    story.append(add_heading('7.3 Database Tables', s_h2, 1))
    tables_4 = [
        ['agents', 'id, organization_id, domain_id, name, slug, description, status, configuration (JSONB)'],
        ['agent_tools', 'id, agent_id, tool_key, configuration (JSONB), enabled'],
        ['agent_permissions', 'agent_id, permission_key (scoped to domain.resource.action)'],
        ['ai_usage_records', 'id, organization_id, agent_id, model, provider, input_tokens, output_tokens, cost, duration_ms'],
        ['agent_memories', 'organization_id, agent_id, scope, content, metadata'],
        ['knowledge_sources', 'id, organization_id, domain_id, type, status, configuration'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_4,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 8: AI Core database tables', s_caption))

    story.append(add_heading('7.4 Tasks', s_h2, 1))
    tasks_4 = [
        'Implement provider abstraction layer with OpenAI and Anthropic adapters',
        'Build model router with task-type routing, fallback chains, and cost optimization',
        'Create agent registry CRUD service with organization and domain scoping',
        'Implement tool registry with typed input/output schemas and risk level classification',
        'Build tool authorization middleware (every tool call checks agent permissions)',
        'Create agent runtime with execution limits (max_steps, max_token_budget, max_cost)',
        'Implement AI usage tracking with per-request cost estimation and recording',
        'Build agent permission system reusing Core RBAC (agents as security principals)',
        'Create memory engine with tenant-scoped storage (never cross organization boundaries)',
        'Implement knowledge retrieval pipeline with authorized vector search',
        'Build AI request context normalization (request_id, user, org, domain, permissions)',
        'Create AI error classification system (MODEL_UNAVAILABLE, TOOL_DENIED, BUDGET_EXCEEDED)',
        'Implement fail-safe chain: retry, fallback model, safe deterministic path, human escalation',
        'Write AI isolation tests: agent cannot access unauthorized domain data',
    ]
    for t in tasks_4:
        story.append(Paragraph(t, s_bullet, bulletText='-'))

    story.append(add_heading('7.5 Tool Risk Levels', s_h2, 1))
    risk_levels = [
        ['LOW', 'Read-only operations, no side effects (get_flock_metrics, view_report)'],
        ['MEDIUM', 'Send notifications, create drafts (send_notification, create_draft)'],
        ['HIGH', 'Create business records, financial operations (create_sale, record_payment)'],
        ['CRITICAL', 'Change ownership, delete data, modify permissions (change_org_owner)'],
    ]
    story.append(make_table(['Risk Level', 'Description and Examples'], risk_levels,
        col_widths=[80, 375]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 9: AI tool risk classification levels', s_caption))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 5: EVENT AND AUTOMATION ENGINE
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('8. Phase 5: Event and Automation Engine', s_h1, 0))
    story.append(Paragraph('Duration: Week 12-14', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(5, 'EVENT AND AUTOMATION', 'Week 12-14'))
    story.append(Spacer(1, 8))

    story.append(add_heading('8.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase implements the deterministic automation backbone of Mianx.ai. Business events are immutable facts emitted by core actions (payment.created, inventory.low, workflow.completed). These events flow through a transactional outbox pattern to guarantee reliable delivery, and can trigger workflows, AI actions, notifications, analytics updates, and external integrations. The workflow engine supports complex multi-step processes with conditions, human approval gates, AI decision steps, delays, retries, and compensating actions. Every workflow execution is tenant-isolated and can never dynamically switch organization context mid-execution. The system supports bounded retries with exponential backoff and jitter, dead-letter queues for exhausted retries, and idempotency keys to prevent duplicate side effects.',
        s_body))

    story.append(add_heading('8.2 Database Tables', s_h2, 1))
    tables_5 = [
        ['events', 'id, event_type, event_version, organization_id, domain_id, source_type, source_id, correlation_id, payload, occurred_at'],
        ['outbox', 'id, organization_id, event_type, payload, status, attempts, available_at, published_at'],
        ['workflow_definitions', 'id, organization_id, domain_id, name, slug, status, definition (JSONB), trigger'],
        ['workflow_runs', 'id, workflow_id, organization_id, status, input, output, current_step, started_at, completed_at, error'],
        ['workflow_step_runs', 'id, workflow_run_id, step_id, status, attempt, input, output, error'],
        ['workflow_approvals', 'id, workflow_run_id, organization_id, requested_action, requested_by, decision, reason, expires_at'],
        ['jobs', 'id, organization_id, type, payload, status, priority, scheduled_at, attempts'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_5,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 10: Event and Automation engine database tables', s_caption))

    story.append(add_heading('8.3 Tasks', s_h2, 1))
    tasks_5 = [
        'Implement event emission system with stable envelope (type, version, org, correlation_id)',
        'Build transactional outbox pattern (business change + outbox event in same DB transaction)',
        'Create event publisher that reads outbox and publishes to event bus reliably',
        'Implement workflow definition engine with JSON-based step and condition definitions',
        'Build workflow execution engine with state machine (queued, running, waiting, completed, failed)',
        'Create human approval gate system with expiration and delegation support',
        'Implement AI decision steps with structured output validation before workflow use',
        'Build retry policy engine with bounded attempts, exponential backoff, and jitter',
        'Create dead-letter queue handling with operator review and manual retry interface',
        'Implement job scheduling system with cron-based and event-triggered execution',
        'Write workflow isolation tests (no cross-tenant execution, no context switching)',
        'Implement idempotency for all side-effecting workflow actions',
    ]
    for t in tasks_5:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    return story

if __name__ == '__main__':
    pass
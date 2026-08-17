# Mianx.ai Roadmap - Body Part 3: Phases 6-9
def add_phases_6_9(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption, make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether, HRFlowable, ACCENT, TEXT_MUTED, add_heading):
    # ══════════════════════════════════════════════════════════
    # PHASE 6: API AND INTEGRATION PLATFORM
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('9. Phase 6: API and Integration Platform', s_h1, 0))
    story.append(Paragraph('Duration: Week 14-16', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(6, 'API AND INTEGRATION', 'Week 14-16'))
    story.append(Spacer(1, 8))

    story.append(add_heading('9.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase builds the secure external connectivity layer that allows Mianx.ai to communicate with the outside world. The API platform implements typed RESTful endpoints with a standard response envelope, cursor-based pagination, idempotency keys for side-effecting operations, and comprehensive error contracts. The integration framework supports OAuth 2.0 connections for external services, incoming and outgoing webhooks with HMAC signature verification, API key management for programmatic access, and an adapter pattern that isolates external provider logic from Core business logic. Every API endpoint enforces the full authorization chain established in Phase 2, and the tenant context is always resolved from trusted server-side data, never from client-supplied request bodies. External failures are handled through circuit breakers and must never corrupt internal business state.',
        s_body))

    story.append(add_heading('9.2 API Types', s_h2, 1))
    api_types = [
        ['Public API', 'External-facing, versioned (/api/v1/), rate-limited, idempotent'],
        ['Internal API', 'Server-to-server within Mianx.ai, no rate limiting'],
        ['Domain API', 'Domain-specific endpoints, dynamically registered per active domain'],
        ['Admin API', 'Platform administration, requires platform-level RBAC'],
        ['Webhook Endpoint', 'Inbound webhooks with signature verification and replay protection'],
        ['AI Tool API', 'Internal API used by AI agents, same authorization as user APIs'],
    ]
    story.append(make_table(['API Type', 'Description'], api_types,
        col_widths=[100, 355]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 11: API type classifications', s_caption))

    story.append(add_heading('9.3 Tasks', s_h2, 1))
    tasks_6 = [
        'Implement standard API response envelope: {data, meta, request_id}',
        'Build cursor-based pagination for all list endpoints (next_cursor, has_more)',
        'Create API key management with scopes, expiration, and organization scoping',
        'Implement idempotency middleware with Idempotency-Key header support',
        'Build webhook delivery system with HMAC signing and retry with backoff',
        'Create inbound webhook endpoint with signature verification and event deduplication',
        'Implement OAuth 2.0 connection flow for external service integration',
        'Build integration adapter pattern with health monitoring and status tracking',
        'Create circuit breaker implementation (Closed, Open, Half-Open state machine)',
        'Implement request/correlation ID propagation across APIs, workflows, and AI runs',
        'Build data export pipeline with authorization, async processing, and download expiry',
        'Write API contract tests and integration security tests (SSRF, replay, permission boundary)',
    ]
    for t in tasks_6:
        story.append(Paragraph(t, s_bullet, bulletText='-'))

    story.append(add_heading('9.4 Database Tables', s_h2, 1))
    tables_6 = [
        ['api_keys', 'id, organization_id, name, scopes (JSONB), status, expires_at, last_used_at'],
        ['integration_connections', 'id, organization_id, provider, status, scopes, credential_reference, health_status'],
        ['webhook_deliveries', 'id, organization_id, event_type, endpoint, status, attempts, response, delivered_at'],
        ['idempotency_records', 'key, organization_id, endpoint, request_hash, status, response, expires_at'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_6,
        col_widths=[120, 335]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 12: API and Integration database tables', s_caption))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 7: BILLING AND ENTITLEMENTS
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('10. Phase 7: Billing and Entitlements', s_h1, 0))
    story.append(Paragraph('Duration: Week 16-18', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(7, 'BILLING AND ENTITLEMENTS', 'Week 16-18'))
    story.append(Spacer(1, 8))

    story.append(add_heading('10.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase implements the commercial SaaS foundation that enables Mianx.ai to operate as a subscription-based platform. The billing architecture cleanly separates three concerns: Entitlements (what a customer is commercially allowed to use), Authorization (what a user is security-allowed to do), and Policy (operational constraints). Plans define commercial packages with versioned feature sets. Subscriptions link organizations to plans with lifecycle management (trialing, active, past_due, grace_period, paused, cancelled). Usage metering tracks consumption against limits with idempotent recording to prevent double-charging. AI usage receives special attention with dedicated meters for tokens, tool calls, and agent runs, enabling AI budget controls (monthly limits, per-agent limits, warn-then-restrict behavior). Plan downgrades never silently delete customer data; the system either blocks the downgrade, schedules it with a cleanup window, or allows it while restricting new creation.',
        s_body))

    story.append(add_heading('10.2 Subscription Lifecycle', s_h2, 1))
    lifecycle = [
        ['trialing', 'Free trial period with full or limited features, time-limited'],
        ['active', 'Paid subscription, all entitled features accessible'],
        ['past_due', 'Payment failed, grace period begins'],
        ['grace_period', '7-day window to update payment, full access maintained'],
        ['paused', 'Organization paused access, data preserved'],
        ['cancelled', 'User cancelled, access until end of billing period'],
        ['expired', 'Billing period ended after cancellation, access restricted'],
        ['suspended', 'Platform-initiated suspension for ToS violations'],
    ]
    story.append(make_table(['State', 'Description'], lifecycle,
        col_widths=[80, 375]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 13: Subscription lifecycle states', s_caption))

    story.append(add_heading('10.3 Tasks', s_h2, 1))
    tasks_7 = [
        'Create plans and plan_versions tables with version locking for commercial integrity',
        'Implement subscription management with full lifecycle state machine',
        'Build entitlement engine: plan features mapped to organization capabilities',
        'Create usage metering service with idempotent recording (idempotency_key per event)',
        'Implement AI usage meters: requests, input/output tokens, tool calls, agent runs',
        'Build AI cost tracking with per-organization, per-agent, per-model visibility',
        'Create AI budget controls with warn-then-restrict behavior and upgrade prompts',
        'Implement plan upgrade/downgrade flows with data preservation guarantees',
        'Build feature flags system (separate from entitlements and authorization)',
        'Create payment provider abstraction adapter for Stripe integration',
        'Implement billing reconciliation (periodic comparison of Mianx state vs provider state)',
        'Build billing failure handling with controlled grace and suspension behavior',
    ]
    for t in tasks_7:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 8: FRONTEND PLATFORM
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('11. Phase 8: Frontend Platform', s_h1, 0))
    story.append(Paragraph('Duration: Week 18-22', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(8, 'FRONTEND PLATFORM', 'Week 18-22'))
    story.append(Spacer(1, 8))

    story.append(add_heading('11.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase builds the complete frontend platform that users interact with. The frontend follows a layered component architecture: Foundation (design tokens, base styles), Primitives (Button, Input, Select), Composites (Form, DataTable, Dialog), Patterns (PermissionGuard, OrgSwitcher, DomainNav), Domain Components (Poultry-specific), and Pages. The app shell provides persistent navigation with an organization switcher, domain switcher, search, AI assistant access, notifications, and user menu. Navigation is dynamically generated from the active organization domains and enabled modules, filtered by the current user permissions. The AI Workspace provides a conversation panel with context display, attachment support, tool visibility, and clear distinction between AI recommendations and executed actions. Code splitting ensures domain bundles load only when needed: Core Shell loads first, then the selected domain bundle, then individual module bundles on navigation. The design system supports RTL languages (Urdu, Arabic) through logical layout properties, and meets WCAG accessibility standards for keyboard navigation and screen reader support.',
        s_body))

    story.append(add_heading('11.2 Core Navigation Structure', s_h2, 1))
    nav_items = [
        ['Home', 'Dashboard with organization summary, active domains, recent activity'],
        ['My Business', 'Organization management, team, branding, settings'],
        ['Domains', 'Active domain cards linking to domain dashboards'],
        ['AI', 'AI Workspace with conversation panel and agent management'],
        ['Automations', 'Workflow list, run history, job scheduling'],
        ['Analytics', 'Organization-level analytics and reporting'],
        ['Integrations', 'Connection management, webhook configuration'],
        ['Team', 'Members, roles, invitations, teams'],
        ['Billing', 'Subscription, usage, invoices, plan management'],
        ['Settings', 'Organization settings, notifications, security'],
    ]
    story.append(make_table(['Navigation', 'Description'], nav_items,
        col_widths=[100, 355]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 14: Core navigation structure', s_caption))

    story.append(add_heading('11.3 Tasks', s_h2, 1))
    tasks_8 = [
        'Build design token system: colors, typography, spacing, radius, shadows, breakpoints',
        'Implement core component library with 28+ components (Button, Input, Table, Dialog, etc.)',
        'Create app shell with header, sidebar navigation, and main workspace area',
        'Build organization switcher with membership verification and context refresh',
        'Implement permission-aware navigation (hide/disable items based on user permissions)',
        'Create domain switcher showing only entitled and authorized domains',
        'Build AI Workspace with conversation panel, context display, and action confirmation',
        'Implement dashboard framework with configurable KPI cards, charts, and tables',
        'Create domain code splitting (Core Shell, domain bundles, module lazy loading)',
        'Build state architecture (server state, UI state, form state, URL state, AI state)',
        'Implement loading, empty, error, and permission-denied states for every screen',
        'Create responsive layout system (layout changes, not just shrinking)',
        'Build RTL readiness using logical layout properties (margin-inline, padding-inline)',
        'Implement accessibility: keyboard navigation, semantic HTML, screen reader support',
        'Create organization onboarding flow (create org, configure, invite team, select domain)',
    ]
    for t in tasks_8:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 9: OBSERVABILITY AND OPERATIONS
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('12. Phase 9: Observability and Operations', s_h1, 0))
    story.append(Paragraph('Duration: Week 22-24', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(9, 'OBSERVABILITY AND OPERATIONS', 'Week 22-24'))
    story.append(Spacer(1, 8))

    story.append(add_heading('12.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'This phase implements the operational visibility layer that enables the Mianx.ai team to monitor, diagnose, and respond to production issues. Observability follows the three pillars model (logs, metrics, traces) supplemented by additional signals including errors, events, AI telemetry, and cost telemetry. Structured logging in JSON format captures timestamp, level, service, event, organization_id, request_id, trace_id, and error_code for every meaningful operation. The correlation ID system propagates request_id, trace_id, organization_id, and user_id across APIs, workflows, AI runs, integration calls, and audit logs, enabling end-to-end request tracing. The Command Center provides a platform administration dashboard for managing organizations, users, domains, subscriptions, AI usage, AI cost, security events, and system health. AI-specific observability tracks quality signals (tool success rate, task completion, human approval rate) and safety signals (policy denials, prompt injection detections, agent loop detection, excessive retries).',
        s_body))

    story.append(add_heading('12.2 Observability Categories', s_h2, 1))
    obs_cats = [
        ['Platform Health', 'CPU, memory, connections, queue depth, DB latency, cache hit rate'],
        ['Application Health', 'Request count, latency distributions, error rates by endpoint'],
        ['Business Health', 'Active organizations, users, flocks, workflows, revenue metrics'],
        ['AI/Cost Health', 'Cost per model, org, domain, agent; AI gross margin calculation'],
        ['AI Quality', 'Tool success rate, task completion, human approval/rejection rate, hallucination rate'],
        ['AI Safety', 'Policy denials, tool auth failures, prompt injection detections, agent loops'],
    ]
    story.append(make_table(['Category', 'Key Signals'], obs_cats,
        col_widths=[100, 355]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 15: Observability signal categories', s_caption))

    story.append(add_heading('12.3 Tasks', s_h2, 1))
    tasks_9 = [
        'Implement structured JSON logging with correlation ID propagation',
        'Create error tracking integration with stack traces and context capture',
        'Build application metrics: request latency histograms, error rates, throughput',
        'Implement AI usage dashboard with per-organization cost visibility',
        'Build AI quality monitoring (tool success, task completion, approval rates)',
        'Create AI safety monitoring (policy denials, injection detection, loop detection)',
        'Implement health check endpoints for all critical services',
        'Build Command Center dashboard with organization, domain, and AI management views',
        'Create alert routing system with priority levels (P1-P4) and escalation policies',
        'Implement incident model (Detected, Acknowledged, Investigating, Mitigating, Resolved)',
        'Build telemetry data redaction (no passwords, API keys, tokens, or personal data in logs)',
        'Create SLO tracking framework with error budget calculations',
    ]
    for t in tasks_9:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    return story

if __name__ == '__main__':
    pass
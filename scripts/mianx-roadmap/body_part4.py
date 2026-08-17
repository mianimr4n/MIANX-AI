# Mianx.ai Roadmap - Body Part 4: Phases 10-11, Dependency Graph, Appendix
import hashlib as _hl
def add_phases_10_11(story, s_h1, s_h2, s_h3, s_body, s_bullet, s_caption, make_table, phase_header, Paragraph, Spacer, PageBreak, KeepTogether, HRFlowable, ACCENT, TEXT_MUTED, TEXT_PRIMARY, HEADER_FILL):

    def add_heading(text, style, level=0):
        key = f'h_{_hl.md5(text.encode()).hexdigest()[:8]}'
        p = Paragraph(f'<a name="{key}"/>{text}', style)
        p.bookmark_name = key
        p.bookmark_level = level
        p.bookmark_text = text
        p.bookmark_key = key
        return p

    # ══════════════════════════════════════════════════════════
    # PHASE 10: POULTRY OS DOMAIN
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('13. Phase 10: Poultry OS Domain', s_h1, 0))
    story.append(Paragraph('Duration: Week 24-30', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(10, 'POULTRY OS DOMAIN', 'Week 24-30'))
    story.append(Spacer(1, 8))

    story.append(add_heading('13.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'Poultry OS is the first production domain and the ultimate architectural validation of the Mianx.ai Core. If the Core supports Poultry cleanly, without any Poultry-specific hacks inside Core code, then the multi-domain architecture is proven and ready for Restaurant, Retail, and Manufacturing domains. This phase implements the complete Poultry business package including eight core modules: Farm management, Shed management, Flock management, Feed tracking, Health records, Production metrics, Procurement, and Sales. Each module follows the domain manifest pattern, registers its own permissions, and integrates with the AI, automation, and billing systems already built in the Core. Poultry-specific AI agents are created with scoped tools and permissions, and Poultry-specific workflows automate common business processes like feed scheduling, health alerts, and sales recording.',
        s_body))

    story.append(add_heading('13.2 Poultry Modules', s_h2, 1))
    poultry_modules = [
        ['Farm', 'Manage farm locations, capacity, contact info, and operational status'],
        ['Shed', 'Track shed types, capacity, environmental conditions, and occupancy'],
        ['Flock', 'Manage flock lifecycle: placement, growth, mortality, weight tracking'],
        ['Feed', 'Record feed consumption, conversion ratios, stock levels, and costs'],
        ['Health', 'Track vaccinations, treatments, mortality causes, and health alerts'],
        ['Production', 'Monitor egg production, body weight, feed conversion, and growth curves'],
        ['Procurement', 'Manage chick procurement, feed purchases, medicine, and equipment'],
        ['Sales', 'Record sales transactions, customer management, and revenue tracking'],
    ]
    story.append(make_table(['Module', 'Description'], poultry_modules,
        col_widths=[80, 375]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 16: Poultry OS modules', s_caption))

    story.append(add_heading('13.3 Database Tables', s_h2, 1))
    tables_10 = [
        ['poultry_farms', 'id, organization_id, name, location, capacity, status, contact_info'],
        ['poultry_sheds', 'id, organization_id, farm_id, name, shed_type, capacity, current_count'],
        ['poultry_flocks', 'id, organization_id, shed_id, breed, placement_date, quantity, status'],
        ['poultry_feed_records', 'id, organization_id, flock_id, date, feed_type, quantity, cost'],
        ['poultry_health_records', 'id, organization_id, flock_id, date, type, treatment, veterinarian'],
        ['poultry_mortality_records', 'id, organization_id, flock_id, date, count, cause, notes'],
        ['poultry_production_records', 'id, organization_id, flock_id, date, eggs_collected, weight'],
        ['poultry_sales', 'id, organization_id, customer_id, date, items (JSONB), total_amount, currency'],
    ]
    story.append(make_table(['Table', 'Key Columns'], tables_10,
        col_widths=[130, 325]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 17: Poultry OS database tables', s_caption))

    story.append(add_heading('13.4 Poultry AI Agents', s_h2, 1))
    poultry_agents = [
        ['Flock Manager', 'get_flock_metrics, get_mortality, create_alert', 'poultry.flock.view, poultry.alert.create'],
        ['Feed Optimizer', 'get_feed_usage, get_production, recommend_feed', 'poultry.feed.view, poultry.report.generate'],
        ['Health Monitor', 'get_health_records, get_mortality_trends, escalate', 'poultry.health.view, poultry.alert.create'],
        ['Sales Analyst', 'get_sales_data, get_revenue, forecast_demand', 'poultry.sale.view, finance.report.view'],
    ]
    story.append(make_table(['Agent', 'Tools', 'Permissions'], poultry_agents,
        col_widths=[90, 200, 165]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 18: Poultry OS AI agents', s_caption))

    story.append(add_heading('13.5 Tasks', s_h2, 1))
    tasks_10 = [
        'Create Poultry domain manifest with all 8 modules, permissions, and settings',
        'Implement Farm and Shed management with CRUD APIs and RLS policies',
        'Build Flock lifecycle management (placement, growth tracking, depletion)',
        'Create Feed tracking with consumption recording and conversion ratio calculations',
        'Implement Health records with vaccination schedules and mortality tracking',
        'Build Production metrics dashboard with egg collection and growth curves',
        'Create Procurement module for chick, feed, and medicine purchasing',
        'Implement Sales module with customer management and revenue tracking',
        'Build Poultry-specific AI agents with scoped tools and permissions',
        'Create Poultry workflows (feed scheduling, health alerts, sales recording)',
        'Build Poultry dashboards with KPI cards, charts, and AI insights',
        'Verify zero Poultry-specific code exists inside Core (architecture validation test)',
        'Write end-to-end Poultry business flow tests',
    ]
    for t in tasks_10:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # PHASE 11: PRODUCTION READINESS
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('14. Phase 11: Security Hardening and Production Readiness', s_h1, 0))
    story.append(Paragraph('Duration: Week 30-32', s_caption))
    story.append(Spacer(1, 4))

    story.append(phase_header(11, 'PRODUCTION READINESS', 'Week 30-32'))
    story.append(Spacer(1, 8))

    story.append(add_heading('14.1 Objective', s_h2, 1))
    story.append(Paragraph(
        'The final phase transforms the development system into a production-ready platform. This encompasses comprehensive security testing across twelve categories (authentication, RBAC, ABAC, tenant isolation, RLS, API, session management, secret exposure, AI tool authorization, prompt injection, integration security, and audit completeness), performance optimization, production infrastructure configuration, backup and disaster recovery verification, and operational readiness. Every security test must pass with zero failures before the system can be deployed to production. The Command Center must be fully operational for platform administration. Documentation must be complete enough that a new team member can understand the architecture, set up the development environment, and make changes without verbal knowledge transfer. The definition of done from the Architecture Specification is the ultimate checklist: if every item passes, Mianx.ai Core v1 is ready.',
        s_body))

    story.append(add_heading('14.2 Security Testing Categories', s_h2, 1))
    sec_cats = [
        ['Authentication', 'Session fixation, token theft, brute force, social engineering vectors'],
        ['RBAC', 'Role escalation, permission bypass, privilege inheritance validation'],
        ['ABAC/Policy', 'Context-based access, conditional denial, approval gate bypass'],
        ['Tenant Isolation', 'Cross-tenant SELECT, UPDATE, DELETE, and organization reassignment'],
        ['RLS', 'Direct database access bypass attempts, policy gap analysis'],
        ['API', 'Injection, mass assignment, IDOR, rate limit bypass, parameter tampering'],
        ['Session', 'Session hijacking, fixation, revocation timing, cookie security'],
        ['Secret Exposure', 'Service key in browser, secrets in AI context, debug data leakage'],
        ['AI Tool Auth', 'Agent exceeding permission scope, tool parameter injection'],
        ['Prompt Injection', 'External content treated as untrusted, instruction override attempts'],
        ['Integration', 'SSRF, payload validation, credential exposure, replay attacks'],
        ['Audit', 'Mutation without audit record, audit record tampering, completeness check'],
    ]
    story.append(make_table(['Category', 'Test Scope'], sec_cats,
        col_widths=[100, 355]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 19: Production security testing categories', s_caption))

    story.append(add_heading('14.3 Tasks', s_h2, 1))
    tasks_11 = [
        'Run all 12 security testing categories with documented pass/fail results',
        'Perform threat modeling for AI agents, payments, integrations, file uploads, admin',
        'Implement MFA support for admin and platform-level operations',
        'Conduct performance testing and optimization (API latency, DB queries, page load)',
        'Set up production infrastructure with separate database credentials per service role',
        'Implement backup and recovery verification (database, object storage, AI data)',
        'Configure production monitoring dashboards and alert routing',
        'Create incident response runbooks for P1-P4 alert categories',
        'Complete operational documentation (architecture, setup, deployment, runbooks)',
        'Verify all audit trails are complete, tamper-resistant, and queryable',
        'Conduct load testing to verify system behavior under expected peak traffic',
        'Perform tenant onboarding/offboarding verification (data export, deletion, cleanup)',
        'Final architecture review: verify no domain-specific code exists in Core',
        'Obtain sign-off on Definition of Done checklist (all 17 items from Architecture Spec)',
    ]
    for t in tasks_11:
        story.append(Paragraph(t, s_bullet, bulletText='-'))
    story.append(Spacer(1, 10))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # DEPENDENCY GRAPH
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('15. Phase Dependency Graph', s_h1, 0))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'The following table maps the explicit dependencies between phases. A phase can only begin when all its dependencies have reached their definition of done. Some phases have partial dependencies where specific deliverables from an earlier phase are needed, but the full phase does not need to be complete. These partial dependencies are noted in the description column. Understanding these dependencies is critical for project scheduling because they define the critical path through the 32-week timeline. Any delay on the critical path phases (0, 1, 2, 4, 8, 10) directly impacts the final delivery date.',
        s_body))
    story.append(Spacer(1, 6))

    deps = [
        ['Phase 0', 'None', 'No dependencies, can start immediately'],
        ['Phase 1', 'Phase 0', 'Requires runnable project and Supabase connection'],
        ['Phase 2', 'Phase 1', 'Requires database tables and RLS policies'],
        ['Phase 3', 'Phase 2', 'Requires authorization middleware and permissions'],
        ['Phase 4', 'Phase 2', 'Requires authorization for agent permissions (partial Phase 2)'],
        ['Phase 5', 'Phase 1, Phase 2', 'Requires database events and authorization (partial Phase 2)'],
        ['Phase 6', 'Phase 2, Phase 5', 'Requires auth middleware and event system'],
        ['Phase 7', 'Phase 3', 'Requires domain/module system for feature entitlements'],
        ['Phase 8', 'Phase 2, Phase 3', 'Requires auth, domains, and modules for UI rendering'],
        ['Phase 9', 'Phase 4, Phase 5', 'Requires AI telemetry and event/audit data'],
        ['Phase 10', 'Phase 3, Phase 4, Phase 5', 'Requires domain engine, AI, and automation'],
        ['Phase 11', 'All phases', 'Complete system must be built and tested'],
    ]
    story.append(make_table(['Phase', 'Depends On', 'Notes'], deps,
        col_widths=[60, 100, 295]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 20: Phase dependency graph', s_caption))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════
    # APPENDIX: DEFINITION OF DONE
    # ══════════════════════════════════════════════════════════
    story.append(add_heading('Appendix A: Core v1 Definition of Done', s_h1, 0))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'The following checklist is taken directly from Section 28 of the Mianx.ai Architecture Specification. Every item must be verified as complete before the Core platform is considered ready for Phase 1 domain implementation. This checklist serves as the ultimate quality gate between Core development and production domain deployment. Each item should have a corresponding test or verification procedure that can be executed automatically or manually with documented evidence.',
        s_body))
    story.append(Spacer(1, 6))

    dod_items = [
        ['User can register and login', 'Authentication flow works end-to-end with Supabase Auth'],
        ['Organization can be created', 'Organization creation with slug, settings, and admin assignment'],
        ['Users can join organizations', 'Invitation, acceptance, and membership activation flow'],
        ['Roles work correctly', 'System and custom roles with permission mapping'],
        ['Permissions work correctly', 'domain.resource.action format enforced on all endpoints'],
        ['Tenant isolation works', 'Zero cross-tenant data access verified by automated tests'],
        ['Domains can be registered', 'Domain manifest validation and registration in Core'],
        ['Domains can be activated', 'Organization-level activation with entitlement checking'],
        ['Modules can be activated', 'Module-level enable/disable with configuration'],
        ['Events work reliably', 'Transactional outbox, event bus, and consumer processing'],
        ['Audit works completely', 'All mutations captured with actor, resource, before/after'],
        ['AI agents have controlled permissions', 'Agent authorization scoped and enforced'],
        ['AI usage is tracked', 'Per-organization, per-agent, per-model usage recording'],
        ['Basic workflows execute', 'Multi-step workflows with conditions and actions complete'],
        ['Billing/entitlements have foundation', 'Plans, subscriptions, and feature gating operational'],
        ['Command Center can manage platform', 'Admin dashboard for organizations, domains, subscriptions'],
        ['Security tests pass', 'All 12 security testing categories with zero failures'],
        ['Core can accept a new domain', 'New domain registers without Core code changes'],
    ]
    story.append(make_table(['Checklist Item', 'Verification'], dod_items,
        col_widths=[180, 275]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Table 21: Core v1 Definition of Done checklist', s_caption))

    return story

if __name__ == '__main__':
    pass

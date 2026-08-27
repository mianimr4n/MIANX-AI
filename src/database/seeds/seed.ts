// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Development Seed Data
// Run: bun run src/database/seeds/seed.ts
// ══════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Mianx.ai development data...')

  // ── Clear existing (order matters for FK constraints) ──
  await prisma.membershipRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.teamMember.deleteMany()
  // Billing tables (depend on Organization, Plan, Subscription)
  await prisma.usageRecord.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.planVersion.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.feature.deleteMany()
  await prisma.usageMeter.deleteMany()
  // Integration tables (depend on Organization)
  await prisma.webhookDelivery.deleteMany()
  await prisma.webhook.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.oAuthConnection.deleteMany()
  // Automation tables (depend on Organization)
  await prisma.workflowStepRun.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.workflowRun.deleteMany()
  await prisma.workflow.deleteMany()
  await prisma.job.deleteMany()
  await prisma.event.deleteMany()
  // AI tables (depend on Organization)
  await prisma.aiMessage.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.agentConfig.deleteMany()
  // Poultry tables (depend on Organization)
  await prisma.poultrySale.deleteMany()
  await prisma.poultryCustomer.deleteMany()
  await prisma.poultryProcurement.deleteMany()
  await prisma.poultryProductionRecord.deleteMany()
  await prisma.poultryMortalityRecord.deleteMany()
  await prisma.poultryHealthRecord.deleteMany()
  await prisma.poultryFeedRecord.deleteMany()
  await prisma.poultryFlock.deleteMany()
  await prisma.poultryShed.deleteMany()
  await prisma.poultryFarm.deleteMany()
  // Domain tables
  await prisma.organizationModule.deleteMany()
  await prisma.organizationDomain.deleteMany()
  await prisma.organizationMembership.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.file.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.team.deleteMany()
  await prisma.role.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.module.deleteMany()
  await prisma.domain.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.profile.deleteMany()

  // ── Organizations ──
  const orgs = await Promise.all([
    prisma.organization.create({ data: { name: 'Poultry Farm Co', slug: 'poultry-farm-co', status: 'active', currency: 'PKR', timezone: 'Asia/Karachi', locale: 'ur' } }),
    prisma.organization.create({ data: { name: 'Fresh Restaurants', slug: 'fresh-restaurants', status: 'active', currency: 'USD', timezone: 'America/New_York' } }),
    prisma.organization.create({ data: { name: 'Test Organization', slug: 'test-organization', status: 'trial', currency: 'EUR', timezone: 'Europe/Berlin' } }),
  ])
  console.log(`  ✓ Created ${orgs.length} organizations`)

  // ── Profiles ──
  const profiles = await Promise.all([
    prisma.profile.create({ data: { userId: 'user-admin-001', displayName: 'Ali Khan', locale: 'ur', timezone: 'Asia/Karachi' } }),
    prisma.profile.create({ data: { userId: 'user-manager-002', displayName: 'Sara Ahmed', locale: 'en', timezone: 'Asia/Karachi' } }),
    prisma.profile.create({ data: { userId: 'user-viewer-003', displayName: 'Usman Tariq', locale: 'en', timezone: 'UTC' } }),
  ])
  console.log(`  ✓ Created ${profiles.length} profiles`)

  // ── Memberships ──
  const memberships = await Promise.all([
    prisma.organizationMembership.create({ data: { organizationId: orgs[0].id, userId: profiles[0].userId, status: 'active', joinedAt: new Date() } }),
    prisma.organizationMembership.create({ data: { organizationId: orgs[0].id, userId: profiles[1].userId, status: 'active', joinedAt: new Date() } }),
    prisma.organizationMembership.create({ data: { organizationId: orgs[1].id, userId: profiles[0].userId, status: 'active', joinedAt: new Date() } }),
    prisma.organizationMembership.create({ data: { organizationId: orgs[2].id, userId: profiles[2].userId, status: 'invited' } }),
  ])
  console.log(`  ✓ Created ${memberships.length} memberships`)

  // ── System Roles (org-scoped) ──
  const roles = await Promise.all([
    ...orgs.flatMap(org => [
      prisma.role.create({ data: { organizationId: org.id, name: 'Owner', slug: 'owner', description: 'Full access to organization', isSystem: true } }),
      prisma.role.create({ data: { organizationId: org.id, name: 'Admin', slug: 'admin', description: 'Administrative access', isSystem: true } }),
      prisma.role.create({ data: { organizationId: org.id, name: 'Member', slug: 'member', description: 'Standard member access', isSystem: true } }),
      prisma.role.create({ data: { organizationId: org.id, name: 'Viewer', slug: 'viewer', description: 'Read-only access', isSystem: true } }),
    ]),
  ])
  console.log(`  ✓ Created ${roles.length} system roles (${orgs.length} orgs × 4 roles)`)

  // ── Permissions ──
  const permissions = await Promise.all([
    // Organization permissions
    prisma.permission.create({ data: { key: 'organization.view', description: 'View organization details' } }),
    prisma.permission.create({ data: { key: 'organization.update', description: 'Update organization settings' } }),
    prisma.permission.create({ data: { key: 'organization.delete', description: 'Archive organization' } }),
    // Team permissions
    prisma.permission.create({ data: { key: 'team.view', description: 'View teams' } }),
    prisma.permission.create({ data: { key: 'team.create', description: 'Create teams' } }),
    prisma.permission.create({ data: { key: 'team.manage', description: 'Manage team members' } }),
    // Member permissions
    prisma.permission.create({ data: { key: 'member.view', description: 'View members' } }),
    prisma.permission.create({ data: { key: 'member.invite', description: 'Invite new members' } }),
    prisma.permission.create({ data: { key: 'member.remove', description: 'Remove members' } }),
    // Domain permissions
    prisma.permission.create({ data: { key: 'domain.view', description: 'View available domains' } }),
    prisma.permission.create({ data: { key: 'domain.activate', description: 'Activate/deactivate domains' } }),
    prisma.permission.create({ data: { key: 'domain.configure', description: 'Configure domain settings' } }),
    // Module permissions
    prisma.permission.create({ data: { key: 'module.view', description: 'View available modules' } }),
    prisma.permission.create({ data: { key: 'module.activate', description: 'Activate/deactivate modules' } }),
    prisma.permission.create({ data: { key: 'module.configure', description: 'Configure module settings' } }),
    // Audit permissions
    prisma.permission.create({ data: { key: 'audit.view', description: 'View audit logs' } }),
    // AI permissions
    prisma.permission.create({ data: { key: 'ai.chat', description: 'Send messages to AI agents' } }),
    prisma.permission.create({ data: { key: 'ai.conversations.view', description: 'View AI conversations' } }),
    prisma.permission.create({ data: { key: 'ai.agents.manage', description: 'Create and configure AI agents' } }),
    prisma.permission.create({ data: { key: 'ai.usage.admin', description: 'View AI usage statistics and costs' } }),
    // Automation permissions
    prisma.permission.create({ data: { key: 'automation.events.view', description: 'View event history and details' } }),
    prisma.permission.create({ data: { key: 'automation.events.manage', description: 'Publish and manage events' } }),
    prisma.permission.create({ data: { key: 'automation.workflows.view', description: 'View workflows and runs' } }),
    prisma.permission.create({ data: { key: 'automation.workflows.manage', description: 'Create and configure workflows' } }),
    prisma.permission.create({ data: { key: 'automation.workflows.execute', description: 'Trigger workflow execution' } }),
    prisma.permission.create({ data: { key: 'automation.jobs.view', description: 'View jobs' } }),
    prisma.permission.create({ data: { key: 'automation.jobs.manage', description: 'Create and manage jobs' } }),
    prisma.permission.create({ data: { key: 'automation.approvals.manage', description: 'View and decide approvals' } }),
    prisma.permission.create({ data: { key: 'automation.approvals.view', description: 'View approval requests' } }),
    // Integration permissions
    prisma.permission.create({ data: { key: 'integration.apikeys.view', description: 'View API keys (prefix only)' } }),
    prisma.permission.create({ data: { key: 'integration.apikeys.manage', description: 'Create, revoke API keys' } }),
    prisma.permission.create({ data: { key: 'integration.webhooks.view', description: 'View webhooks and delivery logs' } }),
    prisma.permission.create({ data: { key: 'integration.webhooks.manage', description: 'Create, update, delete, test webhooks' } }),
    prisma.permission.create({ data: { key: 'integration.oauth.view', description: 'View OAuth connections' } }),
    prisma.permission.create({ data: { key: 'integration.oauth.manage', description: 'Connect, disconnect, refresh OAuth' } }),
    // Poultry permissions (Phase 10)
    prisma.permission.create({ data: { key: 'poultry.dashboard.view', description: 'View Poultry OS dashboard' } }),
    prisma.permission.create({ data: { key: 'poultry.report.generate', description: 'Generate Poultry reports' } }),
    prisma.permission.create({ data: { key: 'poultry.farm.view', description: 'View farms' } }),
    prisma.permission.create({ data: { key: 'poultry.farm.create', description: 'Create farms' } }),
    prisma.permission.create({ data: { key: 'poultry.farm.update', description: 'Update farm details' } }),
    prisma.permission.create({ data: { key: 'poultry.farm.delete', description: 'Archive/delete farms' } }),
    prisma.permission.create({ data: { key: 'poultry.shed.view', description: 'View sheds' } }),
    prisma.permission.create({ data: { key: 'poultry.shed.create', description: 'Create sheds' } }),
    prisma.permission.create({ data: { key: 'poultry.shed.update', description: 'Update shed details' } }),
    prisma.permission.create({ data: { key: 'poultry.shed.delete', description: 'Archive/delete sheds' } }),
    prisma.permission.create({ data: { key: 'poultry.flock.view', description: 'View flocks' } }),
    prisma.permission.create({ data: { key: 'poultry.flock.create', description: 'Create flocks' } }),
    prisma.permission.create({ data: { key: 'poultry.flock.update', description: 'Update flock details' } }),
    prisma.permission.create({ data: { key: 'poultry.flock.archive', description: 'Deplete/archive flocks' } }),
    prisma.permission.create({ data: { key: 'poultry.feed.view', description: 'View feed records' } }),
    prisma.permission.create({ data: { key: 'poultry.feed.create', description: 'Create feed records' } }),
    prisma.permission.create({ data: { key: 'poultry.feed.delete', description: 'Delete feed records' } }),
    prisma.permission.create({ data: { key: 'poultry.health.view', description: 'View health records' } }),
    prisma.permission.create({ data: { key: 'poultry.health.create', description: 'Create health records' } }),
    prisma.permission.create({ data: { key: 'poultry.health.delete', description: 'Delete health records' } }),
    prisma.permission.create({ data: { key: 'poultry.production.view', description: 'View production records' } }),
    prisma.permission.create({ data: { key: 'poultry.production.create', description: 'Create production records' } }),
    prisma.permission.create({ data: { key: 'poultry.production.delete', description: 'Delete production records' } }),
    prisma.permission.create({ data: { key: 'poultry.procurement.view', description: 'View procurement records' } }),
    prisma.permission.create({ data: { key: 'poultry.procurement.create', description: 'Create procurement records' } }),
    prisma.permission.create({ data: { key: 'poultry.procurement.update', description: 'Update procurement records' } }),
    prisma.permission.create({ data: { key: 'poultry.procurement.delete', description: 'Delete procurement records' } }),
    prisma.permission.create({ data: { key: 'poultry.sale.view', description: 'View sales' } }),
    prisma.permission.create({ data: { key: 'poultry.sale.create', description: 'Create sales' } }),
    prisma.permission.create({ data: { key: 'poultry.sale.update', description: 'Update sale records' } }),
    prisma.permission.create({ data: { key: 'poultry.sale.delete', description: 'Delete sales' } }),
    // Billing permissions
    prisma.permission.create({ data: { key: 'billing.plans.view', description: 'View available plans and features' } }),
    prisma.permission.create({ data: { key: 'billing.plans.manage', description: 'Create and manage plans (admin)' } }),
    prisma.permission.create({ data: { key: 'billing.subscriptions.view', description: 'View subscription status and history' } }),
    prisma.permission.create({ data: { key: 'billing.subscriptions.manage', description: 'Upgrade, downgrade, cancel subscriptions' } }),
    prisma.permission.create({ data: { key: 'billing.entitlements.view', description: 'View feature entitlements' } }),
    prisma.permission.create({ data: { key: 'billing.usage.view', description: 'View usage meters and records' } }),
    prisma.permission.create({ data: { key: 'billing.invoices.view', description: 'View invoices' } }),
    prisma.permission.create({ data: { key: 'billing.invoices.manage', description: 'Generate and manage invoices (admin)' } }),
    prisma.permission.create({ data: { key: 'billing.metrics.admin', description: 'View billing metrics (MRR, churn)' } }),
  ])
  console.log(`  ✓ Created ${permissions.length} permissions`)

  // ── Assign permissions to roles ──
  for (const org of orgs) {
    const ownerRole = roles.find(r => r.organizationId === org.id && r.slug === 'owner')!
    const adminRole = roles.find(r => r.organizationId === org.id && r.slug === 'admin')!
    const memberRole = roles.find(r => r.organizationId === org.id && r.slug === 'member')!

    // Owner gets ALL permissions
    await Promise.all(
      permissions.map(p => prisma.rolePermission.create({ data: { roleId: ownerRole.id, permissionId: p.id } }))
    )
    // Admin gets all except destructive
    const adminPerms = permissions.filter(p => !p.key.includes('delete'))
    await Promise.all(
      adminPerms.map(p => prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: p.id } }))
    )
    // Member gets view + domain.view + domain.activate + ai.chat
    const memberPerms = permissions.filter(p =>
      p.key.endsWith('.view') || p.key === 'domain.view' || p.key === 'ai.chat'
    )
    await Promise.all(
      memberPerms.map(p => prisma.rolePermission.create({ data: { roleId: memberRole.id, permissionId: p.id } }))
    )
  }
  console.log('  ✓ Assigned permissions to Owner/Admin/Member roles')

  // ── Assign roles to memberships ──
  await Promise.all([
    prisma.membershipRole.create({ data: { membershipId: memberships[0].id, roleId: roles.find(r => r.organizationId === orgs[0].id && r.slug === 'owner')!.id } }),
    prisma.membershipRole.create({ data: { membershipId: memberships[1].id, roleId: roles.find(r => r.organizationId === orgs[0].id && r.slug === 'member')!.id } }),
    prisma.membershipRole.create({ data: { membershipId: memberships[2].id, roleId: roles.find(r => r.organizationId === orgs[1].id && r.slug === 'admin')!.id } }),
  ])
  console.log('  ✓ Assigned roles to memberships')

  // ══════════════════════════════════════════════════════════════
  // DOMAINS & MODULES (Phase 3 — Domain Engine)
  // ══════════════════════════════════════════════════════════════

  // ── Global Domains ──
  const domains = await Promise.all([
    prisma.domain.create({
      data: {
        name: 'Mianx Poultry OS',
        slug: 'poultry',
        version: '1.0.0',
        description: 'Complete poultry farm management: farms, sheds, flocks, feed, health, production, procurement, and sales',
        status: 'available',
        manifest: JSON.stringify({
          schema: 'mianx-domain/v1',
          domain: { name: 'Mianx Poultry OS', slug: 'poultry', version: '1.0.0' },
          moduleCount: 8, permissionCount: 30,
        }),
      },
    }),
    prisma.domain.create({
      data: {
        name: 'Restaurant OS',
        slug: 'restaurant',
        version: '1.0.0',
        description: 'Restaurant operations — menu, orders, kitchen, inventory',
        status: 'available',
        manifest: JSON.stringify({
          schema: 'mianx-domain/v1',
          domain: { name: 'Restaurant OS', slug: 'restaurant', version: '1.0.0' },
          moduleCount: 4, permissionCount: 10,
        }),
      },
    }),
    prisma.domain.create({
      data: {
        name: 'Retail OS',
        slug: 'retail',
        version: '0.9.0',
        description: 'Retail management — POS, inventory, customers, loyalty',
        status: 'draft',
        manifest: JSON.stringify({
          schema: 'mianx-domain/v1',
          domain: { name: 'Retail OS', slug: 'retail', version: '0.9.0' },
          moduleCount: 3, permissionCount: 8,
        }),
      },
    }),
  ])
  console.log(`  ✓ Created ${domains.length} global domains`)

  // ── Domain Modules ──
  const poultryModules = await Promise.all([
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Farm Management', slug: 'farm', version: '1.0.0', description: 'Manage farm locations, capacity, and operational status', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Shed Management', slug: 'shed', version: '1.0.0', description: 'Track shed types, capacity, environmental conditions, and occupancy', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Flock Management', slug: 'flock', version: '1.0.0', description: 'Manage flock lifecycle: placement, growth, mortality, weight tracking', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Feed Tracking', slug: 'feed', version: '1.0.0', description: 'Record feed consumption, conversion ratios, stock levels, and costs', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Health Records', slug: 'health', version: '1.0.0', description: 'Track vaccinations, treatments, mortality causes, and health alerts', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Production Metrics', slug: 'production', version: '1.0.0', description: 'Monitor egg production, body weight, feed conversion, and growth curves', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Procurement', slug: 'procurement', version: '1.0.0', description: 'Manage chick procurement, feed purchases, medicine, and equipment', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Sales', slug: 'sales', version: '1.0.0', description: 'Record sales transactions, customer management, and revenue tracking', status: 'available' } }),
  ])

  const restaurantModules = await Promise.all([
    prisma.module.create({ data: { domainId: domains[1].id, name: 'Menu Management', slug: 'menu-management', version: '1.0.0', description: 'Menu items, categories, pricing, modifiers', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[1].id, name: 'Order Management', slug: 'order-management', version: '1.0.0', description: 'Orders, kitchen display, fulfillment', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[1].id, name: 'Kitchen Operations', slug: 'kitchen-operations', version: '1.0.0', description: 'Prep lists, waste tracking, recipe management', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[1].id, name: 'Table & Reservation', slug: 'table-reservation', version: '1.0.0', description: 'Table layout, reservations, waitlist', status: 'draft' } }),
  ])

  const retailModules = await Promise.all([
    prisma.module.create({ data: { domainId: domains[2].id, name: 'Point of Sale', slug: 'pos', version: '0.9.0', description: 'POS terminal, transactions, receipts', status: 'draft' } }),
    prisma.module.create({ data: { domainId: domains[2].id, name: 'Inventory', slug: 'inventory', version: '0.9.0', description: 'Stock levels, reordering, suppliers', status: 'draft' } }),
    prisma.module.create({ data: { domainId: domains[2].id, name: 'Customer Loyalty', slug: 'customer-loyalty', version: '0.9.0', description: 'Loyalty points, rewards, customer profiles', status: 'draft' } }),
  ])

  console.log(`  ✓ Created ${poultryModules.length + restaurantModules.length + retailModules.length} modules across ${domains.length} domains`)

  // ── Activate domains for organizations ──
  const orgDomains = await Promise.all([
    // Poultry Farm Co gets Poultry OS
    prisma.organizationDomain.create({
      data: { organizationId: orgs[0].id, domainId: domains[0].id, status: 'active', activatedAt: new Date(), configuration: JSON.stringify({ unit_system: 'metric', language: 'ur' }) },
    }),
    // Fresh Restaurants gets Restaurant OS
    prisma.organizationDomain.create({
      data: { organizationId: orgs[1].id, domainId: domains[1].id, status: 'active', activatedAt: new Date(), configuration: JSON.stringify({ currency: 'USD', tax_rate: 0.08 }) },
    }),
    // Poultry Farm Co also activates Restaurant (for their restaurant side)
    prisma.organizationDomain.create({
      data: { organizationId: orgs[0].id, domainId: domains[1].id, status: 'active', activatedAt: new Date(), configuration: JSON.stringify({ currency: 'PKR', tax_rate: 0.16 }) },
    }),
  ])
  console.log(`  ✓ Activated ${orgDomains.length} domain-organization links`)

  // ── Activate modules for organizations ──
  const orgModules = await Promise.all([
    // Poultry Farm Co: all 8 Poultry modules
    ...poultryModules.map(m => prisma.organizationModule.create({ data: { organizationId: orgs[0].id, moduleId: m.id, status: 'active', activatedAt: new Date() } })),
    // Fresh Restaurants: Menu + Orders modules
    prisma.organizationModule.create({ data: { organizationId: orgs[1].id, moduleId: restaurantModules[0].id, status: 'active', activatedAt: new Date() } }),
    prisma.organizationModule.create({ data: { organizationId: orgs[1].id, moduleId: restaurantModules[1].id, status: 'active', activatedAt: new Date() } }),
    // Poultry Farm Co also activates Menu module (via Restaurant OS)
    prisma.organizationModule.create({ data: { organizationId: orgs[0].id, moduleId: restaurantModules[0].id, status: 'active', activatedAt: new Date() } }),
  ])
  console.log(`  ✓ Activated ${orgModules.length} module-organization links`)

  // ── Teams ──
  const teams = await Promise.all([
    prisma.team.create({ data: { organizationId: orgs[0].id, name: 'Farm Operations', description: 'Daily farm management team' } }),
    prisma.team.create({ data: { organizationId: orgs[0].id, name: 'Sales & Procurement', description: 'Handles sales and purchasing' } }),
    prisma.team.create({ data: { organizationId: orgs[1].id, name: 'Kitchen Staff', description: 'Restaurant kitchen operations' } }),
  ])
  console.log(`  ✓ Created ${teams.length} teams`)

  // ── Settings ──
  await Promise.all([
    prisma.setting.create({ data: { organizationId: orgs[0].id, scopeType: 'organization', key: 'default_currency', value: 'PKR' } }),
    prisma.setting.create({ data: { organizationId: orgs[0].id, scopeType: 'organization', key: 'date_format', value: 'DD/MM/YYYY' } }),
    prisma.setting.create({ data: { organizationId: orgs[1].id, scopeType: 'organization', key: 'default_currency', value: 'USD' } }),
  ])
  console.log('  ✓ Created organization settings')

  // ── Notifications ──
  await Promise.all([
    prisma.notification.create({ data: { organizationId: orgs[0].id, recipientUserId: profiles[0].userId, type: 'system', title: 'Welcome to Mianx.ai', body: 'Your organization is set up and ready to use.' } }),
    prisma.notification.create({ data: { organizationId: orgs[0].id, recipientUserId: profiles[1].userId, type: 'invitation', title: 'You were added to Poultry Farm Co', body: 'Ali Khan added you as a team member.' } }),
  ])
  console.log('  ✓ Created sample notifications')

  // ══════════════════════════════════════════════════════════════
  // AI CORE (Phase 4 — AI Core Foundation)
  // ══════════════════════════════════════════════════════════════

  // ── Custom Agent Configs ──
  const agentConfigs = await Promise.all([
    prisma.agentConfig.create({
      data: {
        organizationId: orgs[0].id, slug: 'farm-advisor', name: 'Farm Advisor',
        description: 'Specialized in poultry farm operations, feed optimization, and flock health',
        systemPrompt: `You are Poultry Farm Co's AI Farm Advisor. You specialize in:
- Flock management and batch tracking
- Feed formulation and cost optimization
- Health monitoring and vaccination schedules
- Sales forecasting and procurement planning

Always reference actual data from the tools. Use Urdu terms when appropriate for the Pakistani context.
Be specific and actionable in your recommendations.`,
        model: 'gpt-4o-mini', provider: 'openai', temperature: 0.5, maxTokens: 4096,
        tools: JSON.stringify(['list_active_domains', 'list_active_modules', 'get_organization_stats', 'list_organization_members']),
      },
    }),
    prisma.agentConfig.create({
      data: {
        organizationId: orgs[1].id, slug: 'menu-optimizer', name: 'Menu Optimizer',
        description: 'Helps optimize restaurant menu items, pricing, and ingredient costs',
        systemPrompt: `You are Fresh Restaurants' Menu Optimizer AI. You help with:
- Menu item pricing and profitability analysis
- Ingredient cost tracking
- Seasonal menu recommendations
- Customer preference analysis

Always use tools to get real data. Focus on actionable cost-saving insights.`,
        model: 'claude-haiku-4-20250414', provider: 'anthropic', temperature: 0.4, maxTokens: 4096,
        tools: JSON.stringify(['get_organization_stats', 'list_active_modules', 'search_audit_logs']),
      },
    }),
  ])
  console.log(`  ✓ Created ${agentConfigs.length} custom agent configs`)

  // ── Sample Conversations ──
  const sampleConvos = await Promise.all([
    prisma.conversation.create({
      data: { organizationId: orgs[0].id, userId: profiles[0].userId, title: 'Flock health check recommendations', agentSlug: 'general-assistant' },
    }),
    prisma.conversation.create({
      data: { organizationId: orgs[0].id, userId: profiles[0].userId, title: 'Feed cost analysis Q1', agentSlug: 'farm-advisor' },
    }),
    prisma.conversation.create({
      data: { organizationId: orgs[1].id, userId: profiles[0].userId, title: 'Menu pricing review', agentSlug: 'menu-optimizer', status: 'archived' },
    }),
  ])
  console.log(`  ✓ Created ${sampleConvos.length} sample conversations`)

  // ── Sample Messages ──
  await Promise.all([
    // Convo 1 messages
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[0].id, role: 'user', content: 'What vaccinations are due this month for our flocks?' } }),
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[0].id, role: 'assistant', content: 'Let me check your current flock data and vaccination schedules. Based on the Poultry OS domain data, I recommend scheduling Newcastle disease booster and infectious bronchitis vaccination for all active flocks this month.', model: 'gpt-4o-mini', provider: 'openai', tokensIn: 45, tokensOut: 38, latencyMs: 320 } }),
    // Convo 2 messages
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[1].id, role: 'user', content: 'Analyze our feed costs for last quarter' } }),
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[1].id, role: 'assistant', content: 'Based on your organization data, you have 2 active modules including Feed Management. The feed costs have been tracked across your active flocks. I recommend reviewing the feed formulation ratios — switching to a locally-sourced soy alternative could reduce costs by 12-15%.', model: 'gpt-4o-mini', provider: 'openai', tokensIn: 52, tokensOut: 56, latencyMs: 410 } }),
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[1].id, role: 'user', content: 'Which supplier has the best rates?' } }),
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[1].id, role: 'assistant', content: 'I don\'t have a supplier comparison tool available yet. However, I can search your audit logs for procurement records. Would you like me to do that?', model: 'gpt-4o-mini', provider: 'openai', tokensIn: 28, tokensOut: 34, latencyMs: 280 } }),
    // Convo 3 messages
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[2].id, role: 'user', content: 'Review our top 5 menu items for profitability' } }),
    prisma.aiMessage.create({ data: { conversationId: sampleConvos[2].id, role: 'assistant', content: 'Your restaurant has Menu Management and Order Management modules active. Based on the current data, I can see your organization is set up with USD currency. For a detailed profitability analysis, I\'d need access to cost and pricing data from the Menu module — which will be available once the domain data is fully integrated.', model: 'claude-haiku-4-20250414', provider: 'anthropic', tokensIn: 48, tokensOut: 62, latencyMs: 550 } }),
  ])
  console.log('  ✓ Created 7 sample messages across 3 conversations')

  // ══════════════════════════════════════════════════════════════
  // AUTOMATION (Phase 5 — Event and Automation)
  // ══════════════════════════════════════════════════════════════

  // ── Sample Events ──
  const sampleEvents = await Promise.all([
    prisma.event.create({
      data: { organizationId: orgs[0].id, eventType: 'poultry.flock.created', eventVersion: '1',
        domainId: domains[0].id, sourceType: 'user', actorType: 'user', actorId: profiles[0].userId,
        payload: JSON.stringify({ flockName: 'Batch A-101', shedId: 'shed-1', breed: 'Cobb-500', count: 5000 }),
        correlationId: 'corr-seed-001',
      },
    }),
    prisma.event.create({
      data: { organizationId: orgs[0].id, eventType: 'poultry.mortality.recorded', eventVersion: '1',
        domainId: domains[0].id, sourceType: 'system', actorType: 'system',
        causationId: 'evt-seed-001',
        payload: JSON.stringify({ flockId: 'flock-1', date: '2026-08-18', mortalityCount: 15, mortalityRate: 0.003, avgWeight: 2.1 }),
        correlationId: 'corr-seed-002',
      },
    }),
    prisma.event.create({
      data: { organizationId: orgs[1].id, eventType: 'restaurant.order.created', eventVersion: '1',
        domainId: domains[1].id, sourceType: 'user', actorType: 'user', actorId: profiles[0].userId,
        payload: JSON.stringify({ orderId: 'ORD-001', items: [{ name: 'Grilled Chicken', qty: 2, price: 25 }], total: 50 }),
        correlationId: 'corr-seed-003',
      },
    }),
    prisma.event.create({
      data: { organizationId: orgs[0].id, eventType: 'poultry.inventory.low', eventVersion: '1',
        domainId: domains[0].id, sourceType: 'system', actorType: 'system',
        causationId: 'evt-seed-002',
        payload: JSON.stringify({ itemId: 'feed-protein-001', currentStock: 50, threshold: 200, unit: 'kg' }),
        correlationId: 'corr-seed-002', status: 'delivered', deliveredAt: new Date(),
      },
    }),
    prisma.event.create({
      data: { organizationId: orgs[1].id, eventType: 'restaurant.inventory.low', eventVersion: '1',
        domainId: domains[1].id, sourceType: 'system', actorType: 'system',
        payload: JSON.stringify({ itemId: 'rice-basmati-001', currentStock: 5, threshold: 20, unit: 'kg' }),
      },
    }),
  ])
  console.log(`  ✓ Created ${sampleEvents.length} sample events`)

  // ── Sample Workflows ──
  const sampleWorkflows = await Promise.all([
    prisma.workflow.create({
      data: {
        organizationId: orgs[0].id, name: 'Mortality Alert', slug: 'mortality-alert',
        description: 'Alert farm manager when mortality rate exceeds threshold',
        triggerType: 'event',
        triggerConfig: JSON.stringify({ eventType: 'poultry.mortality.recorded' }),
        conditions: JSON.stringify([{ field: 'payload.mortalityRate', operator: 'gt', value: 0.002 }]),
        steps: JSON.stringify([
          { id: 'check-threshold', name: 'Check Mortality Rate', type: 'condition', config: { field: 'payload.mortalityRate', operator: 'gt', value: 0.002 } },
          { id: 'analyze', name: 'AI Analysis', type: 'ai_decision', config: { prompt: 'Analyze this mortality event and provide a brief recommendation.', model: 'gpt-4o-mini', provider: 'openai' } },
          { id: 'notify', name: 'Notify Manager', type: 'action', config: { type: 'send_notification', params: { type: 'alert', title: 'Mortality Alert', body: 'Mortality rate exceeded threshold. AI analysis available.' } } },
        ]),
        retryPolicy: JSON.stringify({ maxAttempts: 2, backoffMs: 30000, maxBackoffMs: 300000 }),
        timeoutSeconds: 120,
        status: 'active',
      },
    }),
    prisma.workflow.create({
      data: {
        organizationId: orgs[0].id, name: 'Low Feed Inventory', slug: 'low-feed-inventory',
        description: 'Notify when feed stock falls below threshold',
        triggerType: 'event',
        triggerConfig: JSON.stringify({ eventType: 'poultry.inventory.low' }),
        conditions: JSON.stringify([{ field: 'payload.currentStock', operator: 'lt', value: 200 }]),
        steps: JSON.stringify([
          { id: 'check', name: 'Verify Stock Level', type: 'condition', config: { field: 'payload.currentStock', operator: 'lt', value: 200 } },
          { id: 'notify', name: 'Send Alert', type: 'action', config: { type: 'send_notification', params: { type: 'alert', title: 'Low Feed Stock', body: 'Feed inventory is below threshold. Consider reordering.' } } },
        ]),
        timeoutSeconds: 60,
        status: 'active',
      },
    }),
    prisma.workflow.create({
      data: {
        organizationId: orgs[1].id, name: 'New Order Notification', slug: 'new-order-notification',
        description: 'Notify kitchen staff when a new order is placed',
        triggerType: 'event',
        triggerConfig: JSON.stringify({ eventType: 'restaurant.order.created' }),
        steps: JSON.stringify([
          { id: 'notify-kitchen', name: 'Notify Kitchen', type: 'action', config: { type: 'send_notification', params: { type: 'info', title: 'New Order', body: 'A new order has been placed. Check kitchen display.' } } },
        ]),
        timeoutSeconds: 30,
        status: 'active',
      },
    }),
  ])
  console.log(`  ✓ Created ${sampleWorkflows.length} sample workflows`)

  // ── Sample Job ──
  await prisma.job.create({
    data: { organizationId: orgs[0].id, type: 'send_notification', payload: JSON.stringify({ type: 'system', title: 'Daily Summary', body: 'This is a scheduled daily summary notification.' }), priority: 'low', status: 'completed', attempts: 1, runAt: new Date(), completedAt: new Date() },
  })
  await prisma.job.create({
    data: { organizationId: orgs[0].id, type: 'send_notification', payload: JSON.stringify({ type: 'system', title: 'Feed Check', body: 'Scheduled feed inventory check job.' }), priority: 'normal', scheduledAt: new Date(Date.now() + 86400000), status: 'pending' },
  })
  console.log('  ✓ Created 2 sample jobs')

  // ══════════════════════════════════════════════════════════════
  // API & INTEGRATION (Phase 6 — API and Integration)
  // ══════════════════════════════════════════════════════════════

  // ── Sample API Key ──
  const { createHash } = await import('crypto')
  const testApiKey = 'mk_live_' + 'a'.repeat(32)
  const testKeyHash = createHash('sha256').update(testApiKey).digest('hex')
  await prisma.apiKey.create({
    data: {
      organizationId: orgs[0].id, name: 'Development Key', prefix: 'aaaaaaaa',
      keyHash: testKeyHash, status: 'active', expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  })
  console.log('  ✓ Created 1 sample API key')

  // ── Sample Webhook ──
  await prisma.webhook.create({
    data: {
      organizationId: orgs[0].id, name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/T00/B00/xxx',
      secret: 'whsec_' + 'b'.repeat(24),
      eventTypes: JSON.stringify(['poultry.mortality.recorded', 'poultry.inventory.low', 'workflow.*']),
      status: 'active',
    },
  })
  console.log('  ✓ Created 1 sample webhook')

  // ── Sample OAuth Connection ──
  await prisma.oAuthConnection.create({
    data: {
      organizationId: orgs[0].id, provider: 'google',
      externalAccountId: 'ga-12345', externalAccountName: 'Poultry Farm Co',
      accessToken: 'ya29.a0AfH6SMB...', refreshToken: '1//0dx...',
      tokenExpiresAt: new Date(Date.now() + 3600000),
      metadata: JSON.stringify({ scopes: ['readonly'] }),
      status: 'active',
    },
  })
  console.log('  ✓ Created 1 sample OAuth connection')

  // ══════════════════════════════════════════════════════════════
  // BILLING (Phase 7 — Billing and Entitlements)
  // ══════════════════════════════════════════════════════════════

  // ── Features ──
  const billingFeatures = await Promise.all([
    prisma.feature.create({ data: { key: 'domain.poultry', name: 'Poultry OS Domain', description: 'Full Poultry OS access', category: 'domain' } }),
    prisma.feature.create({ data: { key: 'domain.restaurant', name: 'Restaurant OS Domain', description: 'Full Restaurant OS access', category: 'domain' } }),
    prisma.feature.create({ data: { key: 'module.flock-management', name: 'Flock Management', description: 'Track flocks, batches, mortality', category: 'module' } }),
    prisma.feature.create({ data: { key: 'module.feed-management', name: 'Feed Management', description: 'Feed formulations, consumption tracking', category: 'module' } }),
    prisma.feature.create({ data: { key: 'module.menu-management', name: 'Menu Management', description: 'Menu items, categories, pricing', category: 'module' } }),
    prisma.feature.create({ data: { key: 'ai.assistant', name: 'AI Assistant', description: 'AI chat capability', category: 'ai' } }),
    prisma.feature.create({ data: { key: 'api.access', name: 'API Access', description: 'REST API access', category: 'platform' } }),
    prisma.feature.create({ data: { key: 'automation.workflows', name: 'Automation', description: 'Workflow engine access', category: 'platform' } }),
    prisma.feature.create({ data: { key: 'advanced.analytics', name: 'Advanced Analytics', description: 'Advanced reporting and analytics', category: 'addon' } }),
    prisma.feature.create({ data: { key: 'webhooks.custom', name: 'Custom Webhooks', description: 'Create custom webhooks', category: 'integration' } }),
  ])
  console.log(`  ✓ Created ${billingFeatures.length} features`)

  // ── System Plans (aligned with landing page: Free, Pro, Enterprise) ──
  const freePlan = await prisma.plan.create({
    data: { name: 'Free', slug: 'free', description: 'Get started with core features at no cost', billingCycle: 'monthly', basePrice: 0, currency: 'USD', status: 'active', isSystem: true },
  })
  const proPlan = await prisma.plan.create({
    data: { name: 'Pro', slug: 'pro', description: 'For professionals who need advanced AI and unlimited automations', billingCycle: 'monthly', basePrice: 29, currency: 'USD', status: 'active', isSystem: true },
  })
  const enterprisePlan = await prisma.plan.create({
    data: { name: 'Enterprise', slug: 'enterprise', description: 'Unlimited scale with dedicated infrastructure and custom support', billingCycle: 'monthly', basePrice: 0, currency: 'USD', status: 'active', isSystem: true, metadata: JSON.stringify({ contactRequired: true }) },
  })
  console.log('  ✓ Created 3 system plans (Free, Pro, Enterprise)')

  // ── Plan Versions ──
  const planVersions = await Promise.all([
    prisma.planVersion.create({
      data: { planId: freePlan.id, version: 1, name: 'Free v1',
        features: JSON.stringify([
          { key: 'domain.poultry', name: 'Poultry OS', category: 'domain' },
          { key: 'module.flock-management', name: 'Flock Management', category: 'module' },
          { key: 'ai.assistant', name: 'Basic AI Assistant', category: 'ai' },
        ]),
        limits: JSON.stringify([
          { key: 'members.active', value: 3, unit: 'member' },
          { key: 'api.requests', value: 5000, unit: 'request' },
          { key: 'ai.total_tokens', value: 100000, unit: 'token' },
          { key: 'automations', value: 5, unit: 'workflow' },
        ]),
        seatAllowance: 3, aiTokenAllowance: 100000,
      },
    }),
    prisma.planVersion.create({
      data: { planId: proPlan.id, version: 1, name: 'Pro v1',
        features: JSON.stringify([
          { key: 'domain.poultry', name: 'Poultry OS', category: 'domain' },
          { key: 'domain.restaurant', name: 'Restaurant OS', category: 'domain' },
          { key: 'module.flock-management', name: 'Flock Management', category: 'module' },
          { key: 'module.feed-management', name: 'Feed Management', category: 'module' },
          { key: 'module.menu-management', name: 'Menu Management', category: 'module' },
          { key: 'ai.assistant', name: 'Advanced AI Assistant', category: 'ai' },
          { key: 'api.access', name: 'API Access', category: 'platform' },
          { key: 'automation.workflows', name: 'Unlimited Automations', category: 'platform' },
          { key: 'webhooks.custom', name: 'Custom Webhooks', category: 'integration' },
        ]),
        limits: JSON.stringify([
          { key: 'members.active', value: -1, unit: 'member', description: 'Unlimited' },
          { key: 'api.requests', value: 50000, unit: 'request' },
          { key: 'ai.total_tokens', value: 1000000, unit: 'token' },
        ]),
        seatAllowance: -1, aiTokenAllowance: 1000000,
      },
    }),
    prisma.planVersion.create({
      data: { planId: enterprisePlan.id, version: 1, name: 'Enterprise v1',
        features: JSON.stringify([
          { key: 'domain.poultry', name: 'Poultry OS', category: 'domain' },
          { key: 'domain.restaurant', name: 'Restaurant OS', category: 'domain' },
          { key: 'module.flock-management', name: 'Flock Management', category: 'module' },
          { key: 'module.feed-management', name: 'Feed Management', category: 'module' },
          { key: 'module.menu-management', name: 'Menu Management', category: 'module' },
          { key: 'ai.assistant', name: 'Custom AI Models', category: 'ai' },
          { key: 'api.access', name: 'API Access', category: 'platform' },
          { key: 'automation.workflows', name: 'Unlimited Automations', category: 'platform' },
          { key: 'advanced.analytics', name: 'Advanced Analytics', category: 'addon' },
          { key: 'webhooks.custom', name: 'Custom Webhooks', category: 'integration' },
        ]),
        limits: JSON.stringify([
          { key: 'members.active', value: -1, unit: 'member', description: 'Unlimited' },
          { key: 'api.requests', value: -1, unit: 'request', description: 'Unlimited' },
          { key: 'ai.total_tokens', value: 10000000, unit: 'token' },
        ]),
        seatAllowance: -1, aiTokenAllowance: 10000000,
      },
    }),
  ])
  console.log(`  ✓ Created ${planVersions.length} plan versions (Free, Pro, Enterprise)`)

  // ── Usage Meters ──
  const usageMeters = await Promise.all([
    prisma.usageMeter.create({ data: { key: 'api.requests', name: 'API Requests', unit: 'request', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'hard_limit', defaultLimit: 10000 } }),
    prisma.usageMeter.create({ data: { key: 'storage.bytes', name: 'Storage', unit: 'byte', meterType: 'gauge', aggregation: 'sum', resetCycle: 'never', overageBehavior: 'soft_limit', defaultLimit: 1000000000 } }),
    prisma.usageMeter.create({ data: { key: 'members.active', name: 'Active Members', unit: 'member', meterType: 'counter', aggregation: 'sum', resetCycle: 'never', overageBehavior: 'hard_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.requests', name: 'AI Requests', unit: 'count', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.input_tokens', name: 'AI Input Tokens', unit: 'token', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.output_tokens', name: 'AI Output Tokens', unit: 'token', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.total_tokens', name: 'AI Total Tokens', unit: 'token', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.tool_calls', name: 'AI Tool Calls', unit: 'count', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'ai.agent_runs', name: 'AI Agent Runs', unit: 'count', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'soft_limit' } }),
    prisma.usageMeter.create({ data: { key: 'messages.sent', name: 'Messages Sent', unit: 'message', meterType: 'counter', aggregation: 'sum', resetCycle: 'monthly', overageBehavior: 'hard_limit', defaultLimit: 1000 } }),
  ])
  console.log(`  ✓ Created ${usageMeters.length} usage meters`)

  // ── Subscription for Poultry Farm Co (Free plan, trialing → auto-upgrade via checkout) ──
  const now = new Date()
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const subscription = await prisma.subscription.create({
    data: {
      organizationId: orgs[0].id,
      planId: freePlan.id,
      planVersionId: planVersions[0].id, // Free v1
      state: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      seatCount: 4,
    },
  })
  console.log('  ✓ Created 1 active subscription (Free)')

  // ── Sample Usage Records ──
  await Promise.all([
    prisma.usageRecord.create({ data: { organizationId: orgs[0].id, meterKey: 'api.requests', quantity: 1250, unit: 'request', source: 'api', idempotencyKey: 'seed-api-req-1', occurredAt: new Date() } }),
    prisma.usageRecord.create({ data: { organizationId: orgs[0].id, meterKey: 'ai.total_tokens', quantity: 45000, unit: 'token', source: 'ai-chat', idempotencyKey: 'seed-ai-tok-1', occurredAt: new Date() } }),
    prisma.usageRecord.create({ data: { organizationId: orgs[0].id, meterKey: 'ai.requests', quantity: 23, unit: 'count', source: 'ai-chat', idempotencyKey: 'seed-ai-req-1', occurredAt: new Date() } }),
  ])
  console.log('  ✓ Created 3 sample usage records')

  // ── Sample Invoice ──
  const invoiceLines = JSON.stringify([
    { type: 'base_plan', description: 'Growth (monthly)', unitPrice: 99, amount: 99 },
    { type: 'seats', description: 'Extra seats (1 x 9.90)', quantity: 1, unitPrice: 9.90, amount: 9.90 },
  ])
  await prisma.invoice.create({
    data: {
      organizationId: orgs[0].id, subscriptionId: subscription.id, invoiceNumber: 'INV-0001',
      status: 'paid', periodStart: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), periodEnd: now,
      currency: 'USD', subtotal: 108.90, discount: 0, tax: 0, total: 108.90,
      lineItems: invoiceLines, issuedAt: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), dueAt: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate() + 30), paidAt: now,
    },
  })
  console.log('  ✓ Created 1 sample invoice')

  // ══════════════════════════════════════════════════════════════
  // POULTRY BUSINESS DATA (Phase 10)
  // ══════════════════════════════════════════════════════════════

  const poultryOrgId = orgs[0].id

  // ── Farms ──
  const farms = await Promise.all([
    prisma.poultryFarm.create({ data: { organizationId: poultryOrgId, name: 'Main Farm', location: 'Lahore, Punjab', capacity: 50000, status: 'active', contactInfo: '+92-300-1234567', latitude: 31.5204, longitude: 74.3587 } }),
    prisma.poultryFarm.create({ data: { organizationId: poultryOrgId, name: 'North Farm', location: 'Rawalpindi, Punjab', capacity: 30000, status: 'active', contactInfo: '+92-301-7654321' } }),
  ])

  // ── Sheds ──
  const sheds = await Promise.all([
    prisma.poultryShed.create({ data: { organizationId: poultryOrgId, farmId: farms[0].id, name: 'Shed A1', shedType: 'broiler', capacity: 10000, currentCount: 8500, temperature: 24.5, humidity: 65 } }),
    prisma.poultryShed.create({ data: { organizationId: poultryOrgId, farmId: farms[0].id, name: 'Shed A2', shedType: 'broiler', capacity: 10000, currentCount: 9200, temperature: 25.0, humidity: 60 } }),
    prisma.poultryShed.create({ data: { organizationId: poultryOrgId, farmId: farms[0].id, name: 'Shed L1', shedType: 'layer', capacity: 8000, currentCount: 7500, temperature: 23.0, humidity: 70 } }),
    prisma.poultryShed.create({ data: { organizationId: poultryOrgId, farmId: farms[1].id, name: 'Shed B1', shedType: 'broiler', capacity: 10000, currentCount: 0, temperature: null, humidity: null, status: 'inactive' } }),
  ])

  // ── Flocks ──
  const flocks = await Promise.all([
    prisma.poultryFlock.create({ data: { organizationId: poultryOrgId, shedId: sheds[0].id, breed: 'Cobb 500', placementDate: new Date(Date.now() - 28 * 86400000), quantity: 10000, currentCount: 8500, status: 'growing', averageWeight: 1.85 } }),
    prisma.poultryFlock.create({ data: { organizationId: poultryOrgId, shedId: sheds[1].id, breed: 'Ross 308', placementDate: new Date(Date.now() - 21 * 86400000), quantity: 10000, currentCount: 9200, status: 'growing', averageWeight: 1.35 } }),
    prisma.poultryFlock.create({ data: { organizationId: poultryOrgId, shedId: sheds[2].id, breed: 'Hy-Line Brown', placementDate: new Date(Date.now() - 140 * 86400000), quantity: 8000, currentCount: 7500, status: 'laying', averageWeight: 2.1 } }),
  ])

  // ── Feed Records ──
  const today = new Date()
  for (let d = 0; d < 7; d++) {
    const date = new Date(today.getTime() - d * 86400000)
    await Promise.all([
      prisma.poultryFeedRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[0].id, date, feedType: 'Broiler Starter', quantityKg: 420, costUsd: 210 } }),
      prisma.poultryFeedRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[1].id, date, feedType: 'Broiler Grower', quantityKg: 380, costUsd: 190 } }),
      prisma.poultryFeedRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[2].id, date, feedType: 'Layer Feed', quantityKg: 300, costUsd: 180 } }),
    ])
  }

  // ── Health Records ──
  await Promise.all([
    prisma.poultryHealthRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[0].id, date: new Date(Date.now() - 27 * 86400000), type: 'vaccination', treatment: 'Newcastle Disease (Lasota)', veterinarian: 'Dr. Hassan', costUsd: 45, nextDueDate: new Date(Date.now() + 14 * 86400000) } }),
    prisma.poultryHealthRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[0].id, date: new Date(Date.now() - 14 * 86400000), type: 'vaccination', treatment: 'Infectious Bronchitis (H120)', veterinarian: 'Dr. Hassan', costUsd: 40, nextDueDate: new Date(Date.now() + 7 * 86400000) } }),
    prisma.poultryHealthRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[1].id, date: new Date(Date.now() - 5 * 86400000), type: 'treatment', treatment: 'Antibiotics for respiratory infection', veterinarian: 'Dr. Ahmed', costUsd: 85, notes: '5-day course, responded well' } }),
    prisma.poultryHealthRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[2].id, date: new Date(Date.now() - 10 * 86400000), type: 'checkup', treatment: 'Routine flock inspection', veterinarian: 'Dr. Hassan', costUsd: 20 } }),
  ])

  // ── Mortality Records ──
  await Promise.all([
    prisma.poultryMortalityRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[0].id, date: new Date(Date.now() - 3 * 86400000), count: 15, cause: 'Heat stress', notes: 'Temperature spike in shed' } }),
    prisma.poultryMortalityRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[0].id, date: new Date(Date.now() - 10 * 86400000), count: 8, cause: 'Unknown / Sudden Death Syndrome' } }),
    prisma.poultryMortalityRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[1].id, date: new Date(Date.now() - 4 * 86400000), count: 25, cause: 'Respiratory infection' } }),
    prisma.poultryMortalityRecord.create({ data: { organizationId: poultryOrgId, flockId: flocks[2].id, date: new Date(Date.now() - 7 * 86400000), count: 3, cause: 'Age-related culling' } }),
  ])

  // ── Production Records (for layer flock) ──
  for (let d = 0; d < 14; d++) {
    const date = new Date(today.getTime() - d * 86400000)
    await prisma.poultryProductionRecord.create({
      data: { organizationId: poultryOrgId, flockId: flocks[2].id, date, eggsCollected: 6200 + Math.floor(Math.random() * 400 - 200), totalWeightKg: 390 + Math.floor(Math.random() * 30 - 15), feedConversionRatio: 2.1 + Math.random() * 0.3 },
    })
  }

  // ── Customers ──
  const customers = await Promise.all([
    prisma.poultryCustomer.create({ data: { organizationId: poultryOrgId, name: 'Metro Cash & Carry', phone: '+92-42-35761234', email: 'procurement@metro.pk', address: 'Lahore' } }),
    prisma.poultryCustomer.create({ data: { organizationId: poultryOrgId, name: 'Al-Fatah Store', phone: '+92-42-35876543', address: 'Gulberg, Lahore' } }),
    prisma.poultryCustomer.create({ data: { organizationId: poultryOrgId, name: 'Hashim Brothers', phone: '+92-300-9876543', address: 'Multan Road, Lahore' } }),
  ])

  // ── Sales ──
  await Promise.all([
    prisma.poultrySale.create({ data: { organizationId: poultryOrgId, customerId: customers[0].id, date: new Date(Date.now() - 2 * 86400000), items: JSON.stringify([{ product: 'Live Broiler', qty_kg: 500, rate_per_kg: 450 }]), totalAmount: 225000, currency: 'PKR', status: 'completed' } }),
    prisma.poultrySale.create({ data: { organizationId: poultryOrgId, customerId: customers[1].id, date: new Date(Date.now() - 5 * 86400000), items: JSON.stringify([{ product: 'Eggs (Tray)', qty: 100, rate_per_tray: 850 }]), totalAmount: 85000, currency: 'PKR', status: 'completed' } }),
    prisma.poultrySale.create({ data: { organizationId: poultryOrgId, customerId: customers[2].id, date: new Date(Date.now() - 1 * 86400000), items: JSON.stringify([{ product: 'Live Broiler', qty_kg: 300, rate_per_kg: 460 }, { product: 'Eggs (Tray)', qty: 50, rate_per_tray: 850 }]), totalAmount: 178500, currency: 'PKR', status: 'completed' } }),
  ])

  // ── Procurement ──
  await Promise.all([
    prisma.poultryProcurement.create({ data: { organizationId: poultryOrgId, type: 'feed', supplier: 'Pak Feeds Ltd', description: 'Broiler Starter Feed', quantity: 5000, unit: 'kg', unitCostUsd: 0.5, totalCostUsd: 2500, date: new Date(Date.now() - 10 * 86400000), status: 'received' } }),
    prisma.poultryProcurement.create({ data: { organizationId: poultryOrgId, type: 'medicine', supplier: 'VetPharma', description: 'Antibiotics (Enrofloxacin)', quantity: 50, unit: 'packs', unitCostUsd: 8, totalCostUsd: 400, date: new Date(Date.now() - 6 * 86400000), status: 'received' } }),
    prisma.poultryProcurement.create({ data: { organizationId: poultryOrgId, type: 'chick', supplier: 'Hub Hatchery', description: 'Cobb 500 day-old chicks', quantity: 10000, unit: 'birds', unitCostUsd: 0.4, totalCostUsd: 4000, date: new Date(Date.now() - 28 * 86400000), deliveryDate: new Date(Date.now() - 28 * 86400000), status: 'received' } }),
  ])
  console.log(`  ✓ Created Poultry business data: ${farms.length} farms, ${sheds.length} sheds, ${flocks.length} flocks, ${customers.length} customers`)

  console.log('\n✅ Seed complete! Summary:')
  console.log(`   Organizations: ${orgs.length}`)
  console.log(`   Profiles: ${profiles.length}`)
  console.log(`   Memberships: ${memberships.length}`)
  console.log(`   Roles: ${roles.length}`)
  console.log(`   Permissions: ${permissions.length}`)
  console.log(`   Domains: ${domains.length}`)
  console.log(`   Modules: ${poultryModules.length + restaurantModules.length + retailModules.length}`)
  console.log(`   Org-Domains: ${orgDomains.length}`)
  console.log(`   Org-Modules: ${orgModules.length}`)
  console.log(`   Teams: ${teams.length}`)
  console.log(`   Agent Configs: ${agentConfigs.length}`)
  console.log(`   Conversations: ${sampleConvos.length}`)
  console.log(`   Events: ${sampleEvents.length}`)
  console.log(`   Workflows: ${sampleWorkflows.length}`)
  console.log(`   Jobs: 2`)
  console.log(`   API Keys: 1`)
  console.log(`   Webhooks: 1`)
  console.log(`   OAuth Connections: 1`)
  console.log(`   Plans: 3`)
  console.log(`   Plan Versions: ${planVersions.length}`)
  console.log(`   Features: ${billingFeatures.length}`)
  console.log(`   Usage Meters: ${usageMeters.length}`)
  console.log(`   Subscriptions: 1`)
  console.log(`   Usage Records: 3`)
  console.log(`   Invoices: 1`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

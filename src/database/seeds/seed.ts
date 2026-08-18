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
  await prisma.aiMessage.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.agentConfig.deleteMany()
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
        name: 'Poultry OS',
        slug: 'poultry',
        version: '1.0.0',
        description: 'End-to-end poultry farm management — feed, flock, health, sales',
        status: 'available',
        manifest: JSON.stringify({
          schema: 'mianx-domain/v1',
          domain: { name: 'Poultry OS', slug: 'poultry', version: '1.0.0' },
          moduleCount: 4, permissionCount: 12,
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
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Flock Management', slug: 'flock-management', version: '1.0.0', description: 'Track flocks, batches, mortality, weights', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Feed Management', slug: 'feed-management', version: '1.0.0', description: 'Feed formulations, consumption tracking, cost analysis', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Health & Vaccination', slug: 'health-vaccination', version: '1.0.0', description: 'Vaccination schedules, disease tracking, vet records', status: 'available' } }),
    prisma.module.create({ data: { domainId: domains[0].id, name: 'Sales & Procurement', slug: 'sales-procurement', version: '1.0.0', description: 'Customer orders, procurement, pricing, invoicing', status: 'draft' } }),
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
    // Poultry Farm Co: Flock + Feed modules
    prisma.organizationModule.create({ data: { organizationId: orgs[0].id, moduleId: poultryModules[0].id, status: 'active', activatedAt: new Date(), configuration: JSON.stringify({ batch_tracking: true }) } }),
    prisma.organizationModule.create({ data: { organizationId: orgs[0].id, moduleId: poultryModules[1].id, status: 'active', activatedAt: new Date() } }),
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

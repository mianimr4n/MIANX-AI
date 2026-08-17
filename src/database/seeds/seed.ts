// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Development Seed Data
// Run: bun run src/database/seeds/seed.ts
// ══════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Mianx.ai development data...')

  // ── Clear existing ──
  await prisma.membershipRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.organizationMembership.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.file.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.team.deleteMany()
  await prisma.role.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.organizationDomain.deleteMany()
  await prisma.organizationModule.deleteMany()
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
    prisma.permission.create({ data: { key: 'domain.activate', description: 'Activate domains' } }),
    prisma.permission.create({ data: { key: 'domain.configure', description: 'Configure domain settings' } }),
    // Audit permissions
    prisma.permission.create({ data: { key: 'audit.view', description: 'View audit logs' } }),
  ])
  console.log(`  ✓ Created ${permissions.length} permissions`)

  // ── Assign permissions to Owner role (all permissions per org) ──
  for (const org of orgs) {
    const ownerRole = roles.find(r => r.organizationId === org.id && r.slug === 'owner')!
    await Promise.all(
      permissions.map(p =>
        prisma.rolePermission.create({ data: { roleId: ownerRole.id, permissionId: p.id } })
      )
    )
  }
  console.log('  ✓ Assigned all permissions to Owner roles')

  // ── Assign roles to memberships ──
  await Promise.all([
    prisma.membershipRole.create({ data: { membershipId: memberships[0].id, roleId: roles.find(r => r.organizationId === orgs[0].id && r.slug === 'owner')!.id } }),
    prisma.membershipRole.create({ data: { membershipId: memberships[1].id, roleId: roles.find(r => r.organizationId === orgs[0].id && r.slug === 'member')!.id } }),
    prisma.membershipRole.create({ data: { membershipId: memberships[2].id, roleId: roles.find(r => r.organizationId === orgs[1].id && r.slug === 'admin')!.id } }),
  ])
  console.log('  ✓ Assigned roles to memberships')

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
  console.log(`   Teams: ${teams.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

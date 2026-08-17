// ══════════════════════════════════════════════════════
// MIANX.AI — Phase 2 Integration Tests
// Tests all authorization, teams, roles, permissions endpoints
// ══════════════════════════════════════════════════════

import { resolveAuthContext, AuthenticationError, AuthorizationError } from '../src/core/authorization/auth-context'
import { hasPermission, hasAnyPermission, hasRole, requirePermission, requireAnyPermission, requireAdmin } from '../src/core/authorization/permissions'
import { parsePermission } from '../src/core/tenancy/utils'
import { db } from '../src/lib/db'

const PASS = '✅'
const FAIL = '❌'
let passed = 0
let failed = 0

function assert(name: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  ${PASS} ${name}`)
    passed++
  } else {
    console.log(`  ${FAIL} ${name} — ${detail}`)
    failed++
  }
}

async function main() {
  console.log('\n🔬 MIANX.AI Phase 2 — Authorization Test Suite\n')

  // Get orgs
  const poultryOrg = await db.organization.findFirst({ where: { name: 'Poultry Farm Co' } })!
  const freshOrg = await db.organization.findFirst({ where: { name: 'Fresh Restaurants' } })!

  // ── TEST 1: Owner auth context has all permissions ──
  console.log('── Auth Context Resolution ──')
  const ownerCtx = await resolveAuthContext('user-admin-001', poultryOrg.id)
  assert('Owner has permissions', ownerCtx.permissions.length > 0, `Got ${ownerCtx.permissions.length} perms`)
  assert('Owner has team.view', hasPermission(ownerCtx, 'team.view'), '')
  assert('Owner has organization.view', hasPermission(ownerCtx, 'organization.view'), '')
  assert('Owner has team.create', hasPermission(ownerCtx, 'team.create'), '')
  assert('Owner role present', hasRole(ownerCtx, 'owner'), '')

  // ── TEST 2: Admin auth context has permissions (not all) ──
  const adminCtx = await resolveAuthContext('user-admin-001', freshOrg.id)
  assert('Admin has permissions', adminCtx.permissions.length > 0, `Got ${adminCtx.permissions.length} perms`)
  assert('Admin has team.view', hasPermission(adminCtx, 'team.view'), '')
  assert('Admin role present', hasRole(adminCtx, 'admin'), '')

  // ── TEST 3: Member auth context (limited perms) ──
  const memberCtx = await resolveAuthContext('user-manager-002', poultryOrg.id)
  assert('Member has view perms', hasPermission(memberCtx, 'organization.view'), '')
  assert('Member has team.view', hasPermission(memberCtx, 'team.view'), '')
  assert('Member lacks team.create', !hasPermission(memberCtx, 'team.create'), 'Member should not be able to create teams')
  assert('Member lacks member.invite', !hasPermission(memberCtx, 'member.invite'), 'Member should not invite')

  // ── TEST 4: Cross-tenant denial ──
  console.log('\n── Cross-Tenant Isolation ──')
  try {
    await resolveAuthContext('user-manager-002', freshOrg.id)
    assert('Cross-tenant denied', false, 'Should have thrown for non-member')
  } catch (e) {
    assert('Cross-tenant denied', (e as Error).message.includes('No active membership'), `Error: ${(e as Error).message}`)
  }

  // ── TEST 5: Suspended member denied ──
  console.log('\n── Suspended/Removed Members ──')
  const testProfile = await db.profile.upsert({
    where: { userId: 'test-suspended-user' },
    create: { userId: 'test-suspended-user', displayName: 'Test Suspended' },
    update: {},
  })
  const suspendedMembership = await db.organizationMembership.create({
    data: { organizationId: poultryOrg.id, userId: 'test-suspended-user', status: 'suspended' },
  })
  try {
    await resolveAuthContext('test-suspended-user', poultryOrg.id)
    assert('Suspended member denied', false, 'Should have thrown')
  } catch (e) {
    assert('Suspended member denied', (e as Error).message.includes('No active membership'), '')
  }

  // ── TEST 6: Removed member denied ──
  await db.organizationMembership.update({ where: { id: suspendedMembership.id }, data: { status: 'removed' } })
  try {
    await resolveAuthContext('test-suspended-user', poultryOrg.id)
    assert('Removed member denied', false, 'Should have thrown')
  } catch (e) {
    assert('Removed member denied', (e as Error).message.includes('No active membership'), '')
  }

  // ── TEST 7: Role escalation blocked ──
  console.log('\n── Role Escalation Prevention ──')
  assert('Member cannot update org', !hasPermission(memberCtx, 'organization.update'), 'Role escalation!')
  assert('Member cannot delete org', !hasPermission(memberCtx, 'organization.delete'), 'Role escalation!')
  assert('Member cannot manage teams', !hasPermission(memberCtx, 'team.manage'), 'Role escalation!')
  assert('Member cannot remove members', !hasPermission(memberCtx, 'member.remove'), 'Role escalation!')

  // ── TEST 8: requirePermission throws correctly ──
  console.log('\n── Permission Enforcement ──')
  try {
    requirePermission(memberCtx, 'team.create')
    assert('requirePermission throws', false, 'Should have thrown AuthorizationError')
  } catch (e) {
    assert('requirePermission throws', e instanceof AuthorizationError, '')
  }

  try {
    requireAnyPermission(memberCtx, ['team.view', 'organization.view'])
    assert('requireAnyPermission passes', true, '')
  } catch (e) {
    assert('requireAnyPermission passes', false, `Should not throw: ${(e as Error).message}`)
  }

  try {
    requireAdmin(memberCtx)
    assert('requireAdmin blocks member', false, 'Should have thrown')
  } catch (e) {
    assert('requireAdmin blocks member', e instanceof AuthorizationError, '')
  }

  try {
    requireAdmin(adminCtx)
    assert('requireAdmin allows admin', true, '')
  } catch (e) {
    assert('requireAdmin allows admin', false, `Admin should pass: ${(e as Error).message}`)
  }

  // ── TEST 9: Owner wildcard ──
  console.log('\n── Owner Wildcard Access ──')
  assert('Owner wildcard: any permission', hasPermission(ownerCtx, 'organization.delete'), '')
  assert('Owner wildcard: audit', hasPermission(ownerCtx, 'audit.view'), '')
  assert('Owner wildcard: domain', hasPermission(ownerCtx, 'domain.activate'), '')

  // ── TEST 10: Invalid permission key ──
  console.log('\n── Edge Cases ──')
  assert('Invalid key rejected', !hasPermission(ownerCtx, 'not-valid'), '')
  assert('Empty key rejected', !hasPermission(ownerCtx, ''), '')
  assert('Two-part key is valid format', parsePermission('only.two') !== null, '2-part keys should parse')

  // ── Cleanup ──
  await db.organizationMembership.deleteMany({ where: { userId: 'test-suspended-user' } })
  await db.profile.deleteMany({ where: { userId: 'test-suspended-user' } })

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log(`${'═'.repeat(50)}\n`)

  await db.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main()

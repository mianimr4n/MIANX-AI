import { resolveAuthContext } from '../src/core/authorization/auth-context'
import { db } from '../src/lib/db'

async function main() {
  // Get Poultry Farm Co org
  const org = await db.organization.findFirst({ where: { name: 'Poultry Farm Co' } })
  if (!org) { console.log('Org not found'); return }
  console.log('Org:', org.id)

  // Check membership directly
  const ms = await db.organizationMembership.findFirst({
    where: { organizationId: org.id, userId: 'user-admin-001', status: 'active' },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  })
  if (!ms) { console.log('No active membership'); return }
  console.log('Membership found:', ms.id)
  console.log('Roles:', ms.roles.map(r => r.role.slug))
  console.log('Perms:', ms.roles.flatMap(r => r.role.permissions.map(p => p.permission.key)))

  // Now resolve auth context
  try {
    const ctx = await resolveAuthContext('user-admin-001', org.id)
    console.log('Resolved! Permissions:', ctx.permissions)
  } catch (e) {
    console.error('Auth context failed:', e)
  }

  await db.$disconnect()
}
main()

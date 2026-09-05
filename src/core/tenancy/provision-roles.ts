// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organization Role Provisioning
// Creates the 4 default org-scoped system roles (Owner/Admin/Member/
// Viewer) for a brand-new organization and wires up their permissions
// from the global Permission catalog.
//
// Why this exists: `Role` is org-scoped (Role.organizationId), so a
// role created for one org can never be reused for another — each org
// needs its own Owner/Admin/Member/Viewer rows. Previously,
// POST /api/organizations tried to reuse a globally-found "owner" role
// (`db.role.findFirst({ where: { slug: 'owner' } })` with no org
// filter), which either found nothing (empty Role table) or, worse,
// found and cross-assigned a DIFFERENT organization's Owner role.
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

type Db = typeof db | Prisma.TransactionClient

export interface ProvisionedRoles {
  ownerRoleId: string
  adminRoleId: string
  memberRoleId: string
  viewerRoleId: string
}

/**
 * Create the standard system roles for `organizationId` and assign
 * permissions from the global Permission catalog:
 *   - Owner:  every permission
 *   - Admin:  every permission except ones containing ".delete"
 *   - Member: view-only permissions + domain.view + ai.chat
 *   - Viewer: view-only permissions
 *
 * Idempotent-ish: relies on the caller only invoking this once per new
 * org (Role has a @@unique([organizationId, slug]) constraint, so a
 * second call for the same org will throw on the P2002 unique violation
 * rather than silently duplicating roles).
 *
 * Pass a Prisma transaction client (`tx`) when calling this as part of a
 * larger org-provisioning transaction, so a failure here rolls back
 * everything else in the same transaction instead of leaving an orphaned
 * organization with roles but no owner (or vice versa).
 */
export async function provisionDefaultRoles(organizationId: string, client: Db = db): Promise<ProvisionedRoles> {
  const permissions = await client.permission.findMany({ select: { id: true, key: true } })

  const [ownerRole, adminRole, memberRole, viewerRole] = await Promise.all([
    client.role.create({ data: { organizationId, name: 'Owner', slug: 'owner', description: 'Full access to organization', isSystem: true } }),
    client.role.create({ data: { organizationId, name: 'Admin', slug: 'admin', description: 'Administrative access', isSystem: true } }),
    client.role.create({ data: { organizationId, name: 'Member', slug: 'member', description: 'Standard member access', isSystem: true } }),
    client.role.create({ data: { organizationId, name: 'Viewer', slug: 'viewer', description: 'Read-only access', isSystem: true } }),
  ])

  const viewOnly = permissions.filter(p => p.key.endsWith('.view'))
  const memberPerms = permissions.filter(
    p => p.key.endsWith('.view') || p.key === 'domain.view' || p.key === 'ai.chat'
  )
  const adminPerms = permissions.filter(p => !p.key.includes('.delete'))

  // Only bother writing rows if the global Permission catalog is
  // actually populated. If it's empty (not-yet-seeded environment),
  // the roles still get created so org creation doesn't fail — they
  // just start with zero permissions until permissions are seeded.
  if (permissions.length > 0) {
    await client.rolePermission.createMany({
      data: [
        ...permissions.map(p => ({ roleId: ownerRole.id, permissionId: p.id })),
        ...adminPerms.map(p => ({ roleId: adminRole.id, permissionId: p.id })),
        ...memberPerms.map(p => ({ roleId: memberRole.id, permissionId: p.id })),
        ...viewOnly.map(p => ({ roleId: viewerRole.id, permissionId: p.id })),
      ] as { roleId: string; permissionId: string }[],
    })
  }

  return {
    ownerRoleId: ownerRole.id,
    adminRoleId: adminRole.id,
    memberRoleId: memberRole.id,
    viewerRoleId: viewerRole.id,
  }
}

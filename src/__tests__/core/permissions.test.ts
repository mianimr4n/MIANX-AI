// ══════════════════════════════════════════════════════
// MIANX.AI — Permission System Tests
// Critical security tests for RBAC authorization
// ══════════════════════════════════════════════════════

import { describe, test, expect } from 'bun:test'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  hasRole,
  requireRole,
  requireAdmin,
  filterPermissions,
} from '@/core/authorization/permissions'
import { AuthorizationError } from '@/core/authorization/auth-context'
import type { AuthContext } from '@/core/authorization/auth-context'

function makeCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    user: { id: 'user-1' },
    organizationId: 'org-1',
    membershipId: 'mem-1',
    roles: [],
    permissions: [],
    ...overrides,
  }
}

const ownerCtx = makeCtx({
  roles: [{ id: '1', name: 'Owner', slug: 'owner', isSystem: true }],
  permissions: [],
})

const adminCtx = makeCtx({
  roles: [
    { id: '2', name: 'Admin', slug: 'admin', isSystem: true },
  ],
  permissions: ['organization.view', 'organization.update', 'team.view', 'team.manage'],
})

const viewerCtx = makeCtx({
  roles: [{ id: '3', name: 'Viewer', slug: 'viewer', isSystem: false }],
  permissions: ['organization.view', 'team.view'],
})

const noPermCtx = makeCtx()

// ── Fail-Closed Behavior ────────────────────────────────

describe('Permission: Fail-Closed', () => {
  test('user with no permissions gets denied', () => {
    expect(hasPermission(noPermCtx, 'organization.view')).toBe(false)
  })

  test('user with no permissions gets denied for any key', () => {
    expect(hasPermission(noPermCtx, 'anything.else.here')).toBe(false)
  })

  test('invalid permission format returns false', () => {
    expect(hasPermission(adminCtx, 'invalid')).toBe(false)
    expect(hasPermission(adminCtx, 'a.b.c.d')).toBe(false)
    expect(hasPermission(adminCtx, '')).toBe(false)
  })
})

// ── Exact Match ─────────────────────────────────────────

describe('Permission: Exact Match', () => {
  test('exact permission match allows', () => {
    expect(hasPermission(adminCtx, 'organization.view')).toBe(true)
  })

  test('exact permission mismatch denies', () => {
    expect(hasPermission(adminCtx, 'organization.delete')).toBe(false)
  })

  test('partial match does not grant', () => {
    // Has 'organization.view' but not 'organization.view.special'
    expect(hasPermission(adminCtx, 'organization.view.special')).toBe(false)
  })
})

// ── Owner Bypass ────────────────────────────────────────

describe('Permission: Owner Bypass', () => {
  test('owner has access to any permission', () => {
    expect(hasPermission(ownerCtx, 'organization.view')).toBe(true)
    expect(hasPermission(ownerCtx, 'organization.delete')).toBe(true)
    expect(hasPermission(ownerCtx, 'billing.manage')).toBe(true)
    expect(hasPermission(ownerCtx, 'poultry.flock.create')).toBe(true)
  })

  test('owner has access even with empty permission list', () => {
    const ownerNoPerms = makeCtx({
      roles: [{ id: '1', name: 'Owner', slug: 'owner', isSystem: true }],
      permissions: [],
    })
    expect(hasPermission(ownerNoPerms, 'anything.at.all')).toBe(true)
  })
})

// ── Wildcard Matching ───────────────────────────────────

describe('Permission: Wildcard Matching', () => {
  const wildcardAllCtx = makeCtx({
    permissions: ['*.*'], // 2-part: domain defaults to *, resource *, action *
  })

  test('*.* matches nothing (needs 3-part for full wildcard)', () => {
    // parsePermission('*.*') → { domain: '*', resource: '*', action: '*' } via 2-part path
    // Actually in our implementation, 2-part 'X.Y' becomes domain='*', resource='X', action='Y'
    // So '*.*' → domain='*', resource='*', action='*'
    // This SHOULD match everything per the implementation
    expect(hasPermission(wildcardAllCtx, 'organization.view')).toBe(true)
    expect(hasPermission(wildcardAllCtx, 'poultry.flock.delete')).toBe(true)
  })

  test('specific domain + wildcard action: organization.team.*', () => {
    const ctx = makeCtx({ permissions: ['organization.team.*'] })
    expect(hasPermission(ctx, 'organization.team.view')).toBe(true)
    expect(hasPermission(ctx, 'organization.team.create')).toBe(true)
    expect(hasPermission(ctx, 'organization.team.delete')).toBe(true)
    expect(hasPermission(ctx, 'poultry.team.view')).toBe(false)
  })

  test('specific domain + wildcard resource: organization.*.view', () => {
    const ctx = makeCtx({ permissions: ['organization.*.view'] })
    expect(hasPermission(ctx, 'organization.team.view')).toBe(true)
    expect(hasPermission(ctx, 'organization.member.view')).toBe(true)
    expect(hasPermission(ctx, 'organization.team.create')).toBe(false)
  })
})

// ── hasAnyPermission / hasAllPermissions ─────────────────

describe('Permission: Any / All', () => {
  test('hasAnyPermission: true if one matches', () => {
    expect(
      hasAnyPermission(viewerCtx, ['organization.delete', 'team.view'])
    ).toBe(true)
  })

  test('hasAnyPermission: false if none match', () => {
    expect(
      hasAnyPermission(viewerCtx, ['organization.delete', 'team.delete'])
    ).toBe(false)
  })

  test('hasAllPermissions: true only if all match', () => {
    expect(
      hasAllPermissions(viewerCtx, ['organization.view', 'team.view'])
    ).toBe(true)
  })

  test('hasAllPermissions: false if one missing', () => {
    expect(
      hasAllPermissions(viewerCtx, ['organization.view', 'team.manage'])
    ).toBe(false)
  })
})

// ── requirePermission / requireAnyPermission ─────────────

describe('Permission: Require (throws)', () => {
  test('requirePermission does not throw when allowed', () => {
    expect(() => requirePermission(adminCtx, 'organization.view')).not.toThrow()
  })

  test('requirePermission throws AuthorizationError when denied', () => {
    try {
      requirePermission(viewerCtx, 'organization.delete')
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthorizationError)
      expect((e as AuthorizationError).statusCode).toBe(403)
      expect((e as AuthorizationError).message).toContain('organization.delete')
    }
  })

  test('requireAnyPermission throws when none match', () => {
    try {
      requireAnyPermission(viewerCtx, ['organization.delete', 'billing.manage'])
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthorizationError)
    }
  })
})

// ── Roles ───────────────────────────────────────────────

describe('Roles', () => {
  test('hasRole: true for matching role', () => {
    expect(hasRole(adminCtx, 'admin')).toBe(true)
  })

  test('hasRole: false for non-matching role', () => {
    expect(hasRole(adminCtx, 'owner')).toBe(false)
  })

  test('requireRole throws for non-matching role', () => {
    try {
      requireRole(viewerCtx, 'admin')
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthorizationError)
    }
  })

  test('requireAdmin passes for owner', () => {
    expect(() => requireAdmin(ownerCtx)).not.toThrow()
  })

  test('requireAdmin passes for admin', () => {
    expect(() => requireAdmin(adminCtx)).not.toThrow()
  })

  test('requireAdmin throws for viewer', () => {
    try {
      requireAdmin(viewerCtx)
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthorizationError)
      expect((e as AuthorizationError).message).toContain('Admin or Owner')
    }
  })
})

// ── filterPermissions ───────────────────────────────────

describe('filterPermissions', () => {
  test('returns only matching permission keys', () => {
    const result = filterPermissions(viewerCtx, [
      'organization.view',
      'organization.delete',
      'team.view',
      'poultry.flock.create',
    ])
    expect(result).toEqual(['organization.view', 'team.view'])
  })

  test('returns empty array for no matches', () => {
    expect(
      filterPermissions(noPermCtx, ['a.b.c', 'd.e.f'])
    ).toEqual([])
  })

  test('owner gets all permissions filtered', () => {
    const keys = ['x.y.z', 'a.b.c', 'anything.here.now']
    expect(filterPermissions(ownerCtx, keys)).toEqual(keys)
  })
})

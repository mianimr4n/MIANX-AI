// ══════════════════════════════════════════════════════
// MIANX.AI — Tenant Context Tests
// Critical security tests for tenant isolation primitives
// ══════════════════════════════════════════════════════

import { describe, test, expect, beforeEach } from 'bun:test'
import {
  withTenant,
  getTenantContext,
  requireTenantContext,
  TenantContextError,
  systemContext,
} from '@/core/tenancy/tenant-context'
import type { TenantContext } from '@/core/tenancy/tenant-context'

describe('Tenant Context', () => {
  beforeEach(() => {
    // Each test starts with no tenant context
  })

  // ── Context Lifecycle ──────────────────────────────────

  test('getTenantContext returns null outside withTenant', () => {
    expect(getTenantContext()).toBeNull()
  })

  test('withTenant sets and clears context', async () => {
    const ctx: TenantContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      roles: ['admin'],
    }
    let captured: TenantContext | null = null
    await withTenant(ctx, async () => {
      captured = getTenantContext()
    })
    expect(captured).not.toBeNull()
    expect(captured!.organizationId).toBe('org-1')
    expect(captured!.userId).toBe('user-1')
  })

  test('context is cleared after withTenant returns', async () => {
    await withTenant(
      { organizationId: 'org-1', userId: 'user-1', roles: [] },
      async () => {}
    )
    expect(getTenantContext()).toBeNull()
  })

  // ── Nested Contexts ───────────────────────────────────

  test('inner withTenant overrides outer context', async () => {
    let outerCtx: TenantContext | null = null
    let innerCtx: TenantContext | null = null
    let afterInnerCtx: TenantContext | null = null

    await withTenant(
      { organizationId: 'org-A', userId: 'user-1', roles: [] },
      async () => {
        outerCtx = getTenantContext()

        await withTenant(
          { organizationId: 'org-B', userId: 'user-2', roles: [] },
          async () => {
            innerCtx = getTenantContext()
          }
        )

        afterInnerCtx = getTenantContext()
      }
    )

    expect(outerCtx!.organizationId).toBe('org-A')
    expect(innerCtx!.organizationId).toBe('org-B')
    expect(afterInnerCtx!.organizationId).toBe('org-A')
  })

  // ── Require Context ───────────────────────────────────

  test('requireTenantContext throws when no context', () => {
    expect(() => requireTenantContext()).toThrow(TenantContextError)
    expect(() => requireTenantContext()).toThrow('No tenant context found')
  })

  test('requireTenantContext returns context when set', async () => {
    const ctx: TenantContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      membershipId: 'mem-1',
      roles: ['admin'],
      requestId: 'req-1',
    }
    await withTenant(ctx, async () => {
      const required = requireTenantContext()
      expect(required.organizationId).toBe('org-1')
      expect(required.membershipId).toBe('mem-1')
      expect(required.requestId).toBe('req-1')
    })
  })

  // ── System Context ────────────────────────────────────

  test('systemContext creates context with system role', () => {
    const sys = systemContext('org-1')
    expect(sys.organizationId).toBe('org-1')
    expect(sys.userId).toBe('system')
    expect(sys.roles).toEqual(['system'])
  })

  test('systemContext works inside withTenant', async () => {
    const sys = systemContext('org-sys')
    let captured: TenantContext | null = null
    await withTenant(sys, async () => {
      captured = getTenantContext()
    })
    expect(captured!.userId).toBe('system')
    expect(captured!.roles).toContain('system')
  })

  // ── TenantContextError ─────────────────────────────────

  test('TenantContextError is an Error subclass', () => {
    const err = new TenantContextError('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(TenantContextError)
    expect(err.name).toBe('TenantContextError')
    expect(err.message).toBe('test')
    expect(err.stack).toBeDefined()
  })

  // ── Async Safety ──────────────────────────────────────

  test('context propagates through async operations', async () => {
    const ctx: TenantContext = {
      organizationId: 'org-async',
      userId: 'user-1',
      roles: [],
    }

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    let deepCtx: TenantContext | null = null
    await withTenant(ctx, async () => {
      await delay(5)
      await Promise.all([
        (async () => {
          await delay(5)
          const c = getTenantContext()
          expect(c!.organizationId).toBe('org-async')
        })(),
        (async () => {
          await delay(10)
          deepCtx = getTenantContext()
        })(),
      ])
    })

    expect(deepCtx!.organizationId).toBe('org-async')
    expect(getTenantContext()).toBeNull()
  })
})

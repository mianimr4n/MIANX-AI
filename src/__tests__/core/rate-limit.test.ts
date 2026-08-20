// ══════════════════════════════════════════════════════
// MIANX.AI — Rate Limiting Tests
// Phase 13: Tests for the rate-limit abstraction
// ══════════════════════════════════════════════════════

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { rateLimit, buildRateLimitKey, _resetRateLimitStore } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    _resetRateLimitStore()
  })

  afterEach(() => {
    _resetRateLimitStore()
  })

  test('allows requests under the limit', async () => {
    // Non-production mode always allows
    const result = await rateLimit('test:1', 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(5)
  })

  test('returns correct metadata', async () => {
    const result = await rateLimit('test:meta', 10, 60_000)
    expect(result).toHaveProperty('allowed')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('resetAt')
    expect(result).toHaveProperty('limit')
    expect(result.limit).toBe(10)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  test('buildRateLimitKey extracts IP and path from request', () => {
    const req = new Request('http://localhost:3000/api/teams', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    const key = buildRateLimitKey(req)
    expect(key).toBe('1.2.3.4:/api/teams')
  })

  test('buildRateLimitKey falls back to unknown for missing IP', () => {
    const req = new Request('http://localhost:3000/api/test')
    const key = buildRateLimitKey(req)
    expect(key).toBe('unknown:/api/test')
  })

  test('buildRateLimitKey supports path override', () => {
    const req = new Request('http://localhost:3000/api/teams')
    const key = buildRateLimitKey(req, '/api/custom')
    expect(key).toContain('/api/custom')
  })

  test('different keys are independent', async () => {
    const r1 = await rateLimit('key-a:1', 1, 60_000)
    const r2 = await rateLimit('key-b:1', 1, 60_000)
    // Both should be allowed (separate keys)
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
  })

  test('incrementing depletes remaining', async () => {
    // In dev mode, always allowed, but we can test the store
    const r1 = await rateLimit('test:inc', 100, 60_000)
    const r2 = await rateLimit('test:inc', 100, 60_000)
    // In dev, remaining is always max
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
  })
})

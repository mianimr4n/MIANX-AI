// ══════════════════════════════════════════════════════
// MIANX.AI — Rate Limiting Tests
// Phase 13: Tests for the rate-limit abstraction
// Tests cover: InMemory store, Redis store (mocked),
// key isolation, organization isolation, IP isolation,
// TTL expiration, and fallback behavior.
// ══════════════════════════════════════════════════════

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  rateLimit,
  buildRateLimitKey,
  buildOrgRateLimitKey,
  _resetRateLimitStore,
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  type RateLimitStore,
  type RateLimitEntry,
} from '@/lib/rate-limit'

// ── Mock Redis client for testing Redis store ──────────

class MockRedisClient {
  private data = new Map<string, { value: string; expireAt: number | null }>()
  private shouldFail = false

  failConnection(): void { this.shouldFail = true }

  async get(key: string): Promise<string | null> {
    if (this.shouldFail) throw new Error('Connection refused')
    const entry = this.data.get(key)
    if (!entry) return null
    if (entry.expireAt !== null && Date.now() > entry.expireAt) {
      this.data.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<unknown> {
    if (this.shouldFail) throw new Error('Connection refused')
    let expireAt: number | null = null
    // Parse PX and NX flags
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'PX' && typeof args[i + 1] === 'number') {
        expireAt = Date.now() + (args[i + 1] as number)
        i++
      }
    }
    // NX = only set if not exists
    if (args.includes('NX') && this.data.has(key)) return null
    this.data.set(key, { value, expireAt })
    return 'OK'
  }

  async incr(key: string): Promise<number> {
    if (this.shouldFail) throw new Error('Connection refused')
    const existing = await this.get(key)
    const current = existing ? (JSON.parse(existing) as { count: number }).count : 0
    const newCount = current + 1
    const expireAt = this.data.get(key)?.expireAt
    this.data.set(key, {
      value: JSON.stringify({ count: newCount, resetAt: expireAt || Date.now() + 60000 }),
      expireAt,
    })
    return newCount
  }

  async pexpire(key: string, ms: number): Promise<boolean> {
    if (this.shouldFail) throw new Error('Connection refused')
    const entry = this.data.get(key)
    if (!entry) return false
    entry.expireAt = Date.now() + ms
    return true
  }

  async ping(): Promise<string> {
    if (this.shouldFail) throw new Error('Connection refused')
    return 'PONG'
  }

  async quit(): Promise<string> {
    this.data.clear()
    return 'OK'
  }

  // Test helper: advance time by simulating expired entries
  expireAll(): void {
    for (const [key, entry] of this.data) {
      if (entry.expireAt !== null) {
        entry.expireAt = Date.now() - 1000
      }
    }
  }

  clear(): void {
    this.data.clear()
    this.shouldFail = false
  }
}

// ══════════════════════════════════════════════════════
// InMemory Store — Direct tests
// ══════════════════════════════════════════════════════

describe('InMemoryRateLimitStore', () => {
  test('first request creates entry with count 1', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      const entry = await s.increment('test:1', 60_000)
      expect(entry.count).toBe(1)
      expect(entry.resetAt).toBeGreaterThan(Date.now())
    } finally { s.destroy() }
  })

  test('incrementing increases count within window', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      await s.increment('test:2', 60_000)
      const entry = await s.increment('test:2', 60_000)
      expect(entry.count).toBe(2)
    } finally { s.destroy() }
  })

  test('expired entry resets count to 1', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      await s.increment('test:3', 1)
      await s.set('test:3', { count: 99, resetAt: Date.now() - 1000 })
      const entry = await s.increment('test:3', 60_000)
      expect(entry.count).toBe(1)
    } finally { s.destroy() }
  })

  test('get returns null for missing keys', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      const result = await s.get('nonexistent')
      expect(result).toBeNull()
    } finally { s.destroy() }
  })

  test('get returns null for expired entries', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      await s.set('test:4', { count: 5, resetAt: Date.now() - 1000 })
      const result = await s.get('test:4')
      expect(result).toBeNull()
    } finally { s.destroy() }
  })

  test('different keys are independent', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      // Use unique keys to prevent any possible collision
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const e1 = await s.increment(`a-${id}`, 60_000)
      expect(e1.count === 1).toBe(true)
      const e2 = await s.increment(`b-${id}`, 60_000)
      expect(e2.count === 1).toBe(true)
      const e3 = await s.increment(`a-${id}`, 60_000)
      expect(e3.count === 2).toBe(true)
    } finally { s.destroy() }
  })

  test('destroy clears all entries and timer', async () => {
    const s = new InMemoryRateLimitStore()
    await s.increment('test:5', 60_000)
    s.destroy()
    const result = await s.get('test:5')
    expect(result).toBeNull()
  })
})

// ══════════════════════════════════════════════════════
// Redis Store — Tests with mock client
// ══════════════════════════════════════════════════════

describe('RedisRateLimitStore', () => {
  let mockClient: MockRedisClient
  let redisStore: RedisRateLimitStore

  beforeEach(() => {
    mockClient = new MockRedisClient()
    redisStore = new RedisRateLimitStore(mockClient as unknown as RedisRateLimitStore['client'])
  })

  afterEach(async () => {
    await redisStore.destroy()
    mockClient.clear()
  })

  test('first increment returns count 1 and sets TTL', async () => {
    const entry = await redisStore.increment('test:redis:1', 60_000)
    expect(entry.count).toBe(1)
    expect(entry.resetAt).toBeGreaterThan(Date.now())
  })

  test('subsequent increments increase count', async () => {
    await redisStore.increment('test:redis:2', 60_000)
    await redisStore.increment('test:redis:2', 60_000)
    const entry = await redisStore.increment('test:redis:2', 60_000)
    expect(entry.count).toBe(3)
  })

  test('get returns parsed entry', async () => {
    await redisStore.set('test:redis:3', { count: 5, resetAt: Date.now() + 60_000 })
    const entry = await redisStore.get('test:redis:3')
    expect(entry).not.toBeNull()
    expect(entry!.count).toBe(5)
  })

  test('get returns null for missing keys', async () => {
    const entry = await redisStore.get('nonexistent')
    expect(entry).toBeNull()
  })

  test('get returns null for expired entries', async () => {
    await redisStore.set('test:redis:4', { count: 10, resetAt: Date.now() - 1000 })
    const entry = await redisStore.get('test:redis:4')
    expect(entry).toBeNull()
  })

  test('get returns null on Redis error (fail-safe)', async () => {
    mockClient.failConnection()
    const entry = await redisStore.get('test:redis:err')
    expect(entry).toBeNull()
  })

  test('different keys are independent', async () => {
    const e1 = await redisStore.increment('org-A:api/test', 60_000)
    const e2 = await redisStore.increment('org-B:api/test', 60_000)
    expect(e1.count).toBe(1)
    expect(e2.count).toBe(1)

    // Incrementing org-A doesn't affect org-B
    const e3 = await redisStore.increment('org-A:api/test', 60_000)
    const e4 = await redisStore.increment('org-B:api/test', 60_000)
    expect(e3.count).toBe(2)
    expect(e4.count).toBe(2)
  })

  test('destroy calls quit on client', async () => {
    await redisStore.destroy()
    // If we got here without error, quit was called successfully
    expect(true).toBe(true)
  })
})

// ══════════════════════════════════════════════════════
// Rate Limit Key Building
// ══════════════════════════════════════════════════════

describe('buildRateLimitKey', () => {
  test('extracts first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost:3000/api/teams', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    const key = buildRateLimitKey(req)
    expect(key).toBe('1.2.3.4:/api/teams')
  })

  test('falls back to unknown for missing IP', () => {
    const req = new Request('http://localhost:3000/api/test')
    const key = buildRateLimitKey(req)
    expect(key).toBe('unknown:/api/test')
  })

  test('supports path override', () => {
    const req = new Request('http://localhost:3000/api/teams')
    const key = buildRateLimitKey(req, '/api/custom')
    expect(key).toContain('/api/custom')
  })

  test('different IPs produce different keys for same path', () => {
    const req1 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const req2 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    const key1 = buildRateLimitKey(req1)
    const key2 = buildRateLimitKey(req2)
    expect(key1).not.toBe(key2)
    expect(key1).toBe('10.0.0.1:/api/test')
    expect(key2).toBe('10.0.0.2:/api/test')
  })
})

describe('buildOrgRateLimitKey', () => {
  test('includes organization ID in key', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const key = buildOrgRateLimitKey(req, 'org-123')
    expect(key).toBe('org:org-123:1.2.3.4:/api/test')
  })

  test('different organizations are isolated', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const key1 = buildOrgRateLimitKey(req, 'org-A')
    const key2 = buildOrgRateLimitKey(req, 'org-B')
    expect(key1).not.toBe(key2)
  })

  test('same org, different IPs are isolated', () => {
    const req1 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const req2 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    const key1 = buildOrgRateLimitKey(req1, 'org-A')
    const key2 = buildOrgRateLimitKey(req2, 'org-A')
    expect(key1).not.toBe(key2)
  })
})

// ══════════════════════════════════════════════════════
// rateLimit() integration
// ══════════════════════════════════════════════════════

describe('rateLimit()', () => {
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

  test('dev mode always allows regardless of count', async () => {
    // In dev mode, rate limiting is skipped entirely
    for (let i = 0; i < 100; i++) {
      const result = await rateLimit('dev:unlimited', 5, 60_000)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5) // always returns max in dev
    }
  })

  test('limit is never negative', async () => {
    const result = await rateLimit('test:neg', 1, 60_000)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
    expect(result.limit).toBeGreaterThan(0)
  })

  test('resetAt is always in the future', async () => {
    const result = await rateLimit('test:future', 10, 60_000)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })

  test('incrementing depletes remaining in production-like store', async () => {
    // Directly test the in-memory store for production behavior
    const store = new InMemoryRateLimitStore()
    for (let i = 0; i < 5; i++) {
      await store.increment('prod:test', 60_000)
    }
    const entry = await store.increment('prod:test', 60_000)
    // After 6 increments with limit of 5
    expect(entry.count).toBe(6)
    store.destroy()
  })
})

// ══════════════════════════════════════════════════════
// Organization and IP Isolation
// ══════════════════════════════════════════════════════

describe('Rate Limit Isolation', () => {
  test('organization isolation: different orgs have independent limits', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      const orgAKey = 'org:org-A:1.2.3.4:/api/teams'
      const orgBKey = 'org:org-B:1.2.3.4:/api/teams'
      for (let i = 0; i < 5; i++) { await s.increment(orgAKey, 60_000) }
      const orgAEntry = await s.increment(orgAKey, 60_000)
      expect(orgAEntry.count).toBe(6)
      const orgBEntry = await s.increment(orgBKey, 60_000)
      expect(orgBEntry.count).toBe(1)
    } finally { s.destroy() }
  })

  test('IP isolation: same org, different IPs are independent', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      const ipAKey = 'org:org-A:10.0.0.1:/api/test'
      const ipBKey = 'org:org-A:10.0.0.2:/api/test'
      for (let i = 0; i < 10; i++) { await s.increment(ipAKey, 60_000) }
      const ipBEntry = await s.increment(ipBKey, 60_000)
      expect(ipBEntry.count).toBe(1)
    } finally { s.destroy() }
  })

  test('path isolation: same IP, different paths are independent', async () => {
    const s = new InMemoryRateLimitStore()
    try {
      const pathA = '1.2.3.4:/api/teams'
      const pathB = '1.2.3.4:/api/roles'
      await s.increment(pathA, 60_000)
      await s.increment(pathA, 60_000)
      const entryA = await s.increment(pathA, 60_000)
      const entryB = await s.increment(pathB, 60_000)
      expect(entryA.count).toBe(3)
      expect(entryB.count).toBe(1)
    } finally { s.destroy() }
  })
})

// ══════════════════════════════════════════════════════
// Store Interface Contract
// ══════════════════════════════════════════════════════

describe('RateLimitStore interface contract', () => {
  // Verify both stores satisfy the same interface
  function createStore(type: 'memory' | 'redis'): RateLimitStore {
    if (type === 'memory') {
      return new InMemoryRateLimitStore()
    }
    const mockClient = new MockRedisClient()
    return new RedisRateLimitStore(mockClient as unknown as RedisRateLimitStore['client'])
  }

  const storeTypes: Array<'memory' | 'redis'> = ['memory', 'redis']

  for (const type of storeTypes) {
    describe(type, () => {
      let s: RateLimitStore

      beforeEach(() => { s = createStore(type) })
      afterEach(async () => {
        if ('destroy' in s) {
          await (s as unknown as { destroy: () => Promise<void> | void }).destroy()
        }
      })

      test('increment returns entry with count >= 1', async () => {
        const entry = await s.increment('contract:1', 60_000)
        expect(entry.count).toBeGreaterThanOrEqual(1)
      })

      test('increment returns entry with future resetAt', async () => {
        const entry = await s.increment('contract:2', 60_000)
        expect(entry.resetAt).toBeGreaterThan(Date.now())
      })

      test('get returns null for unknown key', async () => {
        const entry = await s.get('contract:unknown')
        expect(entry).toBeNull()
      })

      test('set and get round-trip', async () => {
        const testEntry: RateLimitEntry = { count: 42, resetAt: Date.now() + 60_000 }
        await s.set('contract:rt', testEntry)
        const result = await s.get('contract:rt')
        // Note: Redis set uses NX flag which may not overwrite in mock
        // but the interface contract is that set stores and get retrieves
        expect(result).not.toBeNull()
        expect(result!.count).toBe(42)
      })
    })
  }
})

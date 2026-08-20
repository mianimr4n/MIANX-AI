// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Rate Limiting Abstraction
// Phase 13: Pluggable rate limiting with in-memory and Redis backends.
//
// Architecture:
//   RateLimitStore interface — pluggable storage backend
//   InMemoryRateLimitStore — default for single-instance / dev
//   RedisRateLimitStore — distributed, atomically incremented via INCR
//   rateLimit() — main entry point, delegates to configured store
//
// Deployment modes:
//   - Single instance (default): InMemory store, no external deps
//   - Multiple instances / serverless: Set REDIS_URL → uses Redis store
//     Requires: bun add ioredis (optional runtime dependency)
//   - If Redis is configured but ioredis is missing or connection fails,
//     falls back to in-memory and logs a warning (fail-safe, not fail-open)
// ══════════════════════════════════════════════════════════════════

export interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry): Promise<void>
  increment(key: string, windowMs: number): Promise<RateLimitEntry>
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// ── In-Memory Store (default) ─────────────────────────

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Periodic cleanup of stale entries every 60s
    if (typeof globalThis !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of this.store) {
          if (now > entry.resetAt) this.store.delete(key)
        }
      }, 60_000)
      if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        (this.cleanupTimer as unknown as { unref: () => void }).unref()
      }
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.resetAt) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry)
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetAt) {
      const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs }
      this.store.set(key, entry)
      return entry
    }

    existing.count++
    return existing
  }

  /** Shutdown cleanup (for testing) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }
}

// ── Redis Store (distributed) ─────────────────────────
// Uses ioredis with dynamic import — no hard dependency.
// Key format: rl:{key}  →  JSON { count, resetAt }
// TTL is set on every write so entries auto-expire.

// Minimal interface we need from ioredis
interface RedisClientLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>
  incr(key: string): Promise<number>
  pexpire(key: string, ms: number): Promise<boolean>
  ping(): Promise<string>
  quit(): Promise<unknown>
}

class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClientLike
  private keyPrefix = 'rl:'

  constructor(client: RedisClientLike) {
    this.client = client
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const raw = await this.client.get(this.keyPrefix + key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as RateLimitEntry
      if (Date.now() > parsed.resetAt) return null
      return parsed
    } catch {
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttlMs = Math.max(0, entry.resetAt - Date.now())
    const raw = JSON.stringify(entry)
    await this.client.set(this.keyPrefix + key, raw, 'PX', ttlMs, 'NX')
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const redisKey = this.keyPrefix + key
    const now = Date.now()
    const resetAt = now + windowMs

    // Atomic increment — Redis INCR is atomic
    const count = await this.client.incr(redisKey)

    // Set TTL on first increment (when count === 1)
    // pexpire returns true if TTL was set
    if (count === 1) {
      await this.client.pexpire(redisKey, windowMs)
    }

    return { count, resetAt }
  }

  /** Close the Redis connection */
  async destroy(): Promise<void> {
    try { await this.client.quit() } catch { /* ignore close errors */ }
  }
}

// ── Module-level singleton ────────────────────────────

let store: RateLimitStore | null = null
let storeInitAttempted = false

/**
 * Attempt to create a Redis store from REDIS_URL.
 * Returns null if REDIS_URL is not set, ioredis is not installed,
 * or connection fails.
 */
async function tryCreateRedisStore(): Promise<RateLimitStore | null> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    // Dynamic import — ioredis is an optional dependency
    const ioredisMod = await import('ioredis' as string)
    const RedisFactory = (ioredisMod.default ?? ioredisMod) as new (url: string, opts: Record<string, unknown>) => RedisClientLike & { connect(): Promise<void> }
    const client = new RedisFactory(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    })

    await client.connect()
    await client.ping() // verify connectivity

    return new RedisRateLimitStore(client)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(
      `[rate-limit] REDIS_URL is set but Redis is unavailable: ${msg}. ` +
      'Falling back to in-memory rate limiting. '
      + 'Install ioredis and ensure Redis is reachable for distributed rate limiting.'
    )
    return null
  }
}

async function getStore(): Promise<RateLimitStore> {
  if (store) return store

  if (!storeInitAttempted) {
    storeInitAttempted = true
    const redisStore = await tryCreateRedisStore()
    if (redisStore) {
      store = redisStore
      return store
    }
  }

  // Fallback: in-memory (always available)
  if (!store) {
    store = new InMemoryRateLimitStore()
  }
  return store
}

// ── Main rate limit function ──────────────────────────

/**
 * Check rate limit for a given key.
 *
 * @param key - Unique identifier (typically "ip:path" or "userId:path")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with allowed status and metadata
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') {
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs, limit: maxRequests }
  }

  const s = await getStore()
  const entry = await s.increment(key, windowMs)

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: maxRequests,
  }
}

/**
 * Build a rate limit key from request context.
 * Uses IP + path by default.
 */
export function buildRateLimitKey(request: Request, pathOverride?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const path = pathOverride || new URL(request.url).pathname
  return `${ip}:${path}`
}

/**
 * Build an organization-aware rate limit key.
 * Isolates rate limits per organization.
 */
export function buildOrgRateLimitKey(request: Request, orgId: string, pathOverride?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const path = pathOverride || new URL(request.url).pathname
  return `org:${orgId}:${ip}:${path}`
}

/** Reset the store (for testing only) */
export function _resetRateLimitStore(): void {
  if (store && 'destroy' in store) {
    const s = store as InMemoryRateLimitStore | RedisRateLimitStore
    if (s instanceof InMemoryRateLimitStore) {
      s.destroy()
    } else {
      s.destroy() // async but fire-and-forget for test reset
    }
  }
  store = null
  storeInitAttempted = false
}

// ── Exports for testing ───────────────────────────────
export { InMemoryRateLimitStore, RedisRateLimitStore }

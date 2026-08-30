// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Rate Limiting Abstraction
// Pluggable rate limiting with in-memory development and Redis production backends.
// Production requires Redis; local development may use the in-memory store.
// ══════════════════════════════════════════════════════════════════

export interface RateLimitEntry { count: number; resetAt: number }
export interface RateLimitStore { get(key: string): Promise<RateLimitEntry | null>; set(key: string, entry: RateLimitEntry): Promise<void>; increment(key: string, windowMs: number): Promise<RateLimitEntry> }
export interface RateLimitResult { allowed: boolean; remaining: number; resetAt: number; limit: number }

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  constructor() {
    if (typeof globalThis !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of this.store) if (now > entry.resetAt) this.store.delete(key)
      }, 60_000)
      if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) (this.cleanupTimer as unknown as { unref: () => void }).unref()
    }
  }
  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.resetAt) { this.store.delete(key); return null }
    return entry
  }
  async set(key: string, entry: RateLimitEntry): Promise<void> { this.store.set(key, entry) }
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now(); const existing = this.store.get(key)
    if (!existing || now > existing.resetAt) { const entry = { count: 1, resetAt: now + windowMs }; this.store.set(key, entry); return entry }
    existing.count++; return existing
  }
  destroy(): void { if (this.cleanupTimer) { clearInterval(this.cleanupTimer); this.cleanupTimer = null }; this.store.clear() }
}

interface RedisClientLike { get(key: string): Promise<string | null>; set(key: string, value: string, ...args: unknown[]): Promise<unknown>; incr(key: string): Promise<number>; pexpire(key: string, ms: number): Promise<boolean>; ping(): Promise<string>; quit(): Promise<unknown> }

class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClientLike
  private keyPrefix = 'rl:'
  constructor(client: RedisClientLike) { this.client = client }
  async get(key: string): Promise<RateLimitEntry | null> {
    try { const raw = await this.client.get(this.keyPrefix + key); if (!raw) return null; const parsed = JSON.parse(raw) as RateLimitEntry; if (Date.now() > parsed.resetAt) return null; return parsed } catch { return null }
  }
  async set(key: string, entry: RateLimitEntry): Promise<void> { await this.client.set(this.keyPrefix + key, JSON.stringify(entry), 'PX', Math.max(0, entry.resetAt - Date.now()), 'NX') }
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> { const redisKey = this.keyPrefix + key; const now = Date.now(); const count = await this.client.incr(redisKey); if (count === 1) await this.client.pexpire(redisKey, windowMs); return { count, resetAt: now + windowMs } }
  async destroy(): Promise<void> { try { await this.client.quit() } catch { /* ignore */ } }
}

let store: RateLimitStore | null = null
let storeInitAttempted = false

async function tryCreateRedisStore(): Promise<RateLimitStore | null> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  try {
    const ioredisMod = await import('ioredis')
    const RedisFactory = (ioredisMod.default ?? ioredisMod) as new (url: string, opts: Record<string, unknown>) => RedisClientLike & { connect(): Promise<void> }
    const client = new RedisFactory(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true })
    await client.connect(); await client.ping(); return new RedisRateLimitStore(client)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (process.env.NODE_ENV === 'production') throw new Error(`[rate-limit] Production Redis is unavailable: ${msg}`)
    console.warn(`[rate-limit] Redis unavailable in development: ${msg}`); return null
  }
}

export async function verifyRateLimitInfrastructure(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return
  if (!process.env.REDIS_URL) throw new Error('[rate-limit] REDIS_URL is required in production')
  const redisStore = await tryCreateRedisStore()
  if (!redisStore) throw new Error('[rate-limit] Redis initialization failed in production')
  store = redisStore; storeInitAttempted = true
}

async function getStore(): Promise<RateLimitStore> {
  if (store) return store
  if (!storeInitAttempted) { storeInitAttempted = true; const redisStore = await tryCreateRedisStore(); if (redisStore) { store = redisStore; return store } }
  if (process.env.NODE_ENV === 'production') throw new Error('[rate-limit] Production Redis store is not initialized')
  if (!store) store = new InMemoryRateLimitStore()
  return store
}

export async function rateLimit(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== 'production') return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs, limit: maxRequests }
  const entry = await (await getStore()).increment(key, windowMs)
  return { allowed: entry.count <= maxRequests, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt, limit: maxRequests }
}

export function buildRateLimitKey(request: Request, pathOverride?: string): string { const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'; const path = pathOverride || new URL(request.url).pathname; return `${ip}:${path}` }
export function buildOrgRateLimitKey(request: Request, orgId: string, pathOverride?: string): string { const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'; const path = pathOverride || new URL(request.url).pathname; return `org:${orgId}:${ip}:${path}` }

export function _resetRateLimitStore(): void { if (store && 'destroy' in store) { const s = store as InMemoryRateLimitStore | RedisRateLimitStore; if (s instanceof InMemoryRateLimitStore) s.destroy(); else s.destroy() }; store = null; storeInitAttempted = false }
export { InMemoryRateLimitStore, RedisRateLimitStore }

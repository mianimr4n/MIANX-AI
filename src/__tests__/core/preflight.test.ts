// ══════════════════════════════════════════════════════
// MIANX.AI — Preflight Validator Tests
// Phase 15: Verify production config validation
// ══════════════════════════════════════════════════════

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { runPreflight } from '@/lib/preflight'

const ORIGINAL_ENV = process.env

function setEnv(env: Record<string, string | undefined>) {
  // Reset all relevant vars
  for (const key of [
    'NODE_ENV', 'DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY',
    'REDIS_URL', 'ALLOWED_ORIGINS',
  ]) {
    delete process.env[key]
  }
  Object.assign(process.env, env)
}

function restoreEnv() {
  // Restore original env
  for (const key of Object.keys(ORIGINAL_ENV)) {
    process.env[key] = ORIGINAL_ENV[key]
  }
}

describe('preflight validator', () => {
  beforeEach(() => {
    setEnv({})
  })

  afterEach(() => {
    restoreEnv()
  })

  test('dev mode with SQLite URL is ready', () => {
    setEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./db/dev.db',
    })
    const result = runPreflight()
    expect(result.ready).toBe(true)
    const dbCheck = result.checks.find(c => c.name === 'DATABASE_URL')
    expect(dbCheck).toBeDefined()
    expect(dbCheck!.status).toBe('pass')
    expect(dbCheck!.message).toContain('SQLite')
  })

  test('production without DATABASE_URL fails', () => {
    setEnv({
      NODE_ENV: 'production',
    })
    const result = runPreflight()
    expect(result.ready).toBe(false)
    const dbCheck = result.checks.find(c => c.name === 'DATABASE_URL')
    expect(dbCheck!.status).toBe('fail')
  })

  test('production with SQLite URL fails', () => {
    setEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'file:./db/dev.db',
    })
    const result = runPreflight()
    expect(result.ready).toBe(false)
    const dbCheck = result.checks.find(c => c.name === 'DATABASE_URL')
    expect(dbCheck!.status).toBe('fail')
    expect(dbCheck!.message).toContain('PostgreSQL')
  })

  test('production with PostgreSQL URL and Supabase passes', () => {
    setEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGci',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGci',
    })
    const result = runPreflight()
    expect(result.ready).toBe(true)
    const dbCheck = result.checks.find(c => c.name === 'DATABASE_URL')
    expect(dbCheck!.status).toBe('pass')
    expect(dbCheck!.message).toContain('PostgreSQL')
    const supabaseCheck = result.checks.find(c => c.name === 'Supabase Auth')
    expect(supabaseCheck!.status).toBe('pass')
  })

  test('never exposes secret values in output', () => {
    setEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://secret_user:secret_pass@secret-host:5432/secret_db',
      SUPABASE_SERVICE_ROLE_KEY: 'super-secret-service-role-key-value',
      OPENAI_API_KEY: 'sk-openai-secret-key-12345',
    })
    const result = runPreflight()
    const json = JSON.stringify(result)
    // None of these secret values should appear
    expect(json).not.toContain('secret_user')
    expect(json).not.toContain('secret_pass')
    expect(json).not.toContain('secret-host')
    expect(json).not.toContain('super-secret-service-role-key-value')
    expect(json).not.toContain('sk-openai-secret-key-12345')
    // But variable names are present
    expect(json).toContain('DATABASE_URL')
    expect(json).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  test('Redis is always pass (optional with fallback)', () => {
    setEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@h:5432/d' })
    const withoutRedis = runPreflight()
    const redisCheck = withoutRedis.checks.find(c => c.name === 'Redis Rate Limiting')
    expect(redisCheck!.status).toBe('pass')
    expect(redisCheck!.message).toContain('in-memory')
  })

  test('timestamp is a valid ISO string', () => {
    setEnv({ NODE_ENV: 'development', DATABASE_URL: 'file:./db/dev.db' })
    const result = runPreflight()
    expect(new Date(result.timestamp).getTime()).not.toBeNaN()
  })
})

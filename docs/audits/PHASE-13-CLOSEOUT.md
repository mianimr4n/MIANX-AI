# Phase 13 — Closeout Audit

**Date:** 2026-08-21
**Branch:** main
**Base Commit:** `1a8fc2a` (Phase 13 implementation)
**Closeout Commit:** (see git log)

---

## Condition Resolution Summary

| # | Condition | Status | Details |
|---|-----------|--------|---------|
| 1 | CSP `unsafe-eval` | RESOLVED | Removed from production CSP. Retained in dev-only for Next.js HMR. Root cause: only HMR needs eval; react-syntax-highlighter, prismjs, and refractor do NOT use eval at runtime. Verified: production build passes, all tests pass. |
| 2 | next-auth v5 advisory | NO ACTIVE CVE | Installed v4.24.13 (latest v4). `npm audit` and `bun audit` report zero next-auth vulnerabilities. v4 is in maintenance mode but no critical CVE exists for this version. Migration to v5 (Auth.js) is a future improvement, not a security emergency. |
| 3 | Redis for distributed rate limiting | IMPLEMENTED | `RedisRateLimitStore` added to `src/lib/rate-limit.ts` with dynamic ioredis import. Set `REDIS_URL` to activate. Falls back to in-memory if Redis is unavailable (fail-safe). No hard dependency for local dev. |
| 4 | Push to GitHub | PENDING | This closeout commit will be pushed. |

---

## CSP Final State

### Production CSP (no `unsafe-eval`)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' https: data:;
connect-src 'self' https: wss:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

### Dev CSP (adds HMR support)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval';
connect-src 'self' https: wss: http://localhost:*;
```

### Root Cause Analysis

`unsafe-eval` was initially included because the comment in `src/middleware.ts` stated it was required by `react-syntax-highlighter`. Investigation found:

- **Application code**: Zero instances of `eval(` or `new Function()` in `src/`
- **react-syntax-highlighter**: Does NOT use eval or new Function at runtime
- **prismjs**: Does NOT use eval
- **refractor**: Does NOT use eval
- **Next.js HMR**: DOES use eval for hot module replacement (dev only)

**Conclusion**: `unsafe-eval` is only needed in development for HMR. Removed from production.

---

## next-auth Advisory Status

| Field | Value |
|-------|-------|
| Installed Version | 4.24.13 |
| Latest v4 | 4.24.13 |
| npm audit | 0 next-auth vulnerabilities |
| bun audit | 0 next-auth vulnerabilities |
| Known CVEs for 4.24.13 | None |
| v4 Maintenance Status | Maintenance mode (no new features) |
| v5 Migration | Recommended as future improvement |

**Risk Assessment**: LOW. No active CVE. v4.24.13 is the final v4 release with all known security patches applied.

---

## Rate Limiting Architecture

```
Application (withAuth / withRateLimit)
  ↓
rateLimit(key, maxRequests, windowMs)
  ↓
RateLimitStore interface
  ↓              ↓
InMemory       RedisRateLimitStore
(default)       (when REDIS_URL set)
```

### In-Memory Store
- Map-based, no external dependencies
- 60-second cleanup interval for stale entries
- Safe for single-instance deployment
- Production-only (skipped in dev)

### Redis Store
- Atomic INCR for thread-safe increments
- TTL auto-expiry via PEXPIRE
- Key prefix `rl:` to avoid collisions
- Dynamic ioredis import (no hard dependency)
- Fail-safe: falls back to in-memory if Redis is unavailable
- Configuration: Set `REDIS_URL` environment variable
- Requirements: `bun add ioredis` (optional)

### Key Building
- `buildRateLimitKey(request)` → `{ip}:{path}`
- `buildOrgRateLimitKey(request, orgId)` → `org:{orgId}:{ip}:{path}`
- Keys isolate by IP, path, and organization

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Security tests | 23 | PASS |
| Pagination tests | 16 | PASS |
| Rate limit tests | 39 | PASS |
| Tenant context | 5 | PASS |
| Env validation | 14 | PASS |
| Domain validator | 28 | PASS |
| Permissions | 27 | PASS |
| **Total** | **152** | **PASS** |

---

## Error Leakage Audit

| File | Status | Notes |
|------|--------|-------|
| `src/core/authorization/middleware.ts` | SAFE | Production returns static string |
| `src/app/api/ai/chat/route.ts` | SAFE | Production returns static string |
| `src/app/api/ai/agents/route.ts` | FIXED | Was leaking error.message; now guards with NODE_ENV |
| `src/app/api/ai/agents/[slug]/route.ts` | SAFE | Static strings only |
| `src/app/api/ai/conversations/[id]/route.ts` | SAFE | Static strings only |
| `src/app/error.tsx` | SAFE | Next.js sanitizes in production |
| `src/core/observability/*.ts` | SAFE | Server-side only (logger/errors) |

---

## Production Limitations

1. **Single-instance rate limiting**: Without Redis, rate limits are per-process. For horizontally scaled deployments, configure `REDIS_URL`.
2. **`unsafe-inline` in CSP**: Required by Next.js RSC hydration and Tailwind CSS v4. Nonces would require deeper Next.js config changes.
3. **next-auth v4**: In maintenance mode. No active CVEs, but v5 (Auth.js) migration is recommended for long-term support.

---

## Verification Results

| Check | Result |
|-------|--------|
| `bun test` | 152 pass, 0 fail |
| `bunx tsc --noEmit` | 0 errors |
| `bun run lint` | 0 errors (1 pre-existing warning) |
| `NODE_ENV=production bun run build` | PASS |

---

## Files Changed in Closeout

### Modified
- `src/middleware.ts` — CSP `unsafe-eval` dev-only (from commit 76ddb82)
- `src/__tests__/api/security-tests.test.ts` — CSP dev-only tests (from commit 76ddb82)
- `src/lib/rate-limit.ts` — Added RedisRateLimitStore, buildOrgRateLimitKey, fail-safe Redis init
- `src/__tests__/core/rate-limit.test.ts` — Extended to 39 tests (Redis mock, isolation, interface contract)
- `src/app/api/ai/agents/route.ts` — Fixed error.message leak in production
- `.env.example` — Added REDIS_URL placeholder
- `docs/production/06-phase13-completion-report.md` — Updated final status

### New
- `docs/audits/PHASE-13-CLOSEOUT.md` — This document

# Environment Security Posture

> **MIANX.AI** — Next.js 16 + Prisma 6.19.2 + SQLite (PostgreSQL-ready)
> Last updated: Phase 11

---

## Overview

This document describes the environment security posture of the MIANX.AI platform. All configuration is validated at startup via Zod schemas, sensitive values are redacted from telemetry, and development-only bypass mechanisms are strictly blocked in production.

---

## 1. Environment Variable Validation (`src/lib/env.ts`)

### Schema Definition

All environment variables are validated through a Zod schema (`envSchema`) at `src/lib/env.ts`. The schema enforces:

| Variable | Type | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | `string` (min 1) | **Always** | No default. Must be set. |
| `NODE_ENV` | `enum('development','production','test')` | No | Defaults to `development` |
| `NEXT_PUBLIC_APP_URL` | `string.url()` | No | Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `string.url()` | No | Required for production auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `string` | No | Required for production auth |
| `SUPABASE_SERVICE_ROLE_KEY` | `string` | No | **Server-only. Never expose to client.** |
| `OPENAI_API_KEY` | `string` | No | AI provider |
| `ANTHROPIC_API_KEY` | `string` | No | AI provider |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `string` | No | AI provider |
| `LOG_LEVEL` | `enum('DEBUG','INFO','WARN','ERROR')` | No | Structured logger level |
| `ALLOWED_ORIGINS` | `string` (comma-separated) | No | CORS origins |
| `AI_DAILY_TOKEN_LIMIT` | `number` (1000–10M) | No | AI safety limit |
| `AI_DAILY_REQUEST_LIMIT` | `number` (10–10K) | No | AI safety limit |

### Production Validation — Strict Mode

**Behavior: `getEnv()` returns `null` on validation failure in production.**

```
if (!result.success) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[ENV] Fatal: Invalid environment configuration:', ...)
    return null          // <-- Soft fail, returns null
  }
  // Dev mode: log warnings, continue with partial config
}
```

- **`getEnv()`**: Returns `Env | null`. In production, `null` means the app cannot start safely.
- **`requireEnv()`**: Throws an `Error` with a clear message directing the operator to check `.env.local` against `.env.example`. Use this at application startup.
- **`isEnvValid()`**: Returns `boolean` indicating whether the schema passed validation.

### Dev-Mode Fallbacks Blocked in Production

The `NODE_ENV === 'production'` check at lines 64–66 of `src/lib/env.ts` ensures that:

- Invalid config in production does **not** silently fall back to defaults.
- The application receives `null` from `getEnv()`, which should trigger a startup failure via `requireEnv()`.
- Development-mode leniency (logging warnings but continuing) is **never** active in production.

---

## 2. `.env` File Management

### `.env.example`

A `.env.example` file exists at the project root with all required and optional variables documented. This is the single source of truth for what variables the application expects.

### `.env` Untracked from Git

The `.gitignore` file includes `.env` and `.env.local` entries. No secrets are committed to version control.

### Rules

1. **Never commit `.env` or `.env.local`** — both are gitignored.
2. **`.env.example` is committed** — contains variable names and documentation, no actual values.
3. **Each environment** (dev, staging, production) has its own `.env.local` managed outside version control.

---

## 3. `NEXT_PUBLIC_` Prefix Rule

Next.js only exposes environment variables prefixed with `NEXT_PUBLIC_` to the client bundle. This is a critical security boundary:

### Client-Safe Variables (exposed to browser)

| Variable | Safe? | Reason |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Public application URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL (needed for client auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key is designed to be public (RLS-enforced) |

### Server-Only Variables (never exposed to browser)

| Variable | Risk if Leaked |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL** — Bypasses all RLS policies. Full database access. |
| `OPENAI_API_KEY` | **HIGH** — API quota abuse, cost exposure |
| `ANTHROPIC_API_KEY` | **HIGH** — API quota abuse, cost exposure |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **HIGH** — API quota abuse, cost exposure |
| `DATABASE_URL` | **CRITICAL** — Direct database access |
| `AI_DAILY_TOKEN_LIMIT` / `AI_DAILY_REQUEST_LIMIT` | **LOW** — Internal safety limits |

> **Rule**: Never prefix server-only variables with `NEXT_PUBLIC_`. The Zod schema at `src/lib/env.ts` enforces this by only marking safe variables with the prefix.

---

## 4. `SUPABASE_SERVICE_ROLE_KEY` — Server-Only

The Supabase service role key bypasses Row Level Security (RLS) and grants full administrative access to all data in the Supabase project.

### Protection Measures

1. **No `NEXT_PUBLIC_` prefix** — not bundled into client-side JavaScript.
2. **Zod schema marks it as optional `z.string().optional()`** — no default value.
3. **Only accessible via `getEnv()` / `requireEnv()` on the server** — these functions read from `process.env` which is server-only in Next.js.
4. **Structured logger redaction** (see §6) — if this key ever appears in logs, it is replaced with `[REDACTED]`.

### Usage Pattern

```typescript
// Server-side only (API routes, server components, middleware)
import { requireEnv } from '@/lib/env'
const env = requireEnv()
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY // Only available server-side
```

---

## 5. Development Headers Blocked in Production

### Headers

| Header | Purpose | Allowed In |
|---|---|---|
| `X-Dev-User-Id` | Bypass auth in development | **Development only** |
| `X-Dev-Org-Id` | Bypass org context in development | **Development only** |

### Implementation (`src/middleware.ts`)

**CORS Allow-List** (line 44–46):
```typescript
const devHeaders = process.env.NODE_ENV !== 'production'
  ? ', X-Dev-User-Id, X-Dev-Org-Id'
  : ''
```
- In production, `X-Dev-User-Id` and `X-Dev-Org-Id` are **not included** in `Access-Control-Allow-Headers`.
- Browsers will block requests carrying these headers in production due to CORS preflight failure.

**Organization Context Fallback** (line 60):
```typescript
const orgId = request.headers.get('x-organization-id')
  || (process.env.NODE_ENV !== 'production'
    ? request.headers.get('x-dev-org-id')
    : null)
```
- In production, `X-Dev-Org-Id` is **never read** — the fallback branch returns `null`.
- Production API routes require the real `X-Organization-Id` header (line 61–66).

---

## 6. Structured Logger Redaction (`src/core/observability/redact.ts`)

### Overview

The redaction module at `src/core/observability/redact.ts` ensures that sensitive data never appears in logs, metrics, or traces. It provides 44 total sensitive patterns.

### Sensitive Field Patterns (32 fields)

The `SENSITIVE_FIELDS` set matches field names (case-insensitive, special characters stripped) including:

- **Authentication**: `password`, `passwd`, `secret`, `token`, `accesstoken`, `access_token`, `refreshtoken`, `refresh_token`, `bearer`
- **API Keys**: `apikey`, `api_key`, `apikeysecret`, `api_key_secret`, `xapikeys`, `servicekey`, `service_key`
- **Financial**: `creditcard`, `credit_card`, `cvv`, `bankaccount`, `bank_account`, `paymentsecret`, `payment_secret`
- **Identity**: `ssn`, `socialsecurity`
- **Webhooks**: `webhooksecret`, `webhook_secret`
- **Session**: `authorization`, `cookie`, `setcookie`
- **Crypto**: `privatekey`, `private_key`

### Sensitive Value Patterns (5 regexes)

The `SENSITIVE_PATTERNS` array detects sensitive values embedded in strings:

| Pattern | Matches |
|---|---|
| `Bearer\s+[A-Za-z0-9\-._~+/]+=*` | Bearer tokens in any context |
| `sk-[A-Za-z0-9]{20,}` | OpenAI-style API keys |
| `ghp_[A-Za-z0-9]{36}` | GitHub Personal Access Tokens |
| `xox[bpas]-[A-Za-z0-9-]+` | Slack tokens |
| `\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}` | Credit card numbers |
| `\d{3}-\d{2}-\d{4}` | Social Security Numbers |

### Redacted HTTP Headers (7 headers)

The `redactHeaders()` function always replaces these header values with `[REDACTED]`:

`authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `proxy-authorization`, `www-authenticate`

### API

| Function | Input | Output | Description |
|---|---|---|---|
| `redactObject(obj)` | `Record<string, unknown>` | Redacted copy | Recursively redacts sensitive fields and string values in nested objects and arrays |
| `redactString(value)` | `string` | Redacted copy | Applies all regex patterns to a single string |
| `redactHeaders(headers)` | HTTP headers | Redacted copy | Replaces sensitive header values with `[REDACTED]` |
| `isSensitiveField(name)` | Field name string | `boolean` | Checks if a field name is in the sensitive set |

---

## 7. Security Headers (`src/middleware.ts`)

All responses include these security headers:

| Header | Value | Notes |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Blocks device access & FLoC |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **Production only** — enforced over HTTPS |

---

## 8. Security Posture Summary

| Control | Status | Implementation |
|---|---|---|
| Env validation at startup | **Implemented** | `src/lib/env.ts` — Zod schema |
| Production strict validation | **Implemented** | Returns `null` on failure; `requireEnv()` throws |
| `.env` excluded from git | **Implemented** | `.gitignore` rules |
| `.env.example` available | **Implemented** | Project root |
| `NEXT_PUBLIC_` prefix discipline | **Implemented** | Only client-safe vars prefixed |
| `SUPABASE_SERVICE_ROLE_KEY` server-only | **Implemented** | No `NEXT_PUBLIC_` prefix; server-side access only |
| Dev-mode fallbacks blocked in prod | **Implemented** | `NODE_ENV` checks in `env.ts` and `middleware.ts` |
| Structured logger redaction | **Implemented** | 44 patterns across fields, values, and headers |
| Dev headers blocked in production | **Implemented** | CORS + org context fallback guarded by `NODE_ENV` |
| Security headers | **Implemented** | HSTS, X-Frame-Options, CSP-related headers in middleware |
| Secret rotation procedure | **Not implemented** | Needs operational runbook |
| Secrets in external vault | **Not implemented** | Currently file-based `.env.local` |
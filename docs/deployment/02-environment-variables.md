# MIANX.AI — Environment Variables Reference

**Status:** Phase 14
**Date:** 2026-08-21

---

## Required Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `NODE_ENV` | `production` | Must be `production` for security features |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/mianx?schema=public` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | `https://app.mianx.ai` | Public base URL (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase service role key (server-only) |

## Optional: AI Providers

At least one recommended for AI features.

| Variable | Notes |
|----------|-------|
| `OPENAI_API_KEY` | GPT models |
| `ANTHROPIC_API_KEY` | Claude models |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini models |

## Optional: Rate Limiting

| Variable | Example | Notes |
|----------|---------|-------|
| `REDIS_URL` | `redis://localhost:6379` | Enables distributed rate limiting. Omit for single-instance in-memory. |

## Optional: Production Settings

| Variable | Example | Notes |
|----------|---------|-------|
| `LOG_LEVEL` | `INFO` | DEBUG, INFO, WARN, ERROR |
| `ALLOWED_ORIGINS` | `https://app.mianx.ai` | Comma-separated CORS origins |
| `AI_DAILY_TOKEN_LIMIT` | `100000` | Per-org daily token budget (1000–10000000) |
| `AI_DAILY_REQUEST_LIMIT` | `500` | Per-org daily request limit (10–10000) |

## Security Rules

1. **NEVER** commit `.env` or `.env.local` to version control
2. **NEVER** paste secrets into chat, logs, or error messages
3. Service role keys and database URLs are **server-only** (never exposed to clients)
4. `NEXT_PUBLIC_*` prefix is the only safe prefix for client-exposed variables
5. Rotate compromised credentials immediately

## Database URL Formats

```
# Development (SQLite)
DATABASE_URL="file:./db/dev.db"

# Staging (PostgreSQL)
DATABASE_URL="postgresql://mianx_staging:PASSWORD@localhost:5432/mianx_staging?schema=public"

# Production (PostgreSQL)
DATABASE_URL="postgresql://mianx_prod:PASSWORD@db-host:5432/mianx_prod?schema=public"
```

## Checklist for New Environment

- [ ] Copy `.env.example` to `.env.production`
- [ ] Set all required variables
- [ ] Set at least one AI provider key
- [ ] Set `ALLOWED_ORIGINS` to production domain
- [ ] Verify `NODE_ENV=production`
- [ ] Do NOT set `REDIS_URL` unless Redis is running
- [ ] Test with `bun run build` locally before deploying
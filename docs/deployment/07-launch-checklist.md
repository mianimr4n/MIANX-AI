# MIANX.AI — Launch Checklist

**Status:** Phase 14
**Date:** 2026-08-21

---

## Pre-Launch

### Code
- [ ] All Phase 1–13 commits pushed to GitHub
- [ ] All CI checks passing on main branch
- [ ] No secrets in tracked files
- [ ] `.env.example` up to date
- [ ] Health endpoints responding correctly

### Database
- [ ] PostgreSQL provisioned (managed provider)
- [ ] `DATABASE_URL` set to PostgreSQL connection string
- [ ] Prisma schema `provider` changed to `postgresql`
- [ ] `prisma migrate deploy` successful
- [ ] Seed data applied (if needed)
- [ ] Backup automation configured

### Authentication
- [ ] Supabase project created
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] Auth flow tested (signup, login, session)

### AI Providers
- [ ] At least one AI provider key configured
- [ ] AI chat endpoint tested
- [ ] Token budget configured

### Security
- [ ] `NODE_ENV=production`
- [ ] `ALLOWED_ORIGINS` set to production domain
- [ ] CSP verified (no `unsafe-eval` in production)
- [ ] HSTS active (requires HTTPS)
- [ ] Rate limiting tested
- [ ] Error responses verified (no stack traces)

### Infrastructure
- [ ] VPS provisioned
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Caddy installed and configured
- [ ] DNS A record pointing to VPS
- [ ] TLS certificate provisioned (Caddy auto)

## Launch Day

- [ ] Deploy via `docker compose -f docker-compose.production.yml up -d`
- [ ] Run `scripts/deploy/verify-health.sh`
- [ ] Test signup/login flow
- [ ] Test organization creation
- [ ] Test AI chat
- [ ] Test tenant isolation (different orgs)
- [ ] Monitor logs for 30 minutes
- [ ] Verify backup runs

## Post-Launch (First 24 Hours)

- [ ] Set up external health check monitoring
- [ ] Configure alert channels (email/Slack)
- [ ] Review error logs for unexpected issues
- [ ] Verify no secrets in response headers
- [ ] Test rate limiting (429 responses)
- [ ] Document any deviations from this checklist
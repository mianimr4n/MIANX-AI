# MIANX.AI — Rollback Runbook

**Status:** Phase 14
**Date:** 2026-08-21

---

## When to Rollback

1. Health check fails after deployment
2. Error rate spikes above baseline
3. Database migration fails
4. Authentication broken
5. Tenant data leakage detected

## Application Rollback

### Quick Rollback (Docker)

```bash
cd /opt/mianx-ai

# Check current commit
git log -1 --oneline

# Rollback to previous known-good commit
git checkout <KNOWN_GOOD_COMMIT>

# Rebuild and restart
docker compose -f docker-compose.production.yml builddocker compose -f docker-compose.production.yml up -d

# Verify health
curl -sf http://localhost:3000/api/health | python3 -m json.tool
```

### Database Rollback

**Prisma migrate supports rollback only for the last migration:**

```bash
docker compose -f docker-compose.production.yml run --rm app \
  bunx prisma migrate rollback
```

**If the migration is not the last one, manual intervention is required.**
Contact the database administrator.

## Emergency Procedures

### Application Unresponsive

```bash
# Force restart
docker compose -f docker-compose.production.yml restart app

# If restart fails, check logs
docker compose -f docker-compose.production.yml logs --tail=100 app

# If container is crash-looping, rollback code
git checkout <PREVIOUS_COMMIT>
docker compose -f docker-compose.production.yml up -d --build
```

### Database Connection Lost

1. Check PostgreSQL provider status page
2. Verify `DATABASE_URL` in `.env.production`
3. Test connectivity:
   ```bash
   docker compose -f docker-compose.production.yml run --rm app \
     bunx prisma db execute --stdin <<< "SELECT 1"
   ```
4. If provider is down, contact their support
5. Application will return 500 errors — this is expected and safe

### Security Incident

1. **Rotate all credentials** (database, Supabase, AI provider keys)
2. **Revoke compromised sessions** via Supabase dashboard
3. **Audit logs** at `/api/audit-logs`
4. **Do NOT delete evidence**
5. Follow the incident response plan in `docs/production/03-disaster-recovery.md`

## Rollback Decision Tree

```
Health check fails?
  ├── Yes → Restart container
  │           ├── Recovers → Monitor
  │           └── Still failing → Rollback code
  │                           ├── Recovers → Investigate failed commit
  │                           └── Still failing → Rollback database + code
  └── No → Monitor error rates
              ├── Elevated → Investigate logs
              └── Normal → Deployment successful
```

## Post-Rollback

1. Document the incident (who, what, when, why)
2. Create a fix branch from the rollback point
3. Test fix locally before re-deploying
4. Update this runbook if procedures were unclear
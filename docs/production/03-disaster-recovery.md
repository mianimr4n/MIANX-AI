# Disaster Recovery Plan

> **MIANX.AI** — Next.js 16 + Prisma 6.19.2 + SQLite (PostgreSQL-ready)
> Last updated: Phase 11

---

## Critical Disclaimer

> **This disaster recovery plan has NOT been tested.** No tabletop exercise, no failover drill, and no restore drill has been conducted. A tabletop exercise with the engineering team MUST be completed before go-live. This document is a plan, not a proven capability.

---

## 1. DR Phases

All disaster recovery incidents follow these five phases in sequence:

### Phase 1: Detection

**Goal**: Identify that a disaster or outage is occurring within minutes.

| Method | What It Detects | Response Time Target |
|---|---|---|
| Health check endpoint (`/api/health`, `/api/observability/health`) | Application unresponsive | < 2 minutes |
| Structured logger error rate spike | Application errors | < 5 minutes |
| Monitoring/alerting system (if configured) | CPU, memory, disk, response time | < 2 minutes |
| User reports (support channel, status page) | Customer-facing issues | Variable (escalate immediately) |
| Database connectivity errors | Data layer failure | < 1 minute |

**Detection Actions**:
1. Confirm the alert is not a false positive (check multiple signals).
2. Classify severity: **P1** (total outage), **P2** (degraded), **P3** (minor).
3. Activate the incident response channel (Slack `#incident-response` or equivalent).
4. Assign an Incident Commander.

### Phase 2: Containment

**Goal**: Prevent the incident from spreading or causing further damage.

| Action | When to Use |
|---|---|
| Stop application traffic (reverse proxy 503) | Application is corrupting data or under active attack |
| Isolate affected database | Data corruption detected in subset of tables/tenants |
| Block specific IP ranges / user agents | DDoS or targeted abuse |
| Disable AI provider integration | AI provider outage causing cascading failures |
| Switch to read-only mode | Database under heavy write load, preserve data |

**Containment Decision Tree**:
```
Is data being corrupted or exfiltrated?
  YES → Stop all traffic immediately. Go to Phase 3.
  NO  → Is the failure isolated to one component?
    YES → Can we route around it?
      YES → Enable degraded mode. Monitor. Document.
      NO  → Isolate the component. Go to Phase 3.
    NO  → Full outage. Go to Phase 3.
```

### Phase 3: Recovery

**Goal**: Restore service to normal operation using the safest available method.

**Recovery Priority Order**:
1. **Authentication / Authorization** — users must be able to log in.
2. **Core API endpoints** — tenant data access must work.
3. **AI features** — non-critical, can be restored last.
4. **Webhooks / Integrations** — replay missed events after core is stable.

**Recovery Methods** (in order of preference):
1. **Fix in place** — restart service, clear cache, fix config (fastest, least disruptive).
2. **Failover** — switch to standby instance or replica (if available).
3. **Restore from backup** — use the most recent known-good backup (see `02-backup-recovery.md`).
4. **Rebuild** — provision new infrastructure, restore data, reconfigure (last resort).

### Phase 4: Verification

**Goal**: Confirm the system is fully operational before declaring the incident resolved.

**Verification Checklist**:
- [ ] Health check endpoints return `200 OK`
- [ ] Structured logger shows normal error rate (< 0.1% of requests)
- [ ] Authentication flow works (login, token refresh, logout)
- [ ] Multi-tenant isolation verified (query results scoped to correct `organizationId`)
- [ ] At least one CRUD operation per core domain succeeds
- [ ] AI provider integration responds (if applicable)
- [ ] Webhook delivery confirmed (if applicable)
- [ ] No alert regressions within 15 minutes of resolution
- [ ] User-facing smoke test passed by product/engineering

**Declare incident resolved** only after all items pass.

### Phase 5: Postmortem

**Goal**: Learn from the incident and prevent recurrence.

**Timeline**:
- **Blameless postmortem meeting**: Within **48 hours** of incident resolution.
- **Postmortem document published**: Within **72 hours**.

**Postmortem Template**:
1. **Incident Summary** — What happened, when, duration, impact.
2. **Timeline** — Chronological sequence of events with timestamps.
3. **Root Cause** — Technical root cause(s) and contributing factors.
4. **Impact** — Users affected, data loss (if any), revenue impact.
5. **What Went Well** — What detection/response mechanisms worked.
6. **What Could Be Improved** — Gaps in detection, response, or recovery.
7. **Action Items** — Specific, assigned, with deadlines.
   - Each action item must have: owner, description, priority (P0/P1/P2), due date.
8. **Lessons Learned** — Generalizable takeaways for the team.

---

## 2. Runbooks

### 2.1 Database Failure

**Symptoms**:
- Application returns 500 errors with Prisma/database error messages.
- Health check fails with database connectivity error.
- Structured logger shows connection pool exhaustion or timeout errors.

**Immediate Actions**:

| Step | Action | Command / Reference |
|---|---|---|
| 1 | Check if the database process is running | `pg_isready -h $PGHOST` (PG) or `ls -la db/custom.db` (SQLite) |
| 2 | Check disk space | `df -h` on the database volume |
| 3 | Check database logs | Journalctl, cloud provider logs, or SQLite error output |
| 4 | If SQLite: check for WAL/lock contention | `ls -la db/custom.db-wal db/custom.db-shm` |
| 5 | If PostgreSQL: check connection count | `SELECT count(*) FROM pg_stat_activity;` |
| 6 | Attempt application restart | `pm restart mianx` or `systemctl restart mianx` |
| 7 | If restart fails: restore from backup | See `02-backup-recovery.md` §3.2 (SQLite) or §4.5 (PostgreSQL) |

**Escalation**: If restore from backup is required, escalate to DevOps/Platform team immediately.

### 2.2 Application Crash

**Symptoms**:
- All endpoints return 502/503.
- Process is not running or crash-looping.
- Structured logger shows unhandled exceptions or OOM errors.

**Immediate Actions**:

| Step | Action | Command / Reference |
|---|---|---|
| 1 | Check process status | `pm status mianx` or `systemctl status mianx` |
| 2 | Check recent logs | Structured logger output, stderr, `pm logs mianx` |
| 3 | Check memory/CPU | `top`, `free -m`, `df -h` |
| 4 | Check environment config | `requireEnv()` — did the app fail to start due to missing env vars? |
| 5 | Check for recent deployments | Did a new deploy introduce the crash? |
| 6 | Rollback to previous version | Revert deployment, restart |
| 7 | If OOM: increase memory limit or fix leak | Scale horizontally or debug memory profile |

**Rollback Procedure**:
1. Identify the last known-good deployment (git SHA or container image tag).
2. Redeploy that version.
3. Restart the application.
4. Verify health check passes.
5. Verify error rate returns to normal.
6. Lock deployments until root cause is identified.

### 2.3 AI Provider Outage

**Symptoms**:
- AI-related endpoints return 500 or timeout.
- Non-AI endpoints continue to function normally.
- Structured logger shows upstream provider errors (OpenAI/Anthropic/Google 5xx).

**Immediate Actions**:

| Step | Action |
|---|---|
| 1 | Confirm which AI provider is affected (check logs for provider-specific errors) |
| 2 | Check provider status page (status.openai.com, status.anthropic.com, etc.) |
| 3 | If multiple providers are configured: failover to alternate provider |
| 4 | If no alternate available: return graceful degradation response to users |
| 5 | Monitor provider status for resolution |
| 6 | Once resolved: verify AI endpoints respond normally |

**Graceful Degradation**:
- AI endpoints should return a clear error message: "AI service temporarily unavailable. Please try again later."
- Non-AI functionality (CRUD, auth, dashboards) must continue operating.
- Do NOT retry excessively — respect provider rate limits.

### 2.4 Security Breach

**Symptoms**:
- Unauthorized access detected (alert from WAF, auth logs, user reports).
- Data exfiltration suspected.
- Malicious payloads detected in requests.
- Unrecognized API keys or tokens in use.

**Immediate Actions**:

| Step | Action | Priority |
|---|---|---|
| 1 | **Activate incident response** — notify security team, legal, management | **P0** |
| 2 | **Contain** — rotate all compromised credentials (API keys, service role keys, database passwords) | **P0** |
| 3 | **Isolate** — block suspicious IPs, revoke compromised sessions/tokens | **P0** |
| 4 | **Preserve evidence** — do NOT delete logs, take filesystem snapshots | **P0** |
| 5 | **Audit** — review structured logs for scope of access (which tenants, which data, what time range) | **P1** |
| 6 | **Notify affected users** — if personal data was accessed, follow legal/notification requirements | **P1** |
| 7 | **Patch** — close the vulnerability that allowed the breach | **P1** |
| 8 | **Postmortem** — full blameless review within 48 hours | **P1** |

**Credential Rotation Checklist**:
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Rotate `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- [ ] Rotate database password (update `DATABASE_URL`)
- [ ] Invalidate all active user sessions (force re-login)
- [ ] Review and revoke any API keys issued to tenants
- [ ] Update `.env.local` on all application instances
- [ ] Restart application to pick up new credentials

---

## 3. Communication Plan

| Audience | Channel | Timing | Content |
|---|---|---|---|
| Engineering team | `#incident-response` | Immediately | Technical details, runbook activation |
| Management | Direct message / email | Within 15 minutes | Severity, scope, ETA |
| Customers | Status page / email | Within 30 minutes | Impact, expected resolution time |
| Public (if major) | Status page | Within 1 hour | Acknowledgement, updates every 30 minutes |

---

## 4. DR Readiness Assessment

| Capability | Status |
|---|---|
| DR plan documented | **DONE** (this document) |
| Runbooks for common scenarios | **DONE** (§2) |
| Backup procedures documented | **DONE** (see `02-backup-recovery.md`) |
| Backup automation configured | **NOT DONE** |
| Restore procedure tested | **NOT DONE** |
| Failover capability | **NOT AVAILABLE** (single-node SQLite) |
| Tabletop exercise conducted | **NOT DONE** |
| Incident communication channels defined | **NEEDS VERIFICATION** |
| On-call rotation established | **NEEDS VERIFICATION** |

### Required Before Go-Live

1. **Tabletop exercise** — Walk through each runbook with the engineering team. Identify gaps.
2. **Restore drill** — Perform a full backup and restore on a staging environment.
3. **Communication test** — Verify that the incident channel is accessible and notifications work.
4. **Credential rotation drill** — Practice rotating all credentials end-to-end.

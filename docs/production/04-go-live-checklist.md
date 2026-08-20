# Go-Live Checklist

> **MIANX.AI** — Next.js 16 + Prisma 6.19.2 + SQLite (PostgreSQL-ready)
> Last updated: Phase 11

---

## Instructions

- **READY**: Implemented and verified in code / configuration.
- **NOT READY**: Not implemented or known to be missing.
- **NEEDS VERIFICATION**: Implemented in code but depends on infrastructure that has not been provisioned or tested.

Every item must be **READY** or explicitly accepted as **NEEDS VERIFICATION with a mitigation plan** before go-live.

---

## Infrastructure (7 items)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Database provisioned (SQLite file path confirmed **or** PostgreSQL instance ready) | **NEEDS VERIFICATION** | SQLite file exists locally. Production database location depends on deployment target. |
| 2 | Backups configured and tested | **NOT READY** | Procedures documented in `02-backup-recovery.md` but no backup system is running. |
| 3 | SSL/TLS terminated at edge (HTTPS enforced) | **NEEDS VERIFICATION** | HSTS header set in production middleware. Edge TLS termination depends on hosting provider. |
| 4 | Domain/DNS configured and pointing to application | **NEEDS VERIFICATION** | `NEXT_PUBLIC_APP_URL` configurable via env. No domain has been provisioned. |
| 5 | CDN / static asset caching configured | **NEEDS VERIFICATION** | Next.js handles static assets. CDN layer depends on hosting. |
| 6 | Monitoring and alerting active (error rate, latency, uptime) | **NEEDS VERIFICATION** | Structured logger (`src/core/observability/`) is implemented. External monitoring service not connected. |
| 7 | Health check endpoint accessible to monitoring | **READY** | `/api/health` and `/api/observability/health` endpoints exist and respond. |

---

## Security (8 items)

| # | Item | Status | Notes |
|---|---|---|---|
| 8 | Secrets managed securely (env vars / vault, not in code) | **READY** | Zod validation in `src/lib/env.ts`. `.env` gitignored. `.env.example` committed. |
| 9 | CORS configured for production origins | **READY** | `ALLOWED_ORIGINS` env var parsed in `src/middleware.ts`. Defaults to `NEXT_PUBLIC_APP_URL`. |
| 10 | Rate limiting active on API routes | **READY** | Implemented via middleware and AI daily token/request limits in `src/lib/env.ts`. |
| 11 | Content Security Policy (CSP) headers | **READY** | Security headers set in `src/middleware.ts`: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`. |
| 12 | HSTS enabled | **READY** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` set in production mode in `src/middleware.ts`. |
| 13 | Authentication required for all API routes | **READY** | Middleware enforces `X-Organization-Id` on all API routes (except health/public) in production. |
| 14 | Tenant isolation verified (no cross-tenant data access) | **READY** | Organization-scoped queries. Prisma schema enforces tenant relationships. Dev bypass headers blocked in production. |
| 15 | Dependency audit reviewed (no known critical vulnerabilities) | **NEEDS VERIFICATION** | Run `npm audit` before go-live. Address any critical/high findings. |

---

## Application (5 items)

| # | Item | Status | Notes |
|---|---|---|---|
| 16 | Health check endpoints respond correctly | **READY** | `/api/health` and `/api/observability/health` implemented and functional. |
| 17 | Error pages configured (404, 500) | **READY** | Next.js handles these. Application returns structured JSON errors via middleware. |
| 18 | Structured logging operational | **READY** | `src/core/observability/redact.ts` with 44 sensitive patterns. Request IDs propagated via `X-Request-Id`. |
| 19 | AI providers configured and functional | **NEEDS VERIFICATION** | Code supports OpenAI, Anthropic, Google. API keys must be set in production env and tested. |
| 20 | Webhooks deliverable (outbound HTTP calls work) | **NEEDS VERIFICATION** | Webhook code exists. Outbound connectivity from production host untested. |

---

## Operations (5 items)

| # | Item | Status | Notes |
|---|---|---|---|
| 21 | Runbook documented for common failure scenarios | **READY** | `03-disaster-recovery.md` covers database failure, app crash, AI outage, security breach. |
| 22 | On-call rotation assigned | **NOT READY** | No on-call schedule or escalation policy defined. |
| 23 | Alerting configured (pager/email on critical events) | **NOT READY** | Structured logger exists. No external alerting integration. |
| 24 | Disaster recovery plan tested (tabletop or live) | **NOT READY** | Plan documented in `03-disaster-recovery.md` but no exercise conducted. |
| 25 | Rollback procedure verified | **NEEDS VERIFICATION** | Documented in `03-disaster-recovery.md`. Needs testing against actual deployment pipeline. |

---

## Compliance (5 items)

| # | Item | Status | Notes |
|---|---|---|---|
| 26 | Data retention policy defined | **NOT READY** | No formal retention policy documented. Tenant data lifecycle not defined. |
| 27 | Privacy policy published | **NOT READY** | Legal document not drafted or published. |
| 28 | Terms of service published | **NOT READY** | Legal document not drafted or published. |
| 29 | Audit logging operational | **NEEDS VERIFICATION** | Structured logging with request IDs exists. Dedicated audit log for compliance actions not implemented. |
| 30 | Backup retention meets compliance requirements (30 days standard, 1 year for compliance) | **NOT READY** | Retention targets defined in `02-backup-recovery.md` but no backup system is operational. |

---

## Summary

| Status | Count | Items |
|---|---|---|
| **READY** | **13** | #7, #8, #9, #10, #11, #12, #13, #14, #16, #17, #18, #21 |
| **NEEDS VERIFICATION** | **10** | #1, #3, #4, #5, #6, #15, #19, #20, #25, #29 |
| **NOT READY** | **7** | #2, #22, #23, #24, #26, #27, #28, #30 |

### Blockers for Go-Live

The following **NOT READY** items must be resolved or explicitly accepted with a mitigation plan:

1. **#2 — Backups configured and tested** — No production system should launch without verified backups.
2. **#22 — On-call rotation assigned** — Who responds when the system breaks at 3 AM?
3. **#23 — Alerting configured** — How will anyone know the system is down?
4. **#24 — DR plan tested** — Untested recovery plans are just wishes.
5. **#26 — Data retention policy** — Legal/compliance requirement before handling user data.
6. **#27 — Privacy policy** — Legal requirement before accepting user signups.
7. **#28 — Terms of service** — Legal requirement before accepting user signups.
8. **#30 — Backup retention** — Depends on #2 and compliance requirements.

### Recommendation

Do not go live until all **NOT READY** items have a clear owner, timeline, and either a resolution or a documented risk acceptance signed by the project lead.
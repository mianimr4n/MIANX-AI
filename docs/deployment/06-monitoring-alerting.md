# MIANX.AI — Monitoring & Alerting

**Status:** Phase 14
**Date:** 2026-08-21

---

## Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /api/health` | Basic liveness | `{ status, version, checks.database }` |
| `GET /api/observability/health` | Full readiness | `{ status, checks: { database, jobs, workflows, incidents } }` |
| `GET /api/observability/health?type=liveness` | Process alive check | `{ status: 'alive' }` |

## What to Monitor

### Application Level

1. **Health endpoint response time** — alert if > 2 seconds
2. **Health endpoint status** — alert if not `healthy`
3. **Error rate** — alert if 5xx rate > 1% of requests
4. **Response time p95** — alert if > 5 seconds
5. **Memory usage** — alert if > 80% of container limit

### Database Level

1. **Connection pool utilization** — alert if > 80%
2. **Query latency p95** — alert if > 500ms
3. **Active connections** — alert if near PostgreSQL limit
4. **Disk usage** — alert if > 80%

### Business Level

1. **Failed jobs** — alert if > 10 in 1 hour
2. **Stuck workflow runs** — alert if any run > 30 minutes stale
3. **P1 incidents** — alert immediately (via `hasP1Active()`)
4. **Failed webhook deliveries** — alert if > 5 consecutive failures

## Recommended Monitoring Stack (Minimal)

### Built-in (Zero Cost)

- **Docker health check** (already in Dockerfile, every 30s)
- **Caddy access logs** for request timing
- **Application structured logs** to stdout

### Recommended Additions

- **Uptime Kuma** or **BetterUptime** for external health checks
- **Prometheus + Grafana** for metrics (if scaling beyond 1 instance)
- **Sentry** for error tracking (optional)

## Alert Configuration Example (Uptime Kuma)

```
Name: MIANX.AI Health
URL: https://app.mianx.ai/api/health
Interval: 60s
Retries: 3
Expected Status: 200
Expected JSON Key: status
Expected Value: healthy
```

## Log Format

Application logs are structured JSON to stdout:

```json
{
  "level": "INFO",
  "msg": "Request completed",
  "method": "GET",
  "path": "/api/teams",
  "status": 200,
  "latency_ms": 42,
  "orgId": "org_abc",
  "requestId": "req_xyz"
}
```

Docker captures these logs: `docker compose logs -f app`.

## Dashboard Metrics to Track

- Requests per minute (by endpoint)
- Error rate (4xx, 5xx)
- Response time histogram
- Database query latency
- Active organizations
- AI usage (tokens, requests)
- Background job queue depth
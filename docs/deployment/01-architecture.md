# MIANX.AI — Deployment Architecture

**Status:** Phase 14
**Date:** 2026-08-21

---

## Recommended Architecture: Docker + Managed PostgreSQL + Redis on VPS

### Why This Architecture

| Factor | Vercel | Docker VPS | Docker + Managed DB |
|--------|--------|------------|-------------------|
| Persistent database | Needs external | Self-managed | Managed (recommended) |
| Long-running processes | Limited | Full support | Full support |
| Background jobs | Limited | Native | Native |
| Multi-tenant isolation | App-level | App + DB-level | App + DB-level |
| Cost at launch | $20+/mo | $10-20/mo | $20-40/mo |
| Scaling path | Vertical | Vertical + horizontal | Vertical + horizontal |
| Auth (Supabase) | External | External | External |
| AI providers | External | External | External |

**Vercel is unsuitable** because MIANX.AI uses a persistent database (not serverless-friendly), background job processing, WebSocket support for AI streaming, and multi-tenant data isolation that benefits from a dedicated PostgreSQL instance.

**Decision: Option C — Docker + Managed PostgreSQL + Optional Redis**

This matches the existing project structure:
- `Dockerfile` already configured for standalone output
- `Caddyfile` already configured for TLS termination
- Health/readiness endpoints already implemented
- Rate limiting already has Redis adapter (optional)

---

## Infrastructure Diagram

```
Internet
  ↓
Caddy (TLS, reverse proxy, port 443)
  ↓
MIANX.AI Container (Docker, port 3000)
  ↓          ↓
PostgreSQL   Supabase (auth)
  ↓          ↓
Redis       AI Providers (OpenAI, Anthropic, Google)
(optional)
```

---

## Required Infrastructure

### Server
- **Provider:** Any VPS (Hetzner, DigitalOcean, Linode, AWS Lightsail)
- **Minimum:** 2 vCPU, 4GB RAM, 40GB SSD
- **Recommended:** 4 vCPU, 8GB RAM, 80GB SSD
- **OS:** Ubuntu 24.04 LTS

### Database
- **Provider:** Managed PostgreSQL (Supabase, Neon, Railway, or RDS)
- **Version:** PostgreSQL 15+
- **Reason:** SQLite is development-only. Multi-tenant SaaS requires concurrent connections, row-level security potential, and proper backup tooling.

### Redis (Optional)
- **Provider:** Managed Redis (Upstash, Railway) or self-hosted
- **Purpose:** Distributed rate limiting for multi-instance deployments
- **Can defer:** In-memory rate limiting works for single-instance

### Domain & DNS
- **Domain:** Production domain (e.g., app.mianx.ai)
- **DNS:** A record pointing to VPS IP
- **SSL:** Caddy handles automatic TLS via Let's Encrypt

### Backups
- **Database:** Daily automated backups via managed provider
- **Application:** Git-tracked code + Docker image versioning
- **Secrets:** Environment variables only (never in code or images)

### Monitoring
- **Application:** `/api/health` and `/api/observability/health` endpoints
- **Infrastructure:** VPS provider metrics (CPU, RAM, disk)
- **Alerting:** Health check failures → restart container
- **Logs:** Structured JSON logs to stdout (Docker captures)

---

## Deployment Flow

1. Provision VPS + managed PostgreSQL
2. Configure DNS (A record → VPS IP)
3. Clone repository on VPS
4. Configure `.env.production`
5. Run `docker compose -f docker-compose.production.yml up -d`
6. Run `docker compose exec app bun run db:migrate`
7. Verify health: `curl https://app.mianx.ai/api/health`
8. Configure automatic backups
9. Set up monitoring alerts

---

## Scaling Path

1. **Single instance** (launch): 1 VPS, 1 container, managed PostgreSQL
2. **Vertical scaling**: Increase VPS resources
3. **Horizontal scaling** (future): Add Redis, load balancer, multiple containers
4. **CDN** (future): Cloudflare for static assets

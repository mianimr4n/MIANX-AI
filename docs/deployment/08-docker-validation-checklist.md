# Docker Validation Checklist

> **MIANX.AI** — Must be executed on a Docker-capable deployment server
> Phase 16: Static review complete; live validation pending

---

## Prerequisites

- [ ] Docker 20+ installed (`docker --version`)
- [ ] Docker Compose v2+ installed (`docker compose version`)
- [ ] `.env.production` file created alongside `docker-compose.production.yml`
- [ ] `POSTGRES_PASSWORD` set in `.env.production`
- [ ] `DATABASE_URL` set to `postgresql://mianx:<password>@postgres:5432/mianx_ai` (for compose) or external PG
- [ ] At least 4GB RAM available on host
- [ ] Ports 3000, 5432, 6379 available (or adjust mappings)

## Build Validation

```bash
# 1. Build the app image
docker compose -f docker-compose.production.yml build app 2>&1 | tee build.log
# EXPECT: "Successfully built" or "Successfully tagged"

# 2. Verify Prisma client was generated inside the image
docker compose -f docker-compose.production.yml run --rm app ls -la node_modules/.prisma/client/client.js
# EXPECT: file exists

# 3. Verify non-root runtime user
docker compose -f docker-compose.production.yml run --rm app whoami
# EXPECT: "nextjs" (uid 1001)

# 4. Verify no .env files baked into image
docker compose -f docker-compose.production.yml run --rm app ls -la .env .env.local .env.production 2>&1
# EXPECT: "No such file or directory" for all three

# 5. Verify no SQLite database files in image
docker compose -f docker-compose.production.yml run --rm app find . -name '*.db' -o -name '*.db-wal' -o -name '*.db-shm'
# EXPECT: no output

# 6. Verify Prisma schema is present in runner
docker compose -f docker-compose.production.yml run --rm app ls -la prisma/schema.prisma
# EXPECT: file exists

# 7. Verify standalone output structure
docker compose -f docker-compose.production.yml run --rm app ls -la server.js .next/standalone 2>&1
# EXPECT: server.js exists, .next/standalone is a directory or server.js is at root
```

## Runtime Validation

```bash
# 8. Start all services
docker compose -f docker-compose.production.yml up -d

# 9. Wait for startup
echo "Waiting 30s for startup..."; sleep 30

# 10. Check container status
docker compose -f docker-compose.production.yml ps
# EXPECT: app (healthy), postgres (healthy), redis (healthy)

# 11. Check app logs for startup errors
docker compose -f docker-compose.production.yml logs app --tail=50
# EXPECT: no "Error", no "FATAL", Prisma client initialized

# 12. Verify health endpoint
curl -sf http://localhost:3000/api/health | python3 -m json.tool
# EXPECT: {"status":"healthy",...}

# 13. Verify observability health
curl -sf http://localhost:3000/api/observability/health?type=full | python3 -m json.tool
# EXPECT: {"status":"healthy",...}

# 14. Verify PostgreSQL connectivity from app
docker compose -f docker-compose.production.yml exec postgres pg_isready -U mianx -d mianx_ai
# EXPECT: "accepting connections"

# 15. Verify no secrets in logs
docker compose -f docker-compose.production.yml logs app 2>&1 | \
  rg -i 'password|secret|api.key|token|DATABASE_URL=postgresql://[^$]' || echo "NO SECRETS IN LOGS"
# EXPECT: NO SECRETS IN LOGS

# 16. Clean up
docker compose -f docker-compose.production.yml down
```

## Known Concerns (Static Review)

| Concern | Status | Notes |
|---------|--------|-------|
| `libc6-compat` + Alpine + Prisma PG engine | ⚠️ Needs live test | Prisma binary may need glibc compat on musl |
| `oven/bun:1-alpine` version pinning | ⚠️ Not pinned | Consider `oven/bun:1.3.14-alpine` for reproducibility |
| PostgreSQL startup before app | ✅ `depends_on` + healthcheck | Compose waits for PG ready |
| Redis startup before app | ✅ `depends_on` + healthcheck | Compose waits for Redis ready |
| Non-root user | ✅ `USER nextjs` (uid 1001) | Verified in Dockerfile |
| Secrets in image | ✅ None | All via `env_file` |

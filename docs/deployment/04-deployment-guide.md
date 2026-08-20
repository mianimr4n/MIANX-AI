# MIANX.AI — Deployment Guide

**Status:** Phase 14
**Date:** 2026-08-21

---

## Prerequisites

1. VPS with Ubuntu 24.04 LTS (2+ vCPU, 4+ GB RAM)
2. Managed PostgreSQL instance (connection string ready)
3. Domain name with DNS access
4. SSH access to VPS
5. Docker and Docker Compose installed on VPS

## Step 1: Server Setup

```bash
# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
# Log out and back in for group change

# Clone repository
cd /opt
sudo git clone https://github.com/mianimr4n/MIANX-AI.git mianx-ai
cd mianx-ai
sudo chown -R $USER:$USER .
```

## Step 2: Configure Environment

```bash
# Copy example env
cp .env.example .env.production

# Edit with real values
nano .env.production
```

Required values:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — Production URL
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `NODE_ENV=production`

## Step 3: Build and Deploy

```bash
# Build Docker image
docker compose -f docker-compose.production.yml build

# Run database migrations
docker compose -f docker-compose.production.yml run --rm app bunx prisma migrate deploy

# Start application
docker compose -f docker-compose.production.yml up -d
```

## Step 4: Verify Deployment

```bash
# Health check
curl -s http://localhost:3000/api/health | python3 -m json.tool

# Readiness check
curl -s http://localhost:3000/api/observability/health | python3 -m json.tool

# External check (after DNS propagates)
curl -s https://your-domain.com/api/health | python3 -m json.tool
```

## Step 5: Configure Caddy (TLS)

The `Caddyfile` is already configured. Ensure:

```bash
# Install Caddy
sudo apt install -y caddy

# Copy Caddyfile
sudo cp Caddyfile /etc/caddy/Caddyfile

# Replace :81 with your domain in Caddyfile
# Then reload
sudo systemctl reload caddy
```

Caddy automatically provisions TLS certificates from Let's Encrypt.

## Ongoing Maintenance

```bash
# Update application
cd /opt/mianx-ai
git pull origin main
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml run --rm app bunx prisma migrate deploy

# View logs
docker compose -f docker-compose.production.yml logs -f app

# Restart
docker compose -f docker-compose.production.yml restart app

# Database backup (via managed provider)
# Configure daily backups in your PostgreSQL provider's dashboard
```
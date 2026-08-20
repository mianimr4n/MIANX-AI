# ══════════════════════════════════════════════════════
# MIANX.AI — Production Dockerfile
# Phase 15: PostgreSQL target, Prisma migration support
# ══════════════════════════════════════════════════════

FROM oven/bun:1-alpine AS base

# ── Dependencies stage ─────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile

# ── Build stage ────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Dummy DATABASE_URL for prisma generate (never connects to DB)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build_db"

# Generate Prisma client (PostgreSQL) — no DB connection needed
RUN bun run db:generate
RUN bun run build

# ── Production runner stage ────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# OpenSSL runtime dependency for PostgreSQL (pg native TLS)
RUN apk add --no-cache libc6-compat openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output + public assets + Prisma schema (for migrate deploy)
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p .next/static
RUN chown -R nextjs:nodejs .next prisma

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["bun", "run", "start"]

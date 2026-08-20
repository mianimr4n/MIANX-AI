# MIANX.AI — Database Migration: SQLite to PostgreSQL

**Status:** Phase 14
**Date:** 2026-08-21
**Risk Level:** MEDIUM (one-time, before production launch)

---

## Current State

- **Provider:** SQLite (`file:./db/dev.db`)
- **Schema:** 51 models, 38 enums, 56 relations
- **Migration system:** `prisma db push` (no migration history)
- **Data:** Development/seed data only (no production data to migrate)

## Why Migrate

SQLite is excellent for development but unsuitable for production MIANX.AI because:

1. **No concurrent writes:** Multi-tenant SaaS has simultaneous requests from different organizations
2. **No connection pooling:** Each SQLite connection locks the database file
3. **No row-level security:** PostgreSQL RLS can add defense-in-depth for tenant isolation
4. **No managed backups:** No point-in-time recovery, WAL archiving, or replication
5. **No full-text search:** PostgreSQL has superior text search for AI conversations
6. **Health checks use raw SQL:** `SELECT 1` works on both, but PostgreSQL enables `pg_isready()`

## Schema Compatibility Assessment

| Check | Result |
-------|--------|
| SQLite-specific `@db.*` annotations | None found |
| `@default(autoincrement())` | None found |
| `@default(uuid())` | None found (all use `cuid()`) |
| `@db.Text` / `@db.UnsignedInt` | None found |
| Raw SQL queries | Only `SELECT 1` in health checks (PG-compatible) |
| Enum definitions | 38 enums (Prisma creates PostgreSQL ENUM types automatically) |
| Relation types | Standard Prisma relations (no raw foreign keys) |
| Model count | 51 models |

**Verdict:** The schema is 100% Prisma-abstracted with zero SQLite-specific features.
Migration requires only the provider change.

## Migration Steps

### Step 1: Provision PostgreSQL

```bash
# Example: Supabase free tier, Neon, Railway, or self-hosted
# You should have a PostgreSQL connection string like:
# postgresql://user:password@host:5432/mianx_prod?schema=public
```

### Step 2: Update Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This is the **only schema change required.** No model modifications.

### Step 3: Generate Prisma Client

```bash
bun run db:generate
```

### Step 4: Create Migration

```bash
bunx prisma migrate dev --name init_postgresql
```

This creates the initial PostgreSQL migration. Since there is no existing
PostgreSQL database with Prisma migration history, this is safe.

### Step 5: Verify

```bash
# Run typecheck to ensure Prisma client types are valid
bunx tsc --noEmit

# Run tests to verify queries work
bun test

# Run production build
NODE_ENV=production bun run build
```

### Step 6: Apply to Staging/Production

```bash
# On the production server
bunx prisma migrate deploy
```

### Step 7: Seed (if needed)

```bash
bun run scripts/database/seeds/seed.ts
```

## Rollback Strategy

1. **Code rollback:** `git revert` the provider change commit
2. **Database:** PostgreSQL data remains intact. Revert schema line and run `prisma db push`
3. **No data loss risk:** Since this is pre-launch, there is no production data to lose

## Risks

| Risk | Mitigation |
|------|-----------|
| Enum name conflicts | Prisma handles ENUM creation. All 38 are uniquely named. |
| CUID format differs | CUID is provider-agnostic. Same format on both databases. |
| Case sensitivity | PostgreSQL is case-sensitive for strings by default. Schema uses `@default("UTC")` and similar string defaults which work correctly. |
| Migration deployment | Use `prisma migrate deploy` (no interactive prompts) in CI/Docker. |

## Testing Checklist

- [ ] Provider changed to `postgresql`
- [ ] `bun run db:generate` succeeds
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun test` passes
- [ ] `NODE_ENV=production bun run build` passes
- [ ] Health endpoint returns `database.status: 'ok'`

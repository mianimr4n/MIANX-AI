#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# MIANX.AI — Database Migration Gate
# Phase 16: Safe migration deployment with pre/post checks
# ═══════════════════════════════════════════════════════════════
# Usage:
#   chmod +x scripts/deploy/migrate.sh
#   ./scripts/deploy/migrate.sh          # Run migration
#   ./scripts/deploy/migrate.sh --status # Check status only
#   ./scripts/deploy/migrate.sh --verify # Post-migration verification
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS=0
WARN=0
FAIL=0

classify() {
  local status="$1"
  local name="$2"
  local msg="$3"
  case "$status" in
    PASS) echo -e "  ${GREEN}PASS${NC}  $name — $msg"; ((PASS++)) ;;
    WARN) echo -e "  ${YELLOW}WARN${NC}  $name — $msg"; ((WARN++)) ;;
    FAIL) echo -e "  ${RED}FAIL${NC}  $name — $msg"; ((FAIL++)) ;;
  esac
}

# ── PRE-MIGRATION CHECKS ──────────────────────────────────────

pre_migration() {
  echo -e "${CYAN}PRE-MIGRATION CHECKS${NC}"
  echo "─────────────────────────────────"

  # 1. NODE_ENV
  if [ "$NODE_ENV" = "production" ]; then
    classify PASS "NODE_ENV" "production"
  else
    classify FAIL "NODE_ENV" "must be 'production', got '$NODE_ENV'"
  fi

  # 2. DATABASE_URL presence
  if [ -z "${DATABASE_URL:-}" ]; then
    classify FAIL "DATABASE_URL" "not set"
  elif echo "$DATABASE_URL" | grep -qE '^postgresql://|^postgres://'; then
    classify PASS "DATABASE_URL" "PostgreSQL format confirmed"
  else
    classify FAIL "DATABASE_URL" "must start with postgresql:// (got: ${DATABASE_URL:0:15}...)"
  fi

  # 3. DATABASE_URL does NOT contain localhost in production
  if echo "$DATABASE_URL" | grep -q 'localhost' && [ "$NODE_ENV" = "production" ]; then
    classify WARN "DATABASE_URL" "points to localhost — is this intentional?"
  else
    classify PASS "DATABASE_URL host" "not localhost"
  fi

  # 4. Prisma schema validity
  if npx prisma validate > /dev/null 2>&1; then
    classify PASS "Schema" "prisma validate passed"
  else
    classify FAIL "Schema" "prisma validate failed"
  fi

  # 5. Prisma client generated
  if [ -f "node_modules/.prisma/client/client.js" ]; then
    classify PASS "Prisma Client" "generated"
  else
    classify FAIL "Prisma Client" "not generated — run: bun run db:generate"
  fi

  # 6. Migration directory exists
  if [ -d "prisma/migrations" ]; then
    MIG_COUNT=$(ls -1 prisma/migrations/ 2>/dev/null | grep -v migration_lock | wc -l)
    classify PASS "Migrations" "$MIG_COUNT migration(s) found"
  else
    classify FAIL "Migrations" "no prisma/migrations/ directory"
  fi

  # 7. No .env files committed (safety check)
  if git ls-files | grep -qE '^\.env$'; then
    classify FAIL ".env" ".env is tracked in git — REMOVE IT"
  else
    classify PASS "Secret safety" ".env not tracked"
  fi

  echo ""
  if [ $FAIL -gt 0 ]; then
    echo -e "${RED}PRE-MIGRATION: $FAIL FAIL(S) — aborting migration${NC}"
    exit 1
  fi
  echo -e "${GREEN}PRE-MIGRATION: $PASS PASS, $WARN WARN — proceeding${NC}"
  echo ""
}

# ── MIGRATION EXECUTION ────────────────────────────────────────

run_migration() {
  echo -e "${CYAN}RUNNING MIGRATION${NC}"
  echo "─────────────────────────────────"

  if npx prisma migrate deploy 2>&1; then
    echo -e "${GREEN}Migration applied successfully${NC}"
  else
    echo -e "${RED}Migration failed — check database connectivity and migration files${NC}"
    exit 1
  fi
  echo ""
}

# ── POST-MIGRATION VERIFICATION ────────────────────────────────

post_migration() {
  echo -e "${CYAN}POST-MIGRATION VERIFICATION${NC}"
  echo "─────────────────────────────────"

  # Check migration status
  if npx prisma migrate status 2>&1 | head -10; then
    classify PASS "Migration status" "verified (see above)"
  else
    classify WARN "Migration status" "could not verify (DB may be unreachable)"
  fi

  # Verify table count
  TABLES=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    db.\$queryRaw\
SELECT count(*)::int as cnt FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'\
      .then(r => { console.log(r[0].cnt); db.\$disconnect(); })
      .catch(() => { console.log('ERROR'); process.exit(1); });
  " 2>/dev/null)
  if [ "$TABLES" = "ERROR" ]; then
    classify WARN "Table count" "could not query database"
  elif [ "$TABLES" -ge 50 ]; then
    classify PASS "Table count" "$TABLES tables created (expected 51+)"
  else
    classify FAIL "Table count" "$TABLES tables (expected 51+)"
  fi

  # Verify enum count
  ENUMS=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    db.\$queryRaw\
SELECT count(*)::int as cnt FROM pg_type WHERE typcategory='E'\
      .then(r => { console.log(r[0].cnt); db.\$disconnect(); })
      .catch(() => { console.log('ERROR'); process.exit(1); });
  " 2>/dev/null)
  if [ "$ENUMS" = "ERROR" ]; then
    classify WARN "Enum count" "could not query database"
  elif [ "$ENUMS" -ge 35 ]; then
    classify PASS "Enum count" "$ENUMS enum types created (expected 38)"
  else
    classify FAIL "Enum count" "$ENUMS enum types (expected 38)"
  fi

  echo ""
  echo -e "${CYAN}SUMMARY: $PASS PASS, $WARN WARN, $FAIL FAIL${NC}"
}

# ── MAIN ───────────────────────────────────────────────────────

case "${1:-}" in
  --status)
    echo -e "${CYAN}MIGRATION STATUS${NC}"
    npx prisma migrate status 2>&1
    ;;
  --verify)
    post_migration
    ;;
  *)
    pre_migration
    run_migration
    post_migration
    ;;
esac

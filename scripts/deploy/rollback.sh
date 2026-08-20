#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# MIANX.AI — Rollback Script
# Phase 16: Application and database rollback
# ═══════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/deploy/rollback.sh <COMMIT_HASH>
#   ./scripts/deploy/rollback.sh HEAD~1
#   ./scripts/deploy/rollback.sh --db-only          # DB rollback only
#   ./scripts/deploy/rollback.sh --app-only <HASH>  # App rollback only
# ═══════════════════════════════════════════════════════════════

set -uo pipefail

COMPOSE_FILE="docker-compose.production.yml"
MIGRATION_DIR="prisma/migrations"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# ── CRITICAL DISTINCTION ──────────────────────────────────────
# Application rollback: reverts code. Database schema stays.
# Database rollback:    reverts schema. Data may be lost.
# Full rollback:        both. Riskiest — only for disasters.
#
# IMPORTANT: Prisma migrations are NOT automatically reversible.
# Rolling back a migration may require manual SQL.
# ═══════════════════════════════════════════════════════════════

echo -e "${BOLD}MIANX.AI — Rollback${NC}"
echo ""

# ── MODE SELECTION ────────────────────────────────────────────

MODE="full"
COMMIT=""

case "${1:-}" in
  --db-only)
    MODE="db"
    ;;
  --app-only)
    MODE="app"
    COMMIT="${2:?Error: --app-only requires a commit hash}"
    ;;
  --help|-h)
    echo "Usage:"
    echo "  rollback.sh <COMMIT>        Full rollback (app + verify DB compat)"
    echo "  rollback.sh --app-only <C>  Application rollback only"
    echo "  rollback.sh --db-only       Database migration rollback (DANGEROUS)"
    exit 0
    ;;
  "")
    echo -e "${RED}Error: commit hash required${NC}"
    echo "Usage: rollback.sh <COMMIT_HASH>"
    exit 1
    ;;
  *)
    COMMIT="$1"
    ;;
esac

# ── APPLICATION ROLLBACK ──────────────────────────────────────

if [ "$MODE" = "full" ] || [ "$MODE" = "app" ]; then
  echo -e "${BOLD}[1] Application Rollback${NC}"
  echo "─────────────────────────────"

  if ! git rev-parse "$COMMIT" >/dev/null 2>&1; then
    echo -e "${RED}FAIL: Commit $COMMIT does not exist${NC}"
    exit 1
  fi

  CURRENT=$(git rev-parse --short HEAD)
  TARGET=$(git rev-parse --short "$COMMIT")

  echo "  Current: $CURRENT"
  echo "  Target:  $TARGET"

  # Check if target commit has a different Prisma provider
  if git show "$COMMIT:prisma/schema.prisma" 2>/dev/null | grep -q 'provider = "sqlite"'; then
    echo -e "${RED}WARNING: Target commit uses SQLite provider.${NC}"
    echo -e "${RED}This is INCOMPATIBLE with the current PostgreSQL database.${NC}"
    echo -e "${YELLOW}Rolling back to this version will break the application.${NC}"
    echo ""
    read -rp "  Proceed anyway? This will break the app. [y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      echo "  Aborted."
      exit 0
    fi
  fi

  echo ""
  read -rp "  Confirm application rollback to $TARGET? [y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "  Aborted."
    exit 0
  fi

  echo "  Checking out $TARGET..."
  git checkout "$COMMIT"

  echo "  Rebuilding Docker image..."
  docker compose -f "$COMPOSE_FILE" up -d --build 2>&1 || {
    echo -e "${RED}Docker build/start failed. Check Docker logs.${NC}"
    exit 1
  }

  echo "  Waiting for startup (30s)..."
  sleep 30

  echo "  Verifying health..."
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}PASS${NC}  Application rollback successful. Health check passed."
  else
    echo -e "  ${RED}FAIL${NC}  Health check failed. Check logs:"
    echo "        docker compose -f $COMPOSE_FILE logs --tail=50 app"
  fi
fi

# ── DATABASE MIGRATION ROLLBACK ────────────────────────────────

if [ "$MODE" = "full" ] || [ "$MODE" = "db" ]; then
  echo ""
  echo -e "${BOLD}[2] Database Migration Rollback${NC}"
  echo -e "${RED}  ⚠  DANGEROUS — may cause irreversible data loss${NC}"
  echo "─────────────────────────────"

  if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "  ${YELLOW}WARN${NC}  No migrations directory found. Nothing to rollback."
    exit 0
  fi

  APPLIED=$(npx prisma migrate status 2>&1 | rg -c 'Applied' || echo "0")
  echo "  Applied migrations: $APPLIED"

  echo ""
  echo -e "${RED}  DATABASE ROLLBACK OPTIONS:${NC}"
  echo "  1. prisma migrate resolve --rolled-back <migration_name>"
  echo "     (marks migration as rolled back WITHOUT running down SQL)"
  echo "  2. Manual: connect to DB and run reverse SQL"
  echo "  3. DROP AND RECREATE: pg_dump backup, dropdb, createdb, restore"
  echo ""
  echo -e "${YELLOW}  Recommendation: For MIANX.AI with no production data yet,${NC}"
  echo -e "${YELLOW}  the safest option is DROP AND RECREATE.${NC}"
  echo ""
  read -rp "  Type 'DANGEROUS' to proceed with interactive rollback: " confirm
  if [ "$confirm" != "DANGEROUS" ]; then
    echo "  Aborted."
    exit 0
  fi

  echo "  Opening interactive migration management..."
  npx prisma migrate status 2>&1 || true
  echo ""
  echo "  To mark a migration as rolled back:"
  echo "    npx prisma migrate resolve --rolled-back <migration_name>"
  echo ""
fi

echo -e "${BOLD}Rollback procedure complete.${NC}"

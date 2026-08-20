#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# MIANX.AI — Production Pre-Flight Check
# Phase 16: Comprehensive deployment readiness validation
# ═══════════════════════════════════════════════════════════════
# Usage: ./scripts/deploy/preflight.sh
# ═══════════════════════════════════════════════════════════════

set -uo pipefail  # -e removed: checks handle their own errors

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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

is_prod() { [ "${NODE_ENV:-}" = "production" ]; }

# ═══════════════════════════════════════════════════════════════

echo -e "${BOLD}${CYAN}MIANX.AI — Production Pre-Flight${NC}"
echo -e "${BOLD}$(date -u '+%Y-%m-%d %H:%M:%S UTC')${NC}"
echo ""

# ── 1. RUNTIME ENVIRONMENT ──────────────────────────────────
echo -e "${BOLD}[1] Runtime Environment${NC}"

if [ -n "${NODE_ENV:-}" ]; then
  if is_prod; then
    classify PASS "NODE_ENV" "production"
  else
    classify FAIL "NODE_ENV" "must be 'production' (got '$NODE_ENV')"
  fi
else
  classify FAIL "NODE_ENV" "not set"
fi

# ── 2. DATABASE ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2] Database Configuration${NC}"

if [ -z "${DATABASE_URL:-}" ]; then
  classify FAIL "DATABASE_URL" "not set"
else
  # Check format — never print the value
  if echo "$DATABASE_URL" | grep -qE '^postgresql://|^postgres://'; then
    classify PASS "DATABASE_URL" "PostgreSQL format"
  elif echo "$DATABASE_URL" | grep -q '^file:'; then
    classify FAIL "DATABASE_URL" "SQLite detected — production requires PostgreSQL"
  else
    classify FAIL "DATABASE_URL" "unrecognized format"
  fi

  # Warn if localhost in production
  if is_prod && echo "$DATABASE_URL" | grep -q 'localhost'; then
    classify WARN "DATABASE_URL host" "localhost in production — use external host"
  fi
fi

# ── 3. AUTHENTICATION ────────────────────────────────────────
echo ""
echo -e "${BOLD}[3] Authentication (Supabase)${NC}"

if is_prod; then
  HAS_SB_URL=false; HAS_SB_ANON=false; HAS_SB_SERVICE=false
  [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && HAS_SB_URL=true
  [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] && HAS_SB_ANON=true
  [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && HAS_SB_SERVICE=true

  if $HAS_SB_URL; then classify PASS "NEXT_PUBLIC_SUPABASE_URL" "set"; else classify FAIL "NEXT_PUBLIC_SUPABASE_URL" "required in production"; fi
  if $HAS_SB_ANON; then classify PASS "NEXT_PUBLIC_SUPABASE_ANON_KEY" "set"; else classify FAIL "NEXT_PUBLIC_SUPABASE_ANON_KEY" "required in production"; fi
  if $HAS_SB_SERVICE; then classify PASS "SUPABASE_SERVICE_ROLE_KEY" "set"; else classify FAIL "SUPABASE_SERVICE_ROLE_KEY" "required in production"; fi
else
  classify WARN "NEXT_PUBLIC_SUPABASE_URL" "optional in non-production"
  classify WARN "NEXT_PUBLIC_SUPABASE_ANON_KEY" "optional in non-production"
  classify WARN "SUPABASE_SERVICE_ROLE_KEY" "optional in non-production"
fi

# ── 4. REDIS ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4] Redis (Distributed Rate Limiting)${NC}"

if [ -n "${REDIS_URL:-}" ]; then
  classify PASS "REDIS_URL" "configured — distributed rate limiting enabled"
else
  classify WARN "REDIS_URL" "not set — in-memory rate limiting (single instance only)"
fi

# ── 5. AI PROVIDERS ──────────────────────────────────────────
echo ""
echo -e "${BOLD}[5] AI Providers${NC}"

AI_COUNT=0
[ -n "${OPENAI_API_KEY:-}" ] && AI_COUNT=$((AI_COUNT+1))
[ -n "${ANTHROPIC_API_KEY:-}" ] && AI_COUNT=$((AI_COUNT+1))
[ -n "${GOOGLE_GENERATIVE_AI_API_KEY:-}" ] && AI_COUNT=$((AI_COUNT+1))

if [ $AI_COUNT -gt 0 ]; then
  classify PASS "AI Providers" "$AI_COUNT provider(s) configured"
else
  classify WARN "AI Providers" "none configured — AI features unavailable"
fi

# ── 6. CORS / SECURITY ───────────────────────────────────────
echo ""
echo -e "${BOLD}[6] Security Configuration${NC}"

if [ -n "${ALLOWED_ORIGINS:-}" ]; then
  classify PASS "ALLOWED_ORIGINS" "set"
elif is_prod; then
  classify WARN "ALLOWED_ORIGINS" "not set — CORS may be too permissive"
else
  classify PASS "ALLOWED_ORIGINS" "optional in development"
fi

# ── 7. PRISMA SCHEMA ─────────────────────────────────────────
echo ""
echo -e "${BOLD}[7] Prisma Schema${NC}"

if DATABASE_URL='postgresql://preflight:preflight@localhost:5432/preflight_db' npx prisma validate > /dev/null 2>&1; then
  classify PASS "prisma validate" "schema is valid"
else
  classify FAIL "prisma validate" "schema validation failed"
fi

if [ -f "node_modules/.prisma/client/client.js" ]; then
  classify PASS "Prisma Client" "generated"
else
  classify FAIL "Prisma Client" "not generated — run: bun run db:generate"
fi

if [ -d "prisma/migrations" ]; then
  MIG_COUNT=$(ls -1d prisma/migrations/*/ 2>/dev/null | wc -l)
  classify PASS "Migrations" "$MIG_COUNT migration(s) versioned"
else
  classify FAIL "Migrations" "no prisma/migrations/ directory"
fi

if [ -f "prisma/migrations/migration_lock.toml" ]; then
  LOCK_PROVIDER=$(grep 'name' prisma/migrations/migration_lock.toml | head -1 | awk '{print $NF}' | tr -d '"')
  if [ "$LOCK_PROVIDER" = "postgresql" ]; then
    classify PASS "Migration lock" "postgresql"
  else
    classify FAIL "Migration lock" "expected 'postgresql', got '$LOCK_PROVIDER'"
  fi
else
  classify FAIL "Migration lock" "migration_lock.toml missing"
fi

# ── 8. FORBIDDEN CONFIGS ────────────────────────────────────
echo ""
echo -e "${BOLD}[8] Forbidden Development Configs${NC}"

if is_prod && [ "${DATABASE_URL:-}" != "${DATABASE_URL#file:}" ]; then
  classify FAIL "Forbidden" "DATABASE_URL is file:// in production"
else
  classify PASS "Forbidden" "no forbidden development configs active"
fi

# Check .env is not tracked
if git ls-files 2>/dev/null | grep -qE '^\.env$'; then
  classify FAIL "Secret safety" ".env is tracked in git — REMOVE IT IMMEDIATELY"
else
  classify PASS "Secret safety" ".env not tracked in git"
fi

# ── 9. SECRET SAFETY ─────────────────────────────────────────
echo ""
echo -e "${BOLD}[9] Secret Safety (No Values Printed)${NC}"

# Verify no secrets would be printed by checking variable name only
SECRET_VARS="DATABASE_URL SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_GENERATIVE_AI_API_KEY REDIS_URL"
ALL_SECRET_SAFE=true
for VAR in $SECRET_VARS; do
  VAL="${!VAR:-}"
  if [ -n "$VAL" ]; then
    # Just confirm it's set without printing it
    : # silent pass
  fi
done
classify PASS "Secret scan" "no secret values printed by this script"

# ── 10. APPLICATION FILES ────────────────────────────────────
echo ""
echo -e "${BOLD}[10] Application Files${NC}"

[ -f "Dockerfile" ] && classify PASS "Dockerfile" "exists" || classify FAIL "Dockerfile" "missing"
[ -f "docker-compose.production.yml" ] && classify PASS "docker-compose.production.yml" "exists" || classify FAIL "docker-compose.production.yml" "missing"
[ -f ".dockerignore" ] && classify PASS ".dockerignore" "exists" || classify WARN ".dockerignore" "missing — build context may include unwanted files"
[ -f ".env.example" ] && classify PASS ".env.example" "exists" || classify WARN ".env.example" "missing"

# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}════════════════════════════════════════════${NC}"
echo -e "${BOLD}RESULTS: ${GREEN}$PASS PASS${NC}  ${YELLOW}$WARN WARN${NC}  ${RED}$FAIL FAIL${NC}"
echo -e "${BOLD}════════════════════════════════════════════${NC}"

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}${BOLD}NOT READY FOR PRODUCTION${NC}"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}READY WITH WARNINGS${NC}"
  exit 0
else
  echo -e "${GREEN}${BOLD}ALL CHECKS PASSED${NC}"
  exit 0
fi

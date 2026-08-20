#!/usr/bin/env bash
# MIANX.AI — Health Verification Script
# Phase 14: Verify all health endpoints after deployment
#
# Usage: ./scripts/deploy/verify-health.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0

check() {
  local name="$1" url="$2" expected="$3"
  local response status body

  printf "  %-40s " "$name"

  response=$(curl -sf -w '\n%{http_code}' "$url" 2>/dev/null) || true
  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "" ]; then
    echo "FAIL (unreachable)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$status" -ne 200 ]; then
    echo "FAIL (HTTP $status)"
    FAIL=$((FAIL + 1))
    return
  fi

  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$expected' in str(d), f'missing: $expected'" 2>/dev/null; then
    echo "PASS"
    PASS=$((PASS + 1))
  else
    echo "WARN (unexpected body)"
    WARN=$((WARN + 1))
  fi
}

echo "MIANX.AI Health Verification"
echo "Target: $BASE_URL"
echo "Time: $(date -Iseconds)"
echo ""

check "Basic health" "$BASE_URL/api/health" "healthy"
check "Readiness check" "$BASE_URL/api/observability/health" "healthy"
check "Liveness check" "$BASE_URL/api/observability/health?type=liveness" "alive"

echo ""
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
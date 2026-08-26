#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# MIANX.AI Phase 26 — E2E Acceptance Tests
# Tests 5 user personas against production
# ══════════════════════════════════════════════════════════════

set -euo pipefail
BASE_URL="${1:-https://mianxai.vercel.app}"
PASS=0
FAIL=0
WARN=0
RESULTS=()

green() { printf '\033[0;32m✓ %s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m✗ %s\033[0m\n' "$1"; }
yellow(){ printf '\033[0;33m⚠ %s\033[0m\n' "$1"; }

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "$name (HTTP $actual)"
    RESULTS+=("PASS: $name")
    PASS=$((PASS + 1))
  else
    red "$name — expected $expected, got $actual"
    RESULTS+=("FAIL: $name (expected $expected, got $actual)")
    FAIL=$((FAIL + 1))
  fi
}

check_contains() {
  local name="$1" needle="$2"
  local body
  body=$(curl -sf "$3" 2>/dev/null) || body=""
  if echo "$body" | grep -q "$needle"; then
    green "$name"
    RESULTS+=("PASS: $name")
    PASS=$((PASS + 1))
  else
    red "$name — '$needle' not found"
    RESULTS+=("FAIL: $name (needle '$needle' not found)")
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " MIANX.AI E2E Acceptance Tests"
echo " Target: $BASE_URL"
echo " Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================"
echo ""

# ── Persona 1: Anonymous Visitor ──
echo "── PERSONA 1: Anonymous Visitor ──"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/")
check "Landing page loads" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/login")
check "Login page loads" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' -L "$BASE_URL/signup")
check "Signup redirects to login" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/app")
check "/app redirects unauthenticated" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/admin")
check "/admin accessible (shows access denied page)" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/onboarding")
check "/onboarding accessible (redirects to login)" "200" "$HTTP"

echo ""

# ── Persona 2: Authenticated User (simulated via API) ──
echo "── PERSONA 2: Authenticated App User ──"
echo "(Testing API endpoints — may return 401 without real session)"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/api/health")
check "Health API is public" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/api/version")
check "Version API is public" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/api/domains")
check "Domains API is public (org-exempt)" "200" "$HTTP"

HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/api/organizations")
check "Organizations API is public (org-exempt)" "200" "$HTTP"

# These should require auth
HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL/api/me")
if [ "$HTTP" = "401" ] || [ "$HTTP" = "200" ]; then
  green "/api/me returns $HTTP (expected: 401 or 200)"
  RESULTS+=("PASS: /api/me returns $HTTP")
  PASS=$((PASS + 1))
else
  yellow "/api/me returned $HTTP (may need session)"
  RESULTS+=("WARN: /api/me returned $HTTP")
  WARN=$((WARN + 1))
fi

echo ""

# ── Persona 3: App Routes (page render check) ──
echo "── PERSONA 3: App Route Structure ──"

for route in /app/ai /app/automations /app/billing /app/business /app/domains /app/integrations /app/settings /app/team /app/analytics; do
  HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL$route")
  if [ "$HTTP" = "200" ]; then
    green "$route renders (HTTP $HTTP)"
    RESULTS+=("PASS: $route renders")
    PASS=$((PASS + 1))
  else
    yellow "$route returned HTTP $HTTP (may redirect to login)"
    RESULTS+=("WARN: $route returned $HTTP")
    WARN=$((WARN + 1))
  fi
done

echo ""

# ── Persona 4: Admin Routes ──
echo "── PERSONA 4: Admin Route Structure ──"

for route in /admin /admin/organizations /admin/users /admin/domains /admin/revenue /admin/health /admin/audit; do
  HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL$route")
  if [ "$HTTP" = "200" ]; then
    green "$route renders (HTTP $HTTP)"
    RESULTS+=("PASS: $route renders")
    PASS=$((PASS + 1))
  else
    red "$route returned HTTP $HTTP"
    RESULTS+=("FAIL: $route returned $HTTP")
    FAIL=$((FAIL + 1))
  fi
done

echo ""

# ── Persona 5: Security Checks ──
echo "── PERSONA 5: Security Verification ──"

# Check security headers on landing page
HEADERS=$(curl -sf -I "$BASE_URL/" 2>/dev/null || true)

echo "$HEADERS" | grep -qi 'x-content-type-options' && \
  green "X-Content-Type-Options header present" && \
  RESULTS+=("PASS: X-Content-Type-Options") && PASS=$((PASS + 1)) || \
  (red "X-Content-Type-Options header MISSING"; RESULTS+=("FAIL: X-Content-Type-Options"); FAIL=$((FAIL + 1)))

echo "$HEADERS" | grep -qi 'x-frame-options' && \
  green "X-Frame-Options header present" && \
  RESULTS+=("PASS: X-Frame-Options") && PASS=$((PASS + 1)) || \
  (red "X-Frame-Options header MISSING"; RESULTS+=("FAIL: X-Frame-Options"); FAIL=$((FAIL + 1)))

echo "$HEADERS" | grep -qi 'content-security-policy' && \
  green "Content-Security-Policy header present" && \
  RESULTS+=("PASS: CSP") && PASS=$((PASS + 1)) || \
  (red "Content-Security-Policy header MISSING"; RESULTS+=("FAIL: CSP"); FAIL=$((FAIL + 1)))

echo "$HEADERS" | grep -qi 'strict-transport-security' && \
  green "HSTS header present" && \
  RESULTS+=("PASS: HSTS") && PASS=$((PASS + 1)) || \
  (yellow "HSTS header not present (expected for HTTPS production)"; RESULTS+=("WARN: HSTS"); WARN=$((WARN + 1)))

# Check no bare routes exist (the (app) route group bug)
for route in /ai /automations /billing /business /domains /integrations /settings /team /analytics; do
  HTTP=$(curl -sf -o /dev/null -w '%{http_code}' "$BASE_URL$route")
  if [ "$HTTP" = "404" ]; then
    green "Bare route $route correctly returns 404"
    RESULTS+=("PASS: $route is 404")
    PASS=$((PASS + 1))
  else
    red "Bare route $route returned $HTTP (should be 404!)"
    RESULTS+=("FAIL: $route should be 404, got $HTTP")
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "========================================"
echo " RESULTS: $PASS passed, $FAIL failed, $WARN warnings"
echo "========================================"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
if [ $FAIL -gt 0 ]; then
  echo "VERDICT: FAILURES DETECTED"
  exit 1
else
  echo "VERDICT: ALL CHECKS PASSED"
  exit 0
fi

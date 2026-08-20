#!/usr/bin/env bash
# MIANX.AI — Rollback Script
# Phase 14: Rollback to a specific commit
#
# Usage:
#   ./scripts/deploy/rollback.sh <COMMIT_HASH>
#   ./scripts/deploy/rollback.sh HEAD~1
#
# This script:
# 1. Verifies the target commit exists
# 2. Checks out the commit
# 3. Rebuilds the Docker image
# 4. Restarts the application
# 5. Runs health verification

set -euo pipefail

COMMIT="${1:?Usage: rollback.sh <COMMIT_HASH>}"
COMPOSE_FILE="docker-compose.production.yml"

# Verify commit exists
if ! git rev-parse "$COMMIT" >/dev/null 2>&1; then
  echo "ERROR: Commit $COMMIT does not exist"
  exit 1
fi

CURRENT=$(git rev-parse --short HEAD)
TARGET=$(git rev-parse --short "$COMMIT")

echo "MIANX.AI Rollback"
echo "Current: $CURRENT"
echo "Target:  $TARGET"
echo ""

read -rp "Confirm rollback to $TARGET? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo "Checking out $TARGET..."
git checkout "$COMMIT"

echo "Rebuilding..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for startup (15s)..."
sleep 15

echo "Verifying health..."
if curl -sf http://localhost:3000/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['status']=='healthy'"; then
  echo "Rollback successful. Application is healthy."
else
  echo "WARNING: Health check failed after rollback. Check logs:"
  echo "  docker compose -f $COMPOSE_FILE logs --tail=50 app"
fi

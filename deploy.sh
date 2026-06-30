#!/usr/bin/env bash
# scripts/deploy.sh
#
# Runs on the VPS via `appleboy/ssh-action` on every push to main that passes
# CI. Assumes the working directory is the repo root (set by the Action's
# `cd ${{ secrets.DEPLOY_PATH }}` step).
#
# Steps:
#   1. Pull latest main (hard reset — no local drift)
#   2. Rebuild the app image (layer cache keeps this fast unless deps changed)
#   3. Run DB migrations in a one-off container
#   4. Recreate only changed containers (Postgres & Caddy are left alone)
#   5. Prune dangling images so disk usage stays bounded

set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> [1/5] Fetching latest main..."
git fetch origin main
git reset --hard origin/main

echo "==> [2/5] Building app image..."
$COMPOSE build app

echo "==> [3/5] Running database migrations..."
$COMPOSE --profile tools run --rm migrate

echo "==> [4/5] Starting / recreating containers..."
$COMPOSE up -d --remove-orphans

echo "==> [5/5] Pruning dangling images..."
docker image prune -f

echo ""
echo "Deploy complete. App status:"
$COMPOSE ps app
#!/usr/bin/env bash
#
# Blue-green cutover for 2anki.net — zero-downtime deploys without dropping
# in-flight requests. See Documentation/deploy/blue-green.md for the rollout
# plan, the manual Apache setup this pairs with, and the first-run bootstrap.
#
# This script is NOT wired into the automated deploy yet. Run it manually for
# the dry-run and staged prod validation described in the doc. It assumes the
# repo is already built (`pnpm build`) and GIT_SHA is exported.
#
# Set DRY_RUN=1 to print every privileged/destructive action instead of running
# it (used for the local docker / staging dry-run).
set -euo pipefail

SERVER_DIR="${SERVER_DIR:-$HOME/src/github.com/2anki/2anki.net}"
STATE_FILE="${DEPLOY_COLOR_FILE:-$HOME/.deploy_color}"
UPSTREAM_CONF="${UPSTREAM_CONF:-/etc/apache2/conf-2anki-upstream.conf}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-$HOME/.2anki-deploy.lock}"
ECOSYSTEM="${ECOSYSTEM:-$SERVER_DIR/ecosystem.blue-green.config.js}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-https://2anki.net/api/version}"
HEALTH_PATH="/api/version"
DRY_RUN="${DRY_RUN:-0}"

: "${GIT_SHA:?GIT_SHA must be exported to the sha being deployed}"

log() { echo "[blue-green] $*" >&2; }
run() {
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN: $*"
  else
    "$@"
  fi
}

wait_for_sha() {
  local url="$1" actual
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN: skip health check $url"
    return 0
  fi
  for _ in $(seq 1 15); do
    actual="$(curl -fsS "$url" 2>/dev/null | jq -r '.sha // empty' 2>/dev/null || echo '')"
    if [ "$actual" = "$GIT_SHA" ]; then
      log "healthy: $url (sha=$actual)"
      return 0
    fi
    sleep 2
  done
  return 1
}

# Serialize against a concurrent deploy. To also serialize against the certbot
# renewal hook's Apache reload, point both at a shared root-writable lock path
# via DEPLOY_LOCK_FILE (see the doc).
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "another deploy holds $LOCK_FILE — aborting"
    exit 1
  fi
else
  log "flock unavailable — skipping deploy lock (ok for dry-run; prod has util-linux)"
fi

CURRENT="$(cat "$STATE_FILE" 2>/dev/null || echo blue)"
if [ "$CURRENT" = "blue" ]; then
  NEXT=green
  NEXT_PORT=3001
else
  NEXT=blue
  NEXT_PORT=3000
fi
log "current=$CURRENT next=$NEXT port=$NEXT_PORT sha=$GIT_SHA"

cd "$SERVER_DIR"
export GIT_SHA

# Bring up the next color; pm2 keeps the current color serving on its port.
run pm2 start "$ECOSYSTEM" --only "server-$NEXT" --update-env

if ! wait_for_sha "http://127.0.0.1:$NEXT_PORT$HEALTH_PATH"; then
  log "server-$NEXT failed health check on :$NEXT_PORT — removing it; current color still live"
  run pm2 delete "server-$NEXT"
  exit 1
fi

# Atomically swap Apache's upstream. The temp file lives in the target's own
# directory so the mv is a same-filesystem rename — no half-written include can
# be read mid-swap.
PREV_CONF="$(cat "$UPSTREAM_CONF" 2>/dev/null || echo '')"
NEW_CONF="${UPSTREAM_CONF}.new"
printf 'ProxyPass / http://127.0.0.1:%s/\nProxyPassReverse / http://127.0.0.1:%s/\n' \
  "$NEXT_PORT" "$NEXT_PORT" | run sudo tee "$NEW_CONF" >/dev/null
run sudo mv "$NEW_CONF" "$UPSTREAM_CONF"
run sudo apachectl graceful

# Verify the swap took effect through Apache before retiring the old color.
if ! wait_for_sha "$PUBLIC_HEALTH_URL"; then
  log "post-swap check failed at $PUBLIC_HEALTH_URL — rolling back Apache"
  if [ -n "$PREV_CONF" ]; then
    printf '%s\n' "$PREV_CONF" | run sudo tee "$UPSTREAM_CONF" >/dev/null
    run sudo apachectl graceful
  else
    log "no previous upstream captured — check Apache config manually"
  fi
  run pm2 delete "server-$NEXT"
  exit 1
fi

# New color is live and verified. Drain the old color via SIGINT -> the
# graceful-shutdown handler (bounded by kill_timeout), then remove it. A missing
# old color (first-run bootstrap leaves it named "server") is not fatal here.
run pm2 stop "server-$CURRENT" || log "could not stop server-$CURRENT (already gone?)"
run pm2 delete "server-$CURRENT" || log "could not delete server-$CURRENT (already gone?)"
run pm2 save

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN: would record live color as $NEXT in $STATE_FILE"
else
  echo "$NEXT" > "$STATE_FILE"
fi
log "deploy complete — live color is $NEXT on :$NEXT_PORT"

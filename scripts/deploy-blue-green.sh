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
WS_UPSTREAM_CONF="${WS_UPSTREAM_CONF:-/etc/apache2/conf-2anki-ws-upstream.conf}"
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

# Rewrite both Apache upstream includes to point at $1 (a port). The HTTP include
# is shared by every app vhost; the WebSocket include is referenced only by the
# live :443 vhost (Ankify /v/* proxy). Each temp file lives in the target's own
# directory so the mv is a same-filesystem rename — no half-written include is
# ever read. The caller runs `apachectl graceful` once afterwards so both apply
# together.
swap_upstreams() {
  local port="$1"
  printf 'ProxyPass / http://127.0.0.1:%s/\nProxyPassReverse / http://127.0.0.1:%s/\n' \
    "$port" "$port" | run sudo tee "${UPSTREAM_CONF}.new" >/dev/null
  run sudo mv "${UPSTREAM_CONF}.new" "$UPSTREAM_CONF"
  printf 'RewriteEngine on\nRewriteCond %%{HTTP:Upgrade} =websocket [NC]\nRewriteRule ^/v/(.*)$ ws://127.0.0.1:%s/v/$1 [P,L]\n' \
    "$port" | run sudo tee "${WS_UPSTREAM_CONF}.new" >/dev/null
  run sudo mv "${WS_UPSTREAM_CONF}.new" "$WS_UPSTREAM_CONF"
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
  CURRENT_PORT=3000
else
  NEXT=blue
  NEXT_PORT=3000
  CURRENT_PORT=3001
fi
log "current=$CURRENT (:$CURRENT_PORT) next=$NEXT (:$NEXT_PORT) sha=$GIT_SHA"

cd "$SERVER_DIR"
export GIT_SHA

# Bring up the next color; pm2 keeps the current color serving on its port.
run pm2 start "$ECOSYSTEM" --only "server-$NEXT" --update-env

if ! wait_for_sha "http://127.0.0.1:$NEXT_PORT$HEALTH_PATH"; then
  log "server-$NEXT failed health check on :$NEXT_PORT — removing it; current color still live"
  run pm2 delete "server-$NEXT"
  exit 1
fi

# Swap both Apache upstreams (HTTP + WebSocket) to the new color, then one
# graceful reload applies them together.
swap_upstreams "$NEXT_PORT"
run sudo apachectl graceful

# Verify the swap took effect through Apache before retiring the old color.
if ! wait_for_sha "$PUBLIC_HEALTH_URL"; then
  log "post-swap check failed at $PUBLIC_HEALTH_URL — rolling back to :$CURRENT_PORT"
  swap_upstreams "$CURRENT_PORT"
  run sudo apachectl graceful
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

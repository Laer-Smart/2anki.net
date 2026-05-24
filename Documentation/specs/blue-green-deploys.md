# Zero-downtime deploys via Apache blue-green

## Why now

Every deploy today drops in-flight requests. PR #2734 (the graceful-shutdown handler) closes connections cleanly within ~20s, but it doesn't eliminate the 5–10s cold-start gap when the new instance boots — Apache → `:3000` has nobody to talk to during that window and returns 502. At ~30 deploys/day, that's ~30 user-facing disruption windows per day.

The cluster-mode alternative is on the table but it costs more than the win is worth (see [Why not pm2 cluster mode](#why-not-pm2-cluster-mode)).

## Goal

A deploy completes with zero 502s and zero dropped in-flight requests, measured against the live instance from outside the box (curl loop). Application code stays unchanged — this is purely an infra change.

## Out of scope

- pm2 cluster mode (the audit captured why — see memory `project-cluster-mode-audit`)
- Changes to `src/lib/**` schedulers, the conversion pool, or the WebSocket session proxy
- A new process manager (systemd, supervisord, k8s) — pm2 stays
- Multi-host deploys — single Hetzner box for now
- Health-check observability dashboards — out of scope, separate work
- Migrating to a new Apache replacement (Caddy, Nginx) — Apache stays

## Solution sketch

Two pm2 apps on different ports, Apache routes to whichever is currently "live", deploy script flips the routing and gracefully reloads Apache.

### Files we touch

| File | Change |
|---|---|
| `ecosystem.config.js` | Define two apps: `server-blue` (`PORT=3000`) and `server-green` (`PORT=3001`). Same script, same env. Only one runs at a time. |
| `.github/workflows/deploy.2anki.net.yml` | Replace the single `pm2 startOrRestart` step with the blue-green deploy script described below. |
| `/etc/apache2/sites-available/2anki.net.conf` *(prod, manual change)* | Replace the static `ProxyPass http://127.0.0.1:3000/` with `Include /etc/apache2/conf-2anki-upstream.conf`. |
| `/etc/apache2/conf-2anki-upstream.conf` *(prod, generated)* | One-line include file containing the current upstream port. Owned by the deploy script. |
| `~/.deploy_color` *(prod, state file)* | `blue` or `green` — which color is currently live. |

### Deploy script (pseudocode)

```bash
CURRENT=$(cat ~/.deploy_color || echo blue)
NEXT=$([ "$CURRENT" = "blue" ] && echo green || echo blue)
NEXT_PORT=$([ "$NEXT" = "blue" ] && echo 3000 || echo 3001)

# Start the next color (pm2 keeps the current color running)
pm2 start ecosystem.config.js --only "server-$NEXT" --update-env

# Health-check the next color directly on its port
for i in $(seq 1 15); do
  ACTUAL=$(curl -fsS "http://127.0.0.1:$NEXT_PORT/api/version" | jq -r .sha)
  [ "$ACTUAL" = "$GIT_SHA" ] && break
  sleep 2
done
[ "$ACTUAL" = "$GIT_SHA" ] || { pm2 delete "server-$NEXT"; exit 1; }

# Atomically swap Apache's upstream
echo "ProxyPass / http://127.0.0.1:$NEXT_PORT/" > /tmp/upstream.conf.new
sudo mv /tmp/upstream.conf.new /etc/apache2/conf-2anki-upstream.conf
sudo apachectl graceful

# Tell pm2 to drain the previous color via SIGINT → our handler runs
pm2 stop "server-$CURRENT"   # waits for graceful-shutdown to finish
pm2 delete "server-$CURRENT"

echo "$NEXT" > ~/.deploy_color
```

### Apache include file

`/etc/apache2/conf-2anki-upstream.conf` is a one-line file:

```
ProxyPass / http://127.0.0.1:3000/
```

The deploy script rewrites this and runs `apachectl graceful`. Apache's graceful reload starts new children with the new config; existing children finish their in-flight requests on the old config, then exit. No request is dropped at the Apache layer.

## Failure modes and mitigation

| Failure | Mitigation |
|---|---|
| New color fails health check (build broke, env missing, port collision) | `pm2 delete "server-$NEXT"`; current color keeps serving; deploy step fails, GH Actions surfaces it. |
| `apachectl graceful` itself fails (config error) | Health-check the swap before declaring success: `curl -fsS https://2anki.net/api/version` from inside the box, expect new SHA. Roll back the include file if it doesn't. |
| `certbot.timer` reloads Apache mid-deploy and reads a half-written include | `mv` from `/tmp/upstream.conf.new` is atomic on the same filesystem. A `flock /var/run/2anki-deploy.lock -- ...` around both deploy and cert-renewal-hook makes the rare race impossible. |
| Old color hangs on graceful shutdown past the 25s `SHUTDOWN_TIMEOUT_MS` | New graceful-shutdown handler already `process.exit(1)`s as a fallback. Deploy script's `pm2 delete` will succeed regardless. |
| Both colors alive at the same time | Brief overlap (~30s during deploy) is the whole point. Memory peaks at ~600 MB total — box has 16 GB headroom. No singleton scheduler issue because Apache only routes to one color at a time. Background work (re-engagement, polling) running on both colors briefly = same as cluster mode, but only for ~30s/deploy ≈ <1% of the day. For 24h-cadence schedulers (re-engagement, inactivity) the overlap window is negligible relative to the schedule. |
| Deploy state file (`~/.deploy_color`) gets out of sync with reality | Health check inside the script verifies the live SHA matches `GIT_SHA` post-swap. If it doesn't, treat as deploy failure. |

## What this does not solve

- The 24h-cadence schedulers (re-engagement, inactivity) still run inside the live pm2 process. If that process dies between deploys, schedulers stop until restart. Same as today.
- Migration-running on startup still gates new-color readiness. Long migrations extend the window where two colors are alive. Not a new problem; just preserved.
- Ankify polling continues to fire from both colors during the overlap. With current `0` Ankify subscriptions (see memory `project-ankify-usage-data`), this is a non-issue. Worth revisiting if Ankify usage grows.

## Why not pm2 cluster mode

The audit found 5 in-process schedulers that double-fire under cluster mode: re-engagement emails, inactivity warnings, parser canary, Ankify polling, cleanup jobs. Two of those (re-engagement, inactivity) would send duplicate emails to real users. Mitigations exist (`NODE_APP_INSTANCE === '0'` gates, advisory locks) but every new scheduler someone adds becomes a footgun: forget the gate, double-send. The `src/lib/ankify/FEATURE.md` comment ("singleton scheduler; survives one process lifetime") makes the codebase's contract explicit. Cluster mode also requires sticky-session config on the WebSocket session proxy (`src/routes/AnkifySessionProxyRouter.ts`). And the CPU-utilisation win cluster mode buys us is moot — `pm2 describe` shows 0% CPU at 0.12 req/min on the API path.

Blue-green is a pure infra change with no application code touched, no scheduler gates to remember, no sticky-session config. The codebase's "one process per host" assumption stays intact.

## Open questions

- **Order of operations on the swap**: should we wait for the old color to fully drain *before* declaring deploy success, or fire-and-forget after Apache reload? Trade-off is deploy duration vs. "is the old code really gone." Lean toward synchronous waiting since the graceful-shutdown handler is bounded at 25s.
- **What happens if a SIGTERM hits the deploy script mid-flight** (rare but: SSH disconnect, GH Actions cancel)? Need to think about idempotency. Probably safest: a lock file plus a "resume from last consistent state" mode. Could also just accept manual cleanup as the failure mode for now.
- **Should `~/.deploy_color` be auto-detected from `pm2 list` instead of a state file?** Avoids drift risk. Cost is parsing pm2's output. Lean toward state file for simplicity.

## Verification plan

1. Local dry-run: run the deploy script against a staging box (or a local docker container running pm2 + apache) and confirm zero 502s during the swap from a parallel `curl` loop.
2. First prod run: deploy a no-op commit during low-traffic hours. Watch the curl loop from outside the box. Expect 100% 200 responses through the swap.
3. After 3 successful prod deploys, this can replace the existing single-color deploy step in `deploy.2anki.net.yml`.

## Related context

- Memory: `project-cluster-mode-audit` (why not cluster mode)
- Memory: `project-ankify-usage-data` (why the Ankify polling overlap doesn't matter)
- PR #2734: the graceful-shutdown handler this spec depends on

# Blue-green deploys

Zero-downtime cutover for 2anki.net: two pm2 apps on two ports, Apache routes to
whichever is live, the deploy script flips the route and gracefully reloads
Apache. No application code is involved. Full rationale (and why not pm2 cluster
mode) is in the original spec — recover it with
`git log -p -- Documentation/specs/blue-green-deploys.md`.

**Status: not wired into the automated deploy.** The live
`.github/workflows/deploy.2anki.net.yml` still runs the single-color
`pm2 startOrRestart ecosystem.config.js`. This page covers the manual validation
that has to happen first. Flipping the workflow is a later PR — see
[Rollout](#rollout).

## Pieces

| Piece | Where | Owner |
|---|---|---|
| `ecosystem.blue-green.config.js` | repo | two apps: `server-blue` (`PORT=3000`), `server-green` (`PORT=3001`) |
| `scripts/deploy-blue-green.sh` | repo | the cutover: start next color → health-check → swap Apache → drain old color |
| `/etc/apache2/conf-2anki-upstream.conf` | prod, generated | one upstream block; rewritten by the script each deploy |
| `2anki.net.conf` site config | prod, manual one-time edit | `Include`s the upstream file instead of a static `ProxyPass` |
| `~/.deploy_color` | prod, state | `blue` or `green` — the currently live color |

`server-green` binds 3001 even though prod's `.env` sets `PORT=3000`: pm2 injects
`PORT=3001` into the environment, and `dotenv.config()` runs with `override:
false`, so the pm2 value wins. Confirmed against prod.

## One-time Apache setup

In the prod site config (`/etc/apache2/sites-available/2anki.net.conf`), replace
the static upstream:

```apache
# before
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/

# after
Include /etc/apache2/conf-2anki-upstream.conf
```

Seed the include file to point at the current live port (3000) so Apache has a
valid config before the first script run:

```bash
printf 'ProxyPass / http://127.0.0.1:3000/\nProxyPassReverse / http://127.0.0.1:3000/\n' \
  | sudo tee /etc/apache2/conf-2anki-upstream.conf
sudo apachectl configtest && sudo apachectl graceful
```

The deploy user needs passwordless sudo for `tee`, `mv`, and `apachectl` on these
paths (it already reloads Apache today).

## First cutover (bootstrap)

The live app is currently a single pm2 process named `server` on 3000. The
script alternates `server-blue` / `server-green`, so the first cutover retires
`server` by hand. Run from `~/src/github.com/2anki/2anki.net` after a normal
build, with `GIT_SHA` exported to the deployed sha:

```bash
# 1. Start green on the free port (3000 is still taken by `server`).
pm2 start ecosystem.blue-green.config.js --only server-green --update-env

# 2. Confirm green reports the right sha.
curl -fsS http://127.0.0.1:3001/api/version | jq .sha   # expect $GIT_SHA

# 3. Point Apache at green and reload.
printf 'ProxyPass / http://127.0.0.1:3001/\nProxyPassReverse / http://127.0.0.1:3001/\n' \
  | sudo tee /etc/apache2/conf-2anki-upstream.conf
sudo apachectl graceful
curl -fsS https://2anki.net/api/version | jq .sha        # expect $GIT_SHA

# 4. Retire the old single-color app and record state.
pm2 stop server && pm2 delete server && pm2 save
echo green > ~/.deploy_color
```

From here, every deploy is just `GIT_SHA=<sha> scripts/deploy-blue-green.sh`,
which alternates colors automatically.

## Steady-state run

```bash
cd ~/src/github.com/2anki/2anki.net
export GIT_SHA=<the sha you just built>
scripts/deploy-blue-green.sh
```

What it does: reads `~/.deploy_color`, starts the other color, waits up to 30s
for its `/api/version` to report `GIT_SHA`, atomically swaps the Apache include,
`apachectl graceful`, verifies `https://2anki.net/api/version` reports the new
sha, then drains and deletes the old color (SIGINT → the graceful-shutdown
handler, bounded by `kill_timeout`), and writes the new color to `~/.deploy_color`.

If the new color fails its health check, the script deletes it and exits non-zero
— the current color never stopped serving. If the post-swap public check fails,
it rolls the Apache include back to the previous upstream and reloads before
exiting.

## Dry-run

`DRY_RUN=1` prints every privileged or destructive action instead of running it,
and skips the health-check waits. Safe to run anywhere:

```bash
DRY_RUN=1 GIT_SHA=test scripts/deploy-blue-green.sh
```

For a real cutover against a non-prod box, override the paths:

```bash
SERVER_DIR=/path/to/checkout \
DEPLOY_COLOR_FILE=/tmp/deploy_color \
UPSTREAM_CONF=/tmp/upstream.conf \
PUBLIC_HEALTH_URL=http://localhost/api/version \
GIT_SHA=<sha> scripts/deploy-blue-green.sh
```

## Config

| Env var | Default | Purpose |
|---|---|---|
| `GIT_SHA` | *(required)* | sha the health checks must match |
| `SERVER_DIR` | `~/src/github.com/2anki/2anki.net` | repo checkout on the box |
| `DEPLOY_COLOR_FILE` | `~/.deploy_color` | live-color state file |
| `UPSTREAM_CONF` | `/etc/apache2/conf-2anki-upstream.conf` | generated Apache include |
| `ECOSYSTEM` | `$SERVER_DIR/ecosystem.blue-green.config.js` | pm2 app definitions |
| `PUBLIC_HEALTH_URL` | `https://2anki.net/api/version` | post-swap verification URL |
| `DEPLOY_LOCK_FILE` | `~/.2anki-deploy.lock` | flock target |
| `DRY_RUN` | `0` | `1` prints actions instead of running them |

### Locking against certbot

The script `flock`s `DEPLOY_LOCK_FILE` so two deploys can't overlap. The
`mv`-from-same-directory swap is already atomic, so a certbot Apache reload can't
read a half-written include. To fully serialize a deploy against the cert-renewal
reload, point both at one root-writable lock path — set `DEPLOY_LOCK_FILE` here
and wrap the certbot deploy hook in `flock <same path> -- apachectl graceful`.
On a box without `flock` (some minimal containers) the script logs and continues
without the lock; prod has util-linux.

## Rollout

Per the spec's test plan:

1. Review this doc and the script.
2. Dry-run (`DRY_RUN=1`, or a local docker box running pm2 + Apache) with a
   parallel `curl` loop measuring the 200/502 ratio across the swap.
3. Run the bootstrap, then 2–3 manual prod cutovers during low-traffic hours,
   watching the curl loop from outside the box. Expect 100% 200s through the swap.
4. After 3 clean prod swaps, a follow-up PR replaces the single-color step in
   `deploy.2anki.net.yml` with this script.

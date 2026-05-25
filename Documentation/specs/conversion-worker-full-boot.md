# Investigation spec: 108 process boots in 24 h

**Status:** investigation — cause not yet confirmed, fix not yet scoped

---

## Signal

Prod logs for a recent 24-hour window show:

- `Running on http://localhost:3000` — 108 occurrences
- `DB is ready` — 108 occurrences
- `Main instance: Starting cleanup jobs` — 108 occurrences
- `Ankify polling worker scheduled` — 108 occurrences
- SIGINT/SIGTERM — 138 occurrences
- `uncaughtException` / `unhandledRejection` — 0

The main pm2 process is currently **stable** (uptime 26 min, lifetime restarts ticking slowly, 1 unstable restart). This is an efficiency and observability concern, not an active outage.

---

## What is already ruled out

| Candidate | Evidence ruling it out |
|---|---|
| Memory-limit restart | `ecosystem.config.js` has no `max_memory_restart`; `node_args` sets heap to 16 GB |
| Conversion worker threads booting a full app | Code-confirmed: `conversionWorker.ts` → `runConversionInWorker()` → `performConversion()` imports individual repositories from `data_layer/` but **never** imports `data_layer/index.ts` and never calls `setupDatabase()`. All three boot messages originate exclusively in `src/data_layer/index.ts:setupDatabase()`, which is only invoked from `src/server.ts:serve()`. Piscina worker threads cannot generate these log lines. |
| CI deploy causing 108 restarts | Deploy workflow triggers `on: push` to `main` with `paths-ignore: **.md`; ~3 deploys in the window, not 108 |
| pm2 crash-loop (uncaught exception) | 0 uncaught exceptions or unhandled rejections in the 24-hour window |

---

## Leading hypothesis (unconfirmed)

The 108 full boots correspond to 108 genuine process restarts — not worker-thread activity. The cause is unknown. Candidates in rough likelihood order:

1. **pm2 `autorestart: true` + `min_uptime: 60s` instability loop.** If `setupDatabase()` (migrations + Ankify scheduler init + top-level-pages cache warm) routinely takes longer than 60 s, pm2 classifies the start as "unstable" and immediately restarts. The `pm2 describe` snapshot shows 1 unstable restart; the 24-hour lifetime counter of 525 restarts is consistent with ~108 events.
2. **External restart trigger.** A cron, health-check script, or ops runbook on the prod box calls `pm2 restart server` or `pm2 reload server` on a cadence not visible in the deploy workflow.
3. **Singapore instance cross-fire.** A second pm2 ecosystem (Singapore) targeting the same server process name could be issuing restarts. The `INSTANCE_ID === 'singapore'` branch in `setupDatabase()` is guarded but the pm2 process name may collide.
4. **Startup exceeding kill_timeout.** `kill_timeout: 30000` in `ecosystem.config.js` — if a previous shutdown takes longer than 30 s and pm2 force-kills, the next boot is logged as a new start.

Riskiest assumption: that `autorestart` is the driver. If it is, boot time or slow migration is the lever. If it is an external cron, no code change is needed — the cron is the fix.

---

## Duplicate Ankify scheduler risk

If 108 boots are genuine restarts and each boot schedules `scheduleAnkifyPolling`, the scheduler singleton in `src/lib/ankify/scheduler/instance.ts` is fresh per process (Node module cache is per process). So duplicate schedulers **do not accumulate within a single boot** — there is only ever one scheduler per live process. However: if two processes are alive simultaneously (e.g. during a rolling restart or kill_timeout overshoot), two poll loops run concurrently for the overlap window. The duplicate-scheduler risk is bounded by the overlap duration, not the restart count.

---

## Disambiguation test

Before any fix is written, confirm which candidate is driving restarts by running these commands on the prod box (SSH, read-only):

```bash
# 1. Check if startup is classifying as unstable in pm2 logs
pm2 describe server | grep -E "restart|unstable|uptime|status"

# 2. Correlate "Running on" timestamps with prior "SIGINT received" timestamps
grep -E "Running on|SIGINT received|drain complete" ~/.pm2/logs/server-out*.log \
  | sort | tail -200

# 3. Check for cron entries that call pm2
crontab -l
sudo crontab -l 2>/dev/null || true

# 4. Check if a second pm2 daemon or ecosystem is running
pm2 list

# 5. Measure startup time (time from server start to "Ankify polling worker scheduled")
awk '/Running on/{start=$1} /Ankify polling worker/{if(start) print $1 - start; start=""}' \
  ~/.pm2/logs/server-out*.log 2>/dev/null | head -20
```

If startup duration is consistently > 60 s → candidate 1. If "Running on" appears in bursts without preceding SIGINT → candidate 3 or 4. If crontab shows a `pm2 restart` entry → candidate 2.

---

## Scope

**In scope (for the implementation PR that follows this investigation):**

- The identified root cause and the minimum change that prevents unnecessary restarts
- A log line or metric that makes future restart-rate anomalies detectable without grepping raw pm2 logs

**Out of scope:**

- Refactoring `setupDatabase()` for any reason other than startup time (if that is the cause)
- Migrating to a different process manager
- Rewriting the Ankify scheduler initialization path unless startup time is confirmed as the cause
- Any change to the conversion worker pool (worker threads are confirmed not to be the cause)

---

## Acceptance criteria

- Prod logs show `Running on http://localhost:3000` no more than once per intentional deploy or manual restart over a 24-hour window
- No duplicate Ankify polling loops running simultaneously (verifiable via log timestamps for `scheduleAnkifyPolling` calls)
- The fix ships with a comment or log line explaining why the change prevents unnecessary restarts

---

## Leading indicator

After the fix ships: `grep -c "Running on http://localhost:3000" ~/.pm2/logs/server-out*.log` over a 24-hour window should be ≤ the number of intentional deploys.

---

## Open questions

1. Does `pm2 describe server` on prod show `min_uptime exceeded` or `unstable restarts` incrementing during normal operation?
2. Is there a cron or systemd timer on the prod box not visible in the deploy workflow?
3. Is there a Singapore-region process with the same pm2 name that could issue restarts?
4. What is the p95 time from `Running on` to `Ankify polling worker scheduled`? If it exceeds 60 s regularly, `min_uptime` is the fix target.

---

## Technical pre-flight

- `src/server.ts:serve()` is the only caller of `setupDatabase()` — confirmed by `grep -rn "setupDatabase" src/`.
- `src/data_layer/index.ts` exports `SINGLE_CONNECTION` as a module-level singleton; this runs once per process (not per conversion), so no connection-per-request leak.
- Piscina worker threads each import `conversionPool.ts` and `performConversion.ts`, which open their own `workerKnex` Knex instance (max 2 connections). This is separate from the main-thread pool and does not call `setupDatabase()`.
- `scheduleAnkifyPolling` is registered exactly once per `setupDatabase()` call. Duplicate schedulers can only arise from overlapping process lifetimes, not from high conversion volume.

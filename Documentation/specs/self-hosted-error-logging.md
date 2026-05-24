# Self-hosted error logging

### Trio synthesis

- **PM:** Build the middle option — drop Bugsnag *and* add server-side capture in v1. Skip grouping/alerting. Success = median time-to-diagnosis drops from "SSH session" to "two minutes in `/ops`"; zero incidents where SSH is required because `/ops` was missing the error.
- **Designer:** Add `/ops/errors` as a new tab in the existing `OpsLayout` (after Engineering, before Performance). Master-detail layout, sort default `last seen ▼`. The detail panel's single primary action is "Copy for Claude Code" — one click, plain-text artifact pre-formatted with message, URL, timestamp, release SHA, user ID, browser, occurrence count, and stack. Numeric user ID only, never name or email.
- **Engineer:** Single `error_events` Postgres table with `source` column (`web` | `server`). `POST /api/events/errors` ingest (anonymous, 10 req/min per IP, hard 1 000/min global cap, 10 KB payload cap, dedup by `message_hash` per `ip_hash` within 5 min). Frontend `reportClientError(err, context)` replaces the three Bugsnag call sites. Server-side: one Express error middleware writes to the same table before `ErrorHandler` responds. Defer source-map demangling — store raw stacks, manually demangle from the SHA when needed.
- **Agreement:** Single table; admin-only `/ops/errors`; the copy-to-Claude primitive is the v1 deliverable, not a dashboard; no grouping algorithm, no alerting, no source maps, no status workflow.
- **Conflict:**
  - *Server capture in v1*: PM yes, Engineer no. **PM wins.** The mindmap crash diagnosed earlier today proves server is the bigger blind spot; the middleware is ~30 LOC.
  - *Table name*: Engineer `client_errors`, PM `error_events`. **PM wins** because the table accepts both sources from day one.
  - *Grouping*: PM said "sort by timestamp is fine"; Designer's mockup shows occurrence counts and a `first seen` line. **Both right.** SQL `GROUP BY message_hash` on the list query is not fingerprinting — it's just `COUNT(*)` over byte-identical messages. Ship the SQL grouping; skip any fuzzy fingerprinting.
- **Resulting plan:** Migration `add_error_events_table`. `POST /api/events/errors` ingest used by both `reportClientError.ts` (web) and a new server `ErrorCaptureMiddleware` mounted before `ErrorHandler`. `/ops/errors` tab with master-detail + "Copy for Claude Code" button. Remove `@bugsnag/js`, `@bugsnag/plugin-react`, the three Bugsnag call sites, and the Bugsnag paragraph in `privacy.md`. No source maps, no alerts, no grouping algorithm in v1.

---

## Outcome

When a prod error happens, Al can diagnose it from `/ops/errors` in under 60 seconds without SSH. Today the mindmap crash took an SSH + grep round trip plus a guess at which log file held it; the next one shouldn't.

**30-day success metric:** Zero diagnosis sessions that required `ssh alemayhu@2anki.net` because `/ops/errors` was missing the error. Secondary: at least two real incidents triaged end-to-end by copy-pasting the artifact into Claude Code, with no follow-up "what's the stack" exchanges.

## Goal alignment

Faster triage = faster fixes = fewer broken sessions on the path to 300K. The current setup ships frontend errors to a third-party SaaS and ships server errors *nowhere queryable*. We lose the user when a deploy regresses, and we lose another hour finding out about it. Both halves get fixed in one table.

## Problem

Bugsnag captures only frontend render errors (3 call sites). Server errors land in `pm2 logs` — queryable only over SSH, only by Al, only while the log rotation hasn't moved the relevant file. Triage today means an SSH session + `grep` + a guess at which file holds it. Bugsnag's UI is for a team of engineers; the audience here is exactly one operator who already lives next to a Claude Code terminal. The right interface is "copy the error, paste into Claude Code, ask it to triage."

## Riskiest assumption

That a "copy for Claude Code" button beats a real error dashboard for single-operator triage. If after two real incidents Al reaches for Sentry/Bugsnag-equivalent anyway, the assumption was wrong.

## Smallest test

Ship v1. Use it for the next two incidents. If both get diagnosed in under five minutes from `/ops/errors` → paste → Claude Code, the bet paid off. If Al falls back to SSH for either one, that's the signal to either add grouping/alerting or buy back into a hosted tracker.

## Scope

**In (v1):**
- Migration `add_error_events_table` adding a single `error_events` table.
- `POST /api/events/errors` ingest endpoint. Anonymous accepted. Rate-limited 10 req/min per IP, 1 000/min global hard cap, 10 KB payload cap. Dedup by `message_hash` per `ip_hash` within 5 min — silent 202 on duplicate, no insert.
- New frontend `reportClientError(err, context?: Record<string, unknown>): void` in `web/src/lib/reportClientError.ts`. Fire-and-forget `fetch`. Reads `process.env.REACT_APP_RELEASE` (set from `$GITHUB_SHA` at build time).
- New plain React `ErrorBoundary` in `web/src/index.tsx` replacing `BugsnagPluginReact`. On boundary catch, call `reportClientError`.
- New server middleware `src/routes/middleware/ErrorCaptureMiddleware.ts` mounted *before* `ErrorHandler`. Writes to `error_events` with `source: 'server'`, then `next(err)` so `ErrorHandler` still responds.
- New `GET /api/ops/errors?limit=50&offset=0` admin endpoint. Behind existing `RequireAdmin`. Returns `{ groups: ErrorGroupRow[], totalGroups: number }`. Server runs `GROUP BY message_hash` and returns one row per group with `firstSeen`, `lastSeen`, `occurrences`, and a representative `stack`/`url`/`release`/`source`.
- New `/ops/errors` tab in `OpsLayout`. Master-detail. List columns: indicator dot, message (truncated 80ch), URL, last seen (relative), occurrences. Sort default `last seen desc`; one-click secondary sort by occurrences.
- Detail panel renders message, first/last seen, occurrences, URL, user (numeric ID or `anonymous`), release SHA (8-char), browser parsed from UA, full stack. Primary action: "Copy for Claude Code" — copies a plain-text artifact (see Acceptance).
- Source filter chip (`all` / `web` / `server`).
- Remove `@bugsnag/js`, `@bugsnag/plugin-react` from `web/package.json`. Delete `web/src/lib/SendError.tsx`. Strip Bugsnag from `web/src/index.tsx` and `web/src/components/shared/redirectOnError.ts` — both switch to `reportClientError`.
- Update `web/src/pages/DocsPage/content/reference/privacy.md`: replace the Bugsnag paragraph with "Error reports are stored on our own infrastructure and deleted after 30 days."
- Changelog entry under `web/src/pages/WhatsNewPage/changelog/`: `style` type, "Error reports now stay on our infrastructure instead of going to a third-party service".

**Out (v1):**
- Source-map upload or server-side demangling. Stacks are stored raw; we have the release SHA and can grep `dist/` manually when it matters.
- Fuzzy fingerprinting / cross-message clustering. SQL grouping by exact message is enough.
- Email / Slack / Discord alerting on rate spikes. Al opens `/ops` anyway.
- Status workflow (resolved/ignored/assigned). Session-local "opened" dot is enough.
- Retention cron. The `created_at` index is fine for 30 days of accumulation at current volume; if it matters in v2, add a daily `DELETE WHERE created_at < now() - interval '30 days'`.
- Per-user error history page. One table, one view.
- Multi-environment separation. Production-only ingest; dev/preview don't send.
- Sparklines / occurrence charts in the UI.

## User story

As the sole operator, when an error fires in production I want to see it in `/ops/errors`, copy a Claude-Code-pasteable block in one click, and paste it into my terminal so Claude can start triaging without me re-typing the stack, the URL, or the release SHA.

## Acceptance criteria

- [ ] Migration `add_error_events_table` creates `error_events` with columns: `id bigserial PK`, `source varchar(10) not null check (source in ('web','server'))`, `message_hash char(64) not null`, `message text not null`, `stack text`, `url text`, `user_agent text`, `release varchar(40)`, `user_id integer null references users(id)`, `ip_hash char(64)`, `context jsonb`, `created_at timestamptz not null default now()`. Indexes: `(message_hash)`, `(created_at desc)`, `(source, created_at desc)`, partial `(user_id) where user_id is not null`. `pnpm kanel` regenerates the type.
- [ ] `POST /api/events/errors` returns `202` on accept, `202` on dedup hit (no insert), `400` on body schema fail, `413` on >10 KB body. Rate-limit responses are `429`.
- [ ] IP is SHA-256 hashed at the controller before reaching the repository; raw IP is never persisted or logged.
- [ ] `reportClientError(err, context?)` swallows secondary fetch errors. A network outage at the user's end does not crash their session.
- [ ] `ErrorBoundary` in `web/src/index.tsx` is a plain React class (no Bugsnag) and calls `reportClientError` in `componentDidCatch`.
- [ ] Server `ErrorCaptureMiddleware` is mounted in `src/server.ts` *before* `ErrorHandler`. It captures the error, never throws, never alters the response, and calls `next(err)` so `ErrorHandler` runs unchanged.
- [ ] `GET /api/ops/errors` requires admin auth (401 otherwise). Returns a typed `{ groups, totalGroups }` shape — no raw Knex rows, no `ip_hash` exposed.
- [ ] `/ops/errors` tab renders in `OpsLayout` after Engineering, before Performance. Empty state: `No errors recorded. Errors appear here as soon as the client reports one.`
- [ ] Clicking a list row sets `?id=<message_hash>` and opens the detail panel without a route change. Pressing Escape or clicking outside clears it. Browser Back closes the panel before leaving the tab.
- [ ] "Copy for Claude Code" copies this exact shape (sentence case, plain text, no markdown styling beyond the heading hash):

      ## Frontend error — triage request

      Message:    <message>
      URL:        <url or "(none)">
      Timestamp:  <YYYY-MM-DD HH:MM:SS UTC>  (last seen)
      Release:    <8-char SHA or "(unknown)">
      User:       <user ID or "anonymous">
      Browser:    <parsed UA or "(unknown)">
      Occurred:   <N> times  (first: <YYYY-MM-DD HH:MM UTC>)
      Source:     <web | server>

      Stack:
      <raw stack, unindented>

      Repo: 2anki/server  |  check git log --oneline <8-char SHA>..HEAD for context

  Server errors use heading `## Server error — triage request` and omit `Browser`. The button label switches to `Copied` for 1.5 s then reverts. Uses `navigator.clipboard.writeText` — no library.
- [ ] Source filter chip persists in the URL (`?source=server`). Sort toggle persists too (`?sort=occurrences`).
- [ ] Source dot indicator and `opened` dot are session-local — no DB writes when a row is viewed.
- [ ] Three Bugsnag call sites are gone: `web/src/index.tsx`, `web/src/lib/SendError.tsx` (file deleted), `web/src/components/shared/redirectOnError.ts`. `@bugsnag/*` deps removed from `web/package.json`. `pnpm install` shrinks the lockfile.
- [ ] `privacy.md` Bugsnag paragraph replaced. No other doc references Bugsnag.
- [ ] Tests:
  - `src/data_layer/ErrorEventRepository.test.ts` — insert + grouped read against SQLite test harness.
  - `src/usecases/ops/ListErrorGroupsUseCase.test.ts` — mock repository, asserts grouping shape.
  - `src/routes/OpsErrorsRouter.test.ts` — supertest: 401 without admin, 200 with, response shape.
  - `src/routes/EventsRouter.test.ts` — adds cases for `/errors`: 202 on valid, 202-no-insert on dedup, 413 on oversized, 400 on malformed, 429 on rate limit, ip never persisted raw.
  - `src/routes/middleware/ErrorCaptureMiddleware.test.ts` — capture writes to repository, calls `next(err)`, never alters the response, never throws.
  - `web/src/lib/reportClientError.test.ts` (Vitest) — payload shape, swallows fetch failure, includes release.
- [ ] No `console.log` left behind. `/check` is green. SonarCloud scan run locally before flipping to ready (per `.claude/rules/sonar.md`).
- [ ] Browser check section in the PR body (per `browser-attestation.md`): golden path = trigger a deliberate client error, see it land in `/ops/errors`, click Copy for Claude Code, paste into Claude Code, confirm the artifact is the spec format above.

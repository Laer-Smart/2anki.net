# Spec: Developer API keys + quota-by-token (substrate v1)

> **DRAFT — not ready to implement as-is.** This touches auth (new credential type) and adds a Knex migration. Before it graduates to ready it needs: the `migration-reviewer` agent on the `api_keys` migration, and `/security-review` on the auth path. It deliberately reuses the existing quota + Stripe (no new billing) to stay off the payments hard rail.

### Trio synthesis
- **PM**: build the auth substrate once (keys authenticate as the owning user; existing quota/paying applies unchanged) so #3686 (MCP) and the future CLI are thin clients, not new backends. Riskiest assumption: bearer auth can reproduce `res.locals` so every downstream quota/paying check works with no cookie present.
- **Designer**: copy-once reveal is the critical moment (secret shown exactly once, no ×-close, only a deliberate Done); rows use hairlines + mono/tabular for key data; danger-red reserved for the irreversible revoke confirm.
- **Engineer**: extract a shared `applyUserLocals()` so the cookie and key paths are byte-identical; wire a single `acceptKeyOr(fallback)` combinator at 4 routes (key-first, else today's gate); SHA-256-indexed hashing (not bcrypt, not the reversible `hashToken`, not plaintext); effort **M**.
- **Agreement**: one combined middleware, reuse existing quota/paying/Stripe untouched, SHA-256 keys, copy-once UX, `/security-review` + `migration-reviewer` before merge.
- **Conflict**: designer placed key management in Account settings; Alexander directed a **dedicated `/developers` page** reached from a new sidebar item, gated to lifetime. Resolved: the designer's key-UI moves onto the gated Developers page; the page is the surface, Account settings is not touched.
- **Resulting plan**: ship the `api_keys` table + `RequireApiKey`/`acceptKeyOr` auth substrate + a lifetime-gated `/developers` page hosting the copy-once key UI, with a request-access flow (free/subscribers) that emails support@2anki.net.

## Outcome
A lifetime user opens **Developers** in the sidebar, mints an `sk_live_…` key (shown once), and a `Authorization: Bearer sk_live_…` request converts a file through the existing engine under that user's own quota and paying status — identical to a session cookie, from any origin (no browser needed). Free and subscriber users see the page locked with a **Request access** button that emails support@2anki.net. Substrate only — no CLI, no MCP facade ships here.

## Goal alignment
Distribution/acquisition per `CLAUDE.md` — the acquisition lane. It creates the machine-auth substrate the MCP server (#3686) and CLI both depend on, and reserves the `cli` / `mcp` `signup_origin` lanes that attribute into the per-origin funnel (`/api/ops/upload-funnel`, #3693). No direct MRR in v1 — conversions ride the existing paywall unchanged.

## Problem
"Document → deck" demand is moving into AI assistants and scripted tooling, but 2anki has only cookie auth. #3686 and a future `2anki` CLI both need revocable, machine-usable credentials that map onto existing quota/paying. Building key auth per-client duplicates the security-sensitive path. Build it once, here, and gate the surface to lifetime users first (lowest-risk cohort, highest intent) with a request path for everyone else.

## Riskiest assumption + smallest test
**Assumption**: bearer-key auth can set `res.locals` so every downstream check (`isPaying`, monthly card limit, Stripe subscriber lookup) works unchanged with no session cookie present.
**Test** (< 1 hr, before UI): a throwaway `RequireApiKey` that hardcodes a resolved owner; run a real upload through `/api/upload/file` with no cookie and no Origin header; confirm the monthly limit + paying gate fire. Grep the 4 endpoints' chains for `req.cookies` / `res.locals.email` reads.

## Scope

**In (v1)**
- `api_keys` table: `id`, `user_id` FK→users, `name`, `key_hash` (unique-indexed), `prefix`, `last_used_at`, `created_at`, `revoked_at`. Migration + `pnpm kanel` in the same PR.
- Keys `sk_live_<crypto.randomBytes base62>`; full secret shown **once** on creation; only `sha256(raw)` stored (mirrors `ipHelpers.hashIp`), prefix (`sk_live_A1b2…`) displayed after. Revocable (`revoked_at`).
- Shared `applyUserLocals(res, user, db, deps)` extracted from `configureUserLocal` (lines 56–84) so the cookie path and the key path populate **identical** locals.
- `RequireApiKey`: parse `Authorization: Bearer sk_live_…` → sha256 → indexed lookup → non-revoked user → `applyUserLocals` → `next()`. Fail-closed 401 on missing/bad/revoked.
- `acceptKeyOr(fallback)` combinator, key-first: bearer present → `RequireApiKey`; else run `fallback` unchanged. Wired at exactly 4 routes:
  - `/api/upload/file` → `acceptKeyOr(RequireAllowedOrigin)` — **a valid key bypasses the Origin allowlist** (API clients have no browser origin); browser requests still hit `RequireAllowedOrigin` byte-identical.
  - `/api/upload/jobs`, `/api/apkg/:key/meta`, `/api/apkg/:key/cards` → `acceptKeyOr(RequireAuthentication)`.
- **Developers page** (`/developers`) — new sidebar item labelled "Developers" using the existing `CommandLineIcon` (terminal). Gated to **lifetime** (`locals.patreon === true`) — matches the existing sidebar tier-gate pattern (`Sidebar.tsx:226`). Hosts the copy-once key UI (create / list / revoke). Registered in `App.tsx` **and** `src/routes/knownRoutes.ts` (direct-load 200).
- **Request access** (free + subscribers): the locked page shows a Request access button → `POST /api/developer/request-access` (session-auth) → emails `SUPPORT_EMAIL_ADDRESS` (support@2anki.net) via the existing `EmailService`, including the requester's **user id, email, paying status (lifetime/subscriber/free), and created date**. Deduped (one pending request per user per day). UI confirms "Request sent."
- Per-token rate limit **60 req/min/token** reusing the `ShareRouter` counter pattern (`checkCounter` over a module `Map`). Note: in-memory/per-process — fine for the single-box deploy.
- `api_key_used` analytics event on each authenticated key request (throttled 1/key/min); `last_used_at` updated async.
- Surface-lifecycle: the usage event ships in this PR + a T+30d adoption-review issue created at merge (keep/remove on distinct-keys-used-per-week; zero → remove).

**Out (explicit non-goals — do not build)**
- Metered credits / usage-based billing / a separate developer pricing tier (payments hard rail — needs Alexander's pricing call).
- OAuth device-flow, the `2anki` CLI, the hosted MCP facade (#3686) — clients built on this substrate later.
- Public OpenAPI curation / directory listings.
- Key rename/edit, key scopes/permissions, expiry picker, rotate button (rotate = revoke + recreate), usage graphs.
- No new quota ledger, no metered credits, no new Stripe products.

## User story
As a developer on a lifetime account, I want to mint a revocable API key so a script or agent can convert files under my account and quota without my session cookie — and if I'm not lifetime, request access in one click.

## Acceptance criteria (copy passes VOICE.md — sentence case, no exclamation marks)
- [ ] Sidebar shows a **Developers** item with the terminal (`CommandLineIcon`) glyph.
- [ ] A lifetime user sees the key UI; a free/subscriber user sees the locked state + **Request access**.
- [ ] Request access emails support@2anki.net with the user's id, email, and paying status; the button then shows "Request sent"; a second request the same day is deduped.
- [ ] Creating a key shows the full `sk_live_…` once with copy, and the line: "This is the only time you'll see this key. Copy it now and store it somewhere safe — you won't be able to see it again." The reveal has no ×-close; only **Done** dismisses it.
- [ ] After dismissal the list shows name, prefix, and last used ("a moment ago" / "12 May 2026" / "Never used"). The list endpoint returns the prefix only, never the secret.
- [ ] Only `sha256(raw)` is persisted; the plaintext key never touches the DB or logs.
- [ ] `Authorization: Bearer sk_live_…` on the 4 listed endpoints sets `res.locals.owner`/`patreon`/`subscriber` to the key's user; the request obeys that owner's monthly limit + paying status identical to a cookie session; and a headless request with **no Origin header** succeeds on `/api/upload/file`.
- [ ] A revoked key → 401 on the next request; a bearer key on any non-listed endpoint carries no privilege (falls through to session).
- [ ] A 61st request in one minute for one key → 429: "Rate limit reached — 60 requests per minute per key. Try again in a moment."
- [ ] A T+30d adoption-review issue exists at merge with the review date in the title.

## Design notes (designer)
- **Placement**: dedicated `/developers` page (per Alexander), not the Account card. Reuse the shared section-card + dialog patterns from `AccountPage` (`AccountDeletion.tsx` dialog via `useDialog`; `LogOutEverywhere.tsx` inline confirm).
- **Locked state** (free/subscriber): one section card explaining what keys unlock ("convert from your own tools — a CLI, a script, or an MCP client"), primary **Request access**; on success → "Request sent — we'll be in touch by email."
- **Create → copy-once reveal**: one dialog, two states (name → reveal). Reveal is the only place the full key renders; `.keyReveal` block is `--font-mono`, wraps (never truncates a secret), copy button is primary, `data-hj-suppress` on the reveal + every prefix. No ×-close on reveal; **Done** only, with an inline nudge "Copied your key? You won't see it again." if dismissed uncopied.
- **List rows**: hairline-separated, name at `--text-sm`/500, mono+tabular line `sk_live_a1b2… · Created 12 May 2026 · Used 3 days ago`, neutral **Revoke** trigger; revoke confirm earns danger-red ("Anything using {name} stops working right away. This can't be undone." · Revoke key / Keep it).
- **Empty (lifetime, no keys)**: "No API keys yet. Create one to convert from your own tools — a CLI, a script, or an MCP client." + **Create key**.
- Exact strings live in the designer output; all go through i18n `account`/new `developers` namespace — flag the reveal warning + locked-state copy for a native-speaker DE pass.
- **Do NOT build**: key rename, scopes UI, usage graphs, expiry picker, rotate button.

## Technical pre-flight (engineer)
- **`res.locals` shape to replicate** (`configureUserLocal.ts:55–84`): the three fields that gate quota/paying are `owner` (`user.owner`), `patreon`, `subscriber`; `isPaying` (`src/lib/isPaying.ts:5`) = `patreon || subscriber`; monthly limit short-circuits when `isPaying`. Extract lines 56–84 into `applyUserLocals()` and call it from both paths so locals can never drift.
- **Composition**: `acceptKeyOr(fallback)` — one middleware, key-first, delegating to the unchanged gate. `/api/upload/file` = `acceptKeyOr(RequireAllowedOrigin)` (this is the Origin-bypass); jobs/meta/cards = `acceptKeyOr(RequireAuthentication)`. Zero behavior change on the cookie/origin path (the fallback runs the same middleware object).
- **Hashing**: `key_hash = crypto.createHash('sha256').update(raw).digest('hex')`, unique-indexed for O(1) lookup — mirrors `ipHelpers.hashIp:20–22`. NOT bcrypt (can't index → O(n) scan) and NOT `hashToken` (reversible AES) and NOT the plaintext `access_tokens` pattern. Generate raw keys with `crypto.randomBytes` (never `Math.random` — Sonar S2245). Log only a hashed surrogate.
- **Rate limit**: reuse the `ShareRouter` `checkCounter`/`Counter` shape (file-private today — duplicate it as the 2nd copy, or extract to `src/lib/rateLimit/`); `resolveClientIp`/`hashIp` reusable as-is. In-memory/per-process — note the multi-instance caveat, don't solve.
- **Layers/files**: migration + `src/data_layer/public/ApiKeys.ts` (kanel, same PR) + `ApiKeyRepository` (+ `IApiKeyRepository` + test); `RequireApiKey.ts` + `acceptKeyOr` (+ test); refactor `configureUserLocal.ts` to export `applyUserLocals` (+ update test); rewire 4 routes in `UploadRouter.ts`/`ApkgRouter.ts`; `swagger` `bearerAuth` on `/api/upload/file`; request-access controller/usecase + `EmailService` internal-notification method; web `/developers` page + sidebar item + `knownRoutes.ts`.
- **Effort M.** Migration + kanel gate + repository + locals-exact middleware + 4 rewires + the gated page + request-access email + tests. Touches auth → `/security-review` before merge.
- **Gotchas**: `tsc -p .` compiles tests → every `IApiKeyRepository` mock literal must be complete or the prod deploy build reddens; kanel-in-PR is a hard gate (no hand-written `ApiKeys.ts`); fail-closed on bad/revoked keys; `hasSessionToken` reads the cookie directly but is only consulted in the `owner == null` branch, so key auth (which sets `owner`) is unaffected (verified).
- **Platform check**: no new Stripe surface — quota/paying resolves from `res.locals` (`owner` + `patreon||subscriber`) against the same `Users` row a session resolves; existing `CheckMonthlyCardLimitUseCase` + subscription lookups untouched.

## Leading indicator
No live metric moves in this PR (clients come later). It instruments `api_key_used` events keyed to `cli`/`mcp` origins, read in the per-origin upload funnel (#3693) once #3686/the CLI ship. T+30d keep/remove signal: distinct keys used per week (zero → remove per surface lifecycle).

## Open questions for implementation
- `/api/apkg/:key/meta` — the `:key` path param is the apkg/deck key, unrelated to the API key; confirm no naming collision in the combinator (bearer is read from the header, not the param — should be clean).
- Request-access dedupe store: a lightweight `developer_access_requests` row, or reuse an existing "requested" flag? Decide at implement (prefer a small table so repeat requests + grant status are auditable).
- Comp-grant mechanism for granting access to a non-lifetime user after a request: reuse an `ankify_access`-style boolean (`developer_access`) rather than flipping `patreon` (which would grant full lifetime). Confirm with Alexander at grant time.

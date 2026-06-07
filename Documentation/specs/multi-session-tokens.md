# Spec: Multiple concurrent sessions (one access_tokens row per session)

> GitHub issue: [#3187](https://github.com/2anki/server/issues/3187)

### Trio synthesis
- PM: pure subtraction of the single-session limit; riskiest assumption is that no flow depends on displacement as revocation; no UI, changelog only.
- Designer: no UI changes required; keep the one-word "Log out" label; password reset must revoke all sessions; "log out everywhere" is a fast-follow issue, not this PR.
- Engineer: S effort — one migration, one repo method, one server.ts GC line, one new test file; GC by `created_at + SESSION_MAX_AGE_MS`, not JWT decode; no login rate limit means unbounded row growth is possible — ship without a cap but flag it.
- Agreement: multi-session unconditional, logout already per-token, GC is hygiene not security, no controller/web changes.
- Conflict: reset-revokes-all was a PM open question; designer called it the security expectation every user holds. Resolved: in scope — one `deleteAllForOwner` call on the reset path.
- Resulting plan: drop unique(owner) + add owner/token indexes, plain insert per login, reset revokes all owner sessions, startup + on-login expiry GC, Jest repo test first.

## Outcome

A user signed in on web and the native app keeps both sessions alive simultaneously. `auth_required_for_native` 401s caused by token displacement drop to zero. **Goal alignment:** the native companion app is a growth surface toward 300K users; it cannot ship while opening the website signs you out of the app.

## Problem

`access_tokens` is keyed one row per owner — `TokenRepository.updateAccessToken` (`src/data_layer/TokenRepository.ts:27-35`) upserts with `.onConflict('owner').merge()`, so every login displaces the previous session's token. Prod, 2026-06-07, one user: native app signs in at 17:20, works for 20 minutes; user signs in on 2anki.net in Safari at 17:40; at 17:41 the app's next API call returns 401 and shows "You're signed out — sign in again to continue." It cuts both ways — the app's login had already killed the Safari session.

**Riskiest assumption:** no existing flow depends on displacement as a security property. Resolved during pre-flight: nothing does, but password reset *should* revoke all sessions — added to scope as an explicit `deleteAllForOwner` on the reset path so the fix doesn't silently weaken reset.

## Scope

**In:**
- Migration: drop unique on `access_tokens.owner`, add plain index on `owner` (per-owner GC) and on `token` (every authenticated request looks the JWT up by value — unindexed today, free win). Down collapses to newest row per owner with a `ctid` tiebreak (same-second logins tie on `created_at`), then restores the unique.
- `updateAccessToken` → plain insert per login, with a per-owner delete of expired rows (`created_at < now − SESSION_MAX_AGE_MS`) on the same call.
- Startup one-shot delete of expired rows in `server.ts`, mirroring the `MagicTokenRepository.deleteExpired()` fire-and-forget at boot (line ~264). No scheduler — prod restarts on every blue-green deploy.
- Password reset revokes all sessions for the owner (`deleteAllForOwner`).
- Jest tests at the repository boundary (new `TokenRepository.test.ts`).
- Changelog entry: `Stay signed in on the website and the app at the same time`.

**Out:**
- Session list UI, "sign out everywhere" button, device naming — fast-follow issue if support volume asks.
- Refresh tokens, JWT lifetime changes.
- Native-app client changes (its 401 handling stays as fallback).
- Per-owner row cap — JWT expiry bounds growth; capping at N silently logs out the oldest device, which is the same bug at a higher threshold. Flag in PR, revisit only if numbers say otherwise.

## User story + acceptance criteria

As a user with the app on my phone and 2anki.net in my browser, I want to sign in on either without being signed out of the other, so I can convert on web and review on mobile in the same sitting.

- [ ] Sign in on web, then native, then call authenticated endpoints from both — both return 200.
- [ ] Logout on one surface deletes only that session's token row; the other surface stays signed in.
- [ ] Password reset revokes every session for that user.
- [ ] Expired-JWT tokens stop validating exactly as today; their rows are removed at boot and on the owner's next login.
- [ ] Migration down restores one-row-per-owner (newest wins) without violating the unique.
- [ ] `migration-reviewer` pass before flip-ready; `/security-review` before merge (auth surface).
- [ ] No user-facing copy changes beyond the changelog entry.

## Leading indicator

Displaced-session 401s (`auth_required_for_native` plus the web-side equivalent) go from daily-per-active-native-user to zero within a week of deploy. Secondary: deck downloads for users active on 2+ surfaces stop being interrupted by forced sign-outs.

## Design notes

No UI changes required. "Log out" keeps its one-word label — "ends the session I'm looking at" is the universal mental model (Google, Notion, GitHub all behave this way unlabeled); the fix makes the existing label honest. The post-401 login bounce copy already exists and stays correct for genuine expiry. File "log out everywhere" (single neutral button on Account — reversible, not red) as a separate fast-follow issue.

## Technical pre-flight

- **Layers:** data_layer (TokenRepository) + one migration + one server.ts line. Controllers, use cases, services, web: unchanged — `persistToken` is a pass-through, all 7 `UsersControllers.ts` call sites keep their signature; `getUserFrom` already reads by token value.
- **Files:** `migrations/20260607000000_allow_multiple_sessions_per_user.js`, `src/data_layer/TokenRepository.ts`, `src/server.ts`, `src/data_layer/TokenRepository.test.ts` (new), reset path in `UsersControllers.ts` (revoke-all call), changelog JSON. Check `src/services/AuthenticationService.test.ts` mocks still compile (deploy tsc typechecks tests). `src/seeds/01_users.ts` re-seeding duplicates rows — dev-only, harmless.
- **Schema today:** `owner integer UNIQUE NOT NULL, token text NOT NULL, created_at timestamp DEFAULT now()`. No `token_type` column (the 2021 "add-token-type" migration actually added `host`, since dropped). `token` is unindexed today — lookup-by-token is a seq scan.
- **GC:** use `created_at + SESSION_MAX_AGE_MS` (`src/shared/session.ts`, 30 days) — one indexed DELETE beats N `jwt.decode` calls, and insert time ≈ sign time. Expired rows are inert anyway: `getUserFrom` verifies the JWT before the DB lookup, so GC is hygiene, not security.
- **Migration safety:** `dropUnique(['owner'])` assumes knex's default constraint name `access_tokens_owner_unique` (2021 inline `.unique()` produces it) — verify against prod `\d access_tokens` before shipping. `DROP CONSTRAINT` is a brief ACCESS EXCLUSIVE; non-concurrent `CREATE INDEX` blocks writes during build — table is tiny (≤1 row per ever-logged-in user), sub-second. Run `pnpm kanel` to confirm a no-op (indexes don't change column shapes).
- **Same-second logins** produce byte-identical JWTs (same `userId` + `iat`) → duplicate token rows. Harmless: `.first()` on read; logout deletes both rows of one logical session. Do not add a unique on token.
- **Effort: S** — half a day. Drafted migration + repo rewrite from the prior session were captured before the shared checkout was cleaned; re-create them (strip explanatory comments per RULES.md).
- **Testing:** failing test first — insert token A then token B for the same owner, assert both resolve via `getAccessTokenFromString` (fails today: merge displaces A). Plus: GC deletes only rows past 30d and only for that owner; logout deletes only the presented token; reset deletes all owner rows.
- **Security:** no rate limit on password/OAuth login paths → a scripted login loop inserts rows freely. Rows are three small columns and per-owner GC trims on each login; ship without a cap, flag in the PR body. Implementation must run in `EnterWorktree` (auth surface) and pass `/security-review` before merge.

## Open questions for the engineer

1. None blocking — GC mechanism, reset-revokes-all, and the cap question were all resolved in pre-flight (startup + on-login delete; yes, in scope; no cap, flagged).

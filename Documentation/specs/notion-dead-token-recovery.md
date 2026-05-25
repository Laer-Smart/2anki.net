# Notion dead-token recovery

### Trio synthesis
- **PM:** Most users never touch Notion; the only group that should ever see a reconnect prompt is a returning Notion user whose token died — at point of use, never a global banner. Ship the smallest slice; don't build an onboarding revamp for a feature with near-zero traffic.
- **Designer:** Reconnect belongs inline where the Notion call fails (already wired through `ErrorPresenter`); the real gap is that `isConnected` lies for dead tokens, so the connect/reconnect affordance never reappears. Tighten the copy to "Reconnect Notion."
- **Engineer:** Root cause is mechanical — a revoked token is never purged or flagged, so (a) the 5-min Ankify poll re-uses it forever (the log spam) and (b) `getNotionLinkInfo` reports `isConnected: true` off mere row existence. `deleteNotionData` exists but only runs on explicit disconnect.
- **Agreement:** Detect the dead token and clear its connected-state at the source; point-of-use reconnect, no global banner; non-Notion users stay untouched.
- **Conflict:** PM proposed neutralizing the AutoSync post-checkout landing to `/upload`; engineer's facts show `/ankify/setup` is correct for the Notion-sync product and fires no Notion call on load. **Resolved: leave AutoSync's `success_url` alone**; the only real post-Stripe bug is routing *unauthenticated* buyers to `/notion`.
- **Resulting plan:** Add a soft `invalidated_at` flag on `notion_tokens`, set it on `Unauthorized` from both the poll worker (and pause the dead subscription) and `NotionController`, treat a flagged token as not-connected so the existing reconnect affordance reappears, and tighten the reconnect copy.

## Outcome

The repeated `@notionhq/client unauthorized / API token is invalid` warns stop at the source, and a returning Notion user whose access was revoked gets a clear, in-place path to reconnect instead of a silent dead end. **Goal alignment:** quieter and simpler for the file-only majority (no new nags, no wasted background calls), and a clean recovery for the few Notion users who lose their connection — both sides of the simpler/more-beautiful bet.

## Problem

A revoked or expired Notion token is never purged or flagged. Two consequences:

1. **Background hammer.** The 5-minute Ankify polling loop re-fetches the stale token for every active subscription every cycle, calls Notion, and gets `Unauthorized` — every 5 minutes, indefinitely. This is the source of the repeated prod warns; it is not interactive users.
2. **Silent stuck state.** `NotionService.getNotionLinkInfo` returns `isConnected: true` whenever a `notion_tokens` row exists — even a dead one. A returning user who revoked the integration sees "switch workspace" (not "reconnect"), every Notion action 401s, and the connect button never reappears. No repair path.

## Riskiest assumption

That marking a token invalid on the first `Unauthorized` is safe — i.e. a 401 from Notion reliably means the token is dead, not a transient blip. **Mitigation/test:** `Unauthorized` is already excluded from `withRetry`'s retryable set (only rate-limit/5xx/timeout retry), so a 401 is already treated as terminal by the SDK wrapper; marking-on-401 matches existing behavior. The soft flag (vs. hard purge) is the safety margin — a mistakenly-flagged live token is recoverable by one reconnect click, and the row/metadata survives.

## Scope

**In:**
- Migration: add `invalidated_at timestamptz null` to `notion_tokens` (then `pnpm kanel`).
- Mark invalid on `Unauthorized` in (a) the Ankify poll path (`SyncNotionPageToRacUseCase` / `scheduleAnkifyPolling`) **and pause/disable the affected subscription**, and (b) `NotionController.search` / `searchTopLevelPages`.
- `getNotionLinkInfo` treats an `invalidated_at`-flagged token as **not connected**.
- Clear `invalidated_at` on a successful reconnect (re-OAuth writes a fresh token).
- Copy: tighten `NOTION_UNAUTHORIZED` in `getErrorMessage.ts` to "Reconnect Notion" semantics, action → the Notion connect page.

**Out:**
- Changing the AutoSync `success_url` (`/ankify/setup` is correct for the Notion-sync product; fires no Notion call on load).
- Any global reconnect banner (nags the file-only majority).
- Proactive background token-refresh job.
- Notion onboarding wizard / revamp.
- Hard purge of the token row.
- New Notion prompts for users with no token row.

## User story & acceptance criteria

*As a returning Notion user whose access I revoked, I want the app to tell me my connection is gone and let me reconnect in one click, so I can keep converting pages.*

- [ ] After a Notion `Unauthorized`, the token row's `invalidated_at` is set.
- [ ] The Ankify poll loop stops calling Notion for that user's subscriptions (subscription paused/disabled) — no more 5-min warns for a dead token.
- [ ] On a Notion-backed page, the user sees the reconnect affordance (not "switch workspace", not a silent failure), with copy "Reconnect Notion."
- [ ] A successful reconnect clears `invalidated_at` and restores normal behavior.
- [ ] A user who never connected Notion sees **no** Notion prompt anywhere outside Notion-specific pages.
- [ ] Unauthenticated post-checkout buyers land on `/upload`, not `/notion`.

## Leading indicator

Volume of `unauthorized / API token is invalid` log lines per day drops toward ~0 for dead tokens (each is flagged-and-paused after the first hit instead of recurring every 5 min). Secondary: reconnect-completions among users who hit the flagged state.

## Open questions for the engineer

- Where to centralize the "mark invalid on 401" — a single helper in `NotionRepository` called from both the poll path and `NotionController`, vs. inline at each call site? Prefer one helper.
- "Pause" the subscription on dead token: reuse the existing subscription-disable path, or a softer paused flag that auto-resumes on reconnect? Pick the one that doesn't strand the user's subscriptions after they reconnect.
- Should the post-Stripe `useSubscriptionStatus` auto-redirect / "Thanks, {firstName}" changes ride in this PR or split to a follow-up? (Lean: separate small PR — different surface, lower risk.)

## Design notes

- **Reconnect is point-of-use, not global.** It already routes through `classifyError` → `NOTION_UNAUTHORIZED` → `ErrorPresenter` on the Notion pages; keep that. No banner.
- **Copy (per VOICE.md):**
  - `NOTION_UNAUTHORIZED.title`: "Your Notion connection expired"
  - `.detail`: "Reconnect to keep converting pages directly."
  - `.actionLink.text`: "Reconnect Notion" → the Notion connect page (not `/upload`).
- **Suppression rule:** Notion UI renders only when connected (`isConnected: true`) or on Notion-specific pages (`/notion`, `/ankify`). Never-connected users (`isConnected: false`, no error) see nothing Notion-related elsewhere. This is already true by construction once the `isConnected` lie is fixed.
- **Post-Stripe (if folded in):** route unauthenticated buyers to `/upload`; drop the "Thanks, {firstName}" warmth; reconsider the 600 ms auto-redirect that pulls users off the confirmation card.

## Technical pre-flight

- **Layers touched:** `data_layer` (migration + repo flag read/write), `services` (`NotionService.getNotionLinkInfo`, `NotionAPIWrapper`/`withRetry` error surface), `controllers` (`NotionController`), `usecases`/`lib` (Ankify poll path), `web` (error copy; optional SuccessfulCheckout).
- **Files in play:** `migrations/<new>.js`, `src/data_layer/public/NotionTokens.ts` (regenerated), `src/data_layer/NotionRespository.ts`, `src/services/NotionService/NotionService.ts` (`getNotionLinkInfo:230`, `disconnect:300`), `src/services/NotionService/helpers/withRetry.ts`, `src/controllers/NotionController.ts` (`:117`, `:139`), `src/lib/ankify/jobs/scheduleAnkifyPolling.ts`, `src/usecases/ankify/SyncNotionPageToRacUseCase.ts`, `web/src/components/errors/helpers/getErrorMessage.ts:32`; optional: `web/src/pages/SuccessfulCheckout/{hooks/useSubscriptionStatus.ts,components/SuccessContent.tsx,components/LoggedInSuccess.tsx}`.
- **Cross-language:** none (TS only).
- **Effort:** **M** — small surface but spans a migration, the Notion auth path, and a background worker; the care is in correctness (don't strand subscriptions; clear the flag on reconnect), not volume.
- **Security / testing / migration concerns:**
  - Touches the Notion auth path + a migration → **`/security-review` and a worktree are required at implement time** (per CLAUDE.md).
  - Never log the token or a 401 body verbatim (CWE-532); flag by `owner`, hash any surrogate.
  - Migration is additive (`invalidated_at` nullable) — no backfill; existing rows read as valid until they next 401.
  - Tests: server Jest for mark-on-401 in the poll path and `NotionController`, and `getNotionLinkInfo` treating a flagged token as not-connected; web Vitest for the reconnect copy.

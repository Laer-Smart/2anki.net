# Spec: Durable upload-funnel instrumentation + login-loop fix

### Trio synthesis
- **PM:** Instrument upload→preview→download with durable server-side events keyed by `user_id` OR `anonymous_id`, ship an ops-only funnel endpoint, and make true (not reported) conversion-success rate measurable for the first time — instrumentation FIRST so regression attribution is falsifiable.
- **Designer:** The fixes are pure restoration (no new surfaces), but the login regression needs a failure *signal* — add `?error=google_signin_failed` with mapped copy and stop `TopMessage` echoing raw error codes, so the next silent bounce is visible to the user.
- **Engineer:** Part 1 is ~70% already built (track(), events table, `anon_id` cookie, PII stripper, ops read pattern) — real work is threading `anon_id` through the detached conversion job. Regressions (b)/(c) are the **same bug, already fixed on main** (`9359d4bed4c4`, 2026-05-21); (a) is a one-line cookie fix (`de3c69bd38e1` added `httpOnly:true`, breaking #2454).
- **Agreement:** No migration (events table exists), no new user surface, instrumentation reuses the pricing-A/B infra, one PR is fine.
- **Conflict:** PM scoped three regressions; engineer found two already shipped. Resolved: **drop (b)/(c)** — fixing what's already fixed is a false artifact (code-quality rule). Designer wants a login *failure-path* UI delta; engineer scoped (a) as a one-line backend fix. Resolved: keep both — the cookie line restores the happy path, the error signal handles the failure path; they sit on the same broken moment.
- **Resulting plan:** One PR = Part 1 (durable funnel instrumentation, the anon-id gap is the prize) + Part 2 (one-line `httpOnly` revert that restores the #2454 login-loop fix, plus a small OAuth-failure error signal). Built in a worktree; `/security-review` for the cookie line.

---

## Outcome

The full upload → preview → download path emits durable server-side events keyed by `user_id` or `anonymous_id`, and an ops-only endpoint returns stage counts plus the **true** upload→download success rate — queryable same-day. The returning-user login loop is fixed. **Goal alignment:** we have diagnosed a four-week conversion cliff blind; durable funnel history is the precondition for every later "simplest/fastest" fix and the instrument the scale-to-300K work needs. A login loop that dead-ends returning users in the first 60 seconds is the opposite of simplest/fastest.

## Problem

New paid conversions collapsed from ~28/wk (late April) to ~3/wk and held there four weeks; MRR is down 14% from the April peak ($1 786 → $1 530), active subs 893 → 749. Churn is steady and mostly natural ("finished", "don't use it enough") — the leak is acquisition/activation. But we cannot see *where* on the upload path users fall out: GA4 is bot-dominated (Direct = 81% of sessions at 7% engagement) and blind to the ~87% anonymous audience, and reported success (96%) overstates true success (72%). One real instance: a recent `/upload` report of conversions that "stopped working" and produced "random texts" instead of images (~05-19) — we have no server-side record of how many users that hit. Separately, returning users hit a login loop (~05-16): Google sign-in bounces back to the login page and settings can't be saved.

## Riskiest assumption

That the login fix recovers conversions. It probably is **not** the primary cause — the cliff began ~05-04, before the login regression (05-16) and before the image/nbsp bug (05-05→05-21, already fixed). **Smallest test to disprove:** ship instrumentation first; once events backfill, compare upload→preview→download drop-off before vs after each known date. If the success rate is flat across them, those regressions are not the cliff and we stop attributing recovery to them. Instrumentation is what makes attribution falsifiable — that is why it leads.

## Scope

**In:**
1. Emit stage events via the existing `track()`/`EventsSink` path into the existing `events` table — **no migration**:
   - `upload_started` + `conversion_succeeded`/`conversion_failed` in `services/UploadService.ts` (today carries `userId` only — **add `anonymousId`; this anon gap is the whole point**).
   - `deck_downloaded` in `controllers/DownloadController.ts` (add `anonymousId`).
   - Thread `anonymous_id` (cookie `anon_id`, set by `anonIdMiddleware`) through the **detached** conversion job `lib/storage/jobs/helpers/performConversion.ts` via the job payload — the one non-trivial plumbing task.
2. Read side: `services/ops/UploadFunnelService.ts` mirroring `PricingAbFunnelService`, + `EventsRepository.groupUploadFunnel(since)` (jsonb `props->>`, `count(distinct COALESCE(user_id::text, anonymous_id))`), exposed as `GET /api/ops/upload-funnel` behind `RequireOpsAccess`.
3. Login-loop fix: revert `httpOnly: true` in `shared/session.ts` (keep the 30-day `maxAge`/`sameSite`/`secure`), restoring the non-HttpOnly invariant the frontend depends on (`Backend.ts:44`, `userPreferencesSync.ts:24`, `App.tsx:534`).
4. OAuth-failure signal: add `?error=google_signin_failed` on the Google failure path and map error codes to copy in `TopMessage` instead of echoing the raw param.

**Out — do NOT build:**
- Fixes for the image / `&nbsp` reports — **already fixed on main** (`9359d4bed4c4`; tests `DeckParser.test.ts:818-840`). No source change, **no changelog entry** for them (false-artifact rule).
- Any user-facing funnel dashboard/chart (ops reads JSON), any GA4 work, any `anon_id` cookie/session redesign, any migration.
- Any conversion-count target before the baseline is measured.

## User story + acceptance criteria

*As the operator, I want each upload-funnel stage to record a durable, anonymous-or-identified event, so when conversions move I see which stage changed the same day instead of guessing from bot-noisy GA4. As a returning user, I want Google sign-in to land me on my decks.*

- [ ] `upload_started`, `conversion_succeeded`/`conversion_failed`, and `deck_downloaded` each emit one durable `events` row carrying `user_id` when present and `anonymous_id` otherwise — never neither.
- [ ] An anonymous upload→download sequence is attributable by shared `anonymous_id` (test asserts the rows share the id, including across the detached job).
- [ ] `GET /api/ops/upload-funnel` returns stage counts + true upload→download success rate over a `since` window; SQL asserted against a real `knex({client:'pg'})` builder (`props->>` is PG-only — sqlite would ship green then 500). Unreachable without `RequireOpsAccess`.
- [ ] Props are enums/buckets only (stage, source, card-count bucket) — never deck titles, filenames, or content (reuse `track()`'s PII stripper).
- [ ] Login loop: a failing test in `shared/session.test.ts` asserts `sessionCookieOptions().httpOnly` is falsy, with a comment naming #2454 so the next "tighten the cookie" PR can't silently re-break it; verified in-browser (Google sign-in → decks).
- [ ] OAuth failure shows a mapped message ("Couldn't sign you in with Google. Try again, or use your email below."); unknown error codes fall back to a generic line, never the raw param.

## Leading indicator

True upload→download success rate becomes **measurable** for the first time, and the returning-user login loop stops. No conversion-count target is committed before the baseline exists — promising to move a number we have never measured is how we got here.

## Design notes

Restoration, not redesign. The login fix needs a failure *signal*: today Google OAuth failure falls through to a bare `/login` (Notion already uses `?error=notion_cancelled`; Google has no equivalent), and `TopMessage` (lines 28–34) renders the raw `error` param verbatim — a live papercut and minor info-leak. Add `?error=google_signin_failed`, map codes → copy, generic fallback for unknown codes. Copy (VOICE.md — what happened + what to do, sentence case, no fake warmth): **"Couldn't sign you in with Google. Try again, or use your email below."** The image case's deeper lesson — silent wrong output (bytes as text) should fail *visibly* (drop the image, keep the card) — is noted for a future PR, not built here.

## Technical pre-flight

- **Layers:** services (`UploadFunnelService`, emit edits in `UploadService`), data_layer (`EventsRepository.groupUploadFunnel`), routes (`OpsRouter` one line), lib (`performConversion` anon-id plumbing), controllers (`DownloadController`), shared (`session.ts` one line), web (`TopMessage`, Google failure redirect).
- **No migration, no `pnpm kanel`** — `events` table (`20260605000000_events.js`) already has `anonymous_id` + the needed indexes; `EventRow`/`public/Events.ts` already typed.
- **No TS↔Python concern** — instrumentation never touches `create_deck.py`; the image/nbsp work (done) lived in cheerio, not genanki.
- **Effort:** Part 1 = **M** (dominated by anon-id threading through the detached job + the PG-dialect SQL test + new read service/route). Part 2 cookie = **S** (one line + test). Overall **M**.
- **Security/process:** the `shared/session.ts` cookie-flag edit is auth-adjacent → **mandatory worktree** + `/security-review` before merge. Removing `httpOnly` is intentional and load-bearing (#2454); the JWT lives in a `sameSite:lax`, prod-`secure` cookie — the XSS tradeoff is the documented #2454 decision. Run `sonar-scanner` locally for the new service/repo method.

## Open questions for the engineer

1. Does the detached conversion job payload already have a slot for `anon_id`, or does enqueue need a new field? (If new field, that's in scope; a cookie redesign is not.)
2. Do existing `paywall`/`purchase` events carry `anonymous_id`, or only `user_id`? If only `user_id`, the anonymous tail can't tie through to paid — flag the gap, don't paper over it.
3. Does the login loop reproduce only via Google OAuth or also email login? (Narrows the in-browser verification.)
4. Should Microsoft OAuth get the same `?error=` treatment as Google in this PR, or is that a fast-follow?

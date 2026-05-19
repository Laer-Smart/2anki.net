# Spec: Automate abandoned-checkout recovery email firing

Tracks [#2279](https://github.com/2anki/server/issues/2279). Drops the manual CSV step from the recovery flow.

### Trio synthesis

- **PM**: Ship Option A (Stripe webhook on `checkout.session.expired`), new dedupe table, backfill the 234-email CSV via the existing manual endpoint, then retire the manual endpoint.
- **Designer**: No user-facing UI changes — the email template from #2270 is locked. One operator nit: the auto-fired sends should land in the same `/ops/performance` counter as the manual path, not a new card.
- **Engineer**: Webhook case belongs in `WebhookRouter.ts` directly (it already handles three events), not in `StripeController.ts`. New thin use case wraps the existing `SendAbandonedCheckoutRecoveryUseCase`. New repository + Knex migration. `INSERT … ON CONFLICT DO NOTHING` is the replay fence. Effort S–M.
- **Agreement**: Option A wins. Dedicated dedupe table on a new `abandoned_checkout_recovery_emails` row keyed by Stripe session ID. The CLAUDE.md "Stripe sync is manual only" rule is about subscription reconciliation — not about webhook event handlers — and the PR body must say so to head off reviewer pushback.
- **Conflict**: PM wanted the manual ops endpoint deleted in the same PR (avoid dead-code rot). Engineer wanted it kept for one week post-rollout as a break-glass tool.
- **Resolution**: Side with engineer. Webhook misfires (signature edge cases, missing-email payloads, retry storms) during the first week are a bigger risk than dead-code rot. The cleanup is a separate, scheduled follow-up PR.
- **Resulting plan**: This spec PR; one implementation PR that adds the webhook handler + dedupe table + the 234-CSV backfill run; one follow-up PR a week after the webhook ships clean that deletes the manual endpoint.

## Outcome

Recovery emails fire automatically within Stripe's normal `checkout.session.expired` delivery window (~24h after session creation), with zero manual intervention and zero duplicate sends per session.

Target volume: order-of-magnitude tens of recovery emails per week, sustained. The 234-email CSV collected over an unknown but multi-month window suggests roughly 30–50/week once continuously firing. Leading indicator moved: **recovery email volume** from ~0/week (manual cadence is "whenever Al remembers") to consistent weekly send. Secondary indicator unlocked: **paid conversion rate from expired sessions** — currently unmeasured because the denominator is incomplete.

## Goal alignment

Direct revenue recapture on the path to 300K users. Every recovered checkout is a paid user we already spent acquisition cost on and almost lost. Simpler/faster/more-beautiful: the user gets the nudge they need at the right time without an operator in the loop.

## Problem

Today, recovering an abandoned checkout requires Al to (1) log into Stripe, (2) export a CSV of expired sessions, (3) SSH to the production box, (4) paste the emails into a curl body against `/api/ops/send-abandoned-checkout-recovery`, and (5) verify the send. He has done this once, with 234 emails. The endpoint exists; the cadence does not. Revenue from in-flight checkouts evaporates between the manual runs.

## Riskiest assumption

That `checkout.session.expired` webhook payloads from Stripe carry a usable customer email on a meaningful share of sessions where the user did not complete payment. If the email field is null on most expired sessions (because the user never reached the email step), the automated path emails nobody and we are back to manual.

**Smallest test to disprove**: Enable `checkout.session.expired` on the existing webhook endpoint in Stripe with log-only behaviour (no send), wait one week, and count: of the events received, how many carry `customer_details.email` or `customer_email`? If ≥60% do, proceed as written. If <60%, the spec changes — we would need to look up the email via the `customer` ID, which is a different storage shape and a different scope decision. Do this observation step **before** the implementation PR opens.

## Scope

**In**
- Subscribe the existing Stripe webhook handler in `src/routes/WebhookRouter.ts` to `checkout.session.expired`.
- New `abandoned_checkout_recovery_emails` table — `session_id TEXT PRIMARY KEY`, `user_email TEXT NOT NULL`, `sent_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Knex migration + `pnpm kanel` regeneration.
- New repository under `src/data_layer/` exposing an `INSERT … ON CONFLICT DO NOTHING` claim method that returns whether the row was newly inserted.
- New use case `SendAbandonedCheckoutRecoveryOnExpiryUseCase` that claims the row first, then delegates to the existing `SendAbandonedCheckoutRecoveryUseCase` from #2270. Email fires only when the insert wins.
- Sessions whose payload lacks a usable email are logged with their `session_id` and skipped (not crashed on, not retried).
- One-time backfill of the existing 234-email CSV via the current manual endpoint — run **before** enabling the webhook in the Stripe dashboard so there is no double-send window. Seed the dedupe table with those session IDs immediately after.
- The auto-fired sends flow into the same `/ops/performance` counter that the manual path already feeds — no new card, no new chart. Operator sees one number.
- Tests: happy path (claim succeeds → email fires), replay (claim is no-op → email does not fire), missing-email payload (skipped with structured log), bad signature (rejected before the case is reached — existing behaviour).

**Out**
- New email copy. The template from #2270 stands until we measure conversion.
- Subscription-cancellation recovery (separate funnel, separate copy).
- A cron fallback (Option B). If webhooks misbehave we revisit; do not pre-build both paths.
- A multi-touch recovery sequence. One email per session, full stop.
- Retiring the manual ops endpoint. Lives one more week as the break-glass tool. **Tracked as a follow-up issue** opened the same day this PR merges.
- An operator UI for the new table. Database access via the existing read-only postgres MCP is enough.

## User story

As a learner who started a Stripe Checkout for 2anki Pro but didn't finish, I want one well-timed reminder email after my session expires so I can pick up where I left off — without 2anki re-emailing me a week later for the same abandoned session.

## Acceptance criteria

- [ ] Webhook receives `checkout.session.expired`, claims the row in `abandoned_checkout_recovery_emails` via `INSERT … ON CONFLICT DO NOTHING`, and only invokes `SendAbandonedCheckoutRecoveryUseCase` when the insert wins.
- [ ] A second delivery of the same `session_id` (Stripe retry, replay, manual replay from the Stripe dashboard) returns 200 without sending a duplicate email.
- [ ] Signature verification still passes for the new event using the existing `WebhookRouter.ts` verification path — no second verifier introduced.
- [ ] Sessions with no email on the payload are logged at WARN with the session ID and skipped (no crash, no retry storm).
- [ ] The 234-email CSV is backfilled via the existing manual endpoint, and the corresponding 234 session IDs are seeded into the new dedupe table in the same operation.
- [ ] `/ops/performance` shows recovery-email volume for the trailing 7 and 30 days in the existing counter — the auto-fired sends are indistinguishable from manual sends in the count.
- [ ] A new GitHub issue is opened in the same PR titled "Retire `/api/ops/send-abandoned-checkout-recovery` after one week clean" and linked from the PR body.

## Leading indicator

**Recovery email volume per week** moves from ~0 (manual, Al-dependent) to ~30–50 (steady-state, webhook-driven). The 234-email backfill ships immediately on PR merge but is a one-time bump, not a sustained metric move.

Conversion rate from recovery email back to completed checkout is **not** measured by this work. That requires UTM or a session-linked CTA on the email and is a separate spec.

## Design notes

No user-facing UI changes. Email template `src/services/EmailService/templates/abandoned-checkout-recovery.html` ships as-is from #2270 — same envelope, same copy, same CTA. The user moment is unchanged: the user receives one email roughly 24h after Stripe expires their checkout session.

Operator-facing: the new auto-fired sends route through the same `/ops/performance` counter as the existing manual path. Do not add a new card or chart — Al should see one number for "recovery emails sent", not two. If, post-launch, the conversion-measurement work raises a question the current single number cannot answer, that is the trigger to add a card. Not before.

## Technical pre-flight

**Layers touched**: `routes/` (`WebhookRouter.ts` — new case in the existing `switch`), `usecases/` (new `SendAbandonedCheckoutRecoveryOnExpiryUseCase` sibling to the existing use case), `data_layer/` (new `AbandonedCheckoutRecoveryRepository`), one new migration. `controllers/StripeController.ts`, `services/EmailService`, and the entire `web/` tree are **not** touched.

**Files in play**:
- `src/routes/WebhookRouter.ts` — add the new `case "checkout.session.expired":` inside the verified block.
- `src/usecases/ops/SendAbandonedCheckoutRecoveryUseCase.ts` — existing, read-only reference for the email-send call.
- `src/usecases/ops/SendAbandonedCheckoutRecoveryOnExpiryUseCase.ts` — new.
- `src/data_layer/AbandonedCheckoutRecoveryRepository.ts` — new.
- `migrations/<timestamp>_add_abandoned_checkout_recovery_emails.js` — new.
- `src/data_layer/public/` — regenerated via `pnpm kanel` after the migration runs; do not hand-edit.

**Migration command**:

```
npx knex migrate:make add_abandoned_checkout_recovery_emails \
  --knexfile ./src/KnexConfig.ts \
  --migrations-directory ../migrations -x js
```

Then `pnpm kanel` to regenerate `src/data_layer/public/`.

**Dedupe storage shape**: New table is the right call. `subscriptions` rows do not exist for expired sessions (that's the point), `users` has no concept of "email we tried to recover", and adding a column to either widens a hot table for a single-purpose flag. The `session_id` primary key is the replay fence; the schema is small enough to drop cleanly if we kill the feature.

**Stripe webhook gotcha — surface in the PR body**: CLAUDE.md says "Stripe sync is manual only — never put `updateStripeSubscriptions` on a cron or `setInterval`." That rule is specifically about the **subscription reconciliation pull**, not about webhook event handlers. The existing `WebhookRouter.ts` already handles three webhook events; this PR adds a fourth event handler, which is the consistent pattern, not a violation. Reviewers will flag this if it is not addressed up front.

**Security and testing**:
- Signature verification is already handled at the top of the `switch` in `WebhookRouter.ts` via `stripe.webhooks.constructEvent` against the raw body. The new case sits inside that same verified block.
- Replay protection: Stripe retries on non-2xx and supports manual replay from the dashboard. `INSERT … ON CONFLICT DO NOTHING` on the `session_id` PK is the fence; it must succeed **before** the email send, not after.
- Concurrent delivery race: two webhook deliveries for the same session arriving at the same time both attempt the insert; the PK constraint makes exactly one win. Email fires only if the insert returns "newly inserted". No application-level locking needed.
- Test plan: unit-test the new use case with a mock repository and mock email-send (claim wins → email fires; claim is no-op → email does not fire; missing email → skipped with WARN log). Route-level test in `WebhookRouter.test.ts` mocking `stripe.webhooks.constructEvent` to return a `checkout.session.expired` payload.
- Log only the hashed session ID surrogate, not the raw session ID, in any non-WARN logs — Stripe session IDs are sensitive per `.claude/rules/security.md` ("Do not log … Stripe customer IDs, session IDs").

**Effort estimate**: **S–M**, leaning S. The wiring pattern is already proven three times in `WebhookRouter.ts`. New use case is ~30 lines, repository is ~15 lines, migration is trivial. Time is mostly tests + Stripe dashboard config (register the event, confirm `STRIPE_ENDPOINT_SECRET` is set). M if the 234-email backfill coordination is folded into the same PR.

## Open questions for the engineer

1. **Webhook vs cron — final call**: Recommendation is webhook. Confirm before coding. If the log-only observation week comes back with <60% email coverage, the spec changes — escalate.
2. **234-email backfill mechanics**: Run the manual endpoint with the existing CSV **before** enabling the webhook in the Stripe dashboard so there is no double-send window. After backfill, seed the 234 session IDs into the new dedupe table in the same script to defend against Stripe re-firing `checkout.session.expired` for old sessions during dashboard config. Confirm Stripe's re-fire behaviour here — if Stripe does not re-fire for already-expired pre-subscription sessions, the seed step is belt-and-braces; if it does, the seed step is required.
3. **Customer email source**: If a session lacks `customer_details.email`, v1 skips with a logged count. Look-up via `customer` ID (an extra Stripe call through `instrumentedAxios`) is a follow-up if the skip count is meaningful.
4. **Cleanup PR timing**: Open the follow-up issue in this PR's body. Cleanup PR ships seven days after the webhook is enabled in production, assuming no incidents in that window. Track from the Stripe dashboard enable timestamp, not the merge timestamp.
5. **Observability**: For v1, surface trailing 7/30 day counts in the existing `/ops/performance` counter — no new chart. If conversion measurement gets prioritised next, that is the moment to add a card.

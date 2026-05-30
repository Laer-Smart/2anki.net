# Spec: Stripe anonymous-id metadata for funnel join

## Outcome

A `checkout_completed` event fired from the Stripe webhook carries the same `anon_id`
the user's anonymous upload→download events carried, so the upload-funnel can join an
anonymous browsing session to the paid conversion it eventually produced.

## Problem

PR #2926 added durable upload-funnel events keyed by `user_id` OR `anonymous_id`
(cookie `anon_id`), read via `GET /api/ops/upload-funnel`. It flagged this gap: the
`checkout_completed` purchase event (emitted in `src/routes/WebhookRouter.ts`, the
`checkout.session.completed` handler, ~line 233) carries only `userId` from
`session.metadata.user_id` and no `anonymous_id` — a webhook request has no browser
cookie. So an anonymous upload→download session has no link to the paid conversion it
turned into, and the funnel cannot measure anonymous → paid.

The fix mirrors the existing `user_id` / `pricing_variant` pattern: those values reach
the webhook because the checkout controllers stamp them into the Stripe session
`metadata` at session-create time. We do the same for `anon_id`.

## Riskiest assumption + smallest test

**Assumption:** a meaningful share of paying users were anonymous earlier in the funnel.
If almost everyone signs in before paying, the join adds little.

**Smallest test:** ship it, then after a few days of real checkouts query whether any
`checkout_completed` rows arrive with a non-null `anonymous_id`. A non-trivial count
validates the assumption; near-zero invalidates it. There is no cheaper way to test
this than shipping — the value only exists once real anonymous users convert.

## Scope

**In:**
- Read the `anon_id` cookie in the three checkout controllers
  (`UnlimitedCheckoutController`, `PassCheckoutController`, `AutoSyncCheckoutController`)
  — each has `req` — and pass it through to its use case.
- In each use case (`UnlimitedCheckoutUseCase`, `CreatePassCheckoutUseCase`,
  `AutoSyncCheckoutUseCase`) add `anon_id` to the Stripe session `metadata` when present,
  exactly mirroring the optional `pricing_variant` spread already there.
- In the webhook `checkout.session.completed` handler, read `session.metadata.anon_id`
  and pass it as `anonymousId` to the `track('checkout_completed', …)` call, alongside
  the existing `userId`.

**Out:**
- No change to the funnel read service / `EventsQueryService` — it already reads
  `anonymous_id`.
- No migration — the `events` table already has the `anonymous_id` column
  (`migrations/20260605000000_events.js`).
- No GA4 changes.
- No new event types, no UI.

## Acceptance criteria

- A checkout started from a request that carries an `anon_id` cookie creates a Stripe
  session whose `metadata.anon_id` equals that cookie value (all three use cases).
- The webhook handler, given a session whose `metadata.anon_id` is set, emits a
  `checkout_completed` event carrying that value as `anonymousId` — alongside `userId`
  when `user_id` metadata is present.
- A checkout with no `anon_id` cookie behaves exactly as today (no `anon_id` key in
  metadata, `anonymousId` null on the event) — no regression.
- Testable end-to-end via the metadata round-trip, mocking Stripe at the SDK boundary
  (`stripe.checkout.sessions.create`) and asserting the emitted event's `anonymousId`.

## PII note

`anon_id` is a random opaque UUID (set by `anonIdMiddleware`, `randomUUID()`), not tied
to identity — safe to place in Stripe metadata. Never put email or other PII in
metadata; `track()` already strips PII-shaped prop keys but metadata bypasses that, so
the controller must pass only the opaque id.

## Open questions

- The anonymous pass path (`CreatePassCheckoutUseCase` with `pass_anonymous`) has no
  `user_id` but is exactly the case where `anon_id` matters most — confirm the cookie is
  still present on that request so the metadata round-trip works for anonymous passes.
- Should the join also cover the `pricing_variant` `checkout_completed` branch only, or
  every `checkout.session.completed`? (The current event fires only when
  `pricing_variant` is set — implementation should decide whether to widen.)

## Process note

Touches payments → `/implement` must run `/security-review` before merge.

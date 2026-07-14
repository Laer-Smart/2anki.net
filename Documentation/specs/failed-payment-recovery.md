# Failed-payment recovery (involuntary-churn nudge)

Status: DRAFT — payments hard rail. Requires the maintainer's explicit gate and a
`/security-review` before any implementation. This spec proposes no live change.

## Problem

Business metrics show ~10 failed payments/week — larger than the entire week's ~8 new-paid
conversions. A failed renewal charge is involuntary churn: the subscriber did not choose to
leave, their card expired, hit a limit, or bounced. Recovering even part of this is near-zero-CAC
MRR defense — cheaper than any acquisition dollar.

We already grant paid access during dunning: `updateStoreSubscription` treats `past_due` and
`unpaid` as access-granting statuses (`ACCESS_GRANTING_STATUSES` in `src/lib/integrations/stripe.ts`),
so a grace window exists. The gap is that we never *tell the user* their payment failed or give them
a one-click way to fix their card. Stripe's own retry emails are off/inconsistent for this account.

## What to build

A single recovery nudge triggered by Stripe's `invoice.payment_failed` webhook:

1. **Trigger:** add an `invoice.payment_failed` case to the `/webhook` switch in
   `src/routes/WebhookRouter.ts`. It is not currently handled (the `default` arm logs it as
   unhandled). No change to any charging, provisioning, or access logic.
2. **Resolve the account** from the invoice's customer (reuse `getCustomerId` +
   `stripe.customers.retrieve`, same as the existing subscription cases). Skip silently if no
   2anki account resolves (do not leak an unlinked-payment alert here — that path already exists
   for provisioning).
3. **Send one card-update email** with a link the user can click to fix their card. Two link
   options — the maintainer picks (see Open decisions):
   - **Option A (simplest, no Stripe config):** the failed invoice already carries
     `hosted_invoice_url` — a Stripe-hosted page where the customer can pay the open invoice and
     update the card. Zero new Stripe surface, no portal configuration.
   - **Option B (billing portal):** `stripe.billingPortal.sessions.create({ customer })` returns a
     managed card-update session. Requires the Stripe Customer Portal to be configured and a
     `return_url`. More flexible but more setup and a new Stripe call.
4. **Idempotency + cadence:** record each send in a new
   `failed_payment_recovery_notifications` table (mirror `subscription_recovery_notifications`:
   `id`, `email`, `stripe_invoice_id`, `sent_at`). Before sending, check we have not already
   emailed for this `stripe_invoice_id`. Stripe fires `invoice.payment_failed` once per retry
   attempt in the dunning schedule; without dedupe on the invoice we would email on every retry.
5. **Template:** `src/services/EmailService/templates/failed-payment-recovery.html`, following
   `.claude/rules/email-templates.md` exactly — mascot header, dark-mode block, responsive block,
   footer tagline. It carries an upsell-adjacent pitch (keep your subscription), so it **must**
   include the `{{unsubscribeUrl}}` footer and its send path **must** exclude
   `email_preferences.marketing_opt_out = true` recipients (see Open decisions — this classification
   is a maintainer call). The template file is scaffolded in this PR but wired to nothing.

## What NOT to build

- No change to charging, retry schedule, dunning grace, or `ACCESS_GRANTING_STATUSES`. Stripe owns
  retries; we only nudge.
- No auto-cancel or auto-downgrade on failure. The grace window already handles access; this is a
  nudge, not an enforcement mechanism.
- No new billing-portal surface in-product (Option B stays server-only if chosen).
- No SMS/push. One email per failed invoice, capped.
- No retroactive backfill of past failures. Forward-only from the day it ships.
- Do not reuse `subscription-recovery.html` — that template is for *unlinked* payments (a payment
  with no matching account), a different problem. This is a linked subscriber whose card failed.

## Suppression rules

- Skip if no 2anki account resolves for the customer.
- Skip if `marketing_opt_out = true` (pending the transactional-vs-marketing decision below).
- Skip if we already emailed for this `stripe_invoice_id` (per-invoice idempotency).
- Skip if the subscription is already `canceled`/`incomplete_expired` by the time we process
  (nothing to recover).
- Respect the existing SendGrid suppression list.

## Success metric

**Recovered subs ÷ failed payments** over a trailing 4-week window. A "recovery" = a subscription
that had an `invoice.payment_failed` and returned to `active` within the dunning window. Read from:
- `email_batch_sent` event with `campaign: 'failed_payment_recovery'` (send volume),
- a `customer.subscription.updated` transition `past_due|unpaid → active` following a recorded
  failed-payment notification (recovery signal),
- cross-check against `BusinessMetricsService` failed-payment count.

Baseline to beat: current involuntary-churn recovery is whatever Stripe's own retries recover with
no nudge. Target for the maintainer to set (proposed: recover ≥20% of failed payments that would
otherwise churn).

## Open decisions for the maintainer

1. **Transactional vs marketing.** A "your payment failed, update your card" email is arguably
   transactional (it concerns the user's paid service), not marketing — which would mean it should
   ship *without* the `marketing_opt_out` exclusion so opted-out payers still hear that their
   subscription is at risk. `email-templates.md` classifies any upsell-adjacent email as commercial.
   **Maintainer's call:** treat as transactional (no opt-out filter, no unsubscribe footer) or
   commercial (opt-out filter + unsubscribe footer). Default in this spec is commercial/conservative.
2. **Send timing / cadence.** Send on the first `invoice.payment_failed`, or wait until the 2nd/3rd
   retry so Stripe's silent retry can succeed first? Proposed: send on first failure (early nudge
   recovers expired cards fastest), one email per invoice, no follow-ups.
3. **How many retries / follow-ups.** Proposed: exactly one email per failed invoice. A second
   nudge near the end of the dunning window is a possible v2 but adds fatigue risk.
4. **Link mechanism.** Option A (`hosted_invoice_url`) vs Option B (billing portal). Proposed:
   Option A — no new Stripe config, no new managed session, the invoice URL fixes the exact open
   charge.
5. **Migration.** The dedupe table needs a Knex migration + `pnpm kanel` in the same
   implementation PR (hard gate). Confirm table shape before implementation.

## Implementation notes (for the eventual PR, not this one)

- New use case `SendFailedPaymentRecoveryUseCase` under `src/usecases/ops/`, constructed in
  `WebhookRouter.ts` with the notifications repo + email service (mirror
  `SendAbandonedCheckoutRecoveryOnExpiryUseCase`).
- New repository `FailedPaymentRecoveryNotificationsRepository` mirroring
  `SubscriptionRecoveryNotificationsRepository`, with `isMarketingOptedOut` + `claimInvoice`.
- New `IEmailService.sendFailedPaymentRecoveryEmail(to, link, token)` method + template load in
  `constants.ts` (this is the "wiring" deliberately omitted from the draft PR).
- Outside-in test: drive `invoice.payment_failed` through the webhook boundary with the Stripe SDK
  mocked; assert one email send, correct link, dedupe on second identical event, and opt-out skip.
- Payments hard rail: `/security-review` before merge; verify signature handling is unchanged and no
  charging side effect is introduced.

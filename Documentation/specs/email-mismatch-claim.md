# Spec: Self-serve subscription claim for email-mismatch billing path

## Problem

From r/notion2anki (u/ContributionNo2688, thread `1czl4mo`): *"I paid twice for the 2-euro per month to get unlimited cards for my decks that I exported from notion yet the site still tells me I've reached the limit, anyone else going through that? What can be done?"* The same user posted a follow-up on a separate thread (`1bf8uzc`) saying they had emailed support and were waiting.

The shape: a user pays Stripe with email A, signs up to 2anki with email B, and the subscription never attaches to their 2anki account because the join is `users.email → stripe.customers.email`. They keep hitting the free-tier limit on an account they believe they paid to unlock. Today the only fix is a manual SQL update by support — which means double-charges, frustrated posts in public, and a trust hit on the one path where trust matters most (they paid us money).

This is the worst-shaped funnel failure we ship: the user already converted, and they're being told they didn't.

## Goal

Users who paid Stripe with one email but registered to 2anki with another can reconcile their subscription from `/account` without emailing support.

## Approach

Add a new section on `/account`, between `PlanDetails` and `SubscriptionManagement`: **"Claim a subscription you paid for with a different email."** Collapsed by default; expand reveals an email input and a "Send confirmation email" button.

Submission hits a new `POST /api/subscriptions/claim` use case that:

1. Validates the submitted email shape; rate-limits per authenticated user ID (12 attempts / hour, modelled on `ShareRouter.ts:checkCounter`).
2. Looks up Stripe customers by that email via the existing `SubscriptionService.findActiveStripeSubscriptions(email)` path — never trust the client's claim alone.
3. **Always returns the same response** ("If a subscription exists for that email, we sent a confirmation link.") whether or not a customer was found. No enumeration oracle.
4. If a customer with an active subscription exists, mint a one-time confirmation token (`crypto.randomUUID()`), persist it to a new `subscription_claim_tokens` table keyed on `(user_id, stripe_customer_id, token_hash, expires_at)`, and send it via the existing magic-link send path to the **paying email** — not the supplied email-field value. (They are the same here, but the wording matters: the token can only land in the inbox the Stripe customer owns.)
5. The email links to `/account/claim?token=…`. That endpoint hits `POST /api/subscriptions/claim/confirm`, which atomically: (a) verifies the token, (b) rejects if the current user already has any active subscription, (c) sets `users.stripe_customer_id` on the row, (d) creates the `subscriptions` row if missing via the same code path the Stripe webhook uses, (e) marks the token consumed.
6. Every claim attempt — initiate, success, failure, token reuse — writes one row to a new `subscription_claim_audit` table (`user_id`, `email_hash`, `outcome`, `ip_hash`, `created_at`). Per `security.md`, the supplied email and IP are stored hashed via `lib/misc/hashToken`, never plaintext.

The migration adds `subscription_claim_tokens` and `subscription_claim_audit` and a `UNIQUE` constraint on `users.stripe_customer_id` (the race guard). `pnpm kanel` regenerates the types.

Copy on `/account`, per VOICE.md:
- Section heading: "Paid with a different email?"
- Helper: "If you paid Stripe with another email address, enter it here. We'll send a confirmation link to that address to attach the subscription to this account."
- Button: "Send confirmation email"
- Success toast: "Sent. Check that inbox for a confirmation link."
- Failure on confirm (already-claimed token): "This link is already used. Sign in and try again from /account if you need to reclaim."
- Failure on confirm (user already has active sub): "This account already has an active subscription. Cancel it first or contact support."

## Security model

Touches **payments + auth** — `/security-review` is required before the implementation PR merges.

Threats and mitigations:

| Threat | Mitigation |
| --- | --- |
| Account takeover by claiming someone else's subscription | The confirmation token is sent only to the Stripe customer's email on record — not to the supplied input. The attacker must control the paying inbox to land the token. |
| Subscription doubling (user ends up with two active subs) | The confirm step rejects if the current user already has any active subscription. The `UNIQUE` constraint on `users.stripe_customer_id` makes the double-attach impossible at the DB layer. |
| Email enumeration (probing whether `victim@example.com` is a paying customer) | The initiate response is identical for "no customer", "customer with no active sub", and "customer found, email sent". Rate-limited per `user_id` to 12 attempts / hour; per IP to 60 / hour. |
| Brute-forcing valid tokens | `crypto.randomUUID()` (128 bits); 15-minute expiry; single-use; tokens are hashed at rest (`hashToken`); attempts > 5 against a token bind it to `consumed=true` with an `invalid` outcome row. |
| Race on concurrent claims for the same Stripe customer | Confirm runs in a single Knex transaction with `SELECT … FOR UPDATE` on the `users` row plus the `UNIQUE` constraint on `stripe_customer_id`. The second claim hits a constraint violation, returns a generic "couldn't claim" message, and writes an audit row. |
| Logging the supplied email or IP in plaintext | `email_hash` and `ip_hash` columns; never log either through `console.log` or Sentry. The supplied email is also redacted from `ErrorHandler` responses. |
| Token reuse after success | Confirm step marks `consumed_at`; subsequent uses 404 with an audit row tagged `replay`. |
| Sending a claim email to a 2anki user who is being phished | The email body says "Someone is trying to attach your 2anki subscription to a different 2anki account. If that wasn't you, ignore this email — no action is needed." Per `email-templates.md`, this is a transactional email; no unsubscribe footer. |

## What NOT to build

- **No magic-link auto-login from the claim email.** The token attaches the subscription to the currently authenticated session only. If the user isn't logged in when they click, they go to `/login?next=/account/claim?token=…` and authenticate normally. Auto-login from an email link is a separate security review.
- **No admin-side bulk claim tool.** The flow is user-initiated; ops fixes the long tail by hand the same way they do today.
- **No merging of two existing 2anki accounts.** Claim only attaches an unattached Stripe customer to one 2anki user. If the user has two 2anki accounts they want merged, that's a separate spec.
- **No transferring decks between accounts.** This spec moves a subscription, not content.
- **No changing the registered email on `/account`.** That's a separate concern with its own verification flow; conflating them widens the blast radius.
- **No retry of failed confirmations through the same token.** A bad token is dead; the user starts over from `/account`.

## Success metric

- ContributionNo2688-shaped tickets ("I paid but I'm still gated") drop to near-zero in the support inbox within 4 weeks of rollout. Today this is the single most common payment-related ticket; the spec ships if support stops seeing it.
- `/api/subscriptions/claim/confirm` success rate above 70 % of attempts. The remaining 30 % are typos, no-subscription-exists, or "user already has an active sub" — all expected.
- Stripe double-charge refunds initiated by support drop by at least half. Today this is the second-order cost of the bug — users pay twice while waiting for support.

## Open questions

1. **Which email-sending path do we reuse for the confirmation token?** `EmailService.sendMagicLinkEmail` is the closest shape but its template is auth-flavoured. Do we build a new `sendSubscriptionClaimConfirmation` against a new template, or pass a variant flag to the magic-link path? (The `email-templates.md` rule discourages partials — leaning toward a new template.)
2. **What's the right rate-limit budget?** 12 / hour / user and 60 / hour / IP are guesses based on the `ShareRouter` precedent. Worth confirming against the magic-link-send rate limit if one exists.
3. **Does `users.stripe_customer_id` already enforce uniqueness?** A grep shows the column exists on `users` but no `UNIQUE` constraint is visible in the migrations folder. The migration in this spec adds it — needs a check for existing duplicates that would block the constraint.
4. **Does Kanel need a migration?** Yes — two new tables plus a `users` constraint. Standard `npx knex migrate:make` then `pnpm kanel`. No edits to `src/data_layer/public/`.
5. **Does the spec need to handle Stripe-tax / VAT name mismatches?** Some EU customers have a billing email that differs from their Stripe `customer.email` because of how the checkout collects tax IDs. Confirm `findActiveStripeSubscriptions` matches against the `customer.email` field and not the `receipt_email` or invoice billing detail.
6. **Should the audit table be readable from `/api/ops`?** Useful for "is this attack pattern real?" — but adds an admin surface. Defer until we see the first abuse pattern post-launch.

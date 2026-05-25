# Stripe webhook audit — W21 2026-05-18→2026-05-24

W21 context: MRR -14.1%, new-paid 29→1. Day Pass webhook incident affected users 19848 and 19605 (paid, never unlocked). User 19374 hit the Ankify silent-zero class of failure (addressed in #2737 / PR #2780).

## Webhook event coverage

| Product | Event | Handler path | Fallback if webhook drops | Last successful delivery | Test-purchase result | Unlock confirmed |
|---------|-------|--------------|--------------------------|--------------------------|----------------------|-----------------|
| Day Pass (24h) | `checkout.session.completed` (pass_kind=24h) | `src/routes/WebhookRouter.ts` → `upsertWithExtension` on `user_passes` (authenticated) or `anonymous_passes.insert` (anonymous) | Stripe retries up to 3 days. `pass-reconcile` job heals missing rows within 15 min of grant. | PENDING — Alexander (Stripe dashboard → Developers → Webhooks → endpoint → event log) | PENDING — Alexander (live purchase test) | PENDING — Alexander (DB query below) |
| Week Pass (7d) | `checkout.session.completed` (pass_kind=7d) | Same as Day Pass | Same | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Auto Sync ($30/mo) | `customer.subscription.created` | No explicit handler. Created fires `updateStoreSubscription` via `customer.subscription.updated` if Stripe sends it; otherwise healed on next active event. | `customer.subscription.updated` carries current state on next billing cycle. | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Auto Sync ($30/mo) | `customer.subscription.updated` | `src/routes/WebhookRouter.ts` → `updateStoreSubscription` → upserts `subscriptions` table | Next billing cycle event re-syncs. | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Auto Sync ($30/mo) | `customer.subscription.deleted` | `src/routes/WebhookRouter.ts` → `updateStoreSubscription` sets active=false | Subscription row stays active until next `updated`/`deleted` event. | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Unlimited monthly | `customer.subscription.created` | Same path as Auto Sync | Same | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Unlimited monthly | `customer.subscription.updated` | Same path as Auto Sync | Same | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Unlimited monthly | `customer.subscription.deleted` | Same path as Auto Sync | Same | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Unlimited yearly | `customer.subscription.updated` | Same path as Auto Sync | Same | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |
| Lifetime ($96+) | `checkout.session.completed` (amount≥9600, product in LIFETIME_PRICE_IDS) | `src/routes/WebhookRouter.ts` → `users.updatePatreonByEmail` sets patreon=true | No automated fallback — requires manual DB fix or re-purchase. | PENDING — Alexander | PENDING — Alexander | PENDING — Alexander |

## Day Pass incident analysis — users 19848 and 21605

**Root cause (from code audit):** PR #2761 (merged 2026-05-24) fixed the anonymous purchase path. The authenticated pass path was already present but required `RequireAuthentication` — logged-in users could initiate checkout. The webhook handler (`src/routes/WebhookRouter.ts` lines 199–280) processes `checkout.session.completed` with `pass_kind` metadata.

**Pre-#2761 authenticated path:** `CreatePassCheckoutUseCase` set `user_id` in session metadata. The webhook handler read `sessionMeta.user_id`, called `UserPassRepository.upsertWithExtension`. If `STRIPE_ENDPOINT_SECRET` was misconfigured, `stripe.webhooks.constructEvent` would throw, Stripe would receive a 400, and retry up to 3 days.

**Does #2761 fix 19848/21605?** No. #2761 only adds the anonymous path. The authenticated grant path for 19848/21605 is unchanged. Their passes were never inserted because the webhook failed (likely secret misconfiguration or a prior bug where `user_id` was not set in checkout metadata).

**Current state (code as of main):** The webhook handler correctly reads `user_id` from metadata and calls `upsertWithExtension`. If the secret is now correctly configured, future purchases will work. Users 19848/21605 still have no pass rows.

**Resolution path for 19848/21605:**

```sql
-- Verify: do they have any pass rows?
SELECT * FROM user_passes WHERE user_id IN (19848, 21605);

-- Verify: did Stripe receive/deliver the webhook?
-- Check Stripe dashboard → Developers → Webhooks → endpoint → event log
-- Filter by checkout.session.completed, date of purchase

-- Heal option A: manual insert (if purchase intent confirmed in Stripe)
INSERT INTO user_passes (user_id, kind, expires_at, stripe_payment_intent_id)
VALUES
  (19848, '24h', NOW() + INTERVAL '24 hours', '<payment_intent_id_from_stripe>'),
  (21605, '24h', NOW() + INTERVAL '24 hours', '<payment_intent_id_from_stripe>');

-- Heal option B: issue refund via Stripe dashboard and notify users
```

**PENDING — Alexander:** confirm whether the payment_intent_id is known, whether refund or manual grant is the right path, and whether the webhook secret has been updated.

## Reconciliation job

Added in this PR: `src/lib/payments/schedulePassReconciliation.ts` runs every 15 minutes, scans Stripe payment intents created in the last hour, and inserts missing `user_passes` / `anonymous_passes` rows. Activated on startup when `STRIPE_KEY` is set.

Log line confirming a heal: `[pass-reconcile] mismatches found` (console.error) followed by `[pass-reconcile] completed` (console.info) with `healed: N`.

## Test-purchase checklist (Alexander, Stripe test mode)

Prerequisites:
1. Ensure `STRIPE_KEY` points to the test-mode secret key.
2. Ensure `STRIPE_ENDPOINT_SECRET` is the test-mode webhook signing secret for the local listener (`stripe listen --forward-to localhost:2020/webhook`).
3. Ensure `PASS_24H_PRICE_ID`, `PASS_7D_PRICE_ID`, `AUTO_SYNC_PRICE_ID`, `UNLIMITED_MONTHLY_PRICE_ID`, `LIFETIME_PRICE_IDS` are set to test-mode price/product IDs.

### Day Pass (24h) — authenticated

1. Log in to a test account.
2. POST `/api/checkout/pass/24h` → get `session_url`.
3. Complete Stripe test checkout using card `4242 4242 4242 4242`.
4. Stripe fires `checkout.session.completed` to local listener.
5. Confirm: `SELECT * FROM user_passes WHERE user_id = <test_user_id>` shows a row with `expires_at ≈ now() + 24h`.
6. Confirm: conversion endpoint no longer returns `MonthlyLimitError` for this user.

### Day Pass (24h) — anonymous

1. Do not log in.
2. POST `/api/checkout/pass/24h` → get `session_url`.
3. Complete Stripe test checkout.
4. Capture `?pass_session=<session_id>` from redirect URL.
5. Confirm: `SELECT * FROM anonymous_passes WHERE stripe_session_id = '<session_id>'` shows a row.
6. Confirm: conversion with `X-Pass-Token: <session_id>` header succeeds past the quota.

### Week Pass (7d)

Same steps as Day Pass, using `/api/checkout/pass/7d`.

### Auto Sync

1. Log in to a test account.
2. POST `/api/checkout/auto-sync` → get `session_url`.
3. Complete Stripe test checkout.
4. Stripe fires `customer.subscription.created` then `customer.subscription.updated`.
5. Confirm: `SELECT * FROM subscriptions WHERE email = '<test_email>'` shows `active = true` and `stripe_product_id = <AUTO_SYNC_PRODUCT_ID>`.
6. Confirm: Ankify gate passes for this user (`hasAnkifyAccess` returns true).

### Unlimited (monthly)

1. Log in.
2. POST `/api/checkout/unlimited` with `{ "interval": "month" }`.
3. Complete checkout.
4. Confirm: `subscriptions` row is active.

### Lifetime

1. Log in.
2. Use a test price with amount ≥ 9600 (or set `LIFETIME_PRICE_IDS` to match the test price product).
3. Complete checkout.
4. Confirm: `SELECT patreon FROM users WHERE email = '<test_email>'` returns `true`.
5. Confirm: all Ankify gates pass.

### Reconciliation job

1. Temporarily break the webhook secret (`STRIPE_ENDPOINT_SECRET=wrong`).
2. Complete a Day Pass purchase.
3. Restore the correct secret.
4. Wait ≤ 15 minutes.
5. Confirm: `SELECT * FROM user_passes WHERE ...` shows the row was healed.
6. Confirm: `[pass-reconcile] mismatches found` appears in pm2 logs.

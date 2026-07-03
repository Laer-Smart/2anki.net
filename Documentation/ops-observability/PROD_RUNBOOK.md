# Prod diagnosis runbook

Read-only production recipes for the recurring billing/access questions support raises. All of these run against the prod box over SSH; none mutate data except the one explicitly-flagged `/ops` button.

**Access pattern.** The prod box checks out this repo at `/home/alemayhu/src/github.com/2anki/2anki.net` (legacy name). `psql` and `DATABASE_URL` live there; source the env, never echo the secret:

```bash
ssh alemayhu@2anki.net 'cd /home/alemayhu/src/github.com/2anki/2anki.net && set -a && . ./.env 2>/dev/null; psql "$DATABASE_URL" -P pager=off -c "<query>"'
```

Confidentiality: never put a customer email, `cus_…`/`pi_…` id, or reporter name into a commit, PR, or issue (see `.claude/rules/support-confidentiality.md`). A numeric user id is fine in an internal note; strip it from anything public.

---

## 1. Paying user stuck on the free tier

Symptom: "I paid but the site still limits me." Stripe shows the subscription **Active**, but the app treats them as free.

**Gate fact.** `isPaying` (`src/lib/isPaying.ts`) is true only when `users.patreon` **OR** an active `subscriptions` row (matched on lowercased `email`/`linked_email`) **OR** an active trial/pass. No row → free tier. The check runs per-request in `configureUserLocal`, so once a row lands the user only needs to refresh/re-login — no restart.

**Diagnose (read-only).** Confirm the user has no active subscription row:

```sql
SELECT id, patreon, stripe_customer_id FROM users WHERE email ILIKE '<email>';
SELECT id, active, stripe_product_id FROM subscriptions WHERE email ILIKE '<email>' OR linked_email ILIKE '<email>';
```

Cross-check the Stripe dashboard (Customers + Subscriptions). Stripe **Active** + no active `subscriptions` row = unprovisioned.

**Fix.** `/ops/commands` → **Stripe subscriptions → Sync now** (PR #2845). It runs the forward sync — lists active Stripe subs and upserts the row active. `STRIPE_SYNC_ON_STARTUP` (§4) is the automatic backstop, but the button is the on-demand fix.

---

## 2. "Unlinked payment / no account resolved" webhook alert

The `[webhook] unlinked payment: no account resolved for active subscription` alert fires from `WebhookRouter` on `customer.subscription.created`/`updated` when the sub is active but no account resolves.

**Do NOT count from logs.** The `customer_id_hash` in the alert is salted (CryptoJS AES, `U2FsdGVkX1…` = "Salted__"), so the *same* customer hashes differently every emit, and Stripe re-sends `subscription.updated` periodically. N alert lines ≠ N subs (a June 2026 window was 19 lines but only 2 distinct subs).

**Account resolution** (`resolveAccountForSubscription` in `src/lib/integrations/stripe.ts`) tries 3 keys: `lower(trim(users.email))` = sub email; `users.email` = `linked_email`; `users.stripe_customer_id` = `payload->>'customer'`. Orphaned = fails all 3.

**Count distinct orphans (read-only).** The full correlated `NOT EXISTS` times out (JSON extract × users seq-scan). Use a two-pass form — materialize the lowercased user-email set once, then check `stripe_customer_id` only on the tiny candidate set:

```sql
WITH ulc AS (SELECT lower(trim(email)) e FROM users WHERE email IS NOT NULL)
SELECT s.id, s.created_at::date, s.stripe_product_id
FROM subscriptions s
WHERE s.active = true
  AND lower(trim(s.email)) NOT IN (SELECT e FROM ulc)
  AND (s.linked_email IS NULL OR lower(trim(s.linked_email)) NOT IN (SELECT e FROM ulc));
-- then for the few rows: EXISTS(SELECT 1 FROM users u WHERE u.stripe_customer_id = s.payload->>'customer')
```

**Standing decision (2026-06-25):** these alerts are **not** lost revenue — they are old paying users who never connected their email to an account. Known and accepted; don't flag as revenue-at-risk. Orphans that fail all 3 keys are not webhook-auto-fixable (no shared key to link on); a tiny count is a manual reconcile (look up each `cus_…` in Stripe → link or cancel). Only escalate if the distinct count climbs sharply or a new pattern appears.

---

## 3. Was a Day Pass granted and honored?

**Data model.** Day Pass purchases land in `user_passes` (`user_id` int, `kind` `'24h'|'7d'`, `expires_at`, `stripe_payment_intent_id`), one row per payment intent (idempotent on pi). Re-buying after expiry creates a new row; buying while active extends the existing `expires_at`.

**Access path.** `configureUserLocal` runs `UserPassRepository.findActive(user_id, now)`; a non-null row sets `res.locals.subscriber = true`, which bypasses the monthly limit (the limit path otherwise redirects to `/limit?kind=…`). Granted + active pass == unlocked.

**Confirm (read-only).** A non-null row here means `subscriber` is true right now:

```sql
SELECT id, kind, expires_at, (expires_at > now()) AS active_now, stripe_payment_intent_id
FROM user_passes WHERE user_id = <id> AND expires_at > now()
ORDER BY expires_at DESC LIMIT 1;
```

**Logs** (live pm2 buffer spans ~the last day; older windows need on-disk files). Markers of a working purchase: `POST /api/checkout/pass/24h 200`, `pass.granted { user_id, payment_intent_id_hash }` (the pi is hashed by design), `GET /upload/?from=pass 200`. A `/limit?kind=` redirect for that user means the pass was **not** honored.

**Gotchas.** Lookup is by email → `users.id`; `users` has no `owner` column. `uploads.owner` is an **integer** (= user id) but `jobs.owner` is a **varchar** — compare with `'19848'`, not `19848`.

---

## 4. `STRIPE_SYNC_ON_STARTUP` — the reconciliation backstop

As of **2026-05-27**, `STRIPE_SYNC_ON_STARTUP=true` is set in the prod `.env`. `server.ts` fires `updateStripeSubscriptions()` in the background on boot when this is `'true'`, so **every pm2 restart and every blue-green deploy re-runs** the full forward sync (all active Stripe subs) + `reconcileActiveSubscriptions` (one Stripe `subscriptions.retrieve` per active DB row — a couple of minutes for ~770 rows).

**Reconcile is safe.** It only deactivates a row when Stripe returns `canceled`/period-ended or `404` for that specific subscription id — it never mass-deactivates from the active-list count (the forward `subscriptions.list({status:'active'})` returned only ~171 while the DB had ~775 active; reconcile still checks each by id). #2848 throttled the forward pass to 5 concurrent `customers.retrieve`, so it no longer trips Stripe's rate limit or competes with live payment traffic.

**Decision (2026-05-27): the flag stays ON permanently** as the reconciliation backstop. This does not violate the CLAUDE.md "Stripe sync is manual only" gotcha — that rule bans cron/`setInterval`, not a throttled sync on boot.

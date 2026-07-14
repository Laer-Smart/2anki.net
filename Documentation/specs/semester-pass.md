# Semester Pass — a ~4-month one-time tier (#3573)

Status: **DRAFT — pricing hard rail.** Ships no code. Requires the maintainer's gate, a Stripe price created dashboard-side, a `/security-review` on the wiring PR, and — critically — a pre-build cannibalization pull (below) before any implementation.

## Trio synthesis
- **PM:** Build it. $14.99 one-time / 120 days / no auto-renew captures the semester-rhythm churn the monthly sub keeps losing. Gate on a cannibalization pull first.
- **Engineer:** No migration needed (`kind` is plain text). Config + code across the existing pass machinery; `WebhookRouter`/`StripeController` are mandatory-worktree paths.
- **Resulting plan:** add one pass kind, one checkout route, one duration branch, labels + a pricing card — after proving it's incremental, not a discount on revenue we'd already get.

## Outcome + goal alignment
Revenue lever (not user count). Monetizes the exact churn segment we lose today: 71–78% of churn is "finished what I needed," 38% cancel at 6+ months on a semester rhythm, only 8% of pass buyers ever subscribe. A term-matched one-time purchase removes the churn event entirely — the buyer never has to cancel.

## Problem
Willingness-to-pay in this market is small and one-time: "$0.99 passed, $5 fair, $30 rejected, subscriptions grumbled about." Day/Week passes fit that shape (66% of checkouts are passes) but only cover a burst; the monthly subscription fits it badly (grumble + churn). There is no product between "one week" and "monthly subscription" for the student who needs it for a whole term and then is done.

## Riskiest assumption + the pre-build gate (do this FIRST, no code)
**Assumption:** a Semester Pass is *incremental* revenue, not a discount on revenue we'd otherwise capture.
**Cannibalization pull (prod, read-only — run before building):** do current Day/Week pass buyers return ~4 months later and buy again, or do they take a monthly sub and cancel?
- If they **re-buy passes on a semester cadence** → Semester Pass mostly discounts revenue we'd already get (weak — reconsider price or hold).
- If they **take a sub and churn** (the "finished what I needed" pattern) → Semester Pass is genuinely incremental (build).
Read from `user_passes` (repeat buyers by `user_id`, inter-purchase interval) cross-checked against the cancel-reason mix. **This spec does not graduate to implementation until that pull says incremental.**

## Scope
**In:** one new pass kind sold as a one-time Checkout SKU with a ~4-month entitlement, surfaced on the pricing page + pass CTAs.
**Out (do NOT build):** auto-renewal, a "semester" calendar picker, proration, any new gated feature set. It is the existing pass entitlement with a longer clock and a new SKU.

## Parameters (PM)
- **Price:** $14.99 one-time (below the $30 rejection ceiling, above the $5 "one need" anchor, cheaper than 2 months of the $7.99 sub).
- **Term:** 120 days, **no auto-renew** (a hard stop matches the tribe and the usage rhythm; auto-renew reintroduces the subscription grumble).
- **Entitlement:** same access a Day/Week pass grants (kind-agnostic `findActive`), just a longer `expires_at`.

## Technical pre-flight (engineer — no migration)
`kind` is plain `text` in both `migrations/20260516000000_add_user_passes.js` and `20260801000000_add_anonymous_passes.js` (no enum, no CHECK), so a new value is **config + code only — no migration, no kanel**.
- **Widen the kind:** `src/data_layer/UserPassRepository.ts:3` `PassKind` += `'4mo'`; `src/controllers/helpers/mapEntitlement.ts:12` `PASS_KINDS` += the kind.
- **Checkout:** new `/api/checkout/pass/4mo` in `src/routes/CheckoutRouter.ts` reading a new `PASS_4MO_PRICE_ID` env (mirror the 503-when-unset guard); `CreatePassCheckoutUseCase` is already generic over `passKind`.
- **Access grant + expiry (mandatory-worktree):** `src/routes/WebhookRouter.ts` — add `DURATION_4MO_MS` and widen the `checkout.session.completed` guard/duration branch to include the kind. `upsertWithExtension` already sets `expires_at = base + durationMs`.
- **Access read (mandatory-worktree):** `StripeController.ts` `findActive` is kind-agnostic → grants access automatically. No change beyond the label paths.
- **Labels / prices / CTAs:** `AccessBanner.tsx` `PASS_LABELS` += `'4mo':'Semester Pass'`; `PricingPage` + `PassCards.tsx` new card; `payment.links.ts` `PASS_PRICES` += the string; `Backend.ts` checkout path switch; `Sidebar.tsx` / `getUserLocals.ts` unions.
- **Pass-ladder:** in `GetPassLadderOfferUseCase.ts`, **exclude** the semester pass from the ladder math — it's the ladder's destination, not a rung (recommended default).
- **IAP (out of scope unless native app sells it):** `src/usecases/iap/products.ts` would need a `'semester.4mo'` product + the `Extract` widened.

## Hard rails / gates
1. **Cannibalization pull passes** (above) — the go/no-go.
2. `PASS_4MO_PRICE_ID` documented in `src/env.example` with the safe default (unset → 503 "not available"); the real Stripe price created dashboard-side before launch.
3. `WebhookRouter.*` + `StripeController.*` edited in a worktree (`EnterWorktree`).
4. `/security-review` on the wiring PR; verify no charging/retry logic changes and the webhook signature path is untouched.

## Success metrics (surface-lifecycle gate)
- **Day-7:** ≥15% of pass checkouts choose Semester over Day/Week AND net pass revenue is up (not just remixed). A day-7 prod usage event ships in the wiring PR.
- **T+30:** revenue-per-Semester-buyer > revenue-per-Day/Week-buyer; a T+30 keep/remove issue is created at merge.

## Open decisions for the maintainer
- Price ($14.99) and term (120 days vs calendar-4-months) — confirm or adjust.
- Whether the native app sells it (adds the IAP touchpoints) or web-only for v1.
- Whether buying a Semester Pass suppresses the pass-ladder upsell (recommended: yes).

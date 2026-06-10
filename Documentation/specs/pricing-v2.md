# Pricing v2 core

## Goal

Introduce new Unlimited price points behind a global `pricing_v2` feature flag, with a grandfather window so existing accounts keep legacy pricing through a lock-in deadline.

## Price points (pending sign-off)

- v2 monthly: $7.99 (lookup_key `v2_monthly`)
- v2 annual: $64, $5.33/mo, save 33% (lookup_key `v2_annual`)
- Legacy monthly: $6 — Legacy annual: $60

## Grandfather rules

- Cutover constant (in code, not env): `2026-06-15T07:00:00Z`.
- Lock-in window end: `2026-06-21T21:59:00Z` (2026-06-21 23:59 CEST).
- An account sees legacy pricing when the flag is on AND `created_at < cutover` AND `now < window end`. Otherwise v2.
- Flag off → legacy pricing for everyone (today's behavior, byte-identical numbers).

## Workstreams

1. `scripts/pricing-v2.ts` — idempotent Stripe price creation (lookup_key lookup first), test/live mode detection from key prefix, `--live` + interactive confirm for live, Step 0 catalog print, reuse existing Unlimited product.
2. Server: cohort resolution (`pricingV2.ts`), `StripePriceResolver` (cache + fallback), `UnlimitedCheckoutUseCase` resolves v2 by lookup_key with legacy env fallback, `GET /api/checkout/prices` returns cohort-correct numbers + lock-in deadline.
3. Web: annual default, UnlimitedCard price-above-toggle, terms line, error state, one primary CTA, LockInBanner.
4. Analytics: `checkout_started` (server), `plan_interval_selected`, `lock_in_banner_shown`, `lock_in_banner_clicked` (client).
5. Playwright E2E + 6h scheduled checkout smoke.

## Acceptance criteria

- Post-cutover account sees $7.99/$64; pre-cutover sees $6/$60 through window then v2.
- Annual preselected on load.
- `pricing_v2` off → today's behavior for everyone.
- Lock-in banner only for logged-in free users inside the window.

## Out of scope

- Live Stripe price creation, flag flip, cutover-timestamp finalization — gated on price sign-off.
- Per-tier caps, replace-mode pricing, currency localization beyond Stripe's checkout conversion.

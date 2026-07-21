# Developer API tiers — flat plans, one-button Stripe provisioning

**Goal:** first developer-tier revenue with zero manual Stripe dashboard work and no metered-billing infrastructure at launch.

**Context:** #3687 (P5), the 2026-07-21 trio on #3727 (MCP stays freemium on the personal sub — untouched here), and the decision that personal Unlimited must not include bulk API volume.

## The problem being solved

Today an API key inherits its owner's personal quotas: a $7.99 Unlimited subscriber gets unlimited API volume. Any paid developer tier is dead on arrival while that holds — Unlimited undercuts every price point. Separating API-key volume from personal-plan volume is the prerequisite AND the revenue mechanism.

## Tiers (flat monthly caps, no overage at v1)

| Tier | Price | Cards/month via API keys | Rate limit | Notes |
| --- | --- | --- | --- | --- |
| Sandbox | free | 100 | 5 req/min | default for every key; "Powered by 2anki" required (terms, not enforced in code at v1) |
| Starter | $29/mo | 5 000 | 30 req/min | |
| Growth | $99/mo | 30 000 | 60 req/min | hard cap at v1; warning email at 80% |
| Custom | unpublished (≥$299) | >100 000 | negotiated | email support@2anki.net; no checkout |

- **No overage billing at v1.** Overage is the only requirement that forces Stripe meters/Metronome. Hard cap + 80% warning email + a cap error carrying an upgrade link (same pattern as the MCP paywall string) covers churn risk. Revisit overage only when a real Growth customer approaches the cap.
- **Personal plans and API volume are now separate.** API-key requests meter against the developer tier only. A personal Unlimited sub without a dev tier gets Sandbox volume through keys. Personal-use surfaces (web, native, MCP-as-consumer) are unchanged.
- **Grandfathering:** `patreon` (lifetime) accounts keep uncapped API keys — they were promised the API during beta. Every other existing beta key drops to Sandbox at launch; announce by email before flipping.

## One-button Stripe provisioning (`/ops/commands`)

`POST /api/ops/commands/create-developer-tiers` (RequireOpsAccess; same family as the retired `create-pricing-v2-prices` route):

1. For each of Starter and Growth: find product by metadata `2anki_dev_tier=<key>` (`stripe.products.search`); create product + monthly recurring price if missing. Livemode follows the configured key.
2. Upsert a `developer_tiers` row per tier: `tier_key, stripe_product_id, stripe_price_id, monthly_card_limit, requests_per_minute, active`. This table — written only by the command — is the single source of truth; no env vars, no hand-edited config.
3. Idempotent: re-running finds existing products by metadata and reconciles the table; response JSON lists created vs found. Price changes are new prices (Stripe prices are immutable) with the old one deactivated in the table.
4. Ops UI: one button on the ops Commands tab, result rendered inline.

Checkout and activation reuse the existing subscription machinery end to end: existing checkout flow with the new price id, existing webhook writes the `subscriptions` row, `STRIPE_SYNC_ON_STARTUP` reconcile keeps it honest. Tier resolution = active subscription row whose `stripe_product_id` is in `developer_tiers`.

## Metering + enforcement

- New table `api_key_usage` (or reuse events): per-user monthly card count for API-key-authenticated conversions, incremented where `card_count` is already known at job completion.
- `RequireApiKey` path: resolve tier → per-key-owner rate limit (shared `InMemoryRateLimiter`) → monthly cap check before conversion. Cap error: "Monthly API card limit reached (N of M). Upgrade at https://2anki.net/pricing?from=api" — fail closed, deck not created.
- 80% warning email, once per month per user (dedupe table or suppression-style check).

## /pricing Developers section

Fourth section under the personal plans: Sandbox (Get a key → /developers), Starter and Growth (checkout buttons), Custom (email link). Copy per VOICE.md; designer review in the UI PR (trio policy). `plan_interval_selected`-style event: `dev_tier_checkout_clicked`.

## Build order (each its own PR)

1. `feat:` `developer_tiers` + `api_key_usage` migrations (kanel in-PR) + tier resolution + cap/rate enforcement on the API-key path. Ships dark — everything resolves to Sandbox/lifetime until tiers exist.
2. `feat:` ops provision command + Commands-tab button.
3. Alexander clicks the button on prod. Verifies products in Stripe dashboard (read-only look, no setup).
4. `feat:` /pricing Developers section + checkout wiring + cap-warning email (trio-reviewed UI).
5. Announcement email to existing beta key holders + changelog.

## Not building

- No Metronome, no Billing Meters, no overage invoicing.
- No per-tool or per-endpoint pricing; cards are the only unit.
- No attribution enforcement in code; terms line only.
- No changes to MCP consumer freemium (#3727) or personal plans.

## Success metric

First `developer_tiers` product subscription = the metric. Secondary: dev-tier checkout clicks from /pricing (`from=api` funnel), API cap-hits per week (demand signal for tier sizing). Read at the weekly retro; T+30d adoption-review issue on the /pricing section per surface lifecycle.

## Open questions for Alexander

1. Confirm Sandbox-for-everyone (including personal Unlimited subs) — the cannibalization guard, but it takes volume away from paying personal subscribers who currently enjoy unlimited API in beta.
2. Rate-limit numbers (5/30/60 req/min) are proposals; the limiter is in-memory per instance, so treat them as approximate.
3. Announcement timing for the beta-key volume drop.

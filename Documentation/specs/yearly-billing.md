# Spec: Yearly billing for Unlimited

### Trio synthesis

- **PM:** Yearly Unlimited at $60/yr (2 months free) via a Monthly/Yearly toggle on the Unlimited card. Riskiest assumption is whether yearly is accretive or dilutive — run the Stripe tenure query before building.
- **Designer:** One in-card toggle, not a split card and not a global toggle. Two-segment radiogroup; CTA stays `Upgrade`; yearly price displayed as `$60 / yr` with a `2 months free` hint underneath.
- **Engineer:** S effort. New `UnlimitedCheckoutUseCase` + `POST /api/checkout/unlimited` mirroring `AutoSyncCheckoutUseCase`. No migration. Webhook handler is interval-agnostic. Retire the hardcoded `buy.stripe.com` link in the same PR.
- **Agreement:** Single in-card toggle on Unlimited only; real Stripe Checkout session for both cadences (retire the hosted payment link in the same PR); Auto Sync and Lifetime out of scope; $60/yr is the working SKU.
- **Conflict:** PM offered `$60/yr — 2 months free` as the price string; designer asked for one shape, not two (price string and savings hint, not both stacked). Resolution: price renders as `$60 / yr` to match the existing `/ mo` suffix; the savings hint `2 months free` lives on a separate muted line under the price.
- **Resulting plan:** Replace the hardcoded Unlimited payment link with a real Checkout-session endpoint that takes `interval: 'month' | 'year'`. Add a Monthly/Yearly radio toggle to the Unlimited card. Ship one PR. Pull the survival-curve query before merging; downshift the discount to 1 month free if median tenure already exceeds 10 months.

---

## Outcome

Lift annual revenue per Unlimited subscriber by giving committed learners (exam-prep, language certs) a one-charge path. Target: ≥25% of new Unlimited subscriptions on yearly within 8 weeks, and blended 12-month revenue per new Unlimited subscriber +10% vs the trailing 8-week monthly-only baseline. Roll back if yearly cannibalizes monthly with no LTV gain.

**Goal alignment:** Serves the **300K scale** half of the mission, not "simplest/fastest." Yearly billing is a retention/LTV lever — it converts a 12-decision relationship into a 1-decision relationship and reduces churn-from-forgetting. It does not make conversion faster. Justified because LTV expansion funds the path to 300K.

## Problem

A returning Unlimited subscriber studying for a multi-month exam — concretely, a med student grinding USMLE Step 1 over a 6-month dedicated period — is charged $6 twelve times across the year. Each monthly charge is a re-decision point ("do I still need this?"), and the answer drifts toward "cancel" the month after the exam. There's no way to commit upfront for the full study cycle, and we have no way to capture the discount-for-commitment trade that comparable SaaS (Notion, Readwise, RemNote) all offer.

## Riskiest assumption and smallest test

**Assumption:** A yearly plan with a 2-months-free discount is accretive, not dilutive. If the median Unlimited subscriber already stays >10 months, the discount just hands ~17% margin to users who would have paid full freight anyway.

**Smallest test (do before writing code):** Pull the last 12 months of Unlimited subscribers from Stripe and compute the survival curve. If median tenure ≥10 months, downshift to 1 month free ($66/yr) or no discount ($72/yr, positioned as "one charge, no renewal emails"). If median ≤6 months, $60/yr is comfortably accretive. 30-minute query, not a build.

## Scope

**In (v1):**
- Yearly Unlimited at $60/yr (pending tenure query).
- Monthly/Yearly toggle on the Unlimited card in `PricingPage.tsx`. Default: Monthly.
- New `POST /api/checkout/unlimited` accepting `{ interval: 'month' | 'year' }`, returning a Stripe Checkout session URL.
- Retire the hardcoded `buy.stripe.com/...` Unlimited link; both cadences go through the new endpoint.
- One changelog entry: `Unlimited — pay yearly and save two months`.

**Out (v1):**
- Yearly Auto Sync.
- Prorated mid-cycle upgrade from monthly→yearly (v1 says cancel-and-resubscribe).
- Downgrade from yearly→monthly.
- Annual gift codes, multi-year prepay.
- In-product CTA to switch existing monthly subscribers to yearly.

## User story

As a returning Unlimited subscriber preparing for a multi-month exam, I want to pay once a year at a discount so I'm not making a renewal decision every month and so my total cost is lower if I'm committing to the full study cycle.

## Acceptance criteria

- [ ] Unlimited card shows a Monthly / Yearly two-segment radio toggle. Default: Monthly.
- [ ] Toggling Yearly updates the price to `$60 / yr`, shows a muted line `2 months free` beneath, and routes the CTA to the yearly Checkout session.
- [ ] **Given** a logged-in user on `/pricing`, **when** they select Yearly and click `Upgrade`, **then** they land in Stripe Checkout for the yearly price and, on success, return to the same post-checkout destination as monthly.
- [ ] **Given** a logged-out user, **when** they click `Upgrade` on either cadence, **then** they're redirected to `/login?redirect=/pricing` (matches existing behavior).
- [ ] **Given** a user with an active monthly Unlimited subscription, **when** they revisit `/pricing`, **then** the Unlimited card surfaces their current plan; the Yearly toggle remains visible but the CTA copy nudges to cancel monthly first (in-product upgrade flow is a follow-up).
- [ ] Webhook handler persists a yearly subscription row identically to monthly (same product, different price). No code change needed in the webhook handler.
- [ ] If `UNLIMITED_YEARLY_PRICE_ID` is unset, the Yearly toggle is hidden — never show a broken yearly state.
- [ ] Changelog entry lands in the same PR: `Unlimited — pay yearly and save two months`.

## Leading indicator and magnitude

**Primary:** Share of new Unlimited subscriptions on yearly cadence, measured weekly. Target ≥25% by week 8.

**Secondary:** Blended 12-month revenue per new Unlimited subscriber. Compare 8 weeks pre-launch vs 8 weeks post. Win = +10%. Loss = flat or negative → roll back the toggle, keep the price configured for future iteration.

## Open questions for engineering

1. **Discount level.** Recommendation: $60/yr (2 months free). Push back to $66/yr if the Stripe survival-curve query shows median tenure ≥10 months.
2. **Existing-monthly upgrade path.** v1 says cancel-and-resubscribe. Confirm acceptable, or scope as immediate follow-up.
3. **Env var naming.** Proposed: `UNLIMITED_MONTHLY_PRICE_ID`, `UNLIMITED_YEARLY_PRICE_ID` (mirrors `AUTO_SYNC_PRICE_ID`).
4. **Fallback during deploy.** Until the env vars land on the prod box, the new endpoint returns 503; the toggle must hide cleanly in that state.

---

## Design notes

**User moment:** A self-directed learner on `/pricing` who's already decided Unlimited is the right fit, comparing whether to commit for the year — usually because they're heading into an exam season or a multi-month study sprint and want one less subscription to think about.

**Recommendation:** Billing-cycle toggle at the top of the Unlimited card only. The toggle sits inside the Unlimited card, just under the title and above the price. Tapping `Yearly` updates the price, the suffix, and the savings hint in place. The "Best for most" badge, benefits list, and CTA stay put. Auto Sync and Lifetime visually untouched.

Why this over splitting Unlimited into two cards (busts the 3-card grid) or a global toggle (implies the other two cards have a yearly option, which they don't): a scoped in-card toggle is the pattern Linear, Vercel, and Notion all use when only one tier has billing-cycle choice.

**Copy strings (exact, sentence case, no trailing period per `VOICE.md`):**

Toggle segments (default `Monthly`):
```
Monthly   Yearly
```

Price — `Monthly` selected:
```
$6 / mo
```

Price — `Yearly` selected:
```
$60 / yr
```

Muted line beneath the yearly price (replaces nothing — only visible in Yearly state):
```
2 months free
```

CTA label: `Upgrade` in both states. Toggle already communicates cycle; changing the button label adds nothing.

**Empty / error states:** Benefits list is identical for both cycles (same product, different billing). If the yearly Stripe price is unconfigured, hide the Yearly toggle and fall back to monthly silently — never render a broken yearly state.

**Mobile + a11y:** At 375px the toggle stays a two-segment control, full-width inside the card (50% per segment), above the price. Use `role="radiogroup"` with `aria-label="Billing cycle"`, two `role="radio"` children with `aria-checked`. Arrow keys move selection; Space/Enter confirm. Savings hint is plain text, not announced as part of selection.

---

## Technical pre-flight

### Layers touched

| Layer | Change |
|---|---|
| **routes/** | Add `POST /api/checkout/unlimited` to `CheckoutRouter.ts`, body `{ interval: 'month' \| 'year' }`. |
| **controllers/** | New `UnlimitedCheckoutController.ts`. |
| **usecases/checkout/** | New `UnlimitedCheckoutUseCase.ts` — Stripe Checkout session for the given `priceId`, mirroring `AutoSyncCheckoutUseCase` minus cap/already-subscribed checks. |
| **services/** | None. `SubscriptionService` unchanged; interval lives in the Stripe payload. |
| **data_layer/** | No migration. No kanel re-run triggered by this change. |
| **web/** | `Backend.ts`: new `startUnlimitedCheckout(interval)`. `PricingPage.tsx`: replace `<a href>` with handler + `useState<'month' \| 'year'>`. `pricing.constants.ts`: add `YEARLY_PRICE = '$60'`, `YEARLY_SUFFIX = '/ yr'`. `payment.links.ts`: `getSubscribeLink` retired from the Unlimited card (file stays — `getLifetimeLink` still used). |

### Files in play

**New:** `src/usecases/checkout/UnlimitedCheckoutUseCase.ts`, `…UseCase.test.ts`, `src/controllers/UnlimitedCheckoutController.ts`, `…Controller.test.ts`.

**Edit:** `src/routes/CheckoutRouter.ts`, `web/src/lib/backend/Backend.ts`, `web/src/pages/PricingPage/PricingPage.tsx`, `web/src/pages/PricingPage/pricing.constants.ts`, `web/src/pages/PricingPage/payment.links.ts`, `web/src/pages/PricingPage/PricingPage.test.tsx`, `web/src/pages/WhatsNewPage/changelog.ts`.

### Approach for the Unlimited checkout path

**Replace the hosted-link with a proper Checkout session API** (option b in the engineer's framing). The hosted payment link can't accept a price ID from us; adding yearly requires a second hardcoded URL regardless, and two hardcoded links is strictly worse than zero — they can't be toggled by env var, can't carry user metadata cleanly, and diverge from the Auto Sync / Pass pattern the rest of the codebase follows. `AutoSyncCheckoutUseCase` is the working reference. New endpoint activates only when both env vars are set; otherwise returns 404, same posture as the Auto Sync route today.

### Cross-language coordination

None. TypeScript server + TypeScript web only. Web↔server contract: `POST /api/checkout/unlimited` with `{ interval: 'month' | 'year' }` → `{ url: string }` on success, `{ message: string }` with 4xx/5xx on error.

### Estimated effort: **S**

Stripe dashboard: create yearly Price (~5 minutes). Server code: ~40 lines across two new files following the Auto Sync pattern. Web: isolated to `PricingPage.tsx` + `Backend.ts`. Two new env vars on the prod box. No migration. Half-day with tests.

### Security, testing, migration

- **Migration:** None. `subscriptions.stripe_product_id` already exists (migration `20260605000002`). The kanel-generated `Subscriptions.ts` lags the column — pre-existing, not a blocker. A `pnpm kanel` housekeeping commit is worth doing before or after, not as a dependency.
- **Webhook:** `WebhookRouter.ts` / `StripeController.ts` don't branch on interval — they read `subscription.items.data[0].price.product` and pass through to `updateStoreSubscription`. Yearly works without webhook changes. Signature verification unaffected.
- **Test plan (minimum to ship):**
  - `UnlimitedCheckoutUseCase.test.ts` — creates a session with the given `priceId`; returns `{ url }`; throws on Stripe rejection; handles both `month` and `year` price IDs via constructor injection.
  - `UnlimitedCheckoutController.test.ts` — rejects missing/invalid `interval`; routes `month`/`year` correctly; returns 503 when env vars absent.
  - `PricingPage.test.tsx` — toggle renders both options; clicking yearly calls `startUnlimitedCheckout('year')`; clicking monthly calls `startUnlimitedCheckout('month')`; `paywall_upgrade_clicked` fires with `plan: 'unlimited'` for both intervals. The existing `Upgrade` link click test needs updating since the CTA becomes a button.
- **SonarCloud:** Toggle adds one `useState` and a conditional branch to `PricingPage.tsx`. Compute price/suffix inline via ternary; avoid flag-on-flag helpers. If the component's cognitive complexity score is already near threshold, extract a `UnlimitedCard` sub-component instead of nesting more branches. Run `sonar-scanner` locally before flipping ready.

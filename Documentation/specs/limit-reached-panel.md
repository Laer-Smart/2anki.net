# Spec: Limit-reached state on Downloads

### Trio synthesis
- **PM**: a free user blocked by the 100-card limit reads the result as "broken"; the existing paywall panel is hidden behind a row-expand, ignores `cards_used`/`reset_on`, and offers only the $7.99/mo upgrade — fix is presentation-only and must ship a usage event so view→pass conversion is measurable.
- **Designer**: auto-expand the `monthly_limit` row and relabel its collapsed chip off the red "failed" tag (a paywall is not a crash); enrich the copy with all three payload fields; lead with the Day Pass ($4), then Week Pass ($9), then Unlimited as a tertiary link; reuse the `UpsellCard` checkout handler and `PassCards` so the surfaces don't drift.
- **Engineer** (code map): the plumbing is half-built — `parseMonthlyLimitPayload` already returns `cards_used`/`limit`/`reset_on`, the API already includes `job_reason_failure`, and `ConversionResult` already has a `paywalled` variant. The change is to *pass through and render* the two dropped fields, swap one CTA for three, seed the auto-expand, and relabel the chip. No backend, no new data fetch, no new payment plumbing.
- **Agreement**: presentation-only refinement of an existing component; Day Pass primary; enriched copy from data already on the wire; one new analytics event.
- **Conflict**: surface tag — PM proposed `downloads-limit`, designer proposed `downloads-paywall`. **Resolved to `downloads-limit`** — distinct from the existing `downloads_upsell` / PaywallBanner events so the funnel filter is unambiguous.
- **Resulting plan**: make the limit-reached row render its enriched paywall panel inline by default, with Day/Week/Unlimited CTAs and a `paywall_pass_clicked` event, reusing existing checkout + copy.

---

**Outcome**: A free user blocked by the 100-card monthly limit understands exactly why their conversion stopped and can buy the smallest pass that unblocks them, without expanding a row or guessing.

**Goal alignment**: Moves ARPU via the proven episodic buy — 95 Day Passes sold in June, roughly matching subscription volume. Passes are the lower-friction entry the data already favors; this puts the $4 pass one click from the highest-intent moment on the page.

## Problem

A returning free user (user 15342) hit the 100-card monthly limit mid-conversion. The blocked state read as "not working" — they emailed support saying so, then bought a $4 Day Pass 3 minutes later and converted 121 more cards. The fix path was obvious and cheap; the product never showed it. Today the limit panel (1) hides behind a row-expand interaction most users never trigger, (2) ignores the `cards_used`/`reset_on` data it already receives, so it can't say how many cards were used or when the limit resets, and (3) offers only the $7.99/mo Unlimited upgrade — not the Day Pass the user actually reached for. See 2anki/server#3480.

## Riskiest assumption + smallest test

**Assumption**: the limit state underperforms because it's *hidden and under-specified*, not because users reject the price. **Test**: ship with `paywall_shown` (exists) + new `paywall_pass_clicked`. If view→pass-click is near zero across the first ~100 impressions, discoverability wasn't the blocker — it's willingness-to-pay, and we stop rather than iterate on copy. The existing event pair is the test; no A/B harness needed.

## Scope

**In**:
- Limit-reached row renders its paywall panel inline, unconditionally (no expand). Seed the auto-expand to the first `monthly_limit` row on load, unless the user manually collapsed it that session.
- Collapsed `monthly_limit` chip relabelled from the red `failed` `StatusTag` to a neutral "Monthly limit reached" badge (reuse the existing `sharedStyles.badge` the "Partial" / "N images skipped" rows use — no new color).
- Panel copy uses `cards_used`, `limit`, and `reset_on` it already receives.
- Day Pass (primary), Week Pass (secondary), Upgrade to Unlimited (tertiary link) inline.
- New `paywall_pass_clicked` event on pass-CTA click; `paywall_shown` on panel view; `paywall_upgrade_clicked` on the Unlimited link.

**Out (explicitly)**:
- The quota-accounting question (whether `cards_used`/`reset_on` values are *correct*) — separate investigation. user 15342's 177>100 is explained by her Day Pass window, not a bug.
- The sync-upload `/limit` page — different surface, untouched.
- Any backend gate, limit value, entitlement, or pricing change. Presentation only.

## User story + acceptance criteria

As a returning free user whose conversion just got blocked, I want to see why it stopped and buy the cheapest thing that unblocks it, so I can keep converting without contacting support.

- [ ] A row blocked by the monthly limit shows the paywall panel immediately, no expand required.
- [ ] Collapsed `monthly_limit` rows show a neutral "Monthly limit reached" chip, not the red `failed` tag.
- [ ] Panel states the count and reset using payload data, e.g. "You've used 56 of your 100 free cards this month" + "Your free cards refresh on 1 July 2026, or get a pass to keep converting now." `reset_on` formatted to the absolute long form via the existing date util — never raw ISO.
- [ ] When `cards_used >= limit`, headline reads "You've reached your 100 free cards this month" (never "used 121 of 100").
- [ ] When `reset_on` is absent (older rows), the refresh clause is dropped entirely — never "refresh on undefined" or a fabricated date.
- [ ] Three buy options in order Day Pass / Week Pass / Upgrade to Unlimited; Day Pass visually primary. Prices sourced from `PASS_PRICES`, not hardcoded. Stripe plan names/prices match the dashboard (protected strings).
- [ ] `paywall_shown { surface: 'downloads-limit' }` fires once when the panel becomes visible.
- [ ] Pass-CTA click fires `paywall_pass_clicked { surface: 'downloads-limit', plan: 'day' | 'week' }`; Unlimited click fires `paywall_upgrade_clicked { surface: 'downloads-limit', plan: 'unlimited' }`.

## Leading indicator + events

Moves limit-panel view→purchase-intent, read in the funnel as click-events ÷ `paywall_shown` filtered to `surface: 'downloads-limit'`. Expected direction: up. Register `paywall_pass_clicked` in **both** `web/src/lib/analytics/events.ts` KNOWN_EVENTS and `src/types/AnalyticsEvents.ts`. All props use safe keys only (`surface`, `plan`) — no email/token/filename/content/title keys, well under 1024 bytes.

## Design notes

**User moment**: free user converts, the job stops because it would push them past 100 cards, they land on `/downloads` and see a row marked **failed** in red — same styling as a real crash. Nothing says it's a limit, not a bug.

Literal copy strings:
- Headline (`cards_used < limit`): `You've used {cards_used} of your {limit} free cards this month`
- Headline (`cards_used >= limit`): `You've reached your {limit} free cards this month`
- Body (`reset_on` present): `This conversion would go past your free limit, so it didn't finish. Your free cards refresh on {resetDate}, or get a pass to keep converting now.`
- Body (`reset_on` absent): `This conversion would go past your free limit, so it didn't finish. Get a pass to keep converting now.`

CTA labels (identical to `UpsellCard`, price from `PASS_PRICES` so they never drift):
- Primary, solid: `Get Day Pass — $4`
- Secondary, outline: `Get Week Pass — $9`
- Tertiary, link: `Upgrade to Unlimited`

Sentence case, no trailing period on buttons, no exclamation marks (VOICE.md). In-product personal phrasing so the number varies per user without lying — the marketing "100 cards per month" string on `/pricing` is untouched.

## Technical pre-flight

Verified against code (engineer map):

- **Payload already on the wire.** `parseMonthlyLimitPayload` (`web/src/pages/DownloadsPage/components/ConversionResult/parseMonthlyLimitPayload.ts`) returns `cards_used`/`limit`/`reset_on`; `renderFailurePanelContent` (`DownloadsPage.tsx` ~227) currently drops two of three; `PaywalledVariant` (`ConversionResult.tsx` ~41-69) renders only `limit`. API includes `job_reason_failure` (`JobController.toJobListItem`, `/api/upload/jobs`). **No backend change, no new fetch.** (answers PM open-q 1 + 3)
- **Checkout reuse.** `startPassCheckout(kind, undefined, surface)` + button labels live in `UpsellCard.tsx`; `PASS_PRICES`/`getSubscribeLink` in `payment.links.ts`; `PassCards.tsx` for plan cards. Extract the pass handler rather than rebuild it. (answers PM open-q 2)
- **Files in play**: `web/src/pages/DownloadsPage/components/ConversionResult/ConversionResult.tsx` (widen `PaywalledProps` with `cardsUsed`/`resetOn`, new copy + 3 CTAs), `web/src/pages/DownloadsPage/DownloadsPage.tsx` (pass all 3 fields at ~227, seed auto-expand near `expandedFailureJobId` ~515, relabel collapsed chip ~189), `web/src/lib/analytics/events.ts` + `src/types/AnalyticsEvents.ts` (register `paywall_pass_clicked`).
- **Tests to extend**: `ConversionResult.test.tsx`, `DownloadsPage.test.tsx` (failure-panel rendering ~503-706), `UpsellCard.test.tsx`. Add: `monthly_limit` row renders inline without expand; enriched copy with cards_used/reset_on; `>=` headline branch; missing `reset_on` drops the clause; the three events fire with the right props.
- **Effort**: S/M — single web component cluster, no backend, plumbing half-built.
- **Layers**: `web` only.

### Open questions for the engineer
1. Auto-expand seeding: confirm `expandedFailureJobId` is single-value (one expanded row) vs a set — if single, decide precedence when multiple `monthly_limit` rows exist (first/newest).
2. Confirm the neutral chip the "Partial"/"images skipped" rows use is `sharedStyles.badge` and that reusing it for `monthly_limit` doesn't collide with their semantics.

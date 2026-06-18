# Spec: /app native app page — trio fixes

### Trio synthesis
- PM: The page is an acquisition surface for the native app; biggest leak was a price mismatch — but the original "$21 one-time" premise was **wrong** (see correction below). Real leak: absolute "Free" claims that hide the app's paid tiers.
- Designer: Copy is on-voice and CSS is fully tokenized, but three real defects — emoji feature icons (VOICE.md hard ban), the black App Store badge is invisible on dark/purple themes, and the formats eyebrow fails WCAG AA contrast — plus a handful of copy nits.
- Engineer: Implementation is correct, conventional, fully tracked, well-tested; no bugs, no Sonar smells. Only gap: no test asserts `rel="noopener"` / the footer + mac event paths.
- Agreement: instrumentation is sound (`native_app_store_clicked {store, placement}` + `native_app_page_viewed` fire correctly); structure, tokens, and tests are solid; this is a copy + asset + a11y pass, not a rewrite.
- Conflict: the original synthesis said "remove all Free framing, state $21 one-time to own" and "cut the AI-chat card." Both were built on a stale 2026-06-03 memory. **Verified against the real app repo (`Laer-Smart/2anki`): there is no $21 one-time product.** Resolved by reading `STOREKIT_ROADMAP.md` / `Configuration.storekit`: the app mirrors web pricing (Day Pass, Week Pass, $9.99/mo Unlimited subscription), AI generation is a real in-app feature gated by the Unlimited sub, so the AI card stays and the price copy is softened (not flipped).
- Resulting plan: ship the dark-theme badge, drop the banned emoji, fix the AA contrast, soften the overclaiming "Free" copy to "Free to start," and land the copy nits — one `fix:` PR, no pricing numbers hardcoded.

---

## Pricing correction (load-bearing — read before implementing)

The shipped app (`/Users/a/src/github.com/Laer-Smart/2anki`) charges via StoreKit 2, mirroring the web pricing page (Apple Guideline 3.1.1 parity), **not** an app-only $21 one-time unlock:

| Product ID | Kind | Server SKU |
|---|---|---|
| `daypass.24h` | Consumable | Day Pass |
| `weekpass.7d` | Consumable | Week Pass |
| `unlimited.monthly` | Auto-renewable subscription | Unlimited |

- Free download + free metered tier (same as web); the paywall shows the three products to free-tier users.
- AI generation is in-app, unlocked by the **Unlimited** subscription (`ClaudeGenerateView` → "Get Unlimited").
- App Store Connect prices are the source of truth. **Do not hardcode dollar amounts** on the marketing page — that would drift and violates the "Stripe/price display must match" rule in VOICE.md.

## Outcome & goal alignment

A `/app` page that tells the truth about the app and renders correctly on every theme, so dark-mode visitors actually see the App Store badge and no copy reads as "the whole app is free." Goal: acquisition surface — improve page → App-Store-click CTR without misleading on price.

## Problem statement

Three concrete defects on the live page:
1. **Overclaiming "Free."** `Free to download` (final CTA), `Free on the App Store` (hero caption), and the meta description present the app as flat-free. The app has paid passes + a $9.99/mo Unlimited subscription; the only mention is buried in one FAQ. A free-tier user who hits the paywall in-app after "Free to download" experiences a trust break.
2. **Dark-theme badge invisible.** The official black App Store badge (`web/public/badges/app-store.svg`) sits on `--color-bg-primary` (`#111827` on dark) with only a faint grey hairline — a dropped install on every dark-mode visitor (a large share of an Anki audience).
3. **VOICE + a11y nits.** Three emoji feature icons (🔒 ✨ 📦) violate the VOICE.md hard ban on emoji in product UI; the formats eyebrow uses `--color-text-tertiary` (~3.4:1) — below WCAG AA 4.5:1; several copy lines are off-voice.

## Riskiest assumption + smallest test

Assumption: a white App Store badge swapped in by theme is allowed and renders correctly. Test: Apple's marketing guidelines ship both a black and white badge for exactly this; add the white SVG, swap via `[data-theme]` CSS, and eyeball on light / dark / gold / purple at 375px before flipping ready.

## Scope

**In:**
- Soften "Free" overclaims to "Free to start" (or equivalent); keep the FAQ's accurate "downloading and converting is free; AI + unlimited use are paid" answer. No dollar amounts.
- Ship Apple's white App Store badge variant; swap black↔white by theme. Add `border-radius: var(--radius-md)` to `.badge` so the focus ring matches the artwork.
- Remove the three emoji icons + the `.featureIcon` span (titles carry the meaning).
- Fix contrast: formats eyebrow `--color-text-tertiary` → `--color-text-secondary`; re-check `.caption` if it carries essential info.
- Copy nits: `Questions` → `Common questions`; fix "Build on your phone on the train" stutter; replace "in final review" process-leak with a date-safe line; drop "universal app" jargon in the FAQ.

**Out:**
- Any pricing numbers / a Day-Pass/Week-Pass/Unlimited price table (lives on `/pricing` + the in-app paywall).
- Cutting the AI-chat feature card (it's accurate — AI is a real in-app feature).
- New screenshots, carousel, testimonials, video (PM: page is already over-built for a surface with zero install telemetry).
- Apple-side purchase event reconciliation into the funnel (separate, larger piece; noted as the ceiling on what this page can be measured by).

## User story & acceptance criteria

As a dark-mode visitor on `/app`, I see the App Store badge clearly and the copy doesn't promise the app is entirely free.

- [ ] App Store badge is clearly visible on light, dark, gold, and purple themes at 375px and desktop.
- [ ] No emoji render in the feature grid; titles still communicate each feature.
- [ ] The formats eyebrow passes WCAG AA (≥4.5:1) in all themes.
- [ ] No copy on the page states or implies the full app is free; "free to start" framing only, FAQ unchanged in substance.
- [ ] `Common questions` heading; no "on the train" stutter, no "final review", no "universal app".
- [ ] Existing tests pass; the `'Also on the Mac App Store →'` assertion is updated only if that string changes.

## Leading indicator

Page → App-Store-click CTR via `native_app_store_clicked` (segmented by `placement`: hero vs footer). Expectation: dark-mode badge fix lifts footer/hero click rate for the dark-theme cohort; honesty changes are neutral-to-positive on trust (not directly measurable here). **Apple-side install/purchase is not in our funnel** — store-click is the ceiling metric until the IAP redeem event (`POST /api/iap/redeem`) is reconciled back.

## Open questions for the engineer

1. Does Apple's white badge SVG exist in the marketing bundle, or does it need to be downloaded from Apple's marketing guidelines and committed alongside the black one?
2. Swap mechanism: two `<img>`s toggled by CSS `[data-theme]`, or a single `<img>` whose `src` switches via a theme hook? CSS-only is simpler and avoids a render flash — prefer it unless the theme isn't expressed as a `[data-theme]` attribute on a CSS-reachable ancestor.

---

## Design notes

- Replace `Free to download` (final CTA body) and `Free on the App Store — iPhone, iPad, and Mac.` (hero caption) with start-framed copy, e.g. caption → `On the App Store for iPhone, iPad, and Mac.`, final body → `Free to start — convert your first file in seconds.`
- `Questions` → `Common questions` (single-word heading reads like a placeholder; rest of page uses descriptive headings).
- Showcase body: `Build on your phone on the train, polish on your Mac at the desk.` → `Draft on your phone, polish on your Mac.` (kills the "on… on…" stutter — the only un-Stripe sentence on the page).
- Coming-soon notice: `The app is in final review.` leaks Apple's queue and dates badly → `The app lands on the App Store soon. Convert your notes on the web in the meantime.`
- FAQ "universal app": `It is a universal app — one download covers iPhone, iPad, and Mac…` → `One download covers iPhone, iPad, and Mac — the same on-device conversion on all three.`
- `→` in `Also on the Mac App Store →`: screen readers announce "right arrow." Either drop it or wrap `aria-hidden`; if the string changes, update `NativeAppPage.test.tsx:91`.
- Sentence case, no exclamation marks, no banned words — all per VOICE.md.

## Technical pre-flight

- **Layers touched:** `web` only. `web/src/pages/NativeAppPage/NativeAppPage.tsx` (copy + remove `.featureIcon`), `NativeAppPage.module.css` (badge theme swap, `.badge` radius, `.formatsLabel` token), `NativeAppPage.test.tsx` (only if the Mac-link string changes), `web/public/badges/` (add white badge SVG). `META_DESCRIPTION` constant at `NativeAppPage.tsx:11-12` also carries "Free on the App Store" — update it.
- **Cross-language:** none.
- **Effort:** S. Pure copy + CSS + one asset; no logic, no API, no migration.
- **Security/testing:** no security surface. Engineer-flagged optional hardening: add a test asserting `rel="noopener noreferrer"` + `target="_blank"` on both external links, and a click test for `placement: 'footer'` / `store: 'mac'` (closes the only coverage gaps; tests-only). Browser-attestation gate applies (web/src change) — verify golden path + console at 375px across all 5 themes before flipping ready.

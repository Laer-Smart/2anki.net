# Spec: Producer/Teams demand smoke test (honest fake-door)

### Trio synthesis
- **PM:** 30x MRR is an ARPU move, not a user-count move — validate that a recurring-need deck-producer population exists at ~1,100-buyer scale before building a Teams product; this fake-door *is* the test.
- **Designer:** two thin entry points (a quiet bottom-of-`/pricing` section + a dismissible in-product card for heavy uploaders) converge on one capture modal; honest copy that states twice there is no product yet; no price, no card chrome, no conversion-path interference.
- **Engineer:** S effort — reuse `/api/events/track`; no migration, no new table; two hard landmines (1 KB props cap, `PII_KEY_PATTERN` strips `email`/`content`/`title` keys) force capped textareas and safe prop key names.
- **Agreement:** ship a measurement, not a feature — one event, one modal, two entry points, zero new backend layers.
- **Conflict:** designer wanted an optional anon email field for an "early-access list"; engineer showed `events.props` silently strips `email` keys and storing email in the analytics table violates support-confidentiality. **Resolved:** drop the email field in v1 — logged-in leads are reachable via `user_id`, anon leads are counted; an email list is part of the v2 build only if demand clears the bar.
- **Resulting plan:** add a `producer_intent_captured` event and a capture modal reachable from a bottom-of-pricing section and a heavy-uploader prompt, storing capped free-text + a structured team-size in `events.props`, with no product built.

## Outcome
Know within 14 days whether a recurring-need producer population (teachers, tutors, exam-prep sellers, language coaches) exists at the scale the 30x-MRR thesis needs. Decision rule on qualified leads: **≥30 → build a Teams MVP next** (the single in-flight surface); **10–29 → iterate targeting/copy**; **<10 → kill the Teams thesis**, pivot to harvesting the pricing-page conversion leak + raising the Auto-Sync 50-subscriber cap (`CheckoutRouter.ts` `DEFAULT_MAX_SUBSCRIBERS`, a hard $1,500/mo ceiling). No product is built in this PR.

## Goal alignment
Serves the revenue axis in `CLAUDE.md` (MRR past $5K is an ARPU move). Cheapest possible test of the only buyer in reach whose need *recurs*, at a plausible $50–150/mo. Read the count at `/api/ops/metrics`; analyst qualifies the free-text at T+14d (2026-07-09).

## Problem
ARPU is floored at $2.40 because the core job is episodic — Day Pass ≈ subscriptions in checkout volume (92 vs 94 / 30d) and 76% of churn is lifecycle ("finished what I needed"). $55K MRR at today's ARPU needs ~23,000 paying subs — more than the entire 17,735 registered base. The math only closes on a higher-ARPU recurring buyer (~1,100 producers × $50). In-base producer candidates are thin (93 users at 21–50 uploads/90d, 30 at 50+; `deck_shares` unused at 3 total), so the test must also reach producers *outside* the base via the public pricing page.

## Riskiest assumption + smallest test
**Assumption:** a population of repeat deck-producers with a team-shaped, recurring need exists in or near our traffic at ~1,100-buyer scale. If false, a Teams build is dead on arrival. **Smallest test:** this fake-door — honest intent capture from two entry points, no build commitment until the lead bar clears.

## Scope
**In:**
1. `producer_intent_captured` event added to both `web/src/lib/analytics/events.ts` (`KNOWN_EVENTS`) and `src/types/AnalyticsEvents.ts`.
2. Capture modal: free-text "What are you making decks for?" (`maxLength` ~200) + structured team-size select (`Just me` / `2–10` / `11–50` / `More than 50`). Submit disabled until both set.
3. Pricing entry point — a quiet section after `<PricingFaq />`, before `.philosophy`; secondary button, **no price, no card chrome**.
4. In-product prompt — dismissible card on `DownloadsPage`/home below the primary action, shown only to users with ≥21 uploads in 90d (counted client-side off the already-loaded `useUploads` list), never on the upload/checkout path.
5. One-time dismissal/submission persisted server-side via the existing `pitch_dismissals` pattern (no new table, no `localStorage`).

**Out:** seats, Stripe quantity billing, deck-sharing, any `access.ts`/`subscriptions` change, the email field, any "buy now"/"coming soon" copy, raising `DEFAULT_MAX_SUBSCRIBERS`, and the T+30d adoption-review issue (it attaches to the real Teams surface only if this graduates).

## User story
As a teacher/tutor/exam-prep seller who makes decks every term, I want to tell 2anki what I need for my class or clients so I'm first in line if a team plan exists — without being sold a product that isn't built yet.

## Acceptance criteria
- [ ] `/pricing` shows a "For educators and teams" section (post-FAQ) routing to the capture modal; carries no price.
- [ ] Capture heading is an honest early-list ask; copy never says "buy now" or "coming soon"; thank-you states there is no product yet.
- [ ] Modal has exactly two fields (free-text purpose + team-size select); textarea is `maxLength`-capped so the payload always fits the 1 KB props limit.
- [ ] In-product prompt fires once for users with ≥21 uploads/90d, is dismissible, never reappears after dismiss or submit, and never sits on the convert/checkout flow.
- [ ] `producer_intent_captured` fires on submit with props `{ source: 'pricing_page' | 'heavy_uploader_prompt', team_size, purpose }` — **no PII keys** (`email`/`content`/`title` are stripped server-side) — readable at `/api/ops/metrics`.
- [ ] No `subscriptions`/`access.ts`/Stripe changes; no migration.
- [ ] No changelog entry — state "no changelog entry — demand smoke test, no user-facing product" in the PR body.

## Leading indicator + target
Qualified producer leads/week (qualified = answer names a class/cohort/client-count or a content business, **and** team-size > "Just me"). Target ≥30 qualified in 14 days to graduate to a Teams MVP.

## Design notes
- **Pricing entry point:** bottom-of-page secondary (outline) button, never a fourth grid card — a card would re-anchor the page and imply a buyable plan. Heading `For educators and teams`; body `Making decks for a class, a tutoring group, or a course you sell? We're exploring tools for people who make decks for others.`; button `Tell us what you need`.
- **In-product card:** title `Making decks for other people?`; body `You've built a lot of decks. If you're making them for students, a class, or customers, we want to hear what would help. There's no product for this yet — we're deciding what to build.`; actions `Tell us what you need` (secondary) + `Not now` (ghost).
- **Modal:** title `Tell us what you need`; lead `We're exploring tools for people who make Anki decks for others. There's nothing to buy yet — answer two questions and we'll come to you first if we build it.`; field 1 `What are you making decks for?` placeholder `e.g. MCAT tutoring, a Spanish course I sell, my biology class`; field 2 `How many people will use them?`; submit `Join the early-access list`.
- **Thank-you (in-place swap):** heading `You're on the list`; body `Thanks. There's no teams product yet — we're still deciding whether to build it. If we do, you'll be among the first to try it.`; close `Done`.
- **Errors:** field 1 empty → `Tell us in a few words what these decks are for.`; field 2 empty → `Pick how many people will use them.`; submit fails → keep all typed values, inline `Couldn't save that — check your connection and try again.`
- Reuse `shared.module.css` primitives (`.dialog`, `.modalCard`, `.btnSecondary`, `.btnGhost`, `.surface*`, `.select`, `.spinnerSmall`); no new primitives. All copy sentence case, no exclamation, no fake warmth (VOICE.md).
- If modal-vs-page or placement is contested at implement, ship a `/dev/producer-capture-preview` route (DEV-gated) rendering the pricing section, in-product card, and modal (form/error/thank-you) side by side.

## Technical pre-flight
- **Reuse `/api/events/track`** — `track()` (`web/src/lib/analytics/track.ts:3`) → `EventsRouter.ts:19` → `EventsController.track` → `TrackEventUseCase` → `EventsRepository.insertEvents`. No new route/controller/usecase/service/data_layer.
- **Landmine 1 — 1 KB props cap.** `EventsController.ts` `PROPS_MAX_BYTES = 1024`; `TrackEventUseCase` re-throws over cap; `track()` swallows the 400 → over-cap lead silently lost. Mitigation: `maxLength` ~200 on the textarea.
- **Landmine 2 — PII key strip.** `TrackEventUseCase` `PII_KEY_PATTERN = /email|token|password|filename|content|title/i` silently drops matching prop keys. Use `purpose` / `team_size` / `source` — never `content`/`title`/`email`. Add a test asserting these keys survive ingestion.
- **Heavy-uploader gate is client-side, no new endpoint.** `useUploads` (`DownloadsPage`) already loads the owner's full upload list with `created_at`; count `uploads.filter(within 90d).length >= 21` in memory.
- **Dismissal persistence:** reuse the existing `pitch_dismissals` table/pattern (same shape as `ShouldShowAutoSyncPitchUseCase`) — no migration, no `localStorage` (code-quality rule).
- **Backend event-name registration:** add `producer_intent_captured` to `src/types/AnalyticsEvents.ts` or it logs `[events] unknown event` warn spam (event still records).
- **Anonymous submitters** land with `anonymous_id` only — fine for counting; read query unions `user_id`/`anonymous_id`.
- **Security:** React escapes props by default; ops renders aggregated charts, not raw props. If a future ops "producer leads" view renders the text, keep it as escaped text nodes — never inject it as raw HTML.
- **Effort: S** — net-new form UI + entry points + event name; zero plumbing. Becomes **M** only if leads must be durably stored (dedicated `producer_leads` table) or the 90d gate must be server-authoritative — both over-build for a demand smoke test.

## Open questions for the engineer
1. Confirm `pitch_dismissals` accepts an arbitrary dismissal key for the producer prompt without a migration; if not, use a single new `dismissal_kind` value.
2. Modal off `/pricing` + `DownloadsPage` vs a shared `/producer` route — recommend a shared modal component over a new route (less surface, matches the existing pitch pattern).
3. Confirm the read query for `/api/ops/metrics` unions anon + auth `producer_intent_captured` and surfaces `team_size` breakdown for the qualification pass.

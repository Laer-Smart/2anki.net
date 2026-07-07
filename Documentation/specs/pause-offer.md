# Pause offer in the subscription cancel flow

### Trio synthesis
- PM: smallest unit is a pause card on the two lifecycle cancel reasons; take-rate target ≥25%; tenure ≥30d guard; no discounts in v1.
- Designer: cancel stays one click at equal weight always; no pre-selected pause length; one-click Resume now; the 3-day resume-warning email is mandatory anti-trap; copy ready to ship.
- Engineer: Stripe `pause_collection` keeps `status: 'active'` — an `isPaused(payload)` derivation must be honored at three sites or paused users keep paid access and inflate MRR; two implementation PRs; worktree mandatory.
- Agreement: offer only on lifecycle reasons; annual subs excluded; 1–3 months `behavior: 'void'`; transactional resume email; metric that matters is paused→resumed-and-retained, not pauses started.
- Conflict: pm wanted 3 months pre-selected (designer: none — trust; resolved: none). pm deferred early resume (designer: include — one Stripe call, symmetry is the anti-dark-pattern core; resolved: include). pm wanted one PR (engineer: two — revenue-integrity risk isolates mechanics from email job; resolved: two).
- Resulting plan: reason selection moves before the cancel commits; lifecycle reasons reveal a pause card; Stripe pause with access off; metrics-first build in a worktree; email job as a second PR.

## Outcome

Convert lifecycle cancels into dormancy instead of churn. Effective monthly churn 18% → 12%. Leading indicator: cancel-intent → pause take rate ≥ 25% on the two lifecycle reasons within 30 days of ship, read at `/api/ops/metrics`; churn read at `/api/ops/business/metrics` at the weekly retro.

## Problem

71–78% of cancels are lifecycle, not dissatisfaction: Stripe feedback `unused` on 299/382 non-blank cancels; in-app survey "I finished what I needed" (32/77) + "I don't use it enough" (23/77). 38% cancel at 6+ months (semester end); 30% of recent cancels downloaded a deck within 14 days of cancelling. These users are done *for now* — we only offer them a permanent exit. Annual subs almost never cancel (5 ever), proving dormancy-friendly terms retain.

## Riskiest assumption

A lifecycle canceller accepts a pause AND resumes next term. If pauses mostly lapse into cancels, we've deferred churn, not cut it. Smallest test: ship to the two lifecycle reasons only; read take rate at T+30d and resume rate at the first resume wave (~90d). The verdict metric is **paused→resumed-and-retained**.

## Decision taken (reviewer can veto here)

**Paused = paid features off; everything the user made stays saved.** Billing paused, product paused — the honest deal, plainly stated in the copy. Keeping access free would misreport MRR and muddy the mental model. All three trio members recommend off.

## The flow

1. "Cancel subscription" click no longer cancels — it opens an inline confirm panel (reason radios optional + Cancel subscription / Keep subscription buttons at equal weight). Feedback is written whichever button the user picks.
2. Selecting a lifecycle reason ("I finished what I needed", "I don't use it enough") reveals a pause card between the reasons and the confirm buttons. The confirm buttons never move, shrink, or grey.
3. Pause card: title "Pause instead — no charge while you're away"; body "Taking a break between terms? Pause your subscription instead of cancelling. You won't be charged while it's paused, and it resumes on its own when you're ready. Everything you've made is saved."; chips 1 / 2 / 3 months, none pre-selected; on pick, preview line "Resumes {date} at {plan}. Cancel anytime before then."; primary button "Pause subscription".
4. Paused account state: badge "Paused · Resumes {date}", body states no charge while paused, paid features off, everything saved. Actions: "Resume now" (primary, immediate) and cancel (one click, cancels immediately — no pending charge exists).
5. ~3 days before `resumes_at`: transactional email "Your 2anki subscription resumes on {date}" naming date and amount, linking the account page (not the Stripe portal). Sent regardless of app activity.

Guards: annual subs never see the offer (`plan.interval === 'year'`); tenure < 30 days never sees it (blocks the 20% harvest-and-leave cohort from free-riding); multiple-subscriptions path skips it; offer shown once per cancel attempt — declined means cancel proceeds unobstructed; a user cancelling *during* pause is not re-offered.

## Mechanism

Stripe `pause_collection` `{ behavior: 'void', resumes_at }`. Stripe auto-resumes and fires `customer.subscription.updated`, which the existing webhook already persists into `subscriptions.payload` — no webhook change. Resume-now clears `pause_collection`.

**Load-bearing constraint:** a paused sub keeps `status: 'active'`. Add an `isPaused(payload)` derivation and honor it at exactly three sites:
- `src/lib/integrations/stripe.ts:99` `updateStoreSubscription` — paused → `active = false` (access off)
- `src/services/AuthenticationService.ts:271` `getIsSubscriber` → `configureUserLocal` → `isPaying`
- `src/services/ops/BusinessMetricsService.ts:766` `isActiveNow` — exclude paused from active count and MRR; do **not** count as churn in `computeChurn30dPct`

Request path: `UserRouter` → `UsersControllers.pauseSubscription/resumeSubscription` → `SubscriptionService` (Stripe call). Cancellation feedback moves through `CancellationFeedbackRepository` (not the controller-direct insert used today).

## Split

- **PR 1 — mechanics + semantics** (worktree mandatory: payments): `isPaused` derivation with a metrics-first failing test (paused payload excluded from `active_paying_subs`/MRR, absent from churn), access semantics, pause/resume endpoints, web cancel-flow re-sequence + pause card + paused state, analytics events, changelog entry.
- **PR 2 — resume-warning email job**: `subscription-resuming-soon.html` (cloned from `subscription-scheduled-cancellation.html`; transactional — no unsubscribe footer; mascot header + dark-mode + responsive + tagline per email rules), daily job on the `scheduleInactivityWarnings` pattern wired in `server.ts` startup, de-dupe marker migration (`paused_subscription_notices` or a `pause_warning_sent_at` column) + kanel regeneration in the same PR.

## Analytics events (PR 1, registered in `src/types/AnalyticsEvents.ts`)

`subscription_pause_offered {reason, tenure_days}` · `subscription_paused {pause_months, reason, tenure_days}` · `subscription_pause_resumed` · `subscription_cancelled_during_pause`. Take rate = paused/offered; resume rate = resumed/paused.

## Acceptance criteria

- [ ] Lifecycle reason reveals the pause card; other reasons, annual subs, tenure <30d, and the multiple-subscriptions path go straight to cancel unchanged.
- [ ] Cancel remains one click at unchanged visual weight with the card visible.
- [ ] Pause calls Stripe with `behavior: 'void'` + `resumes_at`; no charge while paused; paid features off; resume-now restores immediately.
- [ ] Paused subs excluded from MRR/active in `/api/ops/business/metrics` and not counted as churn (asserted by test before UI work).
- [ ] Resume-warning email sends ~3 days before resume, names date and amount, is sent at most once per pause.
- [ ] Four events fire with stated props; migration PR includes regenerated `src/data_layer/public/*`.

## Out of scope (v1)

Discounts or price-drop retention, win-back sequences, pauses >3 months, pause entry points outside the cancel flow, pause on the multiple-subscriptions panel, repeat-pause caps (allow; watch resume rate; cap only on abuse).

## Design notes

Reuse `AccountPage.module.css` classes; one new `.secondaryButtonActive` chip state. In-place reveal (same fade the follow-up uses); paused status line transition is the confirmation — no toast. Email copy: subject "Your 2anki subscription resumes on {resumeDate}"; body names date + amount, "Nothing to do if you're ready to pick back up. To stay paused longer or cancel, open your account settings before {resumeDate}." Sign-off "The 2anki Team".

Dark-pattern guardrails (any one cut makes this a dark pattern): resume date + price shown at pause time, on the account page, and in the 3-day email; resume/cancel-during-pause as frictionless as pausing; never gate cancel behind a required reason; offer once per cancel attempt.

## Technical pre-flight (verified against code this session)

Layers: routes, controllers, services, data_layer (PR 2 migration), web. Files: `web/src/pages/AccountPage/components/SubscriptionManagement.tsx:322-344`, `CancellationFollowUp.tsx`, `useSubscriptionCancellation.ts`, `web/src/lib/backend/cancelSubscription.ts`, `getSubscriptionStatus.ts`, `useStripeSubscriptions.ts` (new `paused` view kind), `src/services/SubscriptionService.ts`, `src/controllers/UsersControllers.ts:476-598`, `src/routes/UserRouter.ts:474-544`, `src/lib/integrations/stripe.ts:99-167`, `src/services/AuthenticationService.ts:271`, `src/routes/middleware/configureUserLocal.ts:61-67`, `src/lib/isPaying.ts`, `src/services/ops/BusinessMetricsService.ts:661-840`, `src/services/EmailService/EmailService.ts:35-85` + new template, new use case + scheduler + `server.ts:290-321` wiring. No cross-language work (Python untouched). Effort: **L** across two PRs (~12–15 files); riskiest part is the paused-but-active semantics — hence the metrics-first failing test and worktree. Webhook, Stripe client wrapper, and payload persistence need no changes.

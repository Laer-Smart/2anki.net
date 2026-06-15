# Spec: Self-serve cancel for duplicate active subscriptions

Closes #3381.

### Trio synthesis
- **PM:** Ship one PR — expose all active subs and add a per-sub cancel by id; revenue-quality/billing-trust fix, not acquisition; retention rule must not apply to a stray cancel.
- **Designer:** Branch on active-sub count (single-sub view unchanged); 2+ shows an amber heads-up + one row per sub with its own cancel and an *inline* (not modal) confirm so the sibling stays visible; immediate mode; no legacy-rate warning or retention survey on this path.
- **Engineer:** Backend already returns all subs — the only defects are the frontend `.find()` collapse and the all-or-nothing cancel; new endpoint needs a hard ownership guard (IDOR/CWE-639); M effort, no migration, `/security-review` + worktree required.
- **Agreement:** Frontend display fix + a new per-subscription-id cancel endpoint; immediate mode for a stray; ownership keyed on `findRecentStripeSubscriptions(callerEmail)` (never `metadata.user_id`); single-sub flow and retention surfaces untouched.
- **Conflict:** Endpoint default mode — engineer prefers `period_end` default with the UI sending `immediate` explicitly; PM/designer want immediate for a stray. Resolved: endpoint accepts an explicit `mode`, the multi-sub UI always sends `immediate`; no implicit server default that silently picks immediate.
- **Resulting plan:** One `fix:` PR that surfaces every active subscription and lets the user cancel a single one by id, guarded against IDOR, with the stray-cancel path excluded from retention.

## Outcome

A returning paid user with two active Stripe subscriptions can see both and cancel the stray one themselves, without emailing support. Success: weekly duplicate-billing support tickets and Stripe refunds for overlapping active subs trend to ~0; day-7 prod check shows ≥1 successful per-sub cancel logged (`subscription_self_serve_extra_cancel`) and no over-rejecting 403s on legitimately-owned subs.

## Goal alignment

Revenue-quality / billing-trust, not acquisition. An orphaned active sub inflates MRR with chargeback-bound dollars and erodes the billing trust retention depends on (79% of churn is lifecycle; a double-charge is a fast way to turn a happy lifetime user into a cancelling one). Read at `/api/ops/business/metrics` (refunds for overlapping active subs) and the support inbox (duplicate-billing tickets), weekly. This is **not** the week's acquisition-lane change.

## Problem

A returning paid user was charged for two active subscriptions at once. The account page renders only one of them, so they could not cancel the stray and had to email support for a manual Stripe fix. Two defects:

1. **Display collapse** — `web/src/lib/hooks/useStripeSubscriptions.ts:23` `deriveView()` does `.find(s => s.status === 'active')`; a second active sub is fetched but never shown.
2. **All-or-nothing cancel** — `POST /api/users/cancel-subscription` → `SubscriptionService.cancelUserSubscriptions(email, mode)` cancels *every* active sub and (immediate mode) deletes *all* email-matched DB rows.

The backend already returns all subscriptions (`getSubscriptionStatus` → `findRecentStripeSubscriptions`, status `all`, cross-email via `linked_email`), so this is a frontend surface plus a targeted-cancel endpoint, not a backend enumeration change.

## Riskiest assumption

The duplicate resolves to the same account the user is logged into (same email or a `linked_email`). If the stray sits under a different identity, `findRecentStripeSubscriptions(callerEmail)` never returns it — self-serve cannot reach it and ops recovery stays the only path.
**Smallest test:** before building, check recent duplicate-billing cases — do both active subs resolve to one account via email/`linked_email`? If most do, this covers the majority; if not, re-scope. (Note from the first ops case investigated under this issue: the reporter's contact email mapped to no Stripe customer at all — the live customer used a different checkout email. The cross-email path via `linked_email` is therefore load-bearing, not a corner case.)

## Scope

**In:** expose `activeSubscriptions[]` from `useStripeSubscriptions`; render a multi-sub card in `SubscriptionManagement.tsx` only when `>1` active; new `POST /api/users/subscriptions/:id/cancel` (route → controller → service) that cancels one sub by id and deletes only the targeted DB row; ownership guard (id must appear in `findRecentStripeSubscriptions(callerEmail)`, else 403).

**Out:** ops recovery for orphans-with-no-owner (commit `473805b` — solves a different problem, not reusable here); refund automation; double-subscribe prevention (closed by `d7066f4`); any change to the existing cancel path for single-sub users.

## User story

As a returning paid user with two active subscriptions, I want to see both and cancel the one I didn't mean to keep, so I stop being double-charged without waiting on support.

## Acceptance criteria

- [ ] With `>1` active subscription, the account page shows a card listing each active sub with plan name, billing amount, and next billing date.
- [ ] With exactly 1 active subscription, the account page is unchanged.
- [ ] Each row has a cancel action that cancels that subscription immediately.
- [ ] Cancelling one subscription leaves the other active and billing normally.
- [ ] After a successful per-sub cancel, the cancelled sub disappears and only its DB row is removed.
- [ ] `POST /api/users/subscriptions/:id/cancel` returns 403 when the id is not among the caller's resolved subscriptions; Stripe is **not** called in that case.
- [ ] The ownership guard does not depend on `payload.metadata.user_id` (legacy orphans lack it).
- [ ] Stripe ids are not written to logs; `subscription_self_serve_extra_cancel` fires on a successful per-sub cancel.
- [ ] The stray-cancel path does **not** render the legacy-rate warning or route through `CancellationFollowUp`; both stay on the single-sub primary-cancel path.
- [ ] All user-facing copy passes `VOICE.md`.

## Leading indicator

Weekly duplicate-billing support tickets (inbox) and Stripe refunds for overlapping active subs, trending to ~0. Day-7 prod check: ≥1 successful per-sub cancel logged, no over-rejecting 403s.

## Design notes

Branch on active-sub count, computed once: `activeSubs = subscriptions.filter(s => s.status === 'active')`.

- **≤1 active:** today's single-sub block, unchanged — no new copy, no behavior change.
- **≥2 active:** amber heads-up line (reuse `.scheduledBadge` / existing `--color-warning-*` ramp — no new color) + one row per sub. Order rows by `current_period_end` ascending (next charge first). Each row: `.statusLine` with plan + `Renews <strong>{date}</strong>`, price in `font-weight: 500` (the number is the hero), and a **neutral** `.secondaryButton` **Cancel this plan** (red reserved for the confirm).

**Confirmation — inline expanding `.dangerSection` panel under the clicked row, not a modal** (the whole task is "cancel the right one of two"; a modal would hide the sibling). One `confirmingSubId` open at a time. Stray cancel uses `mode: 'immediate'`.

Copy strings:
- Heads-up: `You have {n} active subscriptions. You're likely being charged twice — cancel the one you don't want to keep.`
- Confirm title: `Cancel this plan now`
- Consequence: `Cancels the {plan} plan right away. Your card won't be charged the {price} due {date}. This can't be undone.` (fallback `Cancels this plan right away. This can't be undone.` when plan data is missing — never show `$undefined`).
- Confirm button: `Cancel this plan` (`.dangerButton` — red earned here). Dismiss: `Keep it` (`.textButton`).
- Per-row error (`.helpDanger`): `Couldn't cancel this plan. Try again.`
- Success: `refetchAll()` collapses the page back to the unchanged single-sub view; existing `Cancelled. Access has ended.` shows briefly. No bespoke multi-sub success string.
- Already-scheduled row (`cancel_at_period_end`): show ends-date, no cancel button: `{plan} · Ends <strong>{date}</strong>. Access continues until then.` (still counts toward `activeSubs.length`).

**Explicit exclusions on the stray path:** no `isLegacyRate` warning; no `CancellationFollowUp` survey. Both stay on the single-sub primary cancel. Cleanest enforcement: the multi-sub path calls a cancellation flow that never sets `showFollowUp` and never renders the legacy note — do not conditionally suppress inside the shared single-sub block.

**Mobile 375px:** rows stack (`.actions` already `flex-wrap`s); button wraps full-width, min 44px tap target; never truncate price/date; inline panel is full-width — scroll the opened row into view on expand so the sibling isn't pushed off-screen.

## Technical pre-flight

**Layers:** routes (1 new route), controllers (1 new handler), services (1 new method), web (hook + component + backend client + cancel hook). No `usecases` (match the existing controller→service cancel pattern). No `data_layer` change. **No migration** — the Stripe id lives in `payload->>'id'`; single-row delete is a `whereRaw` predicate. **TS only**, no Python.

**New endpoint:**
```
POST /api/users/subscriptions/:id/cancel
body: { mode?: 'immediate' | 'period_end' }   // multi-sub UI always sends 'immediate'
→ SubscriptionService.cancelSubscriptionById(callerEmail, id, mode)
```
Ownership guard (the security core): resolve `callerEmail` from `res.locals.owner`; `const owned = await findRecentStripeSubscriptions(callerEmail)`; if `id` not in `owned.map(s => s.id)` → **403 before any Stripe call**; do **not** gate on `metadata.user_id`. On confirmed ownership, cancel that one sub; immediate-mode delete scoped to `db('subscriptions').whereRaw("payload->>'id' = ?", [id]).delete()` only.

**Files in play:**
- `src/routes/UserRouter.ts`, `src/controllers/UsersControllers.ts`, `src/services/SubscriptionService.ts` (+ their `.test.ts`), `src/lib/integrations/stripe.ts` (read only).
- `web/src/lib/hooks/useStripeSubscriptions.ts`, `web/src/pages/AccountPage/components/SubscriptionManagement.tsx`, `web/src/pages/AccountPage/hooks/useSubscriptionCancellation.ts`, `web/src/lib/backend/cancelSubscription.ts` (+ their tests), `web/src/pages/AccountPage/AccountPage.module.css` (existing classes confirmed present).
- `web/src/pages/WhatsNewPage/changelog/<date>-cancel-one-subscription.json` — user-visible, entry required.

**Security:** CWE-639/BOLA (ownership gate before every Stripe SDK call and the delete; test asserts Stripe not invoked when id not owned), CWE-532 (don't log Stripe ids — the existing `SubscriptionService` log lines are out of scope, don't add more), CWE-209 (generic 500). **Run `/security-review` before merge. Use a worktree** (payments path) — `scripts/worktree-setup.sh` first.

**Effort: M** — two defects, one security-critical endpoint, a multi-state UI list; every layer has a near-identical sibling to clone, no new layer/migration.

## Open questions for `/implement`

1. **Old endpoint fate** — keep `POST /api/users/cancel-subscription` (cancel-all) for the single-sub path, or deprecate once per-sub exists? (Recommend keep for single-sub; per-sub is additive.)
2. **403 copy** — generic `Subscription not found` (doesn't confirm existence) vs explicit. Recommend generic.
3. **Refund** — immediate cancel stops future billing only; refunds stay a manual ops/policy action (out of scope). Confirm the card copy never implies money comes back.
4. **Indistinguishable subs** (same plan/price) — show creation/renewal date per row so the user picks; never auto-pick "the stray".

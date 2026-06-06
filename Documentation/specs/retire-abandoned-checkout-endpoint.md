# Retire the manual abandoned-checkout-recovery ops endpoint

Spec for #2513 (scheduled follow-up from the #2279 spec PR). Draft for review before `/implement`.

## Problem

`POST /api/ops/send-abandoned-checkout-recovery` (shipped in #2270) was a break-glass tool to send
abandoned-checkout recovery emails by hand while the `checkout.session.expired` webhook from #2279
was being rolled out. The webhook is the permanent mechanism. Per the #2279 resolution, the manual
endpoint is to be deleted one week after the webhook has run cleanly in prod — keeping it around is
dead code, which CLAUDE.md forbids ("delete dead code, do not keep 'in case'"). The 234-row CSV
backfill script that lived in the ops folder for the one-time backfill run is likewise spent.

## Proposal (one opinionated direction)

Once the gate below is confirmed, delete the manual path end to end in a single `chore:` PR:

1. Remove the `POST /api/ops/send-abandoned-checkout-recovery` route registration and its
   `RequireOpsAccess` wiring.
2. Remove the controller method `OpsController.sendAbandonedCheckoutRecovery`.
3. Remove the manual-trigger use case it calls (the on-demand path), keeping the webhook-driven
   recovery use case untouched.
4. Delete the one-time 234-CSV backfill script from the deployable surface.

The webhook (`checkout.session.expired` → recovery) and its dedupe table stay; this PR removes only
the manual escape hatch and its backfill helper.

## Gate (must be confirmed before `/implement` runs)

- **One week of clean `checkout.session.expired` webhook firings** observed via `/ops/performance`:
  no signature failures, no retry storms, no missing-email payloads.
- If the bake week is not yet clean, this PR waits — it does not ship early.

## Scope

- Delete the route, the `RequireOpsAccess` registration, the controller method, the manual use case.
- Delete (or move off the deployable surface) the 234-CSV backfill script.
- Update / remove the route's test so the suite reflects the smaller ops surface.

## Explicitly NOT in scope

- Touching the `checkout.session.expired` webhook handler, its dedupe table, or the
  webhook-driven recovery use case — those are the permanent mechanism and stay.
- Changing any other ops endpoint or the `RequireOpsAccess` middleware itself.
- Re-running or re-importing the CSV backfill.

## Touch points

- `src/routes/OpsRouter.ts` — remove the `send-abandoned-checkout-recovery` route registration.
- `src/controllers/OpsController.ts` — remove `sendAbandonedCheckoutRecovery` and its injected
  use-case dependency (`SendAbandonedCheckoutRecoveryUseCase` on the manual path).
- `src/usecases/ops/` — remove the manual-trigger use case if it is no longer referenced.
- The ops-folder 234-CSV backfill script (path to confirm at implement time).
- Tests covering the removed route.

## Risks / Rails — read before `/implement`

- **Payments / checkout-recovery surface.** Even though this is a deletion, it sits on the
  checkout-recovery path. Run `/security-review` and confirm the bake-week gate before merge.
- **Verify the webhook is the only remaining sender.** Before deleting, grep for every caller of the
  manual use case and confirm nothing else (cron, script, test fixture in prod path) depends on it.
  Deleting a still-referenced symbol breaks the build; deleting a still-used path silently drops a
  recovery channel.
- **`SendAbandonedCheckoutRecoveryEmail` in `EmailService` stays** — it's shared with the webhook
  path. Remove only the manual *trigger*, not the email-sending capability.
- **No worktree-trigger path here** (no `migrations`, no `WebhookRouter`, no auth/payments service
  dir), but the payments-adjacency still warrants the security review above.

## Acceptance criteria

- One week of clean `checkout.session.expired` webhook firings confirmed via `/ops/performance`
  before merge.
- `POST /api/ops/send-abandoned-checkout-recovery` returns 404 (route gone); its controller method,
  manual use case, and `RequireOpsAccess` registration are removed.
- The 234-CSV backfill script no longer ships in the deployable surface.
- The webhook-driven recovery path and its dedupe table are unchanged and still send recovery email
  on `checkout.session.expired`.
- `/check` is green; the removed route's test is deleted or updated, and no dangling import or unused
  injected dependency remains.

# Spec: Reconcile from Stripe CSV (/ops admin command)

### Trio synthesis
- **PM**: Drive "paying-in-Stripe but free-in-our-DB" users to 0 for a known list in one upload + apply, with a per-row audit trail, replacing throwaway scripts and one-off SQL.
- **Designer**: A new card inside the existing `/ops` **Commands** tab (sibling to the Stripe sync card); preview-first with a checkbox-gated **Apply N changes**, masked PII in the report, full copy strings supplied.
- **Engineer**: Effort **M**, no migration, no Python; reuse the existing `subscriptions` upsert (`updateStoreSubscription`) — but the Stripe CSV lacks the nested objects that write expects, forcing an A-vs-B apply decision.
- **Agreement**: Admin-only; provision-missing only (never revoke); two endpoints (dry-run + apply); apply re-parses server-side; lives in the Commands tab; no schema change; build the dry-run report first.
- **Conflict**: How "apply" provisions. Engineer found the CSV can't feed `updateStoreSubscription` directly. **Resolved**: build the dry-run report first (identical for both options), then a 2-minute inspection of a real Stripe Subscriptions CSV header decides — **(B) CSV-as-index → fetch from Stripe → real write** if the export carries a subscription/product id (preferred, keeps `payload` real); else **(A) synthetic write**. Apply ships as a fast-follow once decided.
- **Resulting plan**: Ship a preview-first `/ops` Commands card that reports who *would* be provisioned from a Stripe Subscriptions CSV; gate Apply on inspecting one real export to pick the write path, reusing the existing `subscriptions` provisioning shape and never revoking.

---

## Outcome
An admin fixes the next bulk provisioning gap (paying in Stripe, free in our DB) in under 5 minutes — one upload, a preview of exactly who would change, one apply — with a per-row audit trail and idempotent re-runs. Time-to-fix for a 200+ row backlog drops from "write a throwaway script" (hours, eng-only) to minutes (admin self-serve).

**Goal alignment** — Past 300K users, a webhook that silently drops a `customer.subscription.created` degrades paying users into free-tier limits: the most churn- and refund-prone segment we have. A break-glass bulk fix keeps paid value flowing to people who already paid.

## Problem
The Stripe webhook can miss events (historically there was no `customer.subscription.created` handler), so a user who pays can land stuck on the free tier, hitting the monthly card limit they paid to escape. Today the only fixes are the `/ops` "Sync now" button (paginates all of Stripe — slow, rate-limited at scale) or hand-written SQL. Issue #2513 is about to delete a throwaway 234-row CSV backfill script; that exact need recurs and has no reusable, auditable tool.

**Specific instance**: a subscriber who paid for a plan but whose `subscriptions` row was never written — they convert, hit the free monthly cap, and look unpaid to the product despite an active Stripe subscription.

## Riskiest assumption + smallest test
**Assumption**: a Stripe Subscriptions CSV carries enough to (a) match the right 2anki user by email-then-customer-id, and (b) drive provisioning. **Smallest test**: export one real Stripe Subscriptions CSV and inspect its header row. This confirms the match columns exist (≥90% of paying rows should resolve to a user in the dry-run) **and** decides the apply path (A vs B below). No apply code is written until this 2-minute check passes — the dry-run report is built first and is identical for both paths.

## Scope
**In**: Stripe **Subscriptions** CSV upload (admin-only, `RequireOpsAccess`); match each row by email, then Stripe customer id; for paying rows (status `active`/`trialing`) where the user has no **active** `subscriptions` row, provision via the existing write shape; **dry-run report first**; **separate Apply**; idempotent re-runs.

**Out**: revoking/downgrading any access (never call `reconcileActiveSubscriptions`); touching `users.patreon` (lifetime flag — owned by the Patreon flow); other CSV types (invoices, customers, charges); scheduled/auto runs (no cron, no `setInterval`); changing the webhook; reconciling against the live Stripe API for an arbitrary user set; per-sub-page anything. Downloadable report CSV — next iteration.

## User story + acceptance criteria
*As an admin, I upload a Stripe Subscriptions CSV and preview exactly who would be provisioned before committing, so I can bulk-fix stuck paying users safely and see what changed.*

- [ ] Uploading a CSV returns a **dry-run report**; nothing is written on upload.
- [ ] Report shape: `{ dryRun, totals: { totalRows, wouldProvision, alreadyProvisioned, noMatch, ignoredNonPaying, errors }, rows: [{ rowNumber, email, stripeCustomerId, status, outcome, detail }] }` — `outcome ∈ {would-provision, already-provisioned, no-match, ignored-non-paying, error}`; `detail` carries the reason for no-match/error. Never echo arbitrary parsed columns.
- [ ] Matching tries **email first, then Stripe customer id**; a row matched by either resolves to one user.
- [ ] **Apply** is a separate call that **re-parses the CSV server-side** (never trusts the client's preview) and provisions only would-provision rows through the existing `subscriptions` write — no new provisioning logic, no revoke.
- [ ] Re-running the same CSV after a successful apply yields **0 would-provision, 0 errors**; prior would-provision rows now read already-provisioned (idempotent — `onConflict('email').merge`).
- [ ] "Would-provision vs already-provisioned" is decided by an **active** subscription check, not mere row existence.
- [ ] A malformed CSV / unrecognized header returns a clear typed error naming the problem and provisions nothing — no stack trace to the client.
- [ ] Apply never flips `active: false`, never calls a deactivate path, never touches `users.patreon` (asserted in a test).
- [ ] Copy passes VOICE.md (direct, specific, sentence case, no exclamation marks). After apply: `Done — 4 users provisioned. 0 errors.`
- [ ] Server logs carry **hashed** email/customer-id surrogates only (CWE-532), never raw values.

**Leading indicator**: # of mis-provisioned paying users (paying in Stripe, free in DB) → target 0 for any uploaded list; admin time-to-fix a known backlog → minutes, self-serve.

## Open questions for the engineer
1. **Apply path A vs B** (gated on the smallest test): (A) synthesize a minimal `subscriptions` row from CSV fields — cheap, no Stripe calls, but forks the `payload` shape that `reconcileActiveSubscriptions` reads (`payload.id`); (B) use the CSV id to `stripe.subscriptions.retrieve` + `customers.retrieve`, then call the real `updateStoreSubscription` — true reuse, real payload, but adds bounded Stripe calls (cap concurrency like `FORWARD_SYNC_CONCURRENCY = 5`, background if large). **Recommend B if the export carries a subscription/product id.**
2. Exact Stripe Subscriptions export headers for email, customer id, status, product/plan.
3. Treat `trialing` as paying? (The 1-hour trial was removed in `0c1b89c`; confirm trialing rows should still provision.)
4. CSV parser: hand-rolled RFC-4180 line parser vs a small vetted dep (`pnpm why` first per dependency rules) — flagged for the trio.

---

## Design notes (from designer)
- **Location**: a new card in the existing **Commands** tab (`web/src/pages/OpsPage/CommandsTab.tsx`), directly below the **Stripe subscriptions** card — same domain, same sitting. Not a new top-level tab. `opsTabs.ts` unchanged.
- **Layout**: one card, three progressive zones — (1) file picker + **Check file**; (2) dry-run banner + a totals mini-card row + a per-row table; (3) a confirmation checkbox + **Apply N changes**.
- **Two-step gate**: after the dry run, **Apply N changes** becomes primary but stays disabled until the admin ticks `I reviewed the N changes above`. The count is baked into both the checkbox and button labels; re-running **Check file** resets the checkbox and clears the prior report so a stale preview can't apply the wrong batch. Neutral button styling, not danger red (additive, never revokes) — the checkbox is the guard.
- **Report**: totals mini-cards, **Would provision** rendered in `--color-primary` (the number that drives the decision); per-row table `Row · User · Stripe status · Outcome` with badge variants per outcome; default to showing would-provision / no-match / error, with a chip toggle to reveal already-provisioned / ignored so 300 no-ops don't bury the 4 that matter.
- **PII**: show numeric user id as primary identifier, masked email (`al•••@gmail.com`) secondary, wrapped in `data-hj-suppress`; for no-match rows show masked email + masked customer id (`cus_••••4821`). Showing emails to the gated ops owner in the browser is acceptable; **server logs must not carry them**.
- **Copy strings** (sentence case, VOICE-compliant): title `Reconcile from Stripe CSV`; description `Upload a Stripe Subscriptions CSV export. Paying rows whose user has no access yet get provisioned. This never removes access from anyone.`; buttons `Choose CSV file`, `Check file`, `Apply N changes` / `Apply 1 change`; dry-run banner `Dry run — nothing has changed yet. Review the N rows that would be provisioned, then apply.`; zero case `Dry run — nothing to provision. Every paying row already has access.`; while reading `Reading subscriptions.csv`; while applying `Granting access to N users`; success `Done — N users provisioned. 0 errors.` / partial `Provisioned 3 of 4 users. 1 row failed — see the table.`; upload error `Couldn't read this file. Export Subscriptions from Stripe as CSV and try again.`; per-row error `Couldn't provision — try Sync now for this user`; empty state `No file chosen. Choose a Stripe Subscriptions CSV to see what would change.`; wrong type `This isn't a CSV. Choose the Subscriptions export from Stripe — it ends in .csv.`
- **Verdict**: ship it; one decision flagged — dry-run and apply are **two endpoints**, apply re-parses server-side.

## Technical pre-flight (from engineer)
- **"Provisioned" = an active row in the `subscriptions` table keyed by lowercased `email`** (`{ email, active, payload, stripe_product_id }`) plus `users.stripe_customer_id`. **Not** `users.patreon` (lifetime/Patreon-owned — do not touch). The reusable write primitive is **`updateStoreSubscription(db, customer, subscription)` in `src/lib/integrations/stripe.ts`** (does the `onConflict('email').merge` upsert + customer-id write). `isPaying` reads `patreon || subscriber`, where `subscriber` derives from an active `subscriptions` row — so writing that row *is* provisioning.
- **Layers**: routes (`src/routes/OpsRouter.ts` — one new `POST /api/ops/reconcile-stripe-csv`, `RequireOpsAccess` + `multer` memoryStorage `.single('file')`); controllers (`src/controllers/OpsController.ts` — new `reconcileStripeCsv`, map to typed response); usecases (new `src/usecases/ops/ReconcileStripeCsvUseCase.ts` + test, DI repos/provision fn, no `knex`); services (new `src/services/ops/StripeCsvParserService.ts` + test — pure parse + header validation); data_layer (`UsersRepository`: `getByEmail` exists; add find-by-`stripe_customer_id` and an **active**-subscription check; prefer a thin `SubscriptionsRepository` for the write so the use case stays db-free); web (`CommandsTab.tsx` + new `reconcileStripeCsv.ts` helper mirroring `syncStripeSubscriptions.ts`).
- **`RequireOpsAccess`** (`src/routes/middleware/RequireOpsAccess.ts`): cookie token → email must equal `OPS_OWNER_EMAIL`, else 404 (hides the dashboard); sets `res.locals.owner`/`email`. New route follows the identical shape. The owner passed to provisioning reads is the authenticated owner — never attacker-controllable.
- **Reuse the write, skip the revoke**: call the `subscriptions` upsert per matched paying row; **never** call `reconcileActiveSubscriptions` (that deactivates stale rows).
- **No DB migration** (reads existing `users`/`subscriptions`, writes via existing upsert) → **no `pnpm kanel`**. **No TS↔Python**.
- **Multipart**: `multer.memoryStorage()` (CSV is small) with a tight `limits.fileSize` (~5 MB) → 413 on `LIMIT_FILE_SIZE`; validate it's CSV server-side, don't trust `originalname`; with memoryStorage no FS write (sidesteps CWE-22/434); parse in try/catch + header shape check (CWE-20); reject unrecognized layouts. No general CSV parser exists in the server workspace — hand-roll an RFC-4180 line parser or add a small vetted dep (`pnpm why` first).
- **Security/testing**: gate with `RequireOpsAccess`; hash email/customer-id in logs (`shortHash`/`emailHash`, CWE-532); typed response, never raw CSV/DB rows (CWE-209); idempotency via the active-row check; assert apply never revokes / never touches `patreon`. Query-builder-only reads (no new `knex.raw` with aliases) avoid the PG-dialect generated-SQL test requirement. Result-shape template: `SendAbandonedCheckoutRecoveryResult`.
- **Effort**: **M** — single gated endpoint + use case + CSV parser + Commands-tab card on well-trodden patterns; rises to high-M only if the apply path is (B) with bounded Stripe fetches + a background-job shape.

---

*Closest existing template: `src/usecases/ops/SendAbandonedCheckoutRecoveryUseCase.ts` (CSV/ops-action + result shape). This generalizes the throwaway backfill that #2513 deletes — file #2513's cleanup separately; do not block it on this.*

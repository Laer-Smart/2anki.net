# SendGrid bounce/suppression webhook for transactional email

Spec for #2505 (follow-up to #2495 / #2504). Draft for review before `/implement`.

## Problem

A paying subscriber clicked "Forgot password" twice and received nothing. #2504 made the failure
*visible* (structured `password_reset.magic_link` events + a `support@2anki.net` next step) but did
not address the likely root cause: the address is on SendGrid's suppression list (prior hard bounce
or spam complaint), so `sgMail.send()` returns success while no inbox ever sees the mail. The same
blind spot exists for every transactional email we send — deck-ready notifications, receipts,
verify-email — for users whose address quietly broke after signup.

## Proposal (one opinionated direction)

Close the loop with SendGrid's event webhook plus a send-time suppression check:

1. **Receive** SendGrid event webhooks at a new internal endpoint and persist the events we care
   about (`bounce`, `dropped`, `spamreport`, `blocked`, `deferred`, `unsubscribe`).
2. **Verify** the webhook with SendGrid's signed-event-webhook ECDSA signature against the **raw
   request body** (not parsed JSON); reject mismatches with `401`.
3. **Short-circuit at send time**: a thin wrapper inside `EmailService` checks the latest
   suppression state for the recipient before every `sgMail.send()`. On a recent hard-bounce /
   spamreport / blocked state, do not send; emit `outcome: 'suppressed'` on the existing
   observability event.
4. **Surface in product**: an account-page banner — never another email — telling the user we can't
   reach their address and to update it.

Store events keyed on a **hashed email** (`lib/misc/hashToken` pattern) plus SendGrid's raw event id;
never log or store the plaintext address in the events table. `deferred` is transient — it does not
suppress; a later `delivered` for the same address clears the "unreachable" UI state.

## Scope

- New table `suppression_events` (email hash, event type, raw SendGrid event id unique, timestamp).
- New endpoint `POST /api/internal/sendgrid/events` with `express.raw` body + ECDSA verification.
- Suppression-check wrapper inside `EmailService.ts` in front of every `sgMail.send()`.
- One observability event per send outcome, extending the `password_reset.magic_link` model.
- Account-page banner when the current user's address has a recent hard-suppression event.
- `.env.example` placeholder for the SendGrid event-webhook verification key.

## Explicitly NOT in scope

- Backfilling historic suppression state — we don't have it.
- Changing the from-address / SPF / DKIM setup (separate concern).
- Letting the user *re-trigger* a send to a suppressed address from the UI (a later issue).
- Touching the marketing-email opt-out path — this is transactional only.

## Touch points

- `src/services/EmailService/EmailService.ts` — wrapper around every `sgMail.send()` call site
  (`sendResetEmail`, `sendMagicLinkEmail`, `sendConversionLinkEmail`, receipts, verify-email).
- `src/routes/` — new internal router for the event webhook (mirror the raw-body pattern in
  `src/routes/WebhookRouter.ts`, which uses `express.raw` + signature verify before parsing).
- `src/controllers/` + `src/usecases/` — receive → verify → persist event.
- `src/data_layer/` + `migrations/` — `suppression_events` table; `pnpm kanel` after.
- `src/services/observability/` — extend the send-outcome event model.
- `web/src/` — account-page unreachable-address banner.

## Risks / Rails — HARD RAILS, read before `/implement`

- **NEW third-party integration on transactional + auth email.** This is the password-reset and
  magic-link path. Implementation must be gated behind explicit human approval and a
  `/security-review` before merge.
- **`migrations/**` is a worktree-trigger path** and **`src/routes/WebhookRouter.*` / `**/webhook*/**`
  are too** — implementation MUST `EnterWorktree` before any edit (engineer rail list).
- **Verify against the raw body, reject on mismatch with 401** (security rule, CWE-345). Never verify
  the parsed JSON.
- **Idempotency:** SendGrid retries. Unique-constrain on raw event id so the same event never
  double-inserts (CWE-362 / dedupe).
- **No plaintext credentials or addresses in logs or source** (CWE-532 / CWE-798). Webhook key from
  `process.env`, validated at boot; events store hashed email only.
- **Fail-open vs fail-closed on send:** if the suppression-state lookup itself errors, send anyway
  (better a possible bounce than a silent lockout) and emit an `outcome` noting the lookup failure.

## Acceptance criteria

- `POST /api/internal/sendgrid/events` is live, ECDSA-verified against the raw body, returns 401 on
  signature mismatch, and is idempotent across SendGrid retries of the same event id.
- Every `sgMail.send()` in `EmailService` passes through the suppression check; a recent hard-bounce /
  spamreport / blocked recipient is not sent to and produces `outcome: 'suppressed'`.
- One observability event per send outcome (`sent` / `suppressed` / lookup-failed).
- Account-page banner appears for a user whose address has a recent hard-suppression event and names
  the update-address action; no email is sent to a suppressed address to tell them they're suppressed.
- Tests cover: signature verification (pass + fail), the suppression short-circuit, the four hard
  event types (`bounce`, `dropped`, `spamreport`, `blocked`), and a `deferred`-then-`delivered` case
  that does **not** leave the address suppressed. SendGrid SDK / HTTP mocked at the edge only.

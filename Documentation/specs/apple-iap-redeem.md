# Spec: Apple StoreKit 2 IAP redemption endpoint (`POST /api/iap/redeem`)

### Trio synthesis
- **PM:** Build one cookie-authed endpoint that verifies an Apple transaction JWS and applies the same entitlement Stripe already grants; reuse `UserPassRepository.upsertWithExtension` for consumable accumulation/idempotency; ship without refund/revocation (file the Notifications-V2 follow-up the moment it lands).
- **Designer:** No web UI for the endpoint, but write VOICE.md success/error `message` strings the native client renders verbatim — and a fast-follow account-page edit, because an Apple-managed plan can't be cancelled through the Stripe portal the account page currently advertises.
- **Engineer:** **The issue's `unlimited`/`unlimited_until`/`ankify_access` columns do not exist** — real entitlements live in `user_passes` (consumables) and `subscriptions`/`users.patreon` (monthlies, keyed by email). Bridging Apple purchases into *both* systems — especially making `getIsSubscriber`/`hasAnkifyAccess` honor an email-less Apple grant — is the real work. Effort **L**; **M** if scoped to consumables only.
- **Agreement:** New endpoint, cookie auth + origin check, idempotency keyed on Apple `transactionId`, entitlement derived from the *decoded JWS* (never the client's claimed `product_id`), `/security-review` required, return the existing `locals` DTO.
- **Conflict:** PM's spec assumed the issue's entitlement columns; the engineer proved they're fictional. **Resolved:** adopt the real schema and **phase the work** — Phase 1 ships the two consumable passes (clean `user_passes` reuse, M); Phase 2 adds the two monthly subscription tiers (new Apple-grant storage + read-path wiring into `getIsSubscriber`/`hasAnkifyAccess`, the riskier half).
- **Resulting plan:** Ship `POST /api/iap/redeem` for Day Pass + Week Pass first (reusing `user_passes`), then follow with the monthly subscription tiers and an account-page Apple-source branch — with three blockers settled before any code.

---

## Outcome

Every verified Apple purchase from the native app credits the user's account in one request. Today the native channel is a **100% failure**: Apple takes the money, the account is never credited, and the client silently re-queues the JWS forever.

**Goal alignment:** unlocks the entire Apple IAP revenue channel for the native iOS/macOS app — a new path toward 300K users that needs zero new web traffic.

**Success metric:** ≥ 95% of submitted JWS redemptions return 200 with the entitlement visible in `locals`, measured by `iap.redeem.granted` vs `iap.redeem.failed` event counts in week one. Leading indicator moved: native-originated paid conversions (0 → real).

## Problem

The native app ships StoreKit 2 with four products (Day Pass $4, Week Pass $9, Unlimited monthly, Auto Sync/Ankify monthly). The client completes the Apple purchase, gets a verified `Transaction.jwsRepresentation`, and POSTs it to a server endpoint **that does not exist**. Client wiring is done (`APIClient+IAP.swift`, `StoreKitService`); this endpoint is the one missing piece.

## Riskiest assumption + smallest test

**Assumption:** we can verify Apple's signed transaction server-side with our App Store Server credentials, and the JWS carries verifiable `transactionId` / `productId` / `expirationDate`.
**Smallest test (do this first, before any endpoint code):** a standalone `npx tsx` script that takes one real **sandbox** JWS and runs `SignedDataVerifier.verifyAndDecodeTransaction()` from `@apple/app-store-server-library` against the sandbox host, printing the decoded payload. If it prints a verified `transactionId` + `productId`, the assumption holds and the rest is plumbing we already own. This also resolves sandbox-vs-production routing.

## Scope

**In (Phase 1 — consumables, effort M):**
- `POST /api/iap/redeem` — cookie auth (`RequireAuthentication`) + `RequireAllowedOrigin` (`https://2anki.net`).
- JWS verification via Apple's official lib (offline x5c cert-chain check is the security-critical path).
- `daypass.24h` / `weekpass.7d` → reuse `user_passes` accumulation (`upsertWithExtension`); the existing `base = currentActive.expires_at ?? now` math already matches the issue's `max(now, expires) + Nd` semantics.
- Idempotency: new `apple_transactions` ledger, unique on Apple `transactionId` → duplicate returns 409.
- Return mapped `locals` DTO on success.

**In (Phase 2 — monthly tiers, follow-up, effort L):**
- `unlimited.monthly` / `ankify.monthly` → new Apple-subscription grant keyed by `user_id` + `source='apple'` with `expires_at = decoded expirationDate`; teach `AuthenticationService.getIsSubscriber` and `hasAnkifyAccess` to honor an active Apple grant.
- Account-page Apple-source branch in `SubscriptionManagement.tsx` (designer note below).

**Out (next iteration / separate spec):** App Store Server Notifications V2 (refunds, cancellations, billing-retry, renewal pushes) — **without it a refunded Apple subscriber keeps access**, so file it the moment Phase 1 ships. Also out: Stripe↔Apple cross-channel dedup, anonymous IAP, refund clawback.

## User story + acceptance criteria

> As a native-app user who bought a Day Pass through Apple, I want my purchase credited to my 2anki account so unlimited conversions unlock immediately, without contacting support.

- [ ] **200** — valid, never-seen JWS, known product: entitlement applied, body `{ ok, message, locals }`. Entitlement derives from the **decoded JWS** `productId`/`expirationDate`; the body `product_id` is only cross-checked.
- [ ] `daypass.24h` adds 24h to the user's active pass window (accumulates).
- [ ] `weekpass.7d` sets the pass window to `max(now, current) + 7d` (accumulates).
- [ ] `unlimited.monthly` → active Apple grant honored by `getIsSubscriber` while `expirationDate > now`. *(Phase 2)*
- [ ] `ankify.monthly` → active Apple grant honored by `hasAnkifyAccess` while `expirationDate > now`. *(Phase 2)*
- [ ] **400** — JWS malformed, or decoded `productId` ≠ body `product_id`.
- [ ] **401** — no auth cookie (handled by middleware before the controller).
- [ ] **409** — `transactionId` already credited; no second grant.
- [ ] **502** — Apple's App Store Server API unreachable/rejects; client keeps the JWS queued and retries.
- [ ] Layering: `routes/IapRouter.ts` → `controllers/IapController` → `usecases/iap/RedeemAppleTransactionUseCase` → `services/AppleStoreKitService` + `data_layer/AppleTransactionsRepository` (+ reuse `UserPassRepository`). No `knex` outside `data_layer`; never return raw rows.
- [ ] Tests (Jest, outside-in, `SignedDataVerifier` mocked at the service edge): `it.each` over the four products → correct state change; duplicate `transactionId` → 409; failed verification → 400 and **no credit**; Apple rejection → 502; missing cookie → 401. `jest.useFakeTimers` for the accumulation math.

## Three blockers to settle before code

1. **Bundle ID vs product prefix conflict:** the issue gives bundle `no.laersmart.-anki` (hyphen literal) but product IDs `net.2anki.*`. The verifier asserts `bundleId` and the product allowlist must match what the app actually ships. **Confirm with the native/client owner.**
2. **How Apple monthlies surface as entitlements:** `getIsSubscriber`/`hasAnkifyAccess` are email-keyed off `subscriptions`; an Apple subscription has no Stripe email. Decide the storage + read-path bridge before Phase 2.
3. **Idempotency key = Apple `transactionId`** (not the JWS, not `user_passes.stripe_payment_intent_id` — renewals re-post a new `transactionId` and must accumulate, while a replayed `transactionId` must 409).

## Design notes

No web UI for the endpoint itself; the `message` string **is** the post-purchase confirmation UI (the native client renders it verbatim). Sentence case, no exclamation, specific.

| Product | Success `message` |
|---|---|
| `daypass.24h` | `Day Pass active — unlimited cards for the next 24 hours` |
| `weekpass.7d` | `Week Pass active — unlimited cards for the next 7 days` |
| `unlimited.monthly` | `Unlimited active — no card limit, PDF support, and multiple conversions at once` |
| `ankify.monthly` | `Auto Sync active — your Notion pages stay in sync with Anki` |

(Product noun first; "Auto Sync" is the user-facing name for `ankify.monthly`.)

| Status | Error `message` |
|---|---|
| 400 | `We couldn't read this purchase. You weren't charged — try the purchase again.` *(if a 400 can fire after Apple charged, use the 502 phrasing instead — never tell a charged user they weren't)* |
| 409 | `This pass is already active on your account — nothing more to do.` |
| 502 | `Apple couldn't confirm this purchase. If you were charged, it'll be credited automatically — or contact support@2anki.net.` |

`message` is never empty; an unmapped product → 400 with the generic 400 string. `support@2anki.net` is a protected string.

**Fast-follow web edit (Phase 2):** `web/src/pages/AccountPage/components/SubscriptionManagement.tsx` advertises *"managed through your Stripe account"* with Cancel buttons. For an Apple-sourced plan that copy lies and the Cancel button is a dead end. When `locals` marks the plan Apple-sourced, replace with `Managed through your Apple subscriptions. To change or cancel, open Settings on your iPhone or the App Store.` and hide the cancel buttons. Must land before the iOS app ships to the App Store.

## Technical pre-flight

| Layer | File(s) |
|---|---|
| routes | **new** `src/routes/IapRouter.ts`; mount in `src/server.ts` (~line 187) with `RequireAuthentication` (sets `res.locals.owner`, 401s if absent) + `RequireAllowedOrigin` (verify `2anki.net` ∈ `ALLOWED_ORIGINS`, `src/lib/constants.ts:25`). |
| controllers | **new** `src/controllers/IapController.ts` — HTTP shaping, error→status mapping, build the `locals` DTO from `configureUserLocal`'s shape. |
| usecases | **new** `src/usecases/iap/RedeemAppleTransactionUseCase.ts` — verify → map product → apply entitlement → idempotency (constructor-injected deps, mirror `CreatePassCheckoutUseCase`). |
| services | **new** `src/services/AppleStoreKitService/` — wraps `@apple/app-store-server-library`. |
| data_layer | reuse `UserPassRepository` (`upsertWithExtension`, PG 23505 → 409 pattern); **new** `AppleTransactionsRepository` (idempotency ledger); Phase 2: Apple subscription-grant storage. |
| migrations | ≥1: idempotency ledger; Phase 2 Apple-grant table; then `pnpm kanel`. Route through `migration-reviewer`. |
| web | none for the endpoint; Phase 2 account-page branch. The returned `locals` must match `GetUserLocalsResponse.locals` (`web/src/lib/backend/getUserLocals.ts:5-17`). |

**Security/testing/migration:** PAYMENTS + external API → **`EnterWorktree` mandatory**, `/security-review` before merge. JWS signature verification must not be bypassable — entitlement + expiry come from the decoded JWS, never the client. New runtime dep (`@apple/app-store-server-library`) → transitive-bloat check; it fetches Apple CRL/key endpoints itself, **bypassing `instrumentedAxios`** — document as a conscious waiver (fixed `*.apple.com` hosts) in the security review. Secrets from `process.env`, validated at boot: `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY` (PKCS8 .p8), `APPLE_IAP_BUNDLE_ID`, `APPLE_IAP_ENVIRONMENT`. Never log the JWS or private key (CWE-532; hash the transaction id per the security rule). No TS↔Python coordination — `create_deck.py` untouched.

**Effort: L** (M if Phase 1 only). The endpoint is easy; the cost is bridging Apple purchases into two distinct existing entitlement systems and wiring the subscription read-path.

## Open questions for the engineer

1. Reuse the webhook's inline pass-granting directly, or extract a shared entitlement service? **Recommend:** call the existing `user_passes` primitives directly; extract only on the third copy.
2. For Phase 2, does setting an Apple "unlimited" grant need a reaper to expire it, or is expiry checked at read time (as `user_passes` does)? Confirm before wiring the monthlies.
3. Does the client signal sandbox vs production, or do we infer from the JWS / try-prod-then-sandbox? Resolve during the smallest test.

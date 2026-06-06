# Spec: Expose active pass kind + expiry to the native app

Tracks #3077. Apple IAP passes (#2971) set `res.locals.subscriber = true` exactly like a real subscription, so the native app cannot tell a Day/Week pass apart from a subscription and shows a generic "Active" pill. The data the app needs already lives in `res.locals` — this spec is about exposing it as an explicit, typed contract field and fixing the usage flag.

## Problem

The native app reads the user payload and sees only `subscriber: boolean`. With no pass kind or expiry it cannot show honest copy — a Day Pass holder would be mislabelled "Subscriber" (the app currently falls back to a generic "Active"). The web `AccessBanner` already derives precise copy from `passKind` + `passExpiresAt`; the native app has no equivalent. Separately, a freshly-bought pass briefly shows "0 / 100 cards this month" before refreshing. See #3077 (related: #2971, #3069).

## Proposal

`configureUserLocal` already sets `res.locals.passKind`, `res.locals.passExpiresAt`, and `res.locals.planSource`, and `GET` of the user payload (`getLocals`) already returns the whole `locals` object. The fix is to make the contract **explicit and typed** rather than relying on the app to read an untyped `locals` blob (sending raw internal state to the client is a coupling/leak hazard — CWE-209):

1. Add a typed `entitlement` object to the user-payload response shape:
   - `passKind: '24h' | '7d' | 'unlimited' | null`
   - `passExpiresAt: string | null` (ISO-8601, the decoded Apple `expiresDate` / pass expiry)
   - `planSource: 'apple' | 'stripe' | 'patreon' | 'lifetime' | null`
2. Map it explicitly from the resolved locals into the response; do not widen the raw `locals` passthrough.
3. Fix `GET /api/users/usage` (or the equivalent usage endpoint) to report `unlimited: true` for any active pass holder, so a freshly-bought pass shows "Unlimited" immediately, not "0 / 100".

Reuse the existing `'24h' | '7d' | 'unlimited'` and `PlanSource` types — `passKind` lives on the `UserPass` row, `planSource` is already computed by `resolvePlanSource`. No new derivation logic.

## Scope

- A typed `entitlement` field in the user-payload response (`passKind`, `passExpiresAt`, `planSource`).
- Explicit mapping from locals → response shape (stop relying on the untyped `locals` blob for these three).
- `unlimited: true` in the usage endpoint when an active pass exists.

## Explicitly NOT in scope

- Any change to how passes are granted, priced, or validated (Apple IAP, Stripe, anonymous pass) — read-only exposure only.
- New entitlement tiers or pass kinds.
- The web `AccessBanner` (already correct).
- Removing the existing `locals` passthrough wholesale — only the typed fields are added; the broader cleanup is its own refactor.
- `planSource` semantics changes from #3069 — consume the existing value, don't redefine it.

## Touch points

- `src/controllers/UsersControllers.ts` — `getLocals` builds the response; add the typed `entitlement` field here.
- `src/routes/middleware/configureUserLocal.ts` — source of `passKind` / `passExpiresAt` / `planSource` (read-only reference; no change expected).
- The usage endpoint use case (`src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts` computes the per-feature limit; the usage reporter must treat an active pass as unlimited) — confirm the exact endpoint during implementation.

## Risks / Rails

- **Payments/IAP-adjacent + native-app contract.** This is read-only data exposure, but it changes the shape the native app depends on and touches entitlement data. Gate it: run `/security-review` before merge per the auth/payments rule; do not couple it to any write path.
- **No new source of truth.** `passKind` and `planSource` already exist; the spec forbids re-deriving them. A second derivation that drifts from `resolvePlanSource` would mislabel users.
- **Expiry honesty.** `passExpiresAt` must be the real decoded expiry (already ISO-8601 in locals); never synthesize or round it.
- **Usage flag correctness.** Use `value == null`-style presence checks for the active pass; a `!pass` check would misread a falsy-but-present row.

## Acceptance criteria

- The user-payload response carries a typed `entitlement` with `passKind`, `passExpiresAt`, and `planSource` matching the active pass / subscription.
- A Day Pass holder returns `passKind: '24h'` and a future `passExpiresAt`; an unlimited subscriber returns `passKind: 'unlimited'`; a free user returns all-null.
- `GET` of the usage endpoint returns `unlimited: true` for an active pass holder immediately after purchase.
- A controller-boundary test asserts the response `entitlement` shape for each of: free, Day Pass, Week Pass, unlimited subscription.
- `/security-review` run recorded on the PR before merge.

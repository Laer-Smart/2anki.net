# Spec: Referral loop

**Status:** draft — awaiting one decision (reward currency, see §3).
**Trio:** pm + designer + engineer (synthesized).

## Why

The product delivers value fast — ~84% of uploads become a downloaded deck — but paid conversion is the leak (8 days: 2 215 paywall views → 146 upgrade clicks → 16 paid; 1–6 new subs/day). Decks are intrinsically shareable (classmates, study groups), yet there is **no referral mechanism**. Every successful free conversion could become a near-zero-CAC acquisition channel. This is the Dropbox-shaped lever.

## The loop (v1)

A logged-in user shares a referral link. A new user signs up via that link and **converts their first deck**; at that moment both sides earn a reward. One hop only.

- **Trigger surface:** the post-success screen (`upload_success_upsell`, ~388 distinct viewers / 8 days — the warmest, highest-volume moment).
- **Reward gate:** referee's **first conversion**, never bare signup. A dormant/fake account earns nothing. Non-negotiable.
- **Referrer cap:** rewards stop accruing past **5 successful referrals / 30 days** (the real ceiling on abuse damage).

## 3. OPEN DECISION — reward currency (needs Alexander)

The trio split. Pick one before the spec freezes:

| Option | Reward | Pro | Con |
|---|---|---|---|
| **A — bonus cards** *(recommended)* | +100 cards this month, both sides | Same currency users are capped by; **does not cannibalize paid** (cap stays, upgrade motive intact) | New additive `bonus_cards_this_month` column read by the cap check; small new path |
| **B — 7-day Unlimited pass** | One free week of Unlimited, both sides | ~zero engineering — reuses `upsertWithExtension('7d')` → `subscriber:true` → cap skipped | **Cannibalizes paid** — hands the premium product free at peak buy-intent |

Recommended: **A**, implemented cleanly as `limit = 100 + bonus_cards_this_month` in `CheckMonthlyCardLimitUseCase`, reset on the same month boundary as usage — *not* by decrementing `cards_used` (fragile). B is the faster fallback if speed beats cannibalization risk.

## Surfaces (designer)

1. **Post-success screen** — a quieter `.card` block *below* the existing UpsellCard (never above; `Download deck` keeps sole primary-button styling). One read-only link input + `Copy link` button (reuse `SharePopover`'s pattern). On mobile with `navigator.share`, swap in a `Share` button. Anonymous users see a tertiary "Sign in to get your referral link" — never blocked from downloading.
2. **Referee landing `/r/:code`** — the normal upload flow + one credited banner. Not a separate funnel. Code persists (cookie) → claimed at signup.
3. **Shared-deck footer** — one muted "Made with 2anki — convert your own notes" line on `SharedDeckPage`, carrying the sharer's code (organic loop).
4. **Account row** — "Invite a friend · N joined".

Copy (VOICE-compliant, reward-locked once §3 decided): heading "Share 2anki with a classmate"; subtext "They get a free deck. You both get {REWARD} when they convert their first one."; toast "Link copied"; referrer confirmation defaults to "A friend joined and converted their first deck. {REWARD} added to your account." (no name unless consented, per support-confidentiality).

**Do not:** modal/interstitial over the download; auto-copy a marketing message (copy the bare URL only); "invite to unlock" gating; badges/leaderboards/streaks; per-platform deep links; `localStorage` for the code/credit (DB only; cookie is the ephemeral carrier of an unclaimed code).

## Data model (engineer)

Two tables, mirroring the proven `apple_transactions` idempotent-ledger pattern. Run `pnpm kanel` after.

- **`referral_codes`** — `owner` (unique FK users), `code` (unique, `crypto.randomUUID()`-derived — not `Math.random`), `created_at`.
- **`referral_redemptions`** — `referrer_owner` FK, `referee_owner` **unique** FK (one referral per account, ever), `code`, `status` (`pending`→`rewarded`), `qualified_at`, `referrer_rewarded_at`, `referee_rewarded_at`, `created_at`, index on `referrer_owner`.

Reward writes are idempotent via the same unique-key trick the IAP path uses (`referral:<redemptionId>:referrer` / `:referee`). Never forge a `subscriptions` row.

## Attribution flow

Share link `…/r/:code` → cookie (like `anon_id`) → after any successful auth the SPA calls **`POST /api/referral/claim`** once (sidesteps threading through all six `register` call sites and keeps auth controllers untouched). Claim creates a `pending` redemption with self-referral + already-claimed guards. The referee's first `conversion_succeeded` flips it to `rewarded` via `MaybeGrantReferralRewardUseCase`, minting both rewards idempotently.

New events: `referral_link_shared`, `referral_signup`, `referral_qualified`, `referral_rewarded` (for K-factor tracking).

## Abuse prevention

- Reward on **first conversion**, not signup (primary defense).
- `referee_owner` unique → one referral per account; `email` is already unique → fresh address per farmed account.
- Self-referral rejected (`referee_owner === referrer_owner`).
- Referrer accrual capped (5 rewarded / 30 days).
- Double-grant impossible (unique idempotency key on the reward row).
- Signals available: `email` (unique), `signup_country`, `anon_id` cookie. No device/IP fingerprint — don't claim one.

## Success metric

**Referred *activated* signups / week** (signup + first download via a referral link). Target: **10/week by week 4**. Secondary watch: referred-signup → first-download rate should track the ~84% baseline; if much lower, we're attracting farmers, not learners.

## Scope

**v1 ships:** the 2 tables + kanel; `GET /api/referral/code` (create-on-first-call); `POST /api/referral/claim` (+ guards); reward-on-first-conversion hook; 4 events; the post-success share block.
**Defer to v1.1:** referrer accrual cap enforcement, in-app referral dashboard, email-the-referrer-on-qualify, email invitations.

**PM's pre-build de-risk (strongly recommended):** ship the referrer-side "Copy invite link" affordance *first, with no reward logic* — if <5% of post-success users copy it in week 1, learners don't want to share 2anki itself (vs. just the `.apkg`), and the reward design is moot. Build the plumbing only after desire is proven.

## Sensitive paths

The reward grant flips `subscriber`/raises the cap for free → **`/security-review` required**. Keep referral capture in the standalone `POST /api/referral/claim` to avoid touching worktree-gated auth controllers.

> Engineer investigated on the `feat/spec-apple-iap-redeem` branch; the recommended `upsertWithExtension('7d')` (Option B) and `CheckMonthlyCardLimitUseCase` (Option A) both exist on `main` independently of the unmerged IAP work.

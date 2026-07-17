---
description: Weekly retro - pull metrics, compare to goal trajectory, recommend one priority shift
argument-hint: paste this week's numbers, or leave empty to ask for them
---

Use the `pm` agent.

## 1. Pull DB-backed metrics (top of retro)

Pull these **before** any GA4 work — they're the load-bearing numbers, GA4 is the qualifier:

- **Total registered users** (vs the 300K goal in `CLAUDE.md`)
- **Signups this week** (`users.created_at >= now() - interval '7 days'`)
- **MRR (USD)**, **active paying subs**, **30d paid churn %**
- **Top cancellation reasons (last 14d)** — replaces the manual "top 3 support themes" ask

The `BusinessMetricsService` (`src/services/ops/BusinessMetricsService.ts`) already computes all of these and is exposed at `GET /api/ops/business/metrics` (gated by `RequireOpsAccess`).

Fetch it in this order — first one that works wins:

1. **Authenticated curl** to prod:
   ```bash
   curl -s -H "Cookie: $OPS_COOKIE" https://2anki.net/api/ops/business/metrics | jq
   ```
   Requires `OPS_COOKIE` env var set to the ops owner's session cookie (`session=...`). If unset, skip to step 2.
2. **Ask the user to paste** the JSON from `https://2anki.net/api/ops/business/metrics` (they can visit `/ops` and copy the network response, or hit the endpoint directly in a logged-in browser).
3. **Fallback:** ask the user to read the values off the `/ops` dashboard manually.

For the **total registered users** number (not in `/api/ops/business/metrics`), ask the user to paste it, or query `SELECT count(*) FROM users` if a postgres MCP is wired for this project.

**If any of the above fails**, do not silently skip — record the missing field under "Gaps to close before next retro" in the output.

### 1a. Pull the v2 funnel read (per signup_origin)

This is the "stop flying blind" read — the leak between landing → upload → download → checkout → paid, per acquisition source. Pull it every retro; it answers whether the v2 targets (page→checkout ≥10%, checkout→paid ≥50%) are being hit and which origin leaks.

- **Upload funnel** — `GET /api/ops/upload-funnel?window=7d` (gated by `RequireOpsAccess`). Returns the aggregate `stages` + `upload_to_download_rate_pct` / `download_to_signup_rate_pct` / `download_to_paid_rate_pct`, and `by_origin[]` repeating the same stages and rates per `signup_origin` (attributed from the first_touch cookie, ordered by upload volume). Read `by_origin` to name the worst-converting source.
- **Landing-page yield** — `GET /api/ops/landing-page-yield?window=30d`. Signups → subscription / pass / paid per `signup_origin` (the post-signup tail).

Same fetch order as section 1 (authenticated curl with `$OPS_COOKIE`, else ask the user to paste, else read off `/ops`). Report one table: per origin, `upload_started → deck_downloaded → account_created → checkout_completed` and the two rate columns. Name the single biggest leak stage and the origin it hits hardest. If the read fails, record it under "Gaps to close before next retro" — do not skip silently.

## 2. Pull GA4 traffic + engagement (last 7 days vs prior 7 days)

Use the `analytics-mcp` tools against GA4 property `properties/286902985`. Run these reports:

- Sessions + active users + new users by date (last 7 days vs prior 7 days).
- **Traffic Sources**: sessions, new users, and engagement rate by `sessionDefaultChannelGroup` + `sessionSource` — flag any channel that is up or down >20% week-over-week.
- Top events by event count.
- New vs returning users with avg session duration and engagement rate.

## 3. Bot/spam self-check (run before drawing conclusions)

The data can be distorted by a crawler surge faster than the GA4 admin UI can filter it. Run this check on the Traffic Sources output:

- If **Direct/(direct) sessions WoW > +50% AND Direct engagement rate dropped > 20%**, flag bot/referrer-spam traffic. State explicitly in the retro that headline session/new-user numbers are distorted and treat real-user metrics (engagement rate, returning-user behaviour, paid conversions) as the load-bearing signal for the week.
- If flagged: add "apply GA4 bot/referrer-spam filter" to the W+1 gaps list. The filter is a manual GA4 admin action — name it but don't try to fix it from the agent.

## 4. Compute

- Week-over-week change for each metric (sessions, new users, engagement rate, paid conversions, signups, MRR).
- Required weekly growth rate to reach the 300K-user goal in 24 / 18 / 12 months from the **DB user count** (not GA4 new users).
- Gap between actual and required.
- **Traffic Sources table**: which channels grew, which shrank, which drove engaged users vs bounce-and-leave.

## 5. Work-mix and treadmill check

Two standing checks on the week's merged PRs — both run every retro, both report a number:

- **Work-mix report.** Run the sensor: `npx tsx scripts/work-mix-report.ts` (needs `gh`). It classifies every PR merged in the last 7 days into acquisition (landing, SEO, onboarding, signup/first-conversion friction), monetization (pricing, paywall, retention, billing), core-quality (conversion correctness, performance, reliability of the existing pipeline), new-surface (a distinct new user-facing capability), or process (chore/ci/test/docs/deps); prints the count and share per bucket; and exits non-zero with a `FLAG:` line when **acquisition < 25%** — the bucket the `CLAUDE.md` allocation rule protects, and the only lane that creates users. The classifier is a heuristic decision-aid (`scripts/workMix.ts`) — sanity-check any PR it bucketed wrong before trusting the share, and state the flag in one line in the output.
- **Treadmill alarm.** Compare the chore+fix share of commits week-over-week against signups and new-paid. **Flag when chore+fix share rises while weekly signups and weekly new-paid are both flat or down** — that pattern is the 2023-25 stagnation signature (busy commit graph, zero acquisition work, no user growth for 36 months). Name it as such when it fires.

## 6. Write back the business-baseline block in `CLAUDE.md`

You already pulled MRR, paying subs, ARPU, churn, new-paid/wk, and registered users in section 1 — write them into the `### Business baseline` block in `CLAUDE.md` (update the date in the header and every number on the line). This is the one place the baseline is allowed to change; every other agent reads it frozen. If a field couldn't be pulled this run, leave its prior value and note the staleness in "Gaps to close before next retro" — never blank it.

## 7. Identify the single biggest gap

Not three. One.

## 8. Tie it to the goal in `CLAUDE.md`

Does the gap come from making the product simpler/faster/more beautiful, or from scale? Be specific.

## 9. Recommend one priority shift for the next 7 days

Either:
- Spec X this week (and which spec).
- Ship Y (and which spec is ready).
- Pause Z to focus on the gap.

## 10. Emit a "Gaps to close before next retro" section

Any DB field, support theme, or GA4 check that was skipped this run goes here so the next retro doesn't repeat the same blind spot. If nothing was skipped, omit the section.

## Output rules

- Two screens max.
- Numbers in tables.
- "Numbers" section (DB), "Funnel by origin" table (section 1a), and "Traffic Sources" section (GA4) all required.
- Work-mix bucket shares and the treadmill flag are required output, even when nothing is flagged ("acquisition 40% — no flag").
- Recommendation in one paragraph.
- Do not list five things. The point of the retro is to force a single decision.

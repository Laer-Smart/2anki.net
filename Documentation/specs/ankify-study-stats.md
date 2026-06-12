# Ankify study stats on /ankify

### Trio synthesis
- PM: retention surface for the $30/mo cohort; `ankify_stats_viewed` event with a `reachable` flag; binary T+30d keep/remove; the `cardReviews` per-deck fan-out is banned from the request path.
- Designer: one calm card — three hero numbers, a brand-primary streak heatmap (hand-rolled grid, not GitHub green), one stacked by-deck recharts bar; exact copy for offline, zero, and loading states.
- Engineer: two new `AnkiConnectClient` methods, `GET /api/ankify/stats` → `GetAnkifyStatsUseCase` (ping first, three parallel loopback invokes, typed response), heatmap as CSS grid, bar via the OpsPage `ChartPanel` idiom; size M, no new deps.
- Agreement: synced decks only; stats are a status surface (no primary action); offline is a normal state, never an error; no scheduling-adjacent reads or writes.
- Conflict: PM wanted `getCollectionStatsHTML` wrapped-but-unused and a separate 90-day daily chart; designer excluded both. Resolved for designer — unused wrappers violate the code-quality rule, and the heatmap already is the daily chart. Hero #3 resolved to "reviewed this year" (PM had "total cards"; deck totals live in the bar instead).
- Resulting plan: one M-sized PR — endpoint + use case + three-piece stats card — preceded by a 5-line spike verifying `getDeckStats` shape against a live RAC container.

## Outcome

An Ankify subscriber sees their review streak, today's count, and per-deck backlog on /ankify without opening Anki. Stage-2 slice of #3300 (Notion-side mission control). Defends the highest-ARPU cohort ($30/mo Auto Sync) against the 18.9%/mo churn baseline by giving the page a daily-return reason.

## Problem

The value Ankify creates — cards that actually get studied — is invisible on 2anki itself. /ankify shows sync plumbing, not studying. A subscriber who stops reviewing gets no in-product signal, and neither do we, until they cancel.

## Riskiest assumption

That live stats render often enough to matter. Checked against prod 2026-06-12: 2 Ankify owners active in the last 7 days, both with a successful sync inside 24h — reachability is fine; the cohort is simply small. Build stays scoped to one PR accordingly.

## Scope

**In**
- `AnkiConnectClient`: typed `getDeckStats(decks)` and `getNumCardsReviewedToday()` (single round-trips; `getNumCardsReviewedByDay` already exists).
- `GET /api/ankify/stats` behind `RequireAnkifyAccess` → `GetAnkifyStatsUseCase`: `ping()` first (offline → `200 { connected: false }`, never 5xx); distinct synced deck names from `ankify_sync_mappings` (fallback `target_deck`); `Promise.all` of the three invokes; empty deck list skips `getDeckStats` entirely; response mapped to `{ connected, reviewedToday, reviewsByDay: {date, count}[], decks: {name, new, learning, review, total}[] }` — never raw AnkiConnect rows.
- Streak math (current + longest) as a pure server-side helper with its own tests; local-day boundary — a day with no reviews yet keeps yesterday's streak alive until the day ends. Verify the RAC container TZ during the spike.
- `StudyStatsSection` card on AnkifyPage between the conflicts banner and the subscriptions list: three heroes (reviewed today / day streak / reviewed this year), 52-week heatmap, stacked by-deck bar (hidden when no deck data, ~8 rows then "Show all").
- Usage event `ankify_stats_viewed` `{ reachable, streak_days, reviewed_today, synced_deck_count }`, fired once per section render.
- Changelog entry; T+30d adoption-review issue created at merge.

**Out**
- `cardReviews` / `getReviewMinutesByDay` and anything derived (minutes, retention, ease) — the known 10s-timeout fan-out.
- `getCollectionStatsHTML` in any form (not even wrapped) and `insertReviews` (write — never).
- Auto-refresh, date pickers, deck filters, export, week-over-week, Notion write-back, all-decks scope.

## Acceptance criteria

- [ ] Reachable container: card renders heroes, heatmap, and (with deck data) the by-deck bar from one `GET /api/ankify/stats`.
- [ ] Offline: calm copy, no error styling, no spinner-to-error flash; server returns `200 { connected: false }`.
- [ ] Streaks computed server-side; client renders only. Pure helper tested for gaps, empty input, and the today-boundary with an injected clock.
- [ ] Use-case test asserts `cardReviews`/`getReviewMinutesByDay` are never invoked, and `getDeckStats` is skipped on an empty deck list.
- [ ] VOICE.md numbers: hero count one size up in medium+, `tabular-nums`, thin-space thousands; deck names medium weight, truncated at 40 chars with `title`.
- [ ] Route gated by `RequireAnkifyAccess`; response is the explicit typed shape.
- [ ] `ankify_stats_viewed` fires once per render with the four fields.
- [ ] Jest: client wrappers (fetch-mock at HTTP boundary only) + use case (fake AnkiConnect factory). Vitest: section render branches (loading / offline / zero / data).

## Leading indicator

Share of Ankify subscribers firing `ankify_stats_viewed` with `reachable: true` in 30 days. Keep if ≥40%; remove if below, or if `reachable: true` is under half of all fires.

## Design notes

- Placement: one `sharedStyles.surface` card; internal `flex column, gap 1.5rem`.
- Copy (exact): heading `Your reviews`; lead `Live from Anki.`; hero labels `reviewed today` / `day streak` / `reviewed this year`; bar label `By deck`, legend `New · Learning · Review`; loading `Reading your stats from Anki`; offline `Anki isn't connected right now. Your stats will load when it reconnects — usually within a few minutes.`; zero state shows the empty heatmap plus `No reviews yet. Open Anki and study a deck — your streak starts on day one.`
- Heatmap: 11px cells, 3px gap, `--radius-sm`, no borders; five buckets on the brand-primary ramp (0 → `--color-bg-secondary`; 1–4 / 5–14 / 15–29 / 30+ stepping to `--color-primary`). Never green — reserved for success/ops. Per-cell `title`: `7 reviews on 12 May 2026`.
- Bar: horizontal stacked `BarChart` via OpsPage `ChartPanel` + `timeSeriesChartHelpers` tokens; `total_in_deck` right-aligned per row; omit rows with `total = 0`.
- No fourth widget. No emoji, no exclamation marks, no red offline state.

## Technical pre-flight

- Layers: `routes` (AnkifyRouter) → `controllers` (AnkifyController.getStats) → `usecases` (`GetAnkifyStatsUseCase` + streak helper) → `services` (AnkiConnectClient). Web: `web/src/pages/AnkifyPage/stats/{StudyStatsSection,ReviewStreakHeatmap,DeckBreakdownChart}.tsx`, `useAnkifyStats.ts`, `streak.ts(.test.ts)`. No data_layer change, no migration, no Python.
- `getDeckStats` keys results by `deck_id` string — map back to names via the `name` field.
- No server-side cache in v1: three parallel loopback invokes, sub-100ms typical, existing 10s AbortController bound.
- Pre-build spike (blocking): `npx tsx` script against a live dev RAC container logging raw JSON of all three actions — verifies `getDeckStats` shape, empty-array behavior, and the container TZ for the streak boundary.
- Effort: M (~8 source + 4 test files).

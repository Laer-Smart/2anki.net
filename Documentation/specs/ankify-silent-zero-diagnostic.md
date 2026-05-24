# Ankify silent-zero: surface why a sync produced no cards

## Why now

In a 15-day window (2026-05-09 → 2026-05-24) exactly one external user (`user 19374`) used Ankify in production. They set up two Notion subscriptions, ran six manual syncs and several auto-poll cycles, and every single dispatch returned:

```
{ "created": 0, "updated": 0, "conflicts": 0, "errors": [] }
```

`status: success`. No error, no log, no UI feedback explaining why nothing happened. The user then pivoted to the regular upload flow (which worked — 17 cards from a single-shot upload), and never came back to Ankify. They also haven't logged in since that session two weeks ago.

This is a worse failure mode than a thrown error. The product is technically working — the API returns 200, the sync log row says `success` — but the user sees nothing happen and walks. The only signal we get is bounce.

Owner test account (`user 1`) shows a similar pattern at scale: 7 709 successful dispatches + 510 error dispatches in the same window. The success rate inside the matcher (excluding errors) appears to be high in pure dispatch terms but yields no cards for at least one real input.

## Goal

When an Ankify sync produces 0 cards, the sync log row carries a *reason* and the UI surfaces it to the user. The user should be able to read "we looked for X in your page and didn't find it" and either fix their page or tell us the matcher is wrong.

## Out of scope

- Rewriting the Notion matcher itself — this spec is purely about diagnostics
- Changing Ankify's gate (still patreon-true OR active Auto Sync sub)
- Killing the polling worker — separate decision (see [Open questions](#open-questions))
- Marketing or onboarding changes — that's a separate "should Ankify exist" call
- The 510 dispatch errors on `user 1` — different failure mode, log them separately

## Solution sketch

Three small changes, each independently shippable.

### 1. Matcher returns a diagnostic, not just a count

Wherever the sync currently returns `{ created, updated, conflicts, unchanged, errors }`, add a `diagnostic` field that captures *what the matcher looked for and what it found*. Shape:

```ts
type SyncDiagnostic = {
  // Top-level blocks scanned (toggles, paragraphs, etc)
  blocks_scanned: number;
  // Blocks that matched the pattern we use for cards
  blocks_matched: number;
  // Per-pattern hit counts, so we can see whether toggle / Q&A / bullet
  // patterns each contributed
  pattern_hits: Record<string, number>;
  // First few sample block titles we *did not* match, for debugging
  unmatched_samples?: string[];
};
```

Populate this from the matcher itself; don't add a second pass.

### 2. Persist the diagnostic in `ankify_sync_logs.payload`

The existing `payload jsonb` column already carries `created`/`updated`/`page_id`/`trigger`/`ankify_client_id`. Add the diagnostic alongside. No migration needed — `jsonb` is open.

Indexing: no new index. We query by `owner` already.

### 3. Surface the diagnostic in the Ankify UI

When the most recent dispatch for a subscription has `created + updated + conflicts === 0`, show a banner under that subscription's row:

> No cards created. We scanned **N** blocks on your Notion page and found **0** matches for the patterns we look for (toggles, Q&A pairs, bullets). [Learn what Ankify looks for →]

The "Learn what Ankify looks for" link goes to a Documentation page (existing or new — out of scope for this spec) that shows examples of each supported pattern.

If `unmatched_samples` is non-empty, render the first 3 titles in a `<details>` panel so the user can confirm "yes those are my headings; the matcher doesn't recognise them."

## Failure modes and mitigation

| Failure | Mitigation |
|---|---|
| Diagnostic generation is slow on large pages | Cap `blocks_scanned` at 1 000 and `unmatched_samples` at 3. The matcher already walks the tree once; this is bookkeeping. |
| Existing sync log rows have no diagnostic | UI degrades gracefully: when `diagnostic` is absent, show the existing "No cards created" text without the specifics. |
| Sample titles leak sensitive content | `unmatched_samples` only stores block headings (typically section titles), not body text. If a user's heading is sensitive, the data is already in their Notion workspace token's blast radius. Acceptable. |
| The matcher is genuinely broken | The diagnostic exposes it. That's the point. Followup is a separate `fix:` PR. |

## Verification plan

1. **Reproduce the silent-zero against a known-bad input.** Create a Notion page with plain prose (no toggles, no Q&A, no bullets) in the test workspace. Run sync. Confirm we currently report `created: 0` with no detail.
2. **Reproduce the silent-zero against a known-good input.** Page with 5 toggles in the standard Ankify pattern. Confirm we get cards.
3. **After the diagnostic change**, both reproductions surface a populated `diagnostic` block.
4. **After the UI change**, the bad-input case renders the banner with the actual unmatched headings.
5. **Backfill check** on `user 19374`'s historical dispatches: enrich the existing rows with the diagnostic from a one-shot script if cheap, or accept that historical rows lack it.

## Open questions

- **Should we email `user 19374` once the fix ships?** The Andrew-reply draft already invited them to share their page structure. If they respond and the diagnostic confirms the issue, we have a closed-loop story worth a personal "we fixed it" follow-up.
- **Should we disable the 5-min Ankify polling worker entirely** while the feature has zero active subscriptions? Today every 5-min tick is a no-op SQL round-trip. Not free but not expensive. Decision deferred — depends on Ankify product call (invest or shelve).
- **Should the diagnostic also include the matcher version** (a string commit-sha or semver-like stamp)? Helps when we change the matcher and want to know which dispatches predate the change. Optional.
- **UI placement of the banner.** Per-subscription row vs. an empty-state panel above the list. Lean per-row for specificity.

## Related context

- Memory: `project-ankify-usage-data` — the production numbers behind this spec
- Bug discovered via 2026-05-24 db inspection — see prod table `ankify_sync_logs`
- Source: external user `user 19374`'s 20-minute session on 2026-05-10

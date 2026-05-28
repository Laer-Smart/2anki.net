# Spec: Claude chunk partial success when one chunk fails to parse

## Problem

`src/lib/claude/ClaudeService.ts` fans chunks out with `Promise.all` (~lines 615 and 645). If a single chunk's JSON cannot be parsed — even after `jsonrepair` recovery — the whole `Promise.all` rejects and the job dies with zero output. A production job on 2026-05-28 (jobId `49881277-75d4-4e60-8103-d448903c0771`) recovered 10 of 11 chunks via jsonrepair, but chunk 6 contained German low/high quotes (`„…")`) that jsonrepair could not coerce. The user got nothing back, despite 10 chunks of usable cards already in memory.

This is the worst possible failure shape for a self-directed learner: they wait for a long Claude run, the run silently produces nothing, and there is no signal about which section failed or whether retrying will help.

## Proposed approach

Switch the two `Promise.all` call sites to `Promise.allSettled` and treat partial success as a first-class state.

1. Per chunk, capture `{ index, status, result | error }`. Successful chunks flow into `mergeDeckInfoArrays` as today. Failed chunks are logged with `chunkIndex`, error class, and a short content fingerprint (length + first/last 40 chars, never the full payload) so ops can reproduce.
2. If at least one chunk succeeded, return the merged `DeckInfo[]` and attach a `partial` marker to the job result. The job repository persists `failed_chunk_count` and `total_chunk_count`. The download page renders a banner above the download button: "Partial deck — 10 of 11 sections converted. 1 section couldn't be parsed and is logged for investigation."
3. If zero chunks succeeded, fail the job exactly as today. No behaviour change in the all-fail case.

The banner copy is generated server-side from the counts, lives next to the existing download CTA, and disappears on retry once the user re-uploads.

## What NOT to build

- No automatic re-prompt of failed chunks. That doubles cost and latency for a recovery that often won't work (the underlying parse issue is usually structural, not transient).
- No user-facing list of which sections failed. The chunks are not labelled in a way users can act on, and surfacing "chunk 6 of 11" leaks internal mechanics.
- No retry button that re-runs only the failed chunks. Re-running the full upload is fine for now; a partial-retry path is two-way-door work for a later spec if the signal warrants it.
- No silent partial success. The banner is the contract — if it's not visible, we lose user trust the first time a user notices a card is missing.

## Alternative considered

**Fail fast and tell the user.** Keep `Promise.all`, but on rejection capture the partial successes server-side and show an error page that says "1 section couldn't be parsed; try again or contact support." Rejected because the deck is already useful to the learner — the dominant complaint about Claude failures today is that the user waits and gets nothing. A partial deck with a clear banner respects their time. The fail-fast option also doesn't move the audience signal we need (whether a partial deck is preferred or rejected), since the user never sees the partial output.

## Open questions

1. Does the download page have room for a banner above the existing CTA, or does the banner replace the secondary "convert another file" affordance?
2. Should the partial marker also flow into the convert email subject line (e.g. "Your partial deck is ready — 10 of 11 sections"), or does that risk users ignoring the banner?
3. Do we need a per-user cap on how often the banner appears before we escalate to a support nudge? (Defer; revisit after one week of data.)

## Success signal

- Leading: % of Claude jobs that complete with `failed_chunk_count > 0` (today this is 0% because they fail outright; baseline will form after ship).
- Leading: user re-upload rate within 24 hours when a partial deck was delivered, vs the historical re-upload rate after total failure. If partial decks reduce re-uploads, users accepted the trade. If re-uploads stay flat or rise, the banner copy or the partial threshold needs work.
- Qualitative: support inbox mentions of "missing cards" or "incomplete deck" in the two weeks after ship. Zero or one mention = the banner is doing its job; three or more = the contract is unclear and we revisit.

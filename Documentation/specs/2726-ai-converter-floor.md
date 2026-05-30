# Spec: AI converter — 200–500 cards per upload (issue #2726, Wedge B)

## Trio synthesis

- **pm:** Wedge B only matters if the floor is the *default* for paid users — a feature flag that nobody flips is a non-shipped feature. Gate behind paid plan; the per-upload cost delta is the constraint. Tie flip-default-on to a measurable card-count distribution shift.
- **designer:** No new upload-form surface in v1. Reuse the existing progress pulse vocabulary (`claude:chunk:i:n`) for the top-up loop ("generating more cards") so the user sees one continuous state machine, not a second flow. Landing-page subhead loses the implicit 20–40 ceiling, gains "hundreds, not dozens."
- **engineer:** Chunking + parallel + dedup already exist in `ClaudeService.ts`; the gap is (a) no card-count floor, (b) no top-up loop, (c) no per-upload cost log, (d) chunk size (40 000 bytes) is by-byte not by-content, so a long flat document under-chunks. Recommendation: keep the byte chunker, add a top-up pass against the same chunks, log usage already collected.

**Agreement:** ship as default for paid, paywall for free, no new UI primitives, reuse existing chunk/parallel/dedup pipeline. **Resolved conflict:** engineer wanted to rewrite the chunker to be heading-aware; pm and designer overruled — heading-aware path already exists for `cardStyle === 'heading-driven'`; the byte fallback is good enough for v1 and the top-up loop compensates for under-density.

---

## Problem

r/Anki user `1h9pkv1`: *"ChatGPT can only do 20–40 at a time."* Across 80 sales-safari threads this is the single most-cited bottleneck — learners want one deck from one chapter, not five stitched-together batches. 2anki's AI converter today often returns 40–80 cards from a 50-page input where 250+ are warranted; the system prompt asks for density but nothing enforces a floor.

## Target

200–500 cards per upload for typical study material (chapter, lecture notes, question bank). Minimum viable: 50-page medical textbook → ≥ 250 cards, end-to-end < 60 s.

## Approach

- **Chunking:** keep the existing 40 000-byte `chunkHtmlByDetails` splitter on `</details>` boundaries. Heading-driven chunker already exists for `cardStyle === 'heading-driven'`. v1 does not introduce a third strategy.
- **Parallel call shape:** keep `Promise.all` over chunks (`runChunks` already does this) and add a small in-process semaphore of 4 concurrent calls to respect Anthropic tier-2 rate limits. Anthropic batch API is async — incompatible with the < 60 s budget.
- **Dedup:** keep `dedupeCardsByFront` (lowercased + collapsed whitespace, exact-match). No Levenshtein in v1 — the existing prompt already produces sufficiently distinct fronts; fuzzy match risks dropping legitimate near-duplicates (e.g. "list 3 causes" vs "name 3 causes").
- **Top-up loop:** if merged-deduped count < 200, re-run only the *thinnest* chunks (bottom quartile by card yield) with a follow-up user message "extract more single-fact cards from the same content; do not repeat any of these fronts: [...]". Max **2 top-up rounds**. Stop early once ≥ 200 or no chunk yields new cards.
- **Provenance:** **yes** — stamp each card with `chunkIndex` on the in-memory `CardInfo` (not persisted to the .apkg). Needed for the top-up loop's per-chunk yield accounting and for the telemetry `chunks_thin` field. Not exposed in UI in v1.

## Plan-tier gating

**Paid only.** At assumed claude-sonnet pricing of $3/$15 per 1M input/output tokens, a 50-page upload with one top-up round costs roughly $0.12–0.20 per conversion (assumption: ~80k input tokens cached after first call, ~20k output tokens for 300 cards, 1.3× multiplier for top-up). At free-tier volume (estimated 8k uploads/month from /ops dashboard) defaulting this on for free users adds ~$1 200/mo with no revenue offset. Free users keep today's behavior; paywall already exists for the AI path.

## Latency budget

< 60 s for 300 cards. Math: 4 parallel chunks × ~12 s/chunk for streamed sonnet-4-5 output (matches current observed p50) = ~12 s base + ~15 s for one top-up round + parse/dedup ≈ 30–35 s for 300 cards. Headroom for the 500-card upper bound.

## Telemetry

New `KNOWN_EVENT`: `ai_conversion_completed` with fields:

- `card_count` (int, post-dedup)
- `chunks` (int)
- `top_up_rounds` (0 | 1 | 2)
- `cost_usd` (float, computed from `response.usage` input/output/cache tokens; `logClaudeUsage` already collects these — sum and convert)
- `elapsed_ms` (int)

Logged once per `generateDeckInfo` call. Drives the flip-default-on decision and lets us watch the p95 cost tail.

## Feature-flag rollout

GrowthBook flag `ai-converter-floor-v1` — when on, enable the top-up loop and the 200-card floor for paid users. **Default off** at merge; flip default-on for paid users when (a) p95 `elapsed_ms` < 60 s for one full week, and (b) p95 `cost_usd` < $0.30. Off path = today's behavior bit-for-bit.

## Landing-page copy update

In `web/src/pages/ConvertLandingPage/convertLandingConfig.ts`, when shipped, update the PDF and Notion `subhead` to mention card volume: e.g. *"Drop a PDF and download a .apkg deck — hundreds of cards from a chapter, not dozens."* One sentence per pathname; the `whatComesAcross` block stays.

## Out of scope

- No changes to the upload form UI in v1 (no "Generate more cards" button — the floor is automatic).
- No provenance preview UI (chunk → card mapping). That's Wedge C.
- No fuzzy dedup, no semantic dedup, no per-card edit/regenerate.

## Risks

- **Cost tail on giant uploads** — a 200-page textbook with two top-up rounds could exceed $1. Mitigation: hard cap of 500 cards; abort top-up if elapsed > 50 s.
- **Top-up returns near-duplicates** — Mitigation: the "do not repeat these fronts" list in the top-up prompt + existing `dedupeCardsByFront` catches the rest.
- **Rate-limit 429s under concurrent uploads** — Mitigation: semaphore of 4, plus existing `CLAUDE_PARTIAL_SUCCESS_ENABLED=true` lets us return what we have if one chunk drops.

## Open questions

- Does the assumed sonnet token price hold mid-2026? Re-check at flip-default-on.
- Is 200 the right floor, or 250? Pick based on the first week of `ai_conversion_completed` data — adjustable in code, not in the contract.

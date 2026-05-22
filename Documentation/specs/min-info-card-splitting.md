# Spec: smaller cards by default (minimum-information principle)

### Trio synthesis
- **PM**: A professional Anki/Quizlet creator's usability report flagged AI-generated cards holding nearly two pages of source per card; for serious learners this kills the time-saving promise because they have to re-split after export. Default behaviour, not a toggle, is the right lever — most users won't opt in to a "make better cards" setting they didn't know they needed.
- **Designer**: This is a behind-the-scenes change; the user notices it on the result screen ("87 cards" instead of "12 cards") and during review. No new UI required for V1. Result-screen copy should already lead with the card count, which it does; no toggle on /upload because the sibling `feat/spec-card-style-picker` will introduce the picker surface.
- **Engineer**: The change is bounded — tighten `SYSTEM_PROMPT` in `src/lib/claude/ClaudeService.ts` to enforce one-fact-per-card, and add a post-parse splitter for cards whose answer text exceeds a token/character ceiling. Single file in the hot path, server-only. M-effort because the prompt change is fast but evaluation across real Notion exports needs a fixture set.
- **Agreement**: Ship the default behaviour change without a UI toggle. The riskiest unknown is calibration — too aggressive and we fragment context users need; too soft and the report's complaint stands.
- **Conflict**: None substantive. Designer flagged that "smaller cards" creates a downstream count expectation we should hold to (no inflated counts from re-splitting boilerplate); engineer agrees the splitter must skip layout/heading-only blocks.
- **Resulting plan**: Tighten the extraction prompt to enforce min-info, add a server-side max-answer-length guard that splits overflowing cards along sentence boundaries, ship as the new default for the AI conversion path. The `feat/spec-card-style-picker` PR, when it lands, exposes this as the "Concise" default mode.

---

**Outcome**: AI-generated decks contain cards that respect the minimum-information principle by default. Measured by: median answer length per AI-generated card drops by >40% on a 10-Notion-page fixture set, and the share of cards with answer text over 600 characters drops below 5%.

**Goal alignment**: Smaller, reviewable cards are the core promise of the tool — "drop something in, get a clean deck back". Today's oversized cards force users to re-split manually, which is exactly the work they came here to skip. Better defaults raise first-deck satisfaction, which is the leading indicator for the path to 300K users.

**Problem**: A recent usability tester — a professional Anki/Quizlet card creator with paid subscriber access — ran a hands-on review and reported that some AI-generated cards contained almost two pages of source content per card. For serious Anki users (medical school, exam prep, language learners), one card holds one or two facts; anything larger is tiring to review and breaks the spaced-repetition contract. Today's `SYSTEM_PROMPT` in `src/lib/claude/ClaudeService.ts` gives Claude extraction rules (heading→paragraph, term→definition, details→summary) but no instruction to enforce one fact per card or to split paragraphs that bundle multiple facts. The tester's verdict: the conversion saves time on extraction but not on the manual re-splitting users still have to do after export.

**Riskiest assumption**: That tightening the prompt + adding a post-parse splitter produces *better* cards rather than just *more* cards. Fragmenting a definition into two cards that need each other for context would be a regression.

**Smallest test**: Build a 10-page fixture set covering the common Notion shapes (toggles, headings, callouts, definition lists, bullet lists), run the current pipeline and the new pipeline against each fixture, and have one experienced Anki user (Al or a friend with subscriber access) review the two outputs side-by-side. Ship only if the new output is judged "better or same" on at least 8 of 10. Run in a Jest fixture test rather than a manual one-off so future prompt regressions are caught.

**Scope**:

In:
- Tighten `SYSTEM_PROMPT` in `src/lib/claude/ClaudeService.ts` to add min-info rules: one fact per card; split paragraphs that contain multiple facts; one definition + example may stay together; tables of N rows produce N cards.
- Add a post-parse splitter helper (new pure function in `src/lib/claude/`) that splits any card whose answer plain-text length exceeds 600 chars along sentence boundaries, preserving HTML structure.
- Add a Jest fixture suite under `src/lib/claude/__fixtures__/` exercising 10 representative Notion-shaped HTML inputs and asserting card count + median answer length stay within target.
- Update `src/lib/claude/FEATURE.md` (or create it if absent) to document the min-info contract.

Out:
- The pre-conversion style picker (Short / Medium / Detailed, Concise / Cloze / MCQ) — that's the sibling `feat/spec-card-style-picker`. When both ship, this spec's behaviour becomes the default "Concise" mode inside the picker. If the picker lands first, leave the default unchanged here; if this spec lands first, the picker's "Concise" option becomes a no-op preset until other modes ship.
- Changes to the deterministic (non-AI) parser path in `src/lib/parser/`. The reporter's complaint was specifically about AI-generated cards.
- Changes to the Ankify polling path. Same prompt is used; the change applies transparently because `ClaudeService.ts` is shared.
- Cloze cards. The current prompt already produces single-fact cloze deletions; splitting cloze answers is out of scope and likely harmful.
- Pricing or quota changes if card counts rise.

**User story**: As a busy learner uploading a Notion page, I want each generated card to hold one or two facts so I can start reviewing in Anki without re-splitting anything myself.

**Acceptance criteria**:
- [ ] Median answer plain-text length on the 10-page fixture set drops by ≥40% vs the current `main` baseline (measure and record both numbers in the PR body).
- [ ] No card on the fixture set has answer plain-text length > 600 characters after the splitter runs.
- [ ] Card count rises (it must, by definition) but no fixture more than triples its card count — a 3× ceiling guards against runaway fragmentation.
- [ ] Tags, cloze flag, and media references are preserved when a card is split (the split halves carry the parent's tags; cloze cards are never split).
- [ ] Existing `ClaudeService.test.ts` keeps passing; the prompt change does not break the existing single-card and dedupe assertions.
- [ ] Jest fixture test passes deterministically (no model calls — the test runs against a snapshot of parsed `CompactDeck[]` arrays and exercises the post-parse splitter directly).
- [ ] No web/ changes; no migration; no `web/src/pages/WhatsNewPage/changelog/` entry deferred until result-screen verification confirms users see the count difference.

**Open questions**:
- 600 chars is a starting line based on the heuristic that an average sentence is 100–150 chars and a card should hold 2–4 sentences worth of context. Engineer should confirm against the fixture set before locking it in. Acceptable to ship the V1 at 500 or 750 instead — call it out in the PR body.
- Does the prompt change interact with `userInstructions` (the free-text field a user can supply on /upload)? If a user says "keep cards detailed", the min-info default should defer. Engineer to add a system-prompt clause that lets user instructions override min-info when they explicitly ask for longer cards.
- Should the splitter respect `<details>`/`<summary>` boundaries from Notion toggles, treating each toggle as an atomic unit? Default answer: yes, the existing chunker already preserves these.

**Out of scope (next iteration)**:
- The pre-conversion style picker (separate spec).
- A "merge cards" inverse operation for users who want fewer, longer cards. Wait for the request to surface before building it.
- Surfacing the splitter as a deterministic post-processor for non-AI uploads.

---

## Design notes

No new UI in V1. The change is invisible until the result screen, where the existing card-count line ("87 cards") communicates the difference. Two follow-ups for the designer to watch once this ships:

- The result-screen tagline "Built for spaced repetition" stays — this is exactly the spaced-repetition contract being enforced.
- If users complain decks feel "smaller" because the per-card content shrank, the result screen could grow a one-line note: "Cards sized for review — one fact each." Hold this until we see the complaint; per VOICE.md, restraint is the register.

When `feat/spec-card-style-picker` arrives, the picker will surface three labels (working assumption: Short / Medium / Detailed). This spec's behaviour becomes the **Short** default. Copy strings for that picker belong in the picker spec, not here.

## Technical pre-flight

**Layers touched**: `lib` only.
- `src/lib/claude/ClaudeService.ts` — modify `SYSTEM_PROMPT` constant; call a new splitter before `mergeDeckInfoArrays`.
- `src/lib/claude/splitOversizedCards.ts` (new) — pure function `(decks: CompactDeck[]) => CompactDeck[]` that walks cards, measures plain-text length of `a`, and emits 1..N replacement cards by splitting on sentence-terminator punctuation while preserving inline HTML.
- `src/lib/claude/splitOversizedCards.test.ts` (new) — unit tests for the splitter (preserves tags, never splits cloze, stays under ceiling, handles HTML tag boundaries safely).
- `src/lib/claude/__fixtures__/*.html` + `src/lib/claude/minInfoFixtures.test.ts` (new) — fixture-driven contract test: run `parseDeckResponse` on a pre-captured Claude response for each fixture, run the splitter, assert acceptance-criteria thresholds.
- `src/lib/claude/FEATURE.md` (new — does not exist today).

**No layer skipping**: this is `lib` only, no route/controller/usecase/service/data_layer change. The change rides on top of the existing call chain: `routes/UploadRouter` → `UploadService.generateDeckInfo` → `ClaudeService.generateDeckInfoFromChunk` → (new) `splitOversizedCards` → `mergeDeckInfoArrays`.

**No cross-language work**: server-only TS. Python `create_deck/` is the deck-packing step; it consumes the post-split `DeckInfo[]` unchanged.

**Effort**: M. The code is bounded (one prompt edit + ~80-line splitter + tests), but capturing 10 fixture responses requires real Claude calls saved as JSON snapshots. Budget half a day for fixture capture, half a day for the splitter and tests.

**Security**:
- Splitter operates on already-validated `CompactDeck[]` from `parseDeckResponse`; no new user-input surface.
- No new HTTP calls. No new external SDK.
- Watch for HTML-tag-boundary edge cases — splitting inside a `<strong>` opens an XSS-shaped balanced-tags risk. The splitter must split at sentence boundaries in plain text and reassemble using `cheerio` (already a dep) to keep tags balanced. Sanitisation downstream (`sanitize-html`) is the safety net; the splitter is the first line.

**Testing**:
- Jest, server workspace.
- Unit tests for `splitOversizedCards` directly (no model).
- Fixture-driven contract tests using snapshotted Claude responses — gate behind a fast deterministic path (no network).
- Existing `ClaudeService.test.ts` must continue to pass — the prompt change is a behaviour tightening and the existing tests assert structural shape rather than content length, so this should hold; if a test relies on a specific full-paragraph answer, update the assertion to match the split output and call it out in the PR body.

**Migration**: none.

**Sonar concerns**: keep `splitOversizedCards` cognitive complexity low — main loop + one helper for sentence-boundary search. Avoid nested ternaries. Lead with positives in if/else.

**Observability**: log a one-line metric per chunk after the splitter runs: `{ inputCardCount, outputCardCount, avgAnswerLenBefore, avgAnswerLenAfter, chunkIndex }`. Reuses existing `console.log` shape in `ClaudeService.ts`.

**Rollout**: ship behind no flag. The risk is calibrated by the fixture suite; a flag would just defer the decision.

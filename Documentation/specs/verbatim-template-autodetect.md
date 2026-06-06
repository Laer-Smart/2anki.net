# Verbatim mode: auto-detect MCQ vs Basic vs Cloze template

Spec for #2661 (follow-up to #2633). Draft for review before `/implement`.

## Problem

Verbatim photo mode (#2633) transcribes the page into the Basic `{q, a}` shape regardless of what the
source actually is. An MCQ paper, a Q&A study sheet, and a cloze-deletion worksheet all land as plain
Basic cards. The #2633 spec called for classifying the transcription and routing it into the matching
template, but that was deferred behind #2612 (generative MCQ template). **#2612 has since merged** —
`PhotoToFlashcardsUseCase` already parses `options` / `correct_index` (`asValidMcq`) and emits MCQ
cards under `mcqEnabled`, and carries a per-card `cloze` flag. The blocker is cleared; this issue
formalizes the routing into a tested pure classifier.

## Proposal (one opinionated direction)

Add a pure classifier and route verbatim transcriptions per card into the matching template, defaulting
to Basic when unsure:

1. **`src/lib/vision/classifyVerbatimShape.ts`** — pure function over one parsed verbatim card,
   returns `'mcq' | 'cloze' | 'basic'`. No I/O, no Claude call.
   - `mcq` when the card has a well-formed options array (4–5 entries) and a single `correct_index`
     in range — reuse the validation already in `asValidMcq`.
   - `cloze` when the card text carries Anki cloze markers (`{{c1::…}}`) or the parser's `cloze`
     flag is set.
   - `basic` otherwise.
2. **Per-card classification, not per-deck** — a study sheet mixes Q&A and cloze, so classify each
   card independently. (Resolves the issue's first open question.)
3. **Confidence default** — when a card looks MCQ-ish but fails strict validation
   (`looksLikeMcqAttempt` true, `asValidMcq` null), fall back to Basic rather than emit a broken MCQ.
   (Resolves the second open question.)
4. **Dispatch** — route each classified card into the matching template factory: MCQ factory (landed
   with #2612), the existing Cloze model (`n2a-cloze`), or Basic (`n2a-basic`). Verbatim no longer
   forces Basic.

The verbatim prompt (`buildVerbatimPrompt`) already asks the model to emit MCQ option shape when the
page shows one; this issue acts on that output instead of flattening it.

## Scope

- New pure `classifyVerbatimShape.ts` + colocated test.
- Wire the classifier into the verbatim branch of `PhotoToFlashcardsUseCase` card-building dispatch.
- Route classified cards into MCQ / Cloze / Basic factories.

## Explicitly NOT in scope

- Per-card confidence surfaced in the UI (#2633 non-goal).
- Multi-page batching (#2633 non-goal).
- Changing the generative (non-verbatim) path's existing MCQ behavior.
- A new Claude call or prompt change for classification — it's a pure function over the parsed JSON.
- Reworking the MCQ factory itself (it shipped with #2612).

## Touch points

- `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts` — `buildVerbatimPrompt` already returns
  verbatim JSON; `buildDeckInfo` already branches on `mcqEnabled` / `cloze`. Replace the inline
  branching for the verbatim path with a `classifyVerbatimShape`-driven dispatch.
- `src/lib/vision/classifyVerbatimShape.ts` — new pure classifier (new `src/lib/vision/` dir).
- Reuse existing `asValidMcq` / `looksLikeMcqAttempt` validation rather than duplicating shape checks.

## Risks / Rails — read before `/implement`

- **AI feature.** This routes the output of a Claude vision call into different card templates. The
  classifier itself is pure (no LLM call), but it consumes model output — implementation must state
  in the PR body: **latency impact (none — pure function, no extra Claude call), token/cost delta
  (none — same single vision call), prompt caching (unchanged).**
- **Model output is untrusted input.** Validate the parsed shape before trusting it (CWE-20). Never
  index `options[correct_index]` without the in-range check; never emit an MCQ card from a
  partial/ambiguous shape — default to Basic.
- **No silent behavior flag.** Don't gate the new routing behind a `process.env` toggle
  (code-quality rule). Correct routing is the unconditional default.
- **Regression guard:** the generative (non-verbatim) MCQ path and the existing `mcqEnabled` behavior
  must be unchanged — test both paths.
- **#2612 dependency is satisfied** (merged); confirm the MCQ factory entry point is still the one
  `buildDeckInfo` uses before wiring the dispatch.

## Acceptance criteria

- `classifyVerbatimShape` returns `'mcq'` for a valid 4–5-option single-answer card, `'cloze'` for a
  card with `{{c1::…}}` markers or the cloze flag set, and `'basic'` otherwise — covered by
  `it.each` unit tests including the ambiguous-MCQ-falls-back-to-Basic case.
- A verbatim transcription containing a mix of MCQ, cloze, and Q&A cards produces MCQ, Cloze, and
  Basic cards respectively in one deck (per-card routing).
- A card that looks like an MCQ but fails strict validation is emitted as Basic, not as a broken MCQ.
- The generative path and existing `mcqEnabled` behavior are unchanged (regression test).
- PR body states latency / token-cost / prompt-caching impact (all unchanged — pure classifier).
- `/check` green.

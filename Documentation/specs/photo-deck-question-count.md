# Photo to Deck — questions-per-image control

## Problem

Photo to Deck calls Claude with a fixed `VISION_PROMPT` ("Extract atomic question-and-answer flashcard pairs from this image") and takes whatever count the model chooses. A dense lecture slide returns 30+ cards a learner has to prune; a sparse diagram returns 2 cards when the learner wanted the whole thing fanned out. Every photo costs a paid vision call against the user's monthly quota — re-running with a different intent is expensive.

External review (May 2026) flagged this directly: *"Add customization options such as the number of questions to generate per slide or image."*

There is no card-count parameter today. `PhotoToFlashcardsInput` exposes `imageBase64`, `mediaType`, `deckName`, `owner`, `isPaying`, `imageDimensions`, `tokenCeilingOverride` — that's it. The user has no lever between "drop image" and "get whatever Claude felt like producing."

## Goal

Give the learner one control on the Photo to Deck page that sets how many cards per image they want. Pass that intent into `VISION_PROMPT` so Claude targets the count instead of guessing.

Maps to the mission: **more user control over output volume = a simpler, more predictable conversion.** The learner stops re-running the same image to renegotiate density. Faster path from photo to deck-they-keep.

## Non-goals

- Per-card editing or post-conversion regenerate (separate problem; not this PR).
- Verbosity / answer length controls. PR #2618 already specs Short / Medium / Detailed for the AI converter (`ClaudeService.buildUserMessage`) — that's a sibling on a different path. Do **not** unify the two surfaces here.
- A global default in account settings. Start with per-conversion only; revisit if usage data shows people pick the same tier every time.
- Multi-image batch with different counts per image. One control applies to the whole upload.
- Exposing the literal `VISION_PROMPT` to the user.

## Proposed shape

**Three discrete tiers, not a slider or free-form integer.**

```
Card density:  [ Sparse ]  [ Balanced ]  [ Dense ]
                 3–5         6–10          12–20
```

- **Balanced** is the default and matches today's typical output. No change for users who don't touch the control.
- **Sparse** for diagrams, single-concept slides, language vocabulary lists where the learner wants headline facts only.
- **Dense** for textbook pages, dense lecture slides, photographed notes where the learner wants the full surface fanned out.
- Tiers are presented as a 3-segment toggle directly under the deck-name field on `PhotoToFlashcardsPage.tsx`, with a one-line helper underneath: "How many cards per image."

**Why tiers, not a slider:**

- Slider/integer treats "8 cards" and "9 cards" as meaningfully different. They aren't — Claude doesn't honor that precision, and the user can't tell. Tiers stop pretending.
- Tiers fit the VOICE guide: specific where it matters (the range), restrained where it doesn't (no false granularity).
- Three labelled tiers means three test cases in CI, not 13.
- A future change (e.g. "Extra dense" for whiteboard photos) is one more chip, not a UI redesign.

**Wire shape:**

1. Extend `PhotoToFlashcardsInput` with `density?: 'sparse' | 'balanced' | 'dense'`. Optional with a default of `'balanced'` keeps existing callers green.
2. Replace the literal `VISION_PROMPT` constant with `buildVisionPrompt(density)` in `PhotoToFlashcardsUseCase.ts`. The function appends a single rule line:
   - sparse: `"Aim for 3 to 5 cards. Pick the highest-signal facts only."`
   - balanced: `"Aim for 6 to 10 cards covering the main facts."` (today's behavior, made explicit)
   - dense: `"Aim for 12 to 20 cards. Fan out every distinct fact on the image."`
3. UI: 3-segment chip under deck name in `PhotoToFlashcardsPage.tsx`. Default selected: Balanced. Persist last selection in `localStorage` per existing precedent for ephemeral UI preference (per `code-quality.md` localStorage rule — this is a UI tier, not user data).
4. Cost: no change to vision-token math or quota counting; the prompt difference is a handful of tokens.

**What stays out:**

- No new DB column. Density is request-scoped.
- No new endpoint. Same upload route; new optional field on the request body.
- No marketing of "AI customization" — just a label and three chips.

## Open questions

- Does Balanced (6–10) match what `claude-sonnet-4-5` actually returns today on a representative slide? Sample 10 real conversions before locking the ranges — if today's median is 8, the ranges are right; if it's 14, shift Balanced up.
- Should Sparse and Dense be gated to paying users? Lean **no** — the free quota (5 photos/month) already throttles abuse, and gating one of three buttons feels punitive on the marketing page.
- Should the chip be remembered across sessions? Default to yes via `localStorage` (matches how the converter's other per-session toggles work). Revisit if support sees confusion.
- Sibling coordination with PR #2618: that PR adds verbosity to the AI converter path. If both ship, do we want a single shared vocabulary ("sparse/balanced/dense" vs "short/medium/detailed")? Decide at PR-merge time — the two surfaces are different enough that two vocabularies is fine for now.

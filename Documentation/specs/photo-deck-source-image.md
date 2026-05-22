# Embed source slide/image on Photo-to-Deck cards

## Problem

Photo-to-Deck takes a photo, screenshot, or slide and sends it to Claude Vision, which returns a JSON list of question/answer pairs. Today those Q/A strings are the entire output — the source image itself is thrown away after the model call. `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts:171–206` (`buildDeckInfo`) explicitly emits `media: []` for every card, so the `.apkg` ships text-only.

The cards that result are correct in the abstract but stripped of the visual context the user uploaded them for: a diagram with labels becomes "Q: What does point A label? A: Mitochondrion" with no diagram in sight, an annotated slide becomes a flat fact divorced from where it sat on the page, a hand-drawn note becomes a paraphrase of itself. The user then has to re-find the slide, re-attach it in Anki manually, or accept worse recall — exactly the post-generation chore the product exists to remove.

External review (May 2026) named this directly:

> Explore whether relevant images from slides can be automatically added to the generated cards. … At minimum, allow the referenced slide or image to be attached directly to the relevant card.

This is **simpler** (no manual image attachment after generation), **faster** (one upload, finished cards — not upload + 87 paste-image operations in Anki), and **more beautiful** (cards carry the visual the user actually saw when learning, not a flattened summary of it).

## Goal

Every card produced from a Photo-to-Deck upload includes the source image, embedded in the card and bundled in the `.apkg` so it renders on every Anki client (desktop, mobile, AnkiWeb) without further user action. Opening the deck in Anki shows the image; opening the file on a fresh device after sync still shows the image. The user uploads one photo and downloads a deck that looks like the photo, plus questions.

## Non-goals

- Not crop-to-card. We do not slice the source image into per-card regions or try to detect which sub-region of the slide a given Q/A came from. Whole-image attach is the floor; region detection is a separate, harder spec.
- Not a new card template. The existing `n2a-basic` / `n2a-cloze` / `n2a-input` templates already render an image inside the answer/question HTML. No template work needed.
- Not a multi-image upload flow. One photo in, one photo on every card it generated. Batch uploads are out of scope.
- Not OCR re-extraction. The model already turned the photo into text; we do not run a second pass to pull out labels or callouts.
- Not image-occlusion generation. That is a separate Ankify path with its own use case.

## Proposed shape

**Attach the full source image to every card from that upload, embedded on the back of the card under the answer text.**

Be opinionated: one image per upload, the same image on every card. Card-level "is this card visual?" detection would need the model to tag each card with a relevance flag, which adds tokens, adds a failure mode, and is not what the reviewer asked for. The minimum the reviewer named — "allow the referenced slide or image to be attached directly to the relevant card" — is the maximum we should ship in this spec. Whole-image attach also matches user expectation: the photo they uploaded *is* the source for every card the model produced from it.

Back-of-card placement, not both sides. The front is the question; putting the image on the front would leak the answer for diagram-label cards ("What does A point at?" with the labelled image visible defeats the prompt). The back is where context and confirmation live in spaced-repetition convention — Anki's default basic template renders the answer above any media, and reviewers see image + text together at the moment of recall check.

Mirror the pattern shipped in commit **8cb79445** ("fix: bundle mind map image files as card media so apkg renders them"), which solved the same problem for the mind-map path. That commit's lesson: writing the image bytes to the workspace is necessary but not sufficient — the Python deck packager only includes media that each card declares in its `media` array. Empty `media: []` means the file is on disk, then ignored when the `.apkg` is built.

Concrete change to `PhotoToFlashcardsUseCase`:

1. After Claude returns the Q/A JSON, before `buildDeckInfo`, decode the uploaded `imageBase64` to bytes and write `source.<ext>` (extension derived from `input.mediaType`) into `workspaceDir`.
2. In `buildDeckInfo`, append `<br><img src="source.<ext>" style="max-width:100%;height:auto;">` to each card's `back` field (cloze cards: append to the cloze body, which renders on the answer side).
3. In `buildDeckInfo`, set `media: ['source.<ext>']` on every card — replacing the current `media: []`. This is the load-bearing line that commit 8cb79445 surfaced: without it, the Python bridge writes the bytes and then drops them from the `.apkg`.
4. No change to the Claude call, the prompt, the token accounting, the quota, or the cost model. The image is already in memory; we are reusing the bytes we already have.

The workspace cleanup path in the existing `catch` block already handles `rmSync(workspaceDir, ...)`, so the new `source.<ext>` file is cleaned up on failure for free.

## Open questions

- **Image filename collision.** `source.png` is fine for a single upload, but if a future batch flow uploads N images at once, every deck would name its source the same. Pick a `randomUUID()`-based filename now to avoid a future rename migration? Cost is one extra UUID; benefit is forward-compat with a batched flow that hasn't shipped yet.
- **File size on the card vs. file size of the photo.** A 12 MP slide photo is ~3 MB; multiplied across 40 cards' worth of HTML the `.apkg` stays single-digit MB because Anki deduplicates media by filename, but the front-end download size grows. Do we downscale the image before bundling (server-side resize to, say, 1600px on the long edge), or ship the original? The reviewer asked for "the referenced slide" — fidelity argues original; AnkiMobile users on cellular argue downscale.
- **Front-side placement for non-question photos.** A user uploading a single diagram and asking "make me cards" may want the diagram on the front *and* back. Is back-only the right default, or do we expose a `placement: 'back' | 'both' | 'front'` setting after this ships? Default back-only matches Anki convention; the setting can come later if users ask.
- **Cloze rendering.** Cloze cards do not have a "back" field in the same way basic cards do — the image needs to sit inside the cloze HTML such that it shows on the answer side but not the cue side. Confirm with the `n2a-cloze` template in `src/templates/` that appending the `<img>` after the cloze body renders on reveal, not on the prompt.
- **Existing decks.** Users who already downloaded photo decks before this change get text-only cards forever (the upload is gone, we can't retroactively bundle). Do we surface a "re-upload to attach images" CTA on the dashboard for their old photo decks, or accept the discontinuity? Default: accept; the cohort is small and the new behaviour is the bigger story.

---
title: Transform an existing deck
description: Upload a .apkg, pick a transform, and get a new deck back with every card translated, hinted, cloze-ified, or expanded with an example.
---

Transform is the only path in 2anki that takes a `.apkg` as **input**. Everywhere else we turn source files into decks; here we take a deck you already have and mutate every card in one round trip. The page is at [2anki.net/transform](https://2anki.net/transform).

**Plan:** paid plans only.

## When to use this

- You already have a Basic or Cloze deck with hundreds of cards and want to translate the back of every card.
- You want an example sentence added to every card without re-pasting them ten at a time into ChatGPT.
- You want to flip a Basic deck into Cloze, or add a hint field to every card.

If you're starting from a Notion page, PDF, markdown file, or photo, use the standard upload on the home page — that path stays the same.

## Build a transformed deck

1. Open [2anki.net/transform](https://2anki.net/transform). You'll need to be signed in on a paid plan.
2. Drop your `.apkg` on the dropzone, or click to pick it.
3. Pick one transform:
   - **Translate the back field** — front stays as-is, back is translated into the target language you pick.
   - **Add an example sentence** — appends a short example to the back of every card.
   - **Cloze-ify the front field** — picks the most-important term on each card and wraps it in `{{c1::...}}`. Output cards become Cloze.
   - **Add a hint** — adds a one-line hint under the front, leaving front and back untouched.
4. (If you picked translate) pick the target language.
5. Click **Transform**. The new deck downloads as a `.apkg` when ready.

A 900-card deck takes roughly 5 to 10 minutes. Leave the tab open; the download starts automatically when the job finishes.

## What we support in v1

- **Basic and Cloze decks.** If the deck contains any other note type — Image Occlusion Enhanced, custom note types with extra fields, third-party templates — we reject the upload with a clear error. Partial decks are worse than no deck.
- **Up to 100 MB per upload.**
- **One transform per round trip.** To translate *and* add hints, run two passes: translate, download, upload again, add hint.

## What the output looks like

- **Fresh GUIDs.** Output notes get new IDs, so the new deck imports cleanly alongside your original. Your original review history stays on the original deck.
- **The original deck name** with `-transformed` appended.
- **Failed notes are skipped, not silently broken.** If the model misfires on a card, the response header `X-Transform-Failed-Count` tells you how many were dropped.

## When something doesn't work

- **"This deck uses a note type we don't support yet"** — your deck contains a non-Basic, non-Cloze note model. We don't round-trip those in v1. Split the deck in Anki and try again with the Basic/Cloze subset.
- **"Transform is on the paid plan"** — upgrade on [2anki.net/pricing](https://2anki.net/pricing).
- **Nothing downloaded after 15 minutes** — refresh and try again. If it happens twice on the same deck, the deck is likely larger than our current ceiling — split it and run two passes.

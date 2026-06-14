---
title: Notion → Anki for Japanese
description: Structure mined sentences and vocab in Notion, keep audio and screenshots, choose a note type, and open the deck in Anki.
---

This guide is for Japanese and language learners who keep notes in Notion and study them in Anki — sentence miners, JLPT studiers, kanji writers, anyone pairing a note-taking tool with spaced repetition. It covers how to lay out a page so 2anki turns it into the cards you want, what survives the conversion, and what 2anki deliberately leaves to you.

2anki converts what you wrote. It does not generate readings, look up words, or add audio that wasn't there — so a card never shows a guess you didn't make. The work below is about giving it a page it can read cleanly.

## Sentence cards vs vocab cards

Both live on the same Notion page. The unit is the toggle: the toggle line is the front, everything inside is the back.

**A sentence card** — put the mined sentence on the toggle line. Inside, put the reading, the meaning, the target word, and any audio or screenshot. One toggle, one card.

**A vocab card** — put the word on the toggle line. Inside, put the reading and the meaning. Shorter, but the same shape.

You can mix them freely. A grammar page might hold ten sentence toggles and a glossary of word toggles below — 2anki makes a card from each, in order.

If you'd rather not use toggles, [parser rules](/documentation/cards/parser-rules) let a Notion table drive cards instead: column 1 becomes the front, column 2 the back. That suits a vocab list you keep as a table — one row per word.

## Readings and furigana

Type the reading the way you want it on the card. Furigana in brackets after the kanji, kana on its own line, romaji, pitch notation — whatever your workflow uses. 2anki carries it across unchanged.

It does not add furigana for you, and it does not change a reading you wrote. If you want readings filled in, do it in Notion first — a dictionary add-on or Yomitan can help you draft them there — then convert. The card shows exactly what the page showed.

## Audio on cards

Attach the audio as a file in Notion — a clip, a recorded sentence, a pronunciation. 2anki downloads the file and packs it into the deck, so the card plays it offline on any device. Put the audio inside the toggle, on the back, where it belongs with the sentence.

A link to an external audio page stays a link, not playable audio. Only an attached file becomes deck audio.

2anki does not record or generate speech during conversion. Separately, Anki can read a card aloud at review time with its own on-device voice — Japanese included — set under [card options](/documentation/cards/card-options). That is Anki speaking live, not an audio file in the deck.

## Screenshots and images

Drop the screenshot — a subtitle frame, a manga panel, a diagram — into the toggle in Notion. It comes across as an image inside the card and is bundled into the deck, so it renders without a connection.

For sentence mining, a screenshot on the back gives you the scene the sentence came from. Keep images reasonably sized; a page packed with full-resolution screenshots makes a large deck.

## Bold and italic

Bold the target word in a sentence, italicise a part of speech — the emphasis stays on the card. This is the cheapest way to mark what a card is testing without adding a separate field.

## Choosing a note type

During conversion you pick the note type 2anki uses. The defaults work, and you can rename a note type to plug in a template you already study with — a sentence-card template, a vocab template, your own styling.

2anki builds your notes into a deck — it does not replace Kaishi 1.5k, RRTK, or JLab. Study those as they are; use this for the cards you write yourself.

## Opening the deck in Anki

The download is a standard `.apkg`. Open it in Anki — desktop or mobile — and the deck, its media, and its note type import together. Full steps are in [open your deck in Anki](/documentation/start-here/open-in-anki).

Import one page or one topic at a time rather than a whole notebook in one file. Smaller decks are easier to schedule and review, and they import faster.

## Related

- [Parser rules](/documentation/cards/parser-rules) — turn tables, callouts, or headings into cards
- [Card options](/documentation/cards/card-options) — every conversion setting, including Anki's read-aloud voice
- [Notion blocks we support](/documentation/cards/notion-blocks) — what each block does on the card

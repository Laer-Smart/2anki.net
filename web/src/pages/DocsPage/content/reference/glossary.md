---
title: Glossary
description: Words 2anki and Anki use, in plain language.
---

- **Anki** — the spaced-repetition app you're making cards for. Free on desktop and Android, paid on iPhone/iPad. Available at [apps.ankiweb.net](https://apps.ankiweb.net/).
- **APKG** — the file extension Anki uses (`.apkg`). It's a zipped bundle of your deck. 2anki gives you one of these to download.
- **Card options** — the toggles that change how 2anki turns your source into cards. See the [reference](/documentation/cards/card-options).
- **Cloze** — a card with a hidden chunk you have to recall. In Notion or HTML, wrap the hidden bit in `code` and 2anki makes a cloze card from it.
- **Deck** — a named collection of cards in Anki. One upload usually makes one deck.
- **Document** — what we call the source file you upload (HTML, Markdown, ZIP, PDF, etc.).
- **Data source** — a third-party integration we read from. The main one is Notion.
- **Favorites** — pages you've starred in the Notion picker. Quick-access list at [2anki.net/favorites](https://2anki.net/favorites).
- **Flashcard** — a single front/back pair. 2anki makes basic, reversed, cloze, and input cards.
- **Image Quiz HTML** — an experimental card option that uses OCR to pull image-and-answer pairs out of HTML quiz exports.
- **Input card** — a card where you type the answer. Triggered by bold text in HTML when **Treat Bold Text as Input** is on.
- **Job** — the background task that turns your upload into a deck. It moves through pending → running → done (or failed).
- **MCQ card** — a multiple-choice card with 2–7 options and one correct answer. Triggered by a Notion toggle whose children are to-do blocks with one checked, or bullets with one fully bolded.
- **Note type** — Anki's term for the template behind a card. 2anki ships namespaced types like `n2a-basic`, `n2a-cloze`, `n2a-input`, and `n2a-mcq`.
- **Rules** — user-defined transformations that override the default toggle-to-card mapping. Advanced, optional.
- **Settings** — your account-level defaults. Per-upload options override settings.
- **Sync** — keeps a Notion page and an Anki deck in step. See [How sync works](/documentation/sync/how-it-works).
- **Theme** — the visual style of the app. Pick from light, dark, gold, purple, or hotpink in the top navigation. The choice is remembered per browser.
- **Toggle** — a Notion (or HTML `<details>`) block that expands and collapses. By default 2anki turns each top-level toggle into one flashcard.
- **Tour** — the four-step walkthrough that runs the first time you visit the upload page. Skippable. Doesn't run again.
- **Upload** — a document you've sent to 2anki. The job that runs against the upload produces the deck.
- **User** — your account. Owns uploads, decks, and settings.

---
title: Note types and templates
description: Browse starter Anki note types, preview them, customize, and download.
---

A note type is Anki's name for the card template — the front layout, the back layout, the CSS, the field list. 2anki ships a handful of starter note types you can drop into Anki as-is, or fork and edit in the browser. The library lives at [2anki.net/templates](https://2anki.net/templates).

**Plan:** Free for browsing, previewing, and downloading. Creating and saving your own templates needs an account.

## When to use this

- You want a better-looking deck than Anki's default white-on-white card.
- You want a starting point for a custom template — fork one of ours and edit in the browser instead of writing the HTML/CSS from scratch.
- You want to inspect what fields and styling the n2a-basic, n2a-cloze, n2a-input, or n2a-mcq note types use.

If you just want cards from your notes, you don't have to touch this page — 2anki picks a reasonable default template for every upload. Templates matter once you care about how the cards look.

## Browse the library

Open [2anki.net/templates](https://2anki.net/templates). Three sections show up, in order:

- **Your note types** — anything you've created or customized in the browser (logged-in only).
- **Official 2anki templates** — handcrafted designs we ship and maintain. Examples: Abhiyan Night Mode, Alexander Deluxe Blue, Material, Only Notion.
- **Starter note types** — the bare-bones n2a-basic, n2a-cloze, n2a-input, n2a-mcq, and Image Occlusion templates that 2anki uses by default.

Each card has a small preview of the front. Click the card name to open a full-size **Front / Back** preview side-by-side.

## Use a template in Anki

1. Find the template you want. Click the **Download** icon (down arrow) on its card.
2. The browser downloads a `.apkg` containing one empty deck and the note type.
3. Open the `.apkg` in Anki to import. The note type becomes available for any new deck.
4. In Anki, **Add** a card → pick this note type from the **Type** dropdown.

Templates downloaded this way work with Anki on desktop, mobile, and AnkiWeb. You're not locked into 2anki to use them.

## Customize a template

1. Click the **pencil** icon on any template's card. The editor opens at `/templates/edit/<id>`.
2. Edit the HTML for the front, back, and CSS. The preview updates as you type.
3. Save. The template lands in **Your note types** at the top of the library.
4. Download it (the same download icon on its card) and import into Anki.

If you started from one of our templates, your edit is a separate copy — the original stays in the **Official** section.

To make a note type from scratch, click **New note type** in the top right of the library.

## Common mistakes

- **Editing the template doesn't change existing decks.** Anki imports note types by name. If you've already imported a deck that uses `n2a-basic`, customizing your local `n2a-basic` template on 2anki doesn't push back into Anki. Re-export from 2anki, or edit the note type directly in Anki for existing decks.
- **Deleting an official template.** You can hide it from your view, but the original stays available — drop in another download anytime.
- **Forgetting to import the .apkg first.** The browser preview is rendered HTML — it's not an `.apkg` until you click download.

## Related

- [Card types](/documentation/cards/card-types) — what kind of card each template produces
- [Card options](/documentation/cards/card-options) — the per-upload conversion settings
- [Glossary — Note type](/documentation/reference/glossary) — the term as Anki uses it

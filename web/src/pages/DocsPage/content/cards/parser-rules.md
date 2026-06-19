---
title: Parser rules
description: Override the default toggle-to-card mapping for a specific Notion page.
---

By default, 2anki turns every top-level toggle on a Notion page into a flashcard. Rules let you change that for a specific page — turn callouts into cards, treat tables as cards, nest sub-decks under headings, or change how tags get detected.

**Plan:** Free

## When to use this

- You write your notes as paragraphs or callouts, not toggles, and the default parser produces an empty deck.
- You want every row of a Notion table to become a card (column 1 → front, column 2 → back).
- You want H2 or H3 headings inside a page to become sub-decks instead of card content.
- You want strikethrough text to mark tags, or the opposite.

Rules apply to **one Notion page**. Each page has its own rule. Account-level [card options](/documentation/cards/card-options) handle defaults that span every page.

## Open the rules editor

1. Connect Notion if you haven't yet — see [Connect Notion](/documentation/start-here/connect-notion).
2. Go to [2anki.net/notion](https://2anki.net/notion) and find the page you want to customize.
3. Click the **Settings** (gear) icon next to the page.
4. The page opens at `/rules/<page-id>` with the four rule groups described below.

## The four rule groups

### Decks and sub-decks

Notion pages and databases always become decks. Pick which blocks **inside** the page nest as sub-decks. Available choices:

- `child_page` — Notion sub-pages become sub-decks (default).
- `child_database` — inline databases become sub-decks.
- `toggle` — a top-level toggle becomes a sub-deck instead of a flashcard. Its children become the cards in that sub-deck.
- `heading_1` / `heading_2` / `heading_3` — headings split the page into sub-decks. Content under each heading goes into that sub-deck.

Pick zero or more. If you pick none, the whole page is one deck.

The toggle, heading, and database sub-deck options apply on paid plans. Sub-pages nest as sub-decks on every plan.

#### Advanced deck types

Under **Deck boundaries** there's a collapsed **Advanced deck types** disclosure. Open it to turn extra Notion blocks into their own top-level decks instead of cards or sub-decks. Available choices:

- Toggle, Heading 1, Heading 2, Heading 3
- Bulleted list, Numbered list, Quote
- Columns
- Database inside a page

Each type you turn on splits its content into a separate deck sourced from that block's children. This is off by default — pages and databases already become decks, so most pages never need it. When a block type is set as both a flashcard and a deck, it becomes a deck.

Turning these on re-splits the page into more decks on the next conversion. Turn them off to go back to one deck per page.

### Flashcards

Which Notion block types become individual cards. Default is just `toggle`. Available choices:

- `toggle` — the default. Heading is the front, contents are the back.
- `bulleted_list_item` / `numbered_list_item` — top-level bullets become cards. The bullet text is the front; nested bullets are the back.
- `to_do` — to-do blocks become cards. Useful for [MCQ](/documentation/cards/mcq) detection.
- `paragraph` / `callout` / `quote` / `code` — turn these into cards when your notes don't use toggles. The block content is the front; the back stays blank unless you also enable something else.
- `column_list` — Notion's two-column layout becomes a card. Column 1 is the front, column 2 is the back.
- `table` — table rows become cards. Column 1 is the front, column 2 is the back. Columns 3 and beyond render as a small inline table on the back. **(New.)**
- `heading_1` / `heading_2` / `heading_3` — make headings the card front. The content under each heading becomes the back.

You can combine these. If you turn on both `toggle` and `bulleted_list_item`, both become cards.

### Tags and notifications

**Tag format** — how 2anki finds tags inside your content:

- **strikethrough** (default) — strikethrough text becomes a tag. Where you put it sets which cards get the tag:
  - inside a card's toggle → tags only that card
  - a struck-through line under a parent toggle → tags every card nested under it (use this to tag a whole section at once). This scope needs both **Tag a whole section** and **Cherry-pick mode** turned on.
  - at the page level → tags every card on the page
- **heading** — H1/H2/H3 headings become tags. Useful when your notes already have a heading hierarchy you want to keep as tags.

**Email the deck when it's ready** — when on, the finished `.apkg` is emailed to your account address. Decks under 24 MB go as an attachment; larger decks include a download link instead.

### Card options

The same panel as [Card options](/documentation/cards/card-options), but scoped to this one Notion page. Changes here override your account defaults for this page only. Use it to tweak font size, card templates, or per-page MCQ behaviour without changing every other page.

## Save and reset

The save bar at the bottom of the page has three actions:

- **Save changes** — applies the rule to this page only. The next [sync](/documentation/sync/how-it-works) uses it.
- **Cancel** — discards anything you've changed in this session. Existing saved rules stay.
- **Reset to defaults** — clears the rule and card options for this page so it falls back to your account defaults.

## Common mistakes

- **Empty deck after editing the rule.** If you turn off `toggle` without turning anything else on, 2anki has nothing to make cards from. Pick at least one block type under **Flashcards**.
- **Sub-deck explosion.** Turning on `heading_1` _and_ `heading_2` _and_ `heading_3` for sub-decks produces deeply nested decks. Pick the heading level that matches the structure you actually have.
- **Rule on the wrong page.** Rules attach to the page ID you opened. Editing the rule on the parent page doesn't change sub-pages — they need their own rule if you want different behaviour.

## Related

- [Card options](/documentation/cards/card-options) — account-level defaults
- [Notion blocks we support](/documentation/cards/notion-blocks) — what each block does on the card
- [How sync works](/documentation/sync/how-it-works) — when rule changes take effect on a synced page

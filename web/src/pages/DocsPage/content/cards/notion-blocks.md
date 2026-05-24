---
title: Notion blocks we support
description: What works, what's ignored, what's coming.
---

2anki.net supports a large subset of the [Notion block API](https://developers.notion.com/reference/block).
Toggle blocks are the primary way to build flashcards — the summary becomes the front and the children become the back.

## Implemented

These blocks are rendered in the exported deck.

- [x] [Paragraph](https://developers.notion.com/reference/block#paragraph-blocks)
- [x] [Heading 1 / 2 / 3](https://developers.notion.com/reference/block#heading-one-blocks)
- [x] [Bulleted list item](https://developers.notion.com/reference/block#bulleted-list-item-blocks)
- [x] [Numbered list item](https://developers.notion.com/reference/block#numbered-list-item-blocks)
- [x] [To-do](https://developers.notion.com/reference/block#to-do-blocks)
- [x] [Toggle](https://developers.notion.com/reference/block#toggle-blocks) — front/back of a flashcard
- [x] [Quote](https://developers.notion.com/reference/block#quote-blocks)
- [x] [Callout](https://developers.notion.com/reference/block#callout-blocks)
- [x] [Code](https://developers.notion.com/reference/block#code-blocks)
- [x] [Equation](https://developers.notion.com/reference/block#equation-blocks) (KaTeX)
- [x] [Divider](https://developers.notion.com/reference/block#divider-blocks)
- [x] [Image](https://developers.notion.com/reference/block#image-blocks)
- [x] [Video](https://developers.notion.com/reference/block#video-blocks)
- [x] [Audio](https://developers.notion.com/reference/block#audio-blocks)
- [x] [File](https://developers.notion.com/reference/block#file-blocks)
- [x] [Embed](https://developers.notion.com/reference/block#embed-blocks)
- [x] [Bookmark](https://developers.notion.com/reference/block#bookmark-blocks)
- [x] [Link to page](https://developers.notion.com/reference/block#link-to-page-blocks)
- [x] [Child page](https://developers.notion.com/reference/block#child-page-blocks) — also usable as a sub-deck via [Parser rules](/documentation/cards/parser-rules).
- [x] [Column list and column](https://developers.notion.com/reference/block#column-list-and-column-blocks)
- [x] [Table](https://developers.notion.com/reference/block#table-blocks) and [Table row](https://developers.notion.com/reference/block#table-row-blocks) — one row, one card. Column 1 is the front, column 2 is the back. Turn on the **Table** chip in your rule to opt in. If the table has a header row, the first row is skipped. Columns 3 and beyond show up on the back as a small inline table.

## Sub-deck-only

These blocks don't render as cards, but they can structure your deck when used in [Parser rules](/documentation/cards/parser-rules):

- [Child database](https://developers.notion.com/reference/block#child-database-blocks) — pick it as a sub-deck source. The database's rows then convert through the table path. On Notion search you can also click the eye icon on a database row to preview it first — see the row count, columns, and which columns 2anki will use as the card front and back.

## Unsupported

These blocks are skipped or rendered as a fallback. If one of them shows up on a card as raw text like `unsupported: <type>`, that's the fallback firing.

- [ ] [PDF](https://developers.notion.com/reference/block#pdf-blocks) — Notion's embedded PDF block. Upload the PDF file directly through the [upload page](/documentation/start-here/upload-a-file) instead.
- [ ] [Heading 4](https://developers.notion.com/reference/block#heading) — Notion's deepest heading level. H1, H2, and H3 work; H4 doesn't.
- [ ] [Table of contents](https://developers.notion.com/reference/block#table-of-contents-blocks)
- [ ] [Breadcrumb](https://developers.notion.com/reference/block#breadcrumb-blocks)
- [ ] [Link preview](https://developers.notion.com/reference/block#link-preview-blocks)
- [ ] [Template](https://developers.notion.com/reference/block#template-blocks)
- [ ] [Synced block](https://developers.notion.com/reference/block#synced-block-blocks)
- [ ] [Meeting notes](https://developers.notion.com/reference/block#meeting-notes) — Notion's AI-meeting block.
- [ ] [Tab](https://developers.notion.com/reference/block#tab) — Notion's tab block.
- [ ] [Transcription](https://developers.notion.com/reference/block#transcription) — Notion's AI transcription block.

Missing a block you need? [Open an issue](https://github.com/2anki/server/issues).

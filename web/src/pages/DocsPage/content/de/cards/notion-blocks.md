---
title: Notion-Blöcke, die wir unterstützen
description: Was funktioniert, was ignoriert wird, was kommt.
---

2anki.net unterstützt eine große Teilmenge der [Notion-Block-API](https://developers.notion.com/reference/block).
Toggle-Blöcke sind der wichtigste Weg, Karteikarten zu bauen — die Zusammenfassung wird zur Vorderseite und die untergeordneten Blöcke zur Rückseite.

## Implementiert

Diese Blöcke werden im exportierten Deck gerendert.

- [x] [Paragraph](https://developers.notion.com/reference/block#paragraph-blocks)
- [x] [Heading 1 / 2 / 3 / 4](https://developers.notion.com/reference/block#heading-one-blocks) — Heading 4 wird in der Größe von Heading 3 gerendert
- [x] [Bulleted list item](https://developers.notion.com/reference/block#bulleted-list-item-blocks)
- [x] [Numbered list item](https://developers.notion.com/reference/block#numbered-list-item-blocks)
- [x] [To-do](https://developers.notion.com/reference/block#to-do-blocks)
- [x] [Toggle](https://developers.notion.com/reference/block#toggle-blocks) — Vorder-/Rückseite einer Karteikarte
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
- [x] [Child page](https://developers.notion.com/reference/block#child-page-blocks) — auch als Unterdeck nutzbar über [Parser-Regeln](/documentation/cards/parser-rules).
- [x] [Column list and column](https://developers.notion.com/reference/block#column-list-and-column-blocks)
- [x] [Table](https://developers.notion.com/reference/block#table-blocks) und [Table row](https://developers.notion.com/reference/block#table-row-blocks) — eine Zeile, eine Karte. Spalte 1 ist die Vorderseite, Spalte 2 ist die Rückseite. Schalte den **Table**-Chip in deiner Regel ein, um dich anzumelden. Hat die Tabelle eine Kopfzeile, wird die erste Zeile übersprungen. Spalten 3 und weiter erscheinen auf der Rückseite als kleine Inline-Tabelle.
- [x] [Synced block](https://developers.notion.com/reference/block#synced-block-blocks) — der synchronisierte Inhalt wird inline gerendert
- [x] [Link preview](https://developers.notion.com/reference/block#link-preview-blocks) — wird als anklickbarer Link gerendert
- [x] [PDF](https://developers.notion.com/reference/block#pdf-blocks) — wird als anklickbarer Link gerendert. Schalte **Download PDFs as Anki media** in den Deck-Optionen ein, um die Datei stattdessen im Deck zu bündeln.

## Nur als Unterdeck

Diese Blöcke werden nicht als Karten gerendert, können aber dein Deck strukturieren, wenn sie in [Parser-Regeln](/documentation/cards/parser-rules) verwendet werden:

- [Child database](https://developers.notion.com/reference/block#child-database-blocks) — wähle sie als Unterdeck-Quelle. Die Zeilen der Datenbank werden dann über den Tabellenpfad konvertiert. In der Notion-Suche kannst du auch auf das Augensymbol einer Datenbankzeile klicken, um sie zuerst in der Vorschau zu sehen — sieh die Zeilenzahl, die Spalten und welche Spalten 2anki als Vorder- und Rückseite der Karte nutzt.

## Nicht unterstützt

Diese Blöcke werden übersprungen — sie erscheinen überhaupt nicht auf Karten.

- [ ] [Table of contents](https://developers.notion.com/reference/block#table-of-contents-blocks)
- [ ] [Breadcrumb](https://developers.notion.com/reference/block#breadcrumb-blocks)
- [ ] [Template](https://developers.notion.com/reference/block#template-blocks)
- [ ] [Meeting notes](https://developers.notion.com/reference/block#meeting-notes) — Notions KI-Meeting-Block.
- [ ] [Tab](https://developers.notion.com/reference/block#tab) — Notions Tab-Block.
- [ ] [Transcription](https://developers.notion.com/reference/block#transcription) — Notions KI-Transkriptionsblock.

Fehlt ein Block, den du brauchst? [Erstelle ein Issue](https://github.com/2anki/server/issues).

---
title: Parser-Regeln
description: Überschreibe das standardmäßige Toggle-zu-Karte-Mapping für eine bestimmte Notion-Seite.
---

Standardmäßig verwandelt 2anki jedes Toggle auf oberster Ebene einer Notion-Seite in eine Karteikarte. Regeln lassen dich das für eine bestimmte Seite ändern — Callouts in Karten verwandeln, Tabellen als Karten behandeln, Unterdecks unter Überschriften verschachteln oder ändern, wie Tags erkannt werden.

**Plan:** Kostenlos

## Wann du das nutzt

- Du schreibst deine Notizen als Absätze oder Callouts, nicht als Toggles, und der Standard-Parser erzeugt ein leeres Deck.
- Du willst, dass jede Zeile einer Notion-Tabelle zu einer Karte wird (Spalte 1 → Vorderseite, Spalte 2 → Rückseite).
- Du willst, dass H2- oder H3-Überschriften in einer Seite zu Unterdecks statt zu Karteninhalt werden.
- Du willst, dass durchgestrichener Text Tags markiert, oder das Gegenteil.

Regeln gelten für **eine Notion-Seite**. Jede Seite hat ihre eigene Regel. Konto-weite [Kartenoptionen](/documentation/cards/card-options) verwalten Standardwerte, die alle Seiten umfassen.

## Den Regel-Editor öffnen

1. Verbinde Notion, falls noch nicht geschehen — siehe [Notion verbinden](/documentation/start-here/connect-notion).
2. Geh zu [2anki.net/notion](https://2anki.net/notion) und finde die Seite, die du anpassen willst.
3. Klick auf das **Settings** (Zahnrad)-Symbol neben der Seite.
4. Die Seite öffnet sich unter `/rules/<page-id>` mit den vier unten beschriebenen Regelgruppen.

## Die vier Regelgruppen

### Decks and sub-decks

Notion-Seiten und -Datenbanken werden immer zu Decks. Wähle, welche Blöcke **innerhalb** der Seite sich als Unterdecks verschachteln. Verfügbare Wahlmöglichkeiten:

- `child_page` — Notion-Unterseiten werden zu Unterdecks (Standard).
- `child_database` — Inline-Datenbanken werden zu Unterdecks.
- `toggle` — ein Toggle auf oberster Ebene wird zu einem Unterdeck statt zu einer Karteikarte. Seine untergeordneten Blöcke werden zu den Karten in diesem Unterdeck.
- `heading_1` / `heading_2` / `heading_3` — Überschriften teilen die Seite in Unterdecks. Inhalt unter jeder Überschrift geht in dieses Unterdeck.

Wähle null oder mehr. Wenn du keine wählst, ist die ganze Seite ein Deck.

Die Toggle-, Überschriften- und Datenbank-Unterdeck-Optionen gelten in kostenpflichtigen Plänen. Unterseiten verschachteln sich in jedem Plan als Unterdecks.

#### Advanced deck types

Unter **Deck boundaries** gibt es eine eingeklappte **Advanced deck types**-Ausklappung. Öffne sie, um zusätzliche Notion-Blöcke in ihre eigenen Decks auf oberster Ebene statt in Karten oder Unterdecks zu verwandeln. Verfügbare Wahlmöglichkeiten:

- Toggle, Heading 1, Heading 2, Heading 3
- Bulleted list, Numbered list, Quote
- Columns
- Database inside a page

Jeder Typ, den du einschaltest, teilt seinen Inhalt in ein separates Deck, das aus den untergeordneten Blöcken dieses Blocks stammt. Das ist standardmäßig aus — Seiten und Datenbanken werden schon zu Decks, sodass die meisten Seiten es nie brauchen. Wenn ein Blocktyp sowohl als Karteikarte als auch als Deck gesetzt ist, wird er zu einem Deck.

Das Einschalten teilt die Seite bei der nächsten Konvertierung in mehr Decks. Schalte es aus, um zu einem Deck pro Seite zurückzugehen.

### Flashcards

Welche Notion-Blocktypen zu einzelnen Karten werden. Standard ist nur `toggle`. Verfügbare Wahlmöglichkeiten:

- `toggle` — der Standard. Die Überschrift ist die Vorderseite, der Inhalt die Rückseite.
- `bulleted_list_item` / `numbered_list_item` — Aufzählungen auf oberster Ebene werden zu Karten. Der Aufzählungstext ist die Vorderseite; verschachtelte Aufzählungen sind die Rückseite.
- `to_do` — To-do-Blöcke werden zu Karten. Nützlich für [MCQ](/documentation/cards/mcq)-Erkennung.
- `paragraph` / `callout` / `quote` / `code` — verwandle diese in Karten, wenn deine Notizen keine Toggles nutzen. Der Blockinhalt ist die Vorderseite; die Rückseite bleibt leer, es sei denn, du aktivierst zusätzlich etwas.
- `column_list` — Notions Zweispalten-Layout wird zu einer Karte. Spalte 1 ist die Vorderseite, Spalte 2 ist die Rückseite.
- `table` — Tabellenzeilen werden zu Karten. Spalte 1 ist die Vorderseite, Spalte 2 ist die Rückseite. Spalten 3 und weiter werden auf der Rückseite als kleine Inline-Tabelle gerendert. **(Neu.)**
- `heading_1` / `heading_2` / `heading_3` — mach Überschriften zur Kartenvorderseite. Der Inhalt unter jeder Überschrift wird zur Rückseite.

Du kannst diese kombinieren. Wenn du sowohl `toggle` als auch `bulleted_list_item` einschaltest, werden beide zu Karten.

### Tags and notifications

**Tag-Format** — wie 2anki Tags in deinem Inhalt findet:

- **strikethrough** (Standard) — durchgestrichener Text wird zu einem Tag. Wo du ihn platzierst, legt fest, welche Karten den Tag bekommen:
  - im Toggle einer Karte → taggt nur diese Karte
  - eine durchgestrichene Zeile unter einem Eltern-Toggle → taggt jede Karte, die darunter verschachtelt ist (nutze das, um einen ganzen Abschnitt auf einmal zu taggen). Dieser Geltungsbereich braucht sowohl **Tag a whole section** als auch **Cherry-pick mode** eingeschaltet.
  - auf Seitenebene → taggt jede Karte auf der Seite
- **heading** — H1/H2/H3-Überschriften werden zu Tags. Nützlich, wenn deine Notizen schon eine Überschriften-Hierarchie haben, die du als Tags behalten willst.

**Email the deck when it's ready** — wenn ein, wird die fertige `.apkg` an deine Konto-Adresse gemailt. Decks unter 24 MB gehen als Anhang; größere Decks enthalten stattdessen einen Download-Link.

### Card options

Dasselbe Panel wie [Kartenoptionen](/documentation/cards/card-options), aber auf diese eine Notion-Seite beschränkt. Änderungen hier überschreiben deine Konto-Standardwerte nur für diese Seite. Nutze es, um Schriftgröße, Kartenvorlagen oder MCQ-Verhalten pro Seite anzupassen, ohne jede andere Seite zu ändern.

## Speichern und Zurücksetzen

Die Speicherleiste unten auf der Seite hat drei Aktionen:

- **Save changes** — wendet die Regel nur auf diese Seite an. Der nächste [Sync](/documentation/sync/how-it-works) nutzt sie.
- **Cancel** — verwirft alles, was du in dieser Sitzung geändert hast. Bestehende gespeicherte Regeln bleiben.
- **Reset to defaults** — löscht die Regel und die Kartenoptionen für diese Seite, sodass sie auf deine Konto-Standardwerte zurückfällt.

## Häufige Fehler

- **Leeres Deck nach dem Bearbeiten der Regel.** Wenn du `toggle` ausschaltest, ohne etwas anderes einzuschalten, hat 2anki nichts, woraus es Karten machen könnte. Wähle unter **Flashcards** mindestens einen Blocktyp.
- **Unterdeck-Explosion.** `heading_1` _und_ `heading_2` _und_ `heading_3` für Unterdecks einzuschalten erzeugt tief verschachtelte Decks. Wähle die Überschriftenebene, die zu der Struktur passt, die du tatsächlich hast.
- **Regel auf der falschen Seite.** Regeln hängen an der Seiten-ID, die du geöffnet hast. Das Bearbeiten der Regel auf der Elternseite ändert Unterseiten nicht — sie brauchen ihre eigene Regel, wenn du anderes Verhalten willst.

## Verwandt

- [Kartenoptionen](/documentation/cards/card-options) — Standardwerte auf Kontoebene
- [Notion-Blöcke, die wir unterstützen](/documentation/cards/notion-blocks) — was jeder Block auf der Karte bewirkt
- [Wie Sync funktioniert](/documentation/sync/how-it-works) — wann Regeländerungen auf einer synchronisierten Seite greifen

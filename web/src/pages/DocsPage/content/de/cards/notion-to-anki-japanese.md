---
title: Notion → Anki für Japanisch
description: Strukturiere abgebaute Sätze und Vokabeln in Notion, behalte Audio und Screenshots, wähle einen Notiztyp und öffne das Deck in Anki.
---

Dieser Leitfaden ist für Japanisch- und Sprachlernende, die ihre Notizen in Notion halten und sie in Anki lernen — Satz-Miner, JLPT-Lernende, Kanji-Schreiber, alle, die ein Notiz-Tool mit Spaced Repetition kombinieren. Er behandelt, wie du eine Seite anlegst, damit 2anki daraus die gewünschten Karten macht, was die Konvertierung übersteht und was 2anki bewusst dir überlässt.

2anki konvertiert, was du geschrieben hast. Es erzeugt keine Lesungen, schlägt keine Wörter nach und fügt kein Audio hinzu, das nicht da war — eine Karte zeigt also nie eine Vermutung, die du nicht gemacht hast. Die Arbeit unten geht darum, ihm eine Seite zu geben, die es sauber lesen kann.

## Satzkarten vs. Vokabelkarten

Beide leben auf derselben Notion-Seite. Die Einheit ist das Toggle: Die Toggle-Zeile ist die Vorderseite, alles darin ist die Rückseite.

**Eine Satzkarte** — setz den abgebauten Satz in die Toggle-Zeile. Innen setzt du die Lesung, die Bedeutung, das Zielwort und jegliches Audio oder jeglichen Screenshot. Ein Toggle, eine Karte.

**Eine Vokabelkarte** — setz das Wort in die Toggle-Zeile. Innen setzt du die Lesung und die Bedeutung. Kürzer, aber dieselbe Form.

Du kannst sie frei mischen. Eine Grammatikseite könnte zehn Satz-Toggles und darunter ein Glossar aus Wort-Toggles enthalten — 2anki macht aus jedem eine Karte, der Reihe nach.

Wenn du lieber keine Toggles nutzt, lassen [Parser-Regeln](/documentation/cards/parser-rules) stattdessen eine Notion-Tabelle die Karten steuern: Spalte 1 wird zur Vorderseite, Spalte 2 zur Rückseite. Das passt zu einer Vokabelliste, die du als Tabelle hältst — eine Zeile pro Wort.

## Lesungen und Furigana

Tippe die Lesung so, wie du sie auf der Karte willst. Furigana in Klammern nach dem Kanji, Kana auf eigener Zeile, Romaji, Pitch-Notation — was auch immer dein Workflow nutzt. 2anki trägt es unverändert hinüber.

Es fügt keine Furigana für dich hinzu und ändert keine Lesung, die du geschrieben hast. Wenn du Lesungen ausgefüllt haben willst, mach es zuerst in Notion — ein Wörterbuch-Add-on oder Yomitan kann dir helfen, sie dort zu entwerfen — und konvertiere dann. Die Karte zeigt genau, was die Seite zeigte.

## Audio auf Karten

Häng das Audio als Datei in Notion an — ein Clip, ein aufgenommener Satz, eine Aussprache. 2anki lädt die Datei herunter und packt sie ins Deck, sodass die Karte es offline auf jedem Gerät abspielt. Setz das Audio in das Toggle, auf die Rückseite, wo es mit dem Satz hingehört.

Ein Link zu einer externen Audioseite bleibt ein Link, kein abspielbares Audio. Nur eine angehängte Datei wird zu Deck-Audio.

2anki nimmt oder erzeugt während der Konvertierung keine Sprache. Getrennt davon kann Anki eine Karte beim Lernen mit seiner eigenen Stimme auf dem Gerät vorlesen — Japanisch inklusive — einstellbar unter [Kartenoptionen](/documentation/cards/card-options). Das ist Anki, das live spricht, keine Audiodatei im Deck.

## Screenshots und Bilder

Zieh den Screenshot — ein Untertitel-Frame, ein Manga-Panel, ein Diagramm — in das Toggle in Notion. Es kommt als Bild in der Karte hinüber und wird ins Deck gebündelt, sodass es ohne Verbindung rendert.

Beim Satz-Mining gibt dir ein Screenshot auf der Rückseite die Szene, aus der der Satz stammt. Halte Bilder angemessen groß; eine Seite voller Screenshots in voller Auflösung macht ein großes Deck.

## Fett und kursiv

Setz das Zielwort in einem Satz fett, kursiviere eine Wortart — die Hervorhebung bleibt auf der Karte. Das ist der günstigste Weg, zu markieren, was eine Karte prüft, ohne ein separates Feld hinzuzufügen.

## Einen Notiztyp wählen

Während der Konvertierung wählst du den Notiztyp, den 2anki nutzt. Die Standardwerte funktionieren, und du kannst einen Notiztyp umbenennen, um eine Vorlage einzuklinken, mit der du schon lernst — eine Satzkarten-Vorlage, eine Vokabel-Vorlage, dein eigenes Styling.

2anki baut deine Notizen zu einem Deck — es ersetzt nicht Kaishi 1.5k, RRTK oder JLab. Lerne die so, wie sie sind; nutze das hier für die Karten, die du selbst schreibst.

## Das Deck in Anki öffnen

Der Download ist eine standardmäßige `.apkg`. Öffne sie in Anki — Desktop oder Mobil — und das Deck, seine Medien und sein Notiztyp werden zusammen importiert. Die vollständigen Schritte stehen in [Öffne dein Deck in Anki](/documentation/start-here/open-in-anki).

Importiere eine Seite oder ein Thema nach dem anderen statt eines ganzen Notizbuchs in einer Datei. Kleinere Decks sind leichter zu planen und zu lernen, und sie importieren schneller.

## Verwandt

- [Parser-Regeln](/documentation/cards/parser-rules) — verwandle Tabellen, Callouts oder Überschriften in Karten
- [Kartenoptionen](/documentation/cards/card-options) — jede Konvertierungseinstellung, inklusive Ankis Vorlese-Stimme
- [Notion-Blöcke, die wir unterstützen](/documentation/cards/notion-blocks) — was jeder Block auf der Karte bewirkt

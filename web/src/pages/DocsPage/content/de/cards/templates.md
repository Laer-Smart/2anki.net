---
title: Notiztypen und Vorlagen
description: Durchstöbere Anki-Notiztypen zum Loslegen, sieh sie in der Vorschau, passe sie an und lade sie herunter.
---

Ein Notiztyp ist Ankis Name für die Kartenvorlage — das Layout der Vorderseite, das Layout der Rückseite, das CSS, die Feldliste. 2anki liefert eine Handvoll Notiztypen zum Loslegen, die du unverändert in Anki einfügen oder im Browser abwandeln und bearbeiten kannst. Die Bibliothek liegt unter [2anki.net/templates](https://2anki.net/templates).

**Plan:** Kostenlos zum Durchstöbern, Ansehen und Herunterladen. Das Erstellen und Speichern eigener Vorlagen braucht ein Konto.

## Wann du das nutzt

- Du willst ein schöner aussehendes Deck als Ankis Standard-Karte in Weiß auf Weiß.
- Du willst einen Startpunkt für eine eigene Vorlage — wandle eine von unseren ab und bearbeite sie im Browser, statt das HTML/CSS von Grund auf zu schreiben.
- Du willst untersuchen, welche Felder und Stile die Notiztypen n2a-basic, n2a-cloze, n2a-input oder n2a-mcq nutzen.

Wenn du nur Karten aus deinen Notizen willst, musst du diese Seite nicht anfassen — 2anki wählt für jeden Upload eine vernünftige Standardvorlage. Vorlagen sind wichtig, sobald dir wichtig ist, wie die Karten aussehen.

## Die Bibliothek durchstöbern

Öffne [2anki.net/templates](https://2anki.net/templates). Drei Abschnitte erscheinen, in dieser Reihenfolge:

- **Your note types** — alles, was du im Browser erstellt oder angepasst hast (nur angemeldet).
- **Official 2anki templates** — handgefertigte Designs, die wir liefern und pflegen. Beispiele: Abhiyan Night Mode, Alexander Deluxe Blue, Material, Only Notion.
- **Starter note types** — die schlichten Vorlagen n2a-basic, n2a-cloze, n2a-input, n2a-mcq und Image Occlusion, die 2anki standardmäßig nutzt.

Jede Karte hat eine kleine Vorschau der Vorderseite. Klick auf den Kartennamen, um eine **Front / Back**-Vorschau in voller Größe nebeneinander zu öffnen.

## Eine Vorlage in Anki verwenden

1. Finde die gewünschte Vorlage. Klick auf das **Download**-Symbol (Pfeil nach unten) auf ihrer Karte.
2. Der Browser lädt eine `.apkg` herunter, die ein leeres Deck und den Notiztyp enthält.
3. Öffne die `.apkg` in Anki zum Importieren. Der Notiztyp wird für jedes neue Deck verfügbar.
4. In Anki: **Hinzufügen** einer Karte → wähle diesen Notiztyp aus dem **Typ**-Dropdown.

Auf diese Weise heruntergeladene Vorlagen funktionieren mit Anki auf Desktop, Mobil und AnkiWeb. Du bist nicht an 2anki gebunden, um sie zu nutzen.

## Eine Vorlage anpassen

1. Klick auf das **Stift**-Symbol auf der Karte einer beliebigen Vorlage. Der Editor öffnet sich unter `/templates/edit/<id>`.
2. Bearbeite das HTML für Vorderseite, Rückseite und CSS. Die Vorschau aktualisiert sich beim Tippen.
3. Speichere. Die Vorlage landet oben in **Your note types** in der Bibliothek.
4. Lade sie herunter (dasselbe Download-Symbol auf ihrer Karte) und importiere sie in Anki.

Wenn du von einer unserer Vorlagen ausgegangen bist, ist deine Bearbeitung eine separate Kopie — das Original bleibt im Abschnitt **Official**.

Um einen Notiztyp von Grund auf zu erstellen, klick oben rechts in der Bibliothek auf **New note type**.

## Häufige Fehler

- **Das Bearbeiten der Vorlage ändert bestehende Decks nicht.** Anki importiert Notiztypen nach Namen. Wenn du bereits ein Deck importiert hast, das `n2a-basic` nutzt, überträgt das Anpassen deiner lokalen `n2a-basic`-Vorlage auf 2anki nichts nach Anki zurück. Exportiere erneut aus 2anki oder bearbeite den Notiztyp für bestehende Decks direkt in Anki.
- **Eine offizielle Vorlage löschen.** Du kannst sie aus deiner Ansicht ausblenden, aber das Original bleibt verfügbar — lad jederzeit einen weiteren Download.
- **Vergessen, die .apkg zuerst zu importieren.** Die Browser-Vorschau ist gerendertes HTML — es ist keine `.apkg`, bis du auf Download klickst.

## Verwandt

- [Kartentypen](/documentation/cards/card-types) — welche Art von Karte jede Vorlage erzeugt
- [Kartenoptionen](/documentation/cards/card-options) — die Konvertierungseinstellungen pro Upload
- [Glossar — Notiztyp](/documentation/reference/glossary) — der Begriff, wie Anki ihn nutzt

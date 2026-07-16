---
title: Wie Sync funktioniert
description: Bearbeite eine Notion-Seite, erhalte das aktualisierte Deck — ohne erneutes Hochladen.
---

Sync beobachtet die Notion-Seiten, die du abonniert hast, und hält ein passendes Deck in Anki aktuell. Wenn du eine Seite in Notion bearbeitest, greift der nächste Sync-Lauf die Änderungen auf und aktualisiert das Deck — gleicher Deckname, gleiche Karten-IDs, kein Re-Import-Drama.

## Was Sync macht

- Beobachtet die Notion-Seiten, die du für Sync markierst.
- Hält ein Anki-Deck pro Notion-Seite, mit Unterdecks für verschachtelte Unterseiten.
- Aktualisiert bestehende Karten an Ort und Stelle, wenn sich ihre Notion-Quelle ändert — dein Lernverlauf bleibt erhalten.
- Fügt neue Karten hinzu, wenn du Toggles in Notion hinzufügst. Entfernt Karten, wenn du die Quelle löschst.

## Sync auf einer Seite einrichten

Das machst du im **Auto Sync**-Bereich auf 2anki.net:

1. Verbinde Notion (falls noch nicht geschehen — siehe [Notion in 5 Minuten verbinden](/documentation/start-here/connect-notion)).
2. Öffne das **Auto Sync**-Dashboard und wähle eine Notion-Seite zum Abonnieren.
3. Bestätige den Decknamen. Das Deck wird beim ersten Sync-Lauf erstellt.
4. Öffne Anki auf dem Gerät, das das synchronisierte Deck halten soll, und lass 2anki über AnkiConnect verbinden.

## Wie Aktualisierungen fließen

```
Notion page  →  2anki sync   →  AnkiConnect (your Anki)
   edit            (poll)            update card
```

Ein Hintergrund-Job fragt deine abonnierten Seiten ab, vergleicht sie mit dem bereits Synchronisierten und schickt nur die Änderungen an Anki. Reviews und Planungsstatus bleiben erhalten, weil die Karten-IDs über Läufe hinweg stabil sind.

## Zugang zu Auto Sync bekommen

Auto Sync wird gerade nicht als eigenständiger Plan verkauft — nicht genug Leute nutzten es, um es auf der Preisseite zu halten. Es ist in einem Lifetime-Konto enthalten. Bei jedem anderen Plan schreib eine E-Mail an [support@2anki.net](mailto:support@2anki.net), und wir schalten es für dein Konto frei, damit du es ausprobieren kannst. Die Konvertierungsfunktionen, die es heute gibt — Notion verbinden + Deck herunterladen, plus Datei-Uploads — bleiben kostenlos.

Siehe die [Preisseite](/pricing) für aktuelle Pläne, und [Wenn Sync hängen bleibt](/documentation/sync/troubleshooting), falls ein Sync nicht läuft.

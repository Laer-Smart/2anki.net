---
title: Wenn Sync hängen bleibt
description: Drei Dinge, die du versuchen kannst, wenn dein Deck sich nicht aktualisiert.
---

Sync läuft alle fünf Minuten im Hintergrund. Meistens bemerkst du ihn nicht. Wenn er doch hängen bleibt, ist es fast immer eines der drei Dinge unten.

**Plan:** Lifetime (Sync ist durch denselben Zugang gesteuert wie [Wie Sync funktioniert](/documentation/sync/how-it-works))

## Seite wurde nicht synchronisiert

Du hast eine Notion-Seite bearbeitet. Das Deck in Anki hat sich nicht aktualisiert. Versuch, der Reihe nach:

1. **Warte fünf Minuten.** Sync fragt in einem Fünf-Minuten-Takt ab, um innerhalb der Rate-Limits von Notions kostenlosem Tarif zu bleiben. Wenn du gerade erst bearbeitet hast, ist er vielleicht noch nicht gelaufen.
2. **Öffne das Ankify-Dashboard.** Jede abonnierte Seite zeigt die letzte Laufzeit und einen etwaigen Fehler aus diesem Lauf. Wenn du einen Fehler siehst, zeigt er meist direkt auf die Ursache.
3. **Prüfe, ob die Seite noch mit der 2anki-Integration geteilt ist.** Notion verliert die Verbindung manchmal nach einer Workspace-Änderung. Öffne die Seite in Notion, klick auf **Share → Add connections**, und füge 2anki erneut hinzu.
4. **Prüfe, ob Anki geöffnet ist und AnkiConnect läuft.** Sync schreibt über AnkiConnect nach Anki — wenn Anki nicht auf dem Gerät geöffnet ist, das das Deck hält, wird der Lauf auf unserer Seite abgeschlossen, aber das Deck ändert sich nicht.

Wenn das Dashboard zeigt, dass Läufe erfolgreich sind, das Deck sich aber trotzdem nicht aktualisiert, ist es fast immer AnkiConnect. Starte Anki neu, und löse dann einen manuellen Sync aus dem Dashboard aus.

## Anki zeigt einen „Duplicate“-Dialog beim erneuten Import

Beim ersten erneuten Import eines bestehenden Decks nach dieser Änderung stellen sich die Karten-IDs auf ein neues stabiles Format um. Ankis eingebauter „Duplicate“-Dialog erscheint einmal — wähle **Keep existing**. Deine Reviews bleiben erhalten, und künftige erneute Importe aktualisieren stillschweigend ohne Nachfrage.

## Ich sehe ein echtes Duplikat-Deck

Wenn zwei Kopien derselben Karten in Anki existieren, wurde die ältere Kopie vor der ID-Änderung importiert. Lösche das ältere Deck in Anki — behalte das mit deinem Lernverlauf. Künftige erneute Importe derselben Quelle aktualisieren das verbleibende Deck an Ort und Stelle.

Wenn beide Decks einen Lernverlauf haben, der dir wichtig ist, [kontaktiere uns](/documentation/help/contact), bevor du eines löschst — wir können manchmal zusammenführen.

## Ich habe den Zugriff versehentlich entzogen

Wenn du 2anki aus deinem Notion-Workspace entfernt hast, stoppt Sync und das Dashboard zeigt einen Authentifizierungsfehler. Zum Wiederherstellen:

1. Geh zu [2anki.net](https://2anki.net/) und melde dich erneut mit Notion an.
2. Teile die Seiten, die du synchronisieren willst, erneut — öffne jede in Notion, klick auf **Share → Add connections**, und wähle 2anki.
3. Bestehende Abonnements setzen beim nächsten Lauf wieder ein. Du musst nicht erneut abonnieren.

Dein Kartenverlauf geht nicht verloren. Das Dashboard merkt sich, welche Notion-Seiten welchen Anki-Decks zugeordnet waren.

## Immer noch hängen?

Wenn nichts davon geholfen hat:

- Sieh in [Häufige Probleme](/documentation/help/common-problems) für jede Fehlermeldung, die du siehst.
- [Kontaktiere uns](/documentation/help/contact) — nenne den Namen der Notion-Seite, den Zeitstempel des Ankify-Laufs und die Fehlermeldung aus dem Dashboard.

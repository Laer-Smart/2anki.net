---
title: Chat — Lernassistent
description: Notizen einfügen, nach Karten fragen, ein Konzept durcharbeiten. Unterhaltungen werden gespeichert.
---

Chat ist ein Lernassistent, gebaut auf Claude. Füge deine Notizen ein und bitte ihn, Karten zu machen, bitte ihn, etwas zu erklären, oder arbeite ein Thema im Hin und Her durch. Öffne ihn unter [2anki.net/chat](https://2anki.net/chat). Anmeldung erforderlich.

**Plan:** Kostenlos für die ersten 20 Nachrichten pro Monat. Subscription und Lifetime sind unbegrenzt und nutzen ein stärkeres Modell.

## Wann du das nutzt

- Deine Quelle ist nicht strukturiert genug für den Standard-Parser, und du willst sie interaktiv in Karten verwandeln.
- Ein Standard-Upload hat zu wenige Karten (oder keine) zurückgegeben, und du willst einen zweiten Durchlauf mit einem anderen Blickwinkel.
- Du willst ein Konzept durchdenken, bevor du Karten machst — Erklärung zuerst, Karten danach.
- Du hängst an einem bestimmten Upload-Fehler fest und willst Hilfe, herauszufinden, warum eine Datei nicht konvertiert.

Wenn deine Quelle schon sauber auf Karteikarten abbildet (Toggles, Aufzählungspaare, eine Tabelle), ist der Standard-[Upload-Ablauf](/documentation/start-here/upload-a-file) schneller. Chat ist für die Zwischenfälle.

## Eine Unterhaltung starten

1. Öffne [2anki.net/chat](https://2anki.net/chat).
2. Klick entweder auf einen der Start-Chips ("Make 10 cards from notes I'll paste", "Explain a concept, then make cards", "Turn this into cloze cards: [paste]") oder tippe deinen eigenen Prompt.
3. Sende. Der Assistent antwortet und streamt die Antwort, während er sie erzeugt.
4. Wenn der Assistent Karten vorschlägt, siehst du sie inline als Vorder-/Rückseiten-Vorschauen. Du kannst weiter iterieren oder von dort eine `.apkg` herunterladen.

Vergangene Unterhaltungen bleiben in der Seitenleiste links. Klick auf eine beliebige, um sie wieder zu öffnen. Du kannst eine Unterhaltung aus derselben Zeile umbenennen oder löschen.

## Nützliche Prompts schreiben

Ein klarer Prompt schlägt einen langen. Drei Muster, die funktionieren:

**Füge deine Notizen ein, dann frag.** "Here are my notes on the citric acid cycle. Make 12 cards focused on enzymes and their products." — füge die Notizen danach ein.

**Bitte zuerst um Erklärung.** "Explain why beta-blockers work in heart failure. Then make 5 cards from your explanation." — nützlich, wenn du noch nicht sicher bist, was die richtigen Fragen sind.

**Übergib einen festgefahrenen Upload.** Wenn die Upload-Seite dir sagte, dass 0 Karten erstellt wurden, klick im Fehler auf **Open in chat**. Die Unterhaltung füllt sich mit dem Dateinamen vor, und du kannst beschreiben, was in der Datei steht.

Der gleiche Rat, der für [KI-Karteikarten](/documentation/cards/ai-flashcards) funktioniert, funktioniert hier — sei konkret, worauf du dich konzentrieren willst, was du überspringst und welchen Ton du willst.

## Unterhaltungsgrenzen

|                       | Free          | Subscription    | Lifetime        |
| --------------------- | ------------- | --------------- | --------------- |
| Nachrichten pro Monat | 20            | Unbegrenzt      | Unbegrenzt      |
| Nachrichtenlänge      | 4 000 Zeichen | 100 000 Zeichen | 100 000 Zeichen |
| Modell                | Claude Haiku  | Claude Sonnet   | Claude Sonnet   |

Die Zählung setzt sich am Ersten des Folgemonats zurück. Das genaue Rücksetzdatum erscheint, wenn du das Limit erreichst. Siehe [Grenzen und Kontingente](/documentation/help/limits) für die vollständige Plantabelle.

## Was wir speichern

- Den Text jeder Nachricht in jeder Unterhaltung (damit du sie wieder öffnen kannst).
- Das Nutzerkonto, dem die Unterhaltung gehört.
- Nichts sonst — wir betreiben keine Analytik darüber, was du fragst, und wir trainieren keine Modelle mit deinen Unterhaltungen.

Lösche eine Unterhaltung jederzeit über das Papierkorb-Symbol in der Seitenleiste. Die Löschung ist sofortig und endgültig — die Unterhaltung kann nicht wiederhergestellt werden. Für das vollständige Datenbild siehe die [Datenschutzerklärung](/documentation/reference/privacy).

## Häufige Fehler

- **Mehr als das Nachrichtenlimit einfügen.** 4 000 Zeichen im kostenlosen Plan sind grob zwei Seiten. Teile eine lange Quelle über mehrere Nachrichten, oder mach ein Upgrade.
- **Erwarten, dass Chat hochgeladene Dateien liest.** Chat liest Text. Um ein PDF oder einen Notion-Export zu konvertieren, nutze stattdessen die [Upload-Seite](/documentation/start-here/upload-a-file) — dieser Weg ist für Dateien gebaut. Chat kann dir helfen, einen festgefahrenen Upload zu debuggen, aber er verarbeitet die Datei nicht selbst.
- **Chat als einzigen Weg behandeln.** Für Quellen, die schon Struktur haben, ist der Standard-Parser schneller, deterministisch und kostenlos.

## Verwandt

- [KI-Karteikarten](/documentation/cards/ai-flashcards) — automatische Claude-Erstellung als Teil des Uploads, für Dateien statt eingefügten Text
- [Grenzen und Kontingente](/documentation/help/limits) — Nachrichtenkontingente nach Plan
- [Datenschutzerklärung](/documentation/reference/privacy) — was wir speichern, was nicht

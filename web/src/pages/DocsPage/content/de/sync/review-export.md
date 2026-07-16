---
title: Schick deine Reviews zurück nach Notion
description: Übertrage, wie oft du jede Karte richtig hattest, zurück in deine Notion-Datenbank.
---

Der Review-Export schreibt deinen Anki-Lernverlauf in eine Notion-Datenbank. Nach einer Lernsitzung aktualisiert sich die Zeile jeder Karte mit dem Datum, an dem du gelernt hast, und mit der Anzahl der Reviews — direkt neben deinen Notizen in Notion sichtbar.

**Plan:** Verfügbar für Auto-Sync-Abonnenten und Lifetime-Mitglieder. Die Funktion lebt im Ankify-Dashboard.

## Was du in Notion siehst

Jede Karte, die 2anki ursprünglich aus deiner Notion-Seite gemacht hat, ordnet sich einer Zeile in der von dir gewählten Datenbank zu. Nach einem Sync-Lauf aktualisieren sich zwei Eigenschaften:

- **Date** — wann du die Karte zuletzt gelernt hast.
- **Reviews** — wie oft du die Karte insgesamt gelernt hast.

Notion bleibt deine Quelle der Wahrheit für Frage und Antwort. 2anki schreibt nur diese zwei Zahlen — es rührt deinen Karteninhalt nie an.

## Einschalten

1. Stell sicher, dass die Quellseite schon über Auto Sync synchronisiert — siehe [Wie Sync funktioniert](/documentation/sync/how-it-works).
2. Wähle eine Ziel-Datenbank. Du hast zwei Optionen:
   - Nutze eine bestehende Datenbank, die bereits die richtige Struktur hat (eine **Date**-Eigenschaft vom Typ Date und eine **Reviews**-Eigenschaft vom Typ Number).
   - Lass 2anki eine frische Datenbank für dich aus dem Ankify-Dashboard erstellen. Sie kommt mit der richtigen Struktur vorkonfiguriert.
3. Öffne im Ankify-Dashboard die Einstellungen der Seite und schalte **Export reviews to Notion** ein.
4. Wähle die Ziel-Datenbank.
5. Nach deiner nächsten Anki-Lernsitzung füllen sich die Datenbankzeilen im nächsten Sync-Zyklus.

## Erforderliche Notion-Eigenschaften

Die Datenbank braucht diese Eigenschaften. Die Namen müssen genau übereinstimmen. Typen in Klammern.

| Property | Type   |
| -------- | ------ |
| Date     | Date   |
| Reviews  | Number |

Du kannst auch andere Eigenschaften in der Datenbank haben — 2anki schreibt nur die zwei oben. Das Ankify-Dashboard zeigt einen grünen Haken neben Datenbanken, die bereits die richtige Struktur haben, damit du eine auswählen kannst, ohne zu raten.

:::warning
Wenn eine Eigenschaft fehlt oder den falschen Typ hat, überspringt der Sync diese Zeile stillschweigend. Das Lauf-Protokoll im Ankify-Dashboard zeigt, welche Zeilen aktualisiert wurden und welche nicht.
:::

## Grenzen

- Der Review-Export läuft im selben Fünf-Minuten-Takt wie Sync. Er ist nicht in Echtzeit.
- Nur Karten, die 2anki ursprünglich aus dieser Notion-Seite erstellt hat, werden verfolgt. Karten, die du von Hand in Anki hinzugefügt hast, passen nicht zurück.
- Wenn du die Notion-Zeile löschst, bleibt die passende Anki-Karte — Anki ist die Quelle der Wahrheit für das, was du lernst, Notion ist die Quelle der Wahrheit für das, was du geschrieben hast.

Wenn eine Zeile sich nicht aktualisiert, siehe [Wenn Sync hängen bleibt](/documentation/sync/troubleshooting).

---
title: Öffne dein Deck in Anki
description: Bring die heruntergeladene .apkg auf jedem Gerät in Anki.
---

Anki öffnet `.apkg`-Dateien auf jeder Plattform — Desktop, iPhone, iPad, Android und im Web. Der Ablauf unterscheidet sich leicht je Plattform. Wähle deine unten.

**Plan:** Kostenlos (Anki selbst ist auf jeder Plattform außer iOS kostenlos)

## Anki Desktop (Windows, macOS, Linux)

1. Stell sicher, dass Anki installiert ist — [lade es von ankiweb.net](https://apps.ankiweb.net/).
2. Doppelklick auf die heruntergeladene `.apkg`-Datei. Anki öffnet sich und importiert sie.
3. Das neue Deck erscheint in deiner Deckliste, bereit zum Lernen.

Wenn der Doppelklick nicht funktioniert, öffne Anki und nutze **File → Import**, und wähle dann die `.apkg`.

## AnkiMobile (iPhone, iPad)

AnkiMobile ist eine kostenpflichtige App vom offiziellen Anki-Team — der direkte Kauf finanziert die Entwicklung von Anki.

1. Speichere die `.apkg` in der Dateien-App (z. B. per AirDrop, Mail oder iCloud Drive).
2. Öffne Dateien, tippe auf die `.apkg`, und wähle **Open in AnkiMobile**.
3. Bestätige den Import. Das Deck erscheint in deiner Deckliste.

Wenn die Datei stattdessen in einer Vorschau-App öffnet, nutze die **Share**-Schaltfläche und wähle AnkiMobile aus der Liste.

## AnkiDroid (Android)

AnkiDroid ist kostenlos bei Google Play.

1. Speichere die `.apkg` auf deinem Telefon — der direkte Download aus Chrome oder Firefox funktioniert.
2. Öffne die Datei aus deinen Benachrichtigungen oder der Dateien-App.
3. Wähle **AnkiDroid**, wenn Android fragt, wie es geöffnet werden soll. Das Deck wird automatisch importiert.

## AnkiWeb

AnkiWeb ist der offizielle Sync-Dienst. Du kannst im Browser lernen, aber er wird hauptsächlich genutzt, um Desktop und Mobil synchron zu halten.

1. Melde dich unter [ankiweb.net](https://ankiweb.net/) an.
2. AnkiWeb selbst importiert `.apkg`-Dateien nicht direkt — importiere am Desktop oder Mobil, und lass Anki das Deck dann zu AnkiWeb hochsynchronisieren.

## Ein bestehendes Deck aktualisieren

Wenn du dieselbe Notion-Seite oder Datei erneut konvertierst, hält 2anki die Karten-IDs stabil. Der erneute Import der neuen `.apkg` aktualisiert bestehende Karten an Ort und Stelle — dein Lernverlauf bleibt erhalten, du bekommst keine Duplikate.

:::note
Beim ersten erneuten Import eines Decks nach dieser Änderung zeigt Anki seinen eingebauten „Duplicate“-Dialog, weil die Karten-IDs auf ein neues stabiles Format umgestellt wurden. Wähle **Keep existing** — dein Lernverlauf bleibt erhalten, und künftige erneute Importe aktualisieren stillschweigend.
:::

Für Notion-Seiten, bei denen Aktualisierungen automatisch fließen sollen, ohne erneut hochzuladen, nutze stattdessen [Sync](/documentation/sync/how-it-works).

### Warum Duplikate nach dem Umstrukturieren von Toggles auftauchen

Die Karten-ID ist an die Notion-Block-ID des Toggles verankert. Notion behält diese Block-ID bei manchen Änderungen bei und ersetzt sie bei anderen:

- **Den Text innerhalb eines Toggles bearbeiten** behält dieselbe Block-ID → der erneute Import aktualisiert die bestehende Karte an Ort und Stelle.
- **Ein Toggle ausschneiden und anderswo einfügen** vergibt eine neue Block-ID → der erneute Import erstellt eine neue Karte neben der alten.
- **Ein Toggle duplizieren** (per Rechtsklick → Duplicate oder ⌘D) vergibt der Kopie eine neue Block-ID → beide Karten erscheinen nach dem erneuten Import.
- **Ein Toggle per Ziehen verschieben** innerhalb derselben Seite behält meist die Block-ID; seitenübergreifendes Verschieben nicht.

Wenn du erneut importierst und Duplikat-Karten siehst, ist die wahrscheinlichste Ursache ein Ausschneiden-und-Einfügen oder Duplizieren-und-Bearbeiten während des Bearbeitungsdurchgangs.

**Ablauf, der Duplikate vermeidet:** bearbeite Toggle-Text an Ort und Stelle. Strukturiere die Seite vor der ersten Konvertierung um, wenn du kannst — sobald ein Deck in Anki live ist, behandle das Toggle-Layout als Anker und ändere die Inhalte, nicht die Positionen.

---
title: API-Zugang
description: Die 2anki.net-HTTP-API — Schlüssel, Endpunkte und die CLI.
---

Die 2anki.net-HTTP-API ist in einer **begrenzten Beta**. Endpunkte und Payloads können sich zwischen Releases noch ändern, aber API-Schlüssel, Bearer-Authentifizierung und die Kern-Konvertierungsendpunkte sind live und werden von der [2anki CLI](https://www.npmjs.com/package/@2anki/cli) genutzt.

## Zugang

Schlüssel sind Self-Service: melde dich an und erstelle einen auf der [Entwicklerseite](/developers). Jeder Schlüssel startet im kostenlosen Sandbox-Tarif; bezahlte Tarife erhöhen das Volumen (siehe die Tarife unten).

Sende deinen Schlüssel als Bearer-Token bei jeder Anfrage:

```
Authorization: Bearer sk_live_…
```

Halte den Schlüssel geheim. Wer ihn besitzt, kann auf deinem Konto konvertieren, gegen die Limits deines Tarifs.

## Tarife

| Tarif   | Preis      | Karten pro Monat | Anfragen pro Minute |
| ------- | ---------- | ---------------- | ------------------- |
| Sandbox | kostenlos  | 100              | 5                   |
| Starter | 29 $ / Mon | 5 000            | 30                  |
| Growth  | 99 $ / Mon | 30 000           | 60                  |
| Custom  | Kontakt    | über 100 000     | nach Vereinbarung   |

Jeder Schlüssel startet in Sandbox. Für Custom-Volumen über 100 000 Karten pro Monat schreib an [support@2anki.net](mailto:support@2anki.net). Die Kontotarife findest du auf der [Preisseite](/pricing).

## Endpunkte

Die Endpunkte, die ein Konverter-Client braucht:

| Methode | Pfad                                    | Was er macht                     |
| ------- | --------------------------------------- | -------------------------------- |
| POST    | `https://2anki.net/api/upload/file`     | Eine Datei in ein Deck umwandeln |
| GET     | `https://2anki.net/api/upload/jobs`     | Konvertierungsstatus prüfen      |
| GET     | `https://2anki.net/api/apkg/:key/meta`  | Deck-Vorschau — Anzahl und Decks |
| GET     | `https://2anki.net/api/apkg/:key/cards` | Gerenderte Karten                |

Die vollständige OpenAPI-Referenz liegt unter [`/api/docs`](/api/docs) — eine Live-Swagger-UI, generiert vom laufenden Server. Alles, was oben nicht gelistet ist, gilt als intern und kann sich ohne Ankündigung ändern.

## Die CLI

Die [2anki CLI](https://www.npmjs.com/package/@2anki/cli) ist der schnellste Weg, die API zu nutzen:

```
npx @2anki/cli login
2anki convert notes.md
```

Vorgebaute Binaries für macOS, Linux und Windows liegen auf der [Releases-Seite](https://github.com/2anki/server/releases/latest). Das macOS-Binary ist arm64 (Apple Silicon).

## Assistenten

Um 2anki aus Claude oder ChatGPT statt aus eigenem Code zu nutzen, siehe den [MCP-Connector](/documentation/reference/mcp).

## Feedback

Anwendungsfall nicht abgedeckt oder mehr Volumen nötig? Schreib an [support@2anki.net](mailto:support@2anki.net) mit dem, was du baust — für echte Projekte wird der Zugang erweitert. Bugs gehen an [GitHub Issues](https://github.com/2anki/server/issues).

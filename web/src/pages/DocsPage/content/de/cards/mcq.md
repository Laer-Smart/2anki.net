---
title: Multiple-Choice-Fragen
description: Verfasse MCQ-geformte Toggles in Notion und bekomme interaktive Multiple-Choice-Karten in Anki.
---

2anki erkennt Multiple-Choice-Fragen direkt aus deinen Notizen — keine Plugins, keine Extraschritte. Strukturiere ein Toggle richtig, und du bekommst eine interaktive MCQ-Karte in Anki statt einer einfachen Vorder-/Rückseiten-Karte.

**Plan:** Kostenlos

## Zuerst aktivieren

Multiple Choice ist opt-in. Geh zu [Kartenoptionen](/card-options), klapp die Gruppe **Multiple choice** auf und schalte sie **On**. Bis du das tust, werden deine Toggles als Basic-Karten konvertiert.

## Wie ein gültiges MCQ aussieht

Ein Toggle, dessen **Titel die Fragestellung** ist und dessen **untergeordnete Blöcke die Antwortoptionen** sind. Eine Option wird mit einer von zwei Methoden als richtig markiert.

## Methode 1 — Notion-To-do-Blöcke (empfohlen)

Erstelle ein Toggle (tippe `>` gefolgt von einem Leerzeichen, dann die Fragestellung). Füge im Toggle einen To-do-Block pro Option hinzu (`/to-do`) und hake genau einen ab — die abgehakte Option ist die richtige Antwort.

Die Form, geschrieben in Notions Markdown-Kürzeln:

```markdown
> A 65-year-old man presents with crushing chest pain radiating to the jaw.

    - [x]  Acute MI
    - [ ]  Stable angina
    - [ ]  GERD
    - [ ]  Aortic dissection
```

Was du in Anki bekommst:

- Vorderseite: die Fragestellung mit den aufgelisteten und A–D beschrifteten Optionen
- Rückseite: dasselbe Layout, wobei die Zeile der richtigen Option grün hervorgehoben ist und einen Haken trägt

## Methode 2 — Aufzählungsliste mit einer voll fettgedruckten Option

Nützlich, wenn du Inhalt aus Word oder Google Docs eingefügt hast und die Optionen schon eine Aufzählungsliste sind. Füge im Toggle eine Aufzählungsliste hinzu (`/bulleted list`) und setz den vollen Text von genau einer Option fett (markiere den Text, drück Cmd/Strg+B).

Die Form:

```markdown
> Which antibiotic class inhibits cell wall synthesis by blocking transpeptidase?

    - Fluoroquinolones
    - **Beta-lactams**
    - Macrolides
    - Aminoglycosides
```

Was du in Anki bekommst:

- Vorderseite: die Fragestellung mit den aufgelisteten und A–D beschrifteten Optionen
- Rückseite: die Zeile der richtigen Option grün hervorgehoben, mit der Erklärung darunter

## Eine Erklärung hinzufügen

Alles im Toggle, das kein To-do und keine Aufzählung ist, wird zur Erklärung auf der Kartenrückseite — ein Absatz, ein Zitat oder ein Callout funktioniert. Setz es unter die Optionen.

```markdown
> Which finding is most specific for PE on ECG?

    - [x]  S1Q3T3 pattern
    - [ ]  ST elevation in V1–V4
    - [ ]  Left bundle branch block
    - [ ]  Peaked T waves

    S1Q3T3 (large S in lead I, Q wave in lead III, inverted T in lead III) is a classic but uncommon finding in PE. Sinus tachycardia is the most common ECG finding.
```

Es wird auf der Kartenrückseite unter einer **Explanation**-Überschrift gerendert.

## Was auf eine Basic-Karte zurückfällt

Wenn der Parser keine einzelne richtige Antwort bestimmen kann, erstellt er stattdessen eine standardmäßige Toggle-Karte (kein MCQ-Verhalten, kein Fehler). Diese zählen zur Zahl `{n} skipped, no answer marked`, die nach der Konvertierung neben dem Badge gezeigt wird.

| Situation                                     | Ergebnis   |
| --------------------------------------------- | ---------- |
| Null Kontrollkästchen abgehakt, null Elemente fett | Basic-Karte |
| Zwei oder mehr Kontrollkästchen abgehakt      | Basic-Karte |
| Zwei oder mehr Elemente voll fett             | Basic-Karte |
| Nur eine Option aufgelistet                   | Basic-Karte |
| To-do + Aufzählungen im selben Toggle gemischt | Basic-Karte |

**Lösung:** öffne in Notion das Toggle, hake die richtige Option ab (oder setz sie fett), exportiere erneut und lade erneut hoch.

## Geltungsbereich

MCQ-Erkennung läuft auf Notion-HTML-Exporten (`.zip` oder `.html`) und auf reinen Markdown-Uploads — dieselbe `- Question / - [x] Option`-Form funktioniert in beiden. XLSX-, PPTX- und Google-Docs-Uploads nutzen die bestehende Basic-/Cloze-Pipeline — siehe [Kartentypen](/documentation/cards/card-types) für diese.

---
title: Markdown und Obsidian
description: Nutze eine Markdown-Datei oder ein Obsidian-Vault als Quelle.
---

Markdown-Unterstützung wird durch die Kartenoption `Markdown Nested Bullet Points` aktiviert.

## Markdown Nested Bullet Points

Diese Kartenoption aktiviert die Konvertierung von Aufzählungs- und Unteraufzählungspunkten in Markdown. Sie wird von Obsidian-Nutzern verwendet, funktioniert aber auch für Notion.

### Einfache Karteikarte

```
- What is the capital of France?
  - The capital of France is Paris!
```

### Cloze-Karteikarte

Beachte, dass du wählen kannst, ob die Cloze-Nummer angezeigt wird oder nicht, aber Backticks (``) sind erforderlich.

```
- The capital of `France` is `{{c1::Paris}}`!
```

### Eingabe-Karteikarte

Damit das funktioniert, musst du die Kartenoption `Treat Bold Text as Input` aktivieren:

```
- What is 21 + 21 = **42**
```

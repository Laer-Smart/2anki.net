---
title: HTML
description: HTML-Uploads auf 2anki.net
---

Beim Hochladen von HTML bleiben Farben, Schriften und Hintergründe erhalten. 2anki.net ist rund um Notion-Exporte gebaut, akzeptiert aber handgeschriebenes HTML genauso.

Standardmäßig wird jedes Toggle auf oberster Ebene (`<details>`) zu einer Karteikarte — das `<summary>` ist die Vorderseite und der Rest des Elements ist die Rückseite.

## Einfache Karteikarte

```html
<details>
  <summary>What is the capital of Albania?</summary>
  <p>Tirana!</p>
</details>
```

## Cloze-Löschung

Umschließe die versteckten Segmente mit `<code>`-Tags, und 2anki.net wandelt sie automatisch in Ankis Cloze-Syntax um:

```html
<details>
  <summary>The capital of <code>Albania</code> is <code>Tirana</code></summary>
</details>
```

Für explizite nummerierte Clozes (und optionale Hinweise) nutze Ankis native Syntax direkt:

```html
<div class="toggle">
  {{c1::Canberra::city}} was founded in {{c2::1913::year}}
</div>
```

## Eingabekarten

Aktiviere **Treat Bold Text as Input** in den Upload-Einstellungen. Jeder `<strong>`- / `<b>`-Text auf der Rückseite einer Karte wird zu einem Eingabefeld, in das Lernende tippen.

```html
<details>
  <summary>What is 21 + 21?</summary>
  <p><strong>42</strong></p>
</details>
```

## Medien

Bilder, Audio und andere Assets, auf die dein HTML verweist, werden im Deck eingebettet. Wenn du einen Notion-Export hochlädst, sende das ursprüngliche `.zip` ein, damit das HTML und sein `assets/`-Ordner zusammenbleiben — siehe [Dateiformate](/documentation/reference/file-formats).

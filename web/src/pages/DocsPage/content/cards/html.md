---
title: HTML
description: HTML uploads on 2anki.net
---

Uploading HTML preserves colours, fonts, and backgrounds. 2anki.net is built around Notion exports but accepts hand-written HTML just the same.

By default each top-level toggle (`<details>`) becomes a flashcard — the `<summary>` is the front and the rest of the element is the back.

## Basic flashcard

```html
<details>
  <summary>What is the capital of Albania?</summary>
  <p>Tirana!</p>
</details>
```

## Cloze deletion

Wrap the hidden segments in `<code>` tags and 2anki.net will convert them into Anki cloze syntax automatically:

```html
<details>
  <summary>The capital of <code>Albania</code> is <code>Tirana</code></summary>
</details>
```

For explicit numbered clozes (and optional hints), use Anki's native syntax directly:

```html
<div class="toggle">
  {{c1::Canberra::city}} was founded in {{c2::1913::year}}
</div>
```

## Input cards

Enable **Treat Bold Text as Input** in the upload settings. Any `<strong>` / `<b>` text on the back of a card becomes an input field that learners type into.

```html
<details>
  <summary>What is 21 + 21?</summary>
  <p><strong>42</strong></p>
</details>
```

## Media

Images, audio, and other assets referenced from your HTML are embedded in the deck. If you're uploading a Notion export, submit the original `.zip` so the HTML and its `assets/` folder stay together — see [File formats](/documentation/reference/file-formats).

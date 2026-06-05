---
title: Markdown and Obsidian
description: Use a Markdown file or Obsidian vault as the source.
---

Markdown support is enabled by the card option `Markdown Nested Bullet Points`.

## Markdown Nested Bullet Points

This card option enables conversion of bullet and sub bullet points in Markdown. This is used by Obsidian users but works for Notion as well.

### Basic flashcard

```
- What is the capital of France?
  - The capital of France is Paris!
```

### Cloze flashcard

Note that you can choose to have the cloze number or not but backticks (``) are required.

```
- The capital of `France` is `{{c1::Paris}}`!
```

### Input flashcard

For this to work, you need to enable the card option `Treat Bold Text as Input`:

```
- What is 21 + 21 = **42**
```

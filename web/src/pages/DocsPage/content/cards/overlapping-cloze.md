---
title: Overlapping cloze for lists
description: Turn a list into a set of cards that hide one item at a time.
---

When you're memorizing an ordered sequence — the steps of a process, the cranial nerves, the lines of a poem — you want to drill it line by line: hide one item, recall it with the surrounding lines in view, then move to the next. Overlapping cloze turns a single list into exactly that set of cards.

Each card hides one item with a cloze deletion. One cloze per card, so Anki schedules each line on its own — no waiting a day between siblings.

## Turn it on

1. Open **Card options**.
2. Under **Card types**, turn on **Cloze deletion cards**.
3. In **Overlapping cloze for lists**, pick a style.

The picker stays disabled until Cloze is on.

## The two styles

Say you have a Notion toggle titled **Pledge of Allegiance** whose contents are a bulleted list:

- I pledge allegiance
- to the flag
- of the United States of America

A list of 3 items becomes 3 cards. The styles differ in how much of the list each card shows around the hidden line.

**Show the whole list** keeps every line visible, hiding one at a time. The card for the second line reads:

> I pledge allegiance
> [...]
> of the United States of America

**Show nearby lines only** keeps just the line before and the line after, dropping the rest. The card for the second line reads:

> I pledge allegiance
> [...]

Show the whole list is best when the surrounding lines jog your memory. Show nearby lines only is closer to true recitation — you recall each line from its immediate neighbours.

## What fires it

Overlapping cloze fires when a card's answer is a list of 2 or more items. A list with a single item becomes one normal cloze card. Cards that aren't lists are untouched.

The result is a standard Cloze deck — it downloads, syncs, and studies like any other.

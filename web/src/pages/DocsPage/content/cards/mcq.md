---
title: Multiple choice questions
description: Author MCQ-shaped toggles in Notion and get interactive multiple-choice cards in Anki.
---

2anki detects multiple-choice questions directly from your notes — no plugins, no extra steps. Structure a toggle correctly and you get an interactive MCQ card in Anki instead of a basic front/back card.

**Plan:** Free

## Enable it first

Multiple choice is opt-in. Go to [Card options](/card-options), expand the **Multiple choice** group, and switch it **On**. Until you do, your toggles convert as Basic cards.

## What a valid MCQ looks like

A toggle whose **title is the question stem** and whose **children are the answer options**. One option is marked as correct using either of two methods.

## Method 1 — Notion to-do blocks (recommended)

Create a toggle (type `>` followed by a space, then the question stem). Inside the toggle, add one to-do block per option (`/to-do`) and check exactly one — the checked option is the correct answer.

The shape, written in Notion's markdown shortcuts:

```markdown
> A 65-year-old man presents with crushing chest pain radiating to the jaw.

    - [x]  Acute MI
    - [ ]  Stable angina
    - [ ]  GERD
    - [ ]  Aortic dissection
```

What you get in Anki:

- Front: the question stem with the options listed and labelled A–D
- Back: the same layout with the correct option's row highlighted green and a checkmark

## Method 2 — Bulleted list with one option fully bolded

Useful when you've pasted content from Word or Google Docs and the options are already a bulleted list. Inside the toggle, add a bulleted list (`/bulleted list`) and bold the full text of exactly one option (select the text, press Cmd/Ctrl+B).

The shape:

```markdown
> Which antibiotic class inhibits cell wall synthesis by blocking transpeptidase?

    - Fluoroquinolones
    - **Beta-lactams**
    - Macrolides
    - Aminoglycosides
```

What you get in Anki:

- Front: the question stem with the options listed and labelled A–D
- Back: the correct option's row highlighted green, with the explanation below

## Adding an explanation

Anything inside the toggle that isn't a to-do or a bullet becomes the explanation on the card back — a paragraph, a quote, or a callout works. Put it below the options.

```markdown
> Which finding is most specific for PE on ECG?

    - [x]  S1Q3T3 pattern
    - [ ]  ST elevation in V1–V4
    - [ ]  Left bundle branch block
    - [ ]  Peaked T waves

    S1Q3T3 (large S in lead I, Q wave in lead III, inverted T in lead III) is a classic but uncommon finding in PE. Sinus tachycardia is the most common ECG finding.
```

It renders on the card back under an **Explanation** heading.

## What falls back to a basic card

If the parser can't determine a single correct answer, it creates a standard toggle card instead (no MCQ behaviour, no error). These count toward the `{n} skipped, no answer marked` figure shown next to the badge after conversion.

| Situation                                  | Result     |
| ------------------------------------------ | ---------- |
| Zero checkboxes checked, zero items bolded | Basic card |
| Two or more checkboxes checked             | Basic card |
| Two or more items fully bolded             | Basic card |
| Only one option listed                     | Basic card |
| Mixed to-do + bullets in the same toggle   | Basic card |

**Fix:** in Notion, open the toggle, check the correct option (or bold it), export again, and re-upload.

## Scope

MCQ detection runs on Notion HTML exports (`.zip` or `.html`) and on plain markdown uploads — the same `- Question / - [x] Option` shape works in both. XLSX, PPTX, and Google Docs uploads use the existing basic/cloze pipeline — see [Card types](/documentation/cards/card-types) for those.

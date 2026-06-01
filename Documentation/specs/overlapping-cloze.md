# Overlapping cloze for lists

**Issue:** [#85 — Handle overlapping cloze deletions](https://github.com/2anki/server/issues/85) (open since 2020, multiple +1s)
**Type:** `feat:` · **Status:** draft spec

## Problem

Learners memorizing an *ordered sequence* — the steps of mitosis, the cranial nerves, the lines of a poem or the Pledge of Allegiance — have no good path in 2anki today. A Notion list becomes either N unrelated single cards or one all-in-one card. Neither lets you drill *order* the way Anki users expect: hide one item, recall it with the surrounding items as context, then move to the next. This is the single most-requested study pattern we don't support (Glutanimate's cloze-overlapper and AnkiLPCG exist precisely for it).

## Solution

A new card option that lets the user **pick a style**, so they can use a popular layout they already know or 2anki's own. Every style that ships in v1 shares one mechanic: when the option is set and a note's answer is a list of 2+ items, we emit **N separate cloze notes** — one per item, each with a single `{{c1::…}}`. One cloze per note → one card → no siblings. We reuse the **existing Cloze model** (`clozeModelName`); no new note type, no migration.

A list with fewer than 2 items falls back to one normal cloze card, silently.

### Styles

| Style (picker value) | Each card… | Origin | Ships |
| --- | --- | --- | --- |
| **Off** (`off`, default) | — | — | — |
| **Show the whole list** (`show-all`) | hides one item; the rest of the list stays visible as context | 2anki's own | **v1** |
| **Show nearby lines only** (`windowed`) | hides one item; only the lines just before and after stay visible, the rest is dropped | behavior inspired by Glutanimate's `before`/`after` | **v1** |
| **Recitation** (`recitation`) | shows the previous lines and asks you to recall the next | behavior inspired by AnkiLPCG | **deferred** |

`show-all` and `windowed` are the **same N-note engine** — they differ only in how much surrounding context gets baked into each note's text (Glutanimate does this with `getBeforeStart`/`getAfterEnd` slicing). Offering both is nearly free once the fan-out exists; `windowed` defaults to 1 line before + 1 after, with the count knob deferred. `recitation` is deferred because it's a different card shape (front-context → reveal) on the **Basic** model, not cloze — a separate code path and a different gating story.

### Why N separate notes, not one

The obvious shortcut — one cloze note with `{{c1::a}} {{c2::b}} … {{cN::z}}` — is **study-broken**. Anki generates N cards from that one note, but they are *siblings*, and Anki buries new/review siblings by default: reviewing one card buries the rest until the next day, so the learner drills **one item per day**, defeating the feature. AnkiLPCG's own docs cite exactly this ("single-note-per-poem would create issues with sibling burying") as the reason it generates a series of unrelated notes. We follow LPCG: one note per item.

### Why no new note type

All three referenced add-ons ship a custom note type, but none of their reasons apply to us:

- **Glutanimate Cloze Overlapper** — type `Cloze (overlapping)` exists so users can **edit and regenerate the overlap inside Anki**, plus a "Full" reveal button.
- **anki_cloze_anything** — custom type + `cloze_anything.js` reimplements cloze in JavaScript (own `((c1::))` syntax) to grey out sibling clozes.
- **AnkiLPCG** — type `LPCG 1.0` is just Basic-with-a-`Context`-field; the windowed context is **baked into the field at generation time**, not computed by the template.

2anki regenerates every deck from the Notion source on each sync — we never edit-in-place inside Anki, so we don't need a type that stores regeneration state or a JS cloze engine. The lesson from LPCG: **windowing is a content decision, not a note-type decision.** We bake the chosen context into each note's text and use the existing Cloze model. (Adding a type wouldn't be exotic — 2anki already ships `n2aCloze`/`n2aBasic`/`n2aInput` — but no style here needs one; `recitation` would reuse the existing Basic model.)

## Licensing — reimplement, copy nothing

We studied the three add-ons for *behavior*; we do **not** copy their code. 2anki/server is **MIT**. Verbatim reuse is gated by their licenses:

| Project | License | Verbatim copy into 2anki? |
| --- | --- | --- |
| Glutanimate cloze-overlapper | **AGPLv3 + Section 7 additional terms** | **No** — copyleft and network-viral (AGPL targets SaaS); extra terms on top |
| AnkiLPCG | **GPL-3.0** | **No** — copyleft; would force the combined work off MIT |
| anki_cloze_anything | **Apache-2.0** | Permitted with attribution — but it's the JS/sibling design we rejected, so we don't use it |

Licenses protect specific code, not ideas or algorithms. "Show k lines either side" and "show prior lines, recall the next" are behaviors we reimplement from scratch. **v1 ships zero third-party code.** If we ever vendor the Apache-2.0 file, it must keep its `LICENSE`/`NOTICE` and a changes note — but that is explicitly out of scope here.

## Scope

**In:**
- One new card option `overlapping-cloze` (string: `off` | `show-all` | `windowed`, default `off`), gated behind `cloze: true`.
- Behavior: a note whose answer is a `<ul>`/`<ol>` of ≥2 items → **N separate cloze notes**, note *i* hiding item *i* with the chosen context baked in. One cloze per note → no sibling burying.
- `windowed` fixed at 1 line before + 1 after.
- Reuses the existing Cloze model; works on Notion toggle/list content.
- A docs page with a worked example (Pledge of Allegiance / a short poem) showing both styles.
- A changelog entry.

**Out (explicit — do not build in v1):**
- **Recitation style** (`recitation`) — Basic-model, front-context → reveal. Deferred to a follow-up; the picker is built so adding it is additive.
- **Configurable window count.** `windowed` is fixed at 1±1; the before/after number knob is deferred (a content tweak, no type/schema change).
- No "full text" reveal field/button (Glutanimate's `Full`) — we don't edit-in-place.
- No prose/paragraph splitting — a list item is the unit.
- No emoji trigger (considered and rejected in the issue thread).
- No new Anki note type, no Settings migration (the Settings `payload` is an opaque JSON blob; reuse `clozeModelName`).
- No copied third-party code (see *Licensing*).

## Design

The control lives in the **Card types** group of `CardOptionsForm`, right after **Cloze**. It is a small style picker (radio or select), not a bare checkbox — there is precedent for a string-valued card option in `toggleMode`.

- **Heading:** Overlapping cloze for lists
- **Helper:** Turn a list into a set of cards that hide one item at a time. Best for ordered things like steps or poem lines.
- **Options:**
  - **Off** — default.
  - **Show the whole list** — *Each card hides one item; the rest stays visible as context.*
  - **Show nearby lines only** — *Each card hides one item; only the lines just before and after stay visible.*
- **Dependency:** the picker is disabled when Cloze is off, with helper *Turn on Cloze deletion cards first*.
- **Edge state:** a list shorter than 2 items produces one normal cloze card, no message.

The heading is anchored to *lists* so a non-expert understands when it fires; "overlapping cloze" is the term the requesting users already use. **The picker UI is a new control type for this form — it needs a designer pass and a browser check at `/implement`.**

## Implementation sketch

Fan one list-note out into N cloze notes, each through the existing Cloze model. The `basicReversed` path in `DeckParser.ts:658-664` already pushes extra `Note`s from one source card — that is the precedent to mirror.

| File | Change |
| --- | --- |
| `src/lib/parser/Settings/CardOption.ts` | Declare + parse `overlapping-cloze` as a string (mirror `toggleMode`); default `off` in `LoadDefaultOptions`. |
| `web/src/components/CardOptionsForm/CardOptionsForm.tsx` | Add the style picker to the `Card types` group; disable when `cloze` is false. |
| `src/lib/parser/helpers/handleOverlappingCloze.ts` *(new)* | Pure helper: `(items: string[], style: 'show-all' \| 'windowed') => string[]` returning N note bodies, item *i* wrapped `{{c1::…}}` and the rest rendered per style (full list, or 1±1 window). Clean reimplementation — no copied code. Colocated `*.test.ts`. |
| `src/lib/parser/DeckParser.ts` | In `processPayload`, when the style ≠ `off` and the answer is a list of ≥2 items, build N cloze `Note`s from the helper output and push them in place of the single note — mirroring the `basicReversed` fan-out at `658-664`. Each note uses `clozeModelName`. |
| docs + changelog | New `cards/overlapping-cloze` doc page (+ `sidebar.ts`) and a changelog JSON entry. |

## Risks

1. **Sibling burying (the trap).** Do **not** collapse items into one `{{c1}}…{{cN}}` note — Anki buries siblings by default and the learner would see one card per day. One cloze per note is the whole point; a test must assert N notes out, each with exactly one cloze index.
2. **Shared hot path.** `handleClozeDeletions` builds *every* cloze card (`<code>`→cloze numbering, KaTeX, already-numbered passthrough). Keep overlapping logic in a **separate** helper selected by the style in `DeckParser` — never branch inside `handleClozeDeletions`.
3. **List detection is the spike.** By the time `processPayload` runs, `extractCardsFromLists` has flattened `<li>`s into independent notes. The list structure must be captured earlier or re-parsed from the note's answer HTML. **Prototype this first** — it determines whether the fan-out is viable as written.
4. **Collision with existing cloze markup.** If a note already contains `{{c::}}` or `<code>` cloze spans, defer to the existing path untouched so the two flows never fight over the same note.

## Docs (required this PR)

Add `web/src/pages/DocsPage/content/cards/overlapping-cloze.md`, registered in `sidebar.ts` under **Make better cards**. Worked example: a Notion toggle titled *Pledge of Allegiance* whose children are a bulleted list of its lines; turn on Cloze, pick a style, and download a deck of one card per line. Show what *Show the whole list* vs *Show nearby lines only* each produce. Follow VOICE.md — sentence-case headings, no implementation detail.

## Measuring success

- **Primary:** first-review success rate on decks built with a style selected tracks standard cloze decks → the generated cards render and study correctly.
- **Secondary:** count of decks per week with `overlapping-cloze` ≠ `off`, split by style (tells us whether the windowed/show-all pick is worth keeping or collapsing).

## Naming note

The styles ship under the issue's "overlapping cloze" name because that's what users ask for, and the list-anchored heading keeps it honest. `show-all` is technically *incremental* cloze; `windowed` is the true overlap. Both reuse one engine; `recitation` (LPCG-style) is the deferred third style and slots into the same picker with no type or schema change.

## Goal alignment

Simpler/faster/more beautiful: turns a list into a study-ready set of order-drilling cards in one click, in the layout the user already prefers, no manual cloze markup. Scale: pure opt-in, default off, no new infra, migration, or third-party code — zero cost to the 99% who don't use it, real value for the sequence-memorizers who've asked since 2020.

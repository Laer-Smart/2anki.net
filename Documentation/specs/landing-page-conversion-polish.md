# Spec: Landing-page conversion polish (titles, meta, and Anki proof section)

**Status:** draft · **Type:** `feat:` · **Workstream:** SEO recovery (existing pages only)

## Problem

GSC shows our format landing pages appear for queries but earn ~0 clicks, and unbranded discovery is shrinking. Two gaps:

1. **Titles/meta don't lead with the moat.** Current `<title>`/description copy describes mechanics ("turn your notes into flashcards", "no add-on required") but never states the one thing competitors can't promise: the deck *works correctly in Anki*. A learner scanning a SERP can't tell us apart from a scraper that produces broken decks.
2. **No on-page proof of fidelity.** Once a user lands, nothing shows that cloze stays clickable, images render, tags apply, and note types come out right. The `LandingCopy` type already has an optional `whatComesAcross` field, but only 3 marketing variants (usmle, nursing, medical-lecture-slides) and `ankiToNotion` populate it. None of the seven `/convert/*` format pages, and none of notion/quizlet/markdown/pdf, carry a fidelity proof block.

We are not winning the click, and when we do win it we don't earn the trust.

## Recommendation

Do two tightly-scoped things across the existing format pages — **no new pages, no homepage changes.**

### (a) Rewrite `<title>` + meta description to match head query, fidelity-first

For each format page, the `<title>` leads with the exact "<X> to Anki" head query, then states fidelity as the payoff. Sentence/Title-case per existing pattern, keep the `| 2anki` suffix, keep under ~60 chars for the title and ~155 for the description. Per VOICE.md: understated, specific, no fake warmth, no exclamation. Recommended copy (the implementer applies these verbatim unless a length check forces a trim):

| Page | New `<title>` | New description (lead with fidelity) |
| --- | --- | --- |
| `/convert/notion-to-anki` & `/notion-to-anki` | Notion to Anki — decks that open clean in Anki \| 2anki | Convert any Notion page to an Anki deck that opens clean — cloze stays clickable, images render, toggles become cards. Paste a link, get a .apkg. |
| `/convert/pdf-to-anki` & `/pdf-to-anki` | PDF to Anki — flashcards that work in Anki \| 2anki | Turn a PDF into an Anki deck that imports clean — correct note types, images embedded, headings as decks. Drop a file, get a .apkg. |
| `/convert/markdown-to-anki` & `/markdown-to-anki` | Markdown to Anki — decks that open clean in Anki \| 2anki | Convert Markdown or Obsidian notes to an Anki deck that opens clean — code blocks intact, cloze clickable, bullets become cards. |
| `/convert/csv-to-anki` | CSV to Anki — spreadsheets to clean Anki decks \| 2anki | Import a CSV or Excel sheet as an Anki deck that opens clean — correct fields, tags applied, one row per card. |
| `/convert/html-to-anki` | HTML to Anki — web pages to clean Anki decks \| 2anki | Convert an HTML file to an Anki deck that opens clean — images embedded, tables row by row, headings as decks. |
| `/quizlet-to-anki` | Quizlet to Anki — sets that open clean in Anki \| 2anki | Move a Quizlet set into an Anki deck that opens clean — correct fields, no copy-paste. Upload your export, get a .apkg. |

`apkg-to-csv` and `notion-tables-to-anki` keep their current titles — fidelity-in-Anki isn't the promise for an export-out page or a niche table page; rewriting them dilutes the moat message. Leave them as-is.

### (b) Add one reusable "What you actually get in Anki" proof section to every format page

Reuse the existing `whatComesAcross` mechanism rather than inventing a new component — the type, the render slot in `LandingPage.tsx`, and the prerender path already exist. Define one shared `ankiFidelityProof: WhatComesAcrossItem[]` constant and attach it to every format `LandingCopy` that doesn't already set `whatComesAcross`. Four items, each one fidelity claim stated as a result, VOICE-compliant:

- **Cloze deletions stay clickable** — `{{c1::...}}` becomes a real Anki cloze card, not plain text.
- **Images render in the card** — embedded images come across and display on front or back.
- **Tags carry over** — strikethrough (Notion) or a tag column (CSV) attaches to every card in the deck.
- **Correct note types** — Basic, Cloze, and front/back map to the right Anki note type so import is clean.

Rename the on-page section label from "What comes across" to **"What you actually get in Anki"** in `LandingPage.tsx` so the proof reads as the fidelity guarantee, not a feature list. (Existing pages using `whatComesAcross` for marketing variants inherit the new label — acceptable; their items already describe Anki output.)

Optional visual lift, in scope only if it's a CSS-only change to the existing `whatComesAcross` block: small inline check glyph before each item. No new images required for v1 — copy carries the proof. (See "Images" below for the v2 escalation path.)

### Preview route — not warranted

Per the repo's visual-direction rule, a `/dev/<surface>-preview` route exists to resolve a *disagreement on visual direction*. There is no disagreement here: we are reusing an existing, already-rendered section with new copy and a relabel. Skip the preview route. If the implementer decides to add proof *images* (v2), that's a genuine visual direction and a preview route becomes warranted at that point — flag it then.

## What NOT to build

- **No new landing pages.** That's a separate workstream. Touch only the pages listed above.
- **No homepage / `/upload` / `/pricing` changes.** Separate workstream.
- **No new shared proof component.** Reuse `whatComesAcross` + `LandingPage.tsx`; do not introduce a parallel section.
- **No rewrite of `apkg-to-csv` or `notion-tables-to-anki` titles** — fidelity-in-Anki isn't their promise.
- **No proof images in v1.** Copy first; images are a measured v2.
- **No FAQ rewrites, no H1/subhead rewrites, no new routes, no JSON-LD changes.**
- **No changelog entry rationale debate** — titles/meta are SEO-facing, not in-app; the proof section is user-visible, so one `feature` changelog entry covers it.

## Shared files implementation will touch

- `web/src/pages/ConvertLandingPage/convertLandingConfig.ts` — title/description edits for 5 of 7 entries; attach `ankiFidelityProof` to all that lack `whatComesAcross`.
- `web/src/pages/LandingPage/copy/notion.ts`, `quizlet.ts`, `markdown.ts`, `pdf.ts` — title/description edits; attach the shared proof.
- `web/src/pages/LandingPage/LandingPage.tsx` — relabel the section to "What you actually get in Anki"; optional CSS-only check glyph.
- `web/src/pages/LandingPage/LandingPage.module.css` — only if the optional glyph lands.
- A new shared constant for the proof items — colocate in `web/src/pages/LandingPage/types.ts` or a small `web/src/pages/LandingPage/copy/ankiFidelityProof.ts`; import from both copy families. (Third occurrence rule: the proof now appears on ~10 pages, so a shared constant is justified, not premature.)
- Tests: extend `LandingPage.test.tsx`, `ConvertLandingPage.test.tsx`, and `web/scripts/prerenderLandingPages.test.ts` to assert the new titles and the proof section.

**Prerender note (load-bearing):** `web/scripts/prerenderLandingPages.ts` injects only head meta + a hero fragment into static HTML; the `whatComesAcross` body renders client-side via React. New titles/descriptions flow into prerendered HTML automatically (good for SEO). The proof section will NOT be in the prerendered HTML — it appears after hydration. That's acceptable for conversion (real users see it) but means the proof copy is not itself crawlable. If we later want the proof crawlable, extend `buildHeroFragment` — out of scope for v1, note it for the implementer.

## Acceptance

- Each of the 6 listed pages serves the new `<title>` and description (verify in prerendered HTML under `web/build/<slug>/index.html` after `pnpm --filter 2anki-web build`).
- Every format page (the 6 above + csv/html already covered by the table) renders the 4-item "What you actually get in Anki" section after hydration.
- `apkg-to-csv` and `notion-tables-to-anki` titles unchanged.
- `/check` green; one `feature` changelog entry; browser check at 375px.

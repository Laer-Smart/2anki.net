# Spec: EPUB and Kindle highlights to vocab deck

**Outcome**: Readers who highlight passages on an e-reader can drop the source file on 2anki and walk away with a usable vocab deck in the same session. Target: lift first-week deck downloads from new uploaders by 5% within 60 days of ship.
**Goal alignment**: Multi-source ingestion is the moat. Adding EPUB and Kindle highlights opens a wedge no other Anki converter handles in one shot, and pulls in language learners and certification readers — two of the highest-retention segments toward the 300K mark.
**Leading indicator**: Successful first-card-review rate on decks tagged `source=epub` or `source=kindle-clippings`. We're not chasing volume — we want the cards to actually be reviewed.

## Problem

Readers highlight passages in EPUB and Kindle but the path to Anki is fragmented. The current stack a serious reader is asked to assemble — a third-party reader plugin, KOReader on the side, Termux for the export, and manual field mapping after the fact — is brittle, and the book title routinely lands in the wrong field. Two r/Anki threads in the last 30 days described exactly this workflow as the reason the user gave up on building vocab cards at all. They want to drop a file and get cards.

## Riskiest assumption

Highlight passages, mapped as-is to the back of a card with book attribution, are usable for spaced repetition without an auto-defined word. If users open the import in Anki and find the cards unreadable because the "word" field is the whole sentence, they won't review and won't come back.

**Smallest test**: Ship v1 with `word = highlighted passage` (see below), tag those decks `source=epub`, and watch first-card-review rate over the first 14 days. If it lands below the baseline for HTML uploads, v2 adds an "extract the word" affordance before we invest in auto-define.

## Goal (one line)

Drop an `.epub` or a Kindle `My Clippings.txt` on the existing converter, get a downloadable `.apkg` of vocab cards back — same session, same upload surface, no new plan tier.

## What ships

**Upload surface.** The existing `/upload` drag-and-drop accepts `.epub` and `My Clippings.txt` alongside today's formats. EPUB is detected by file extension; Kindle clippings by filename (`My Clippings.txt`, case-insensitive) and a header-line shape check on first read.

**Parsers.**
- EPUB: an EPUB is a zip of XHTML. Reuse `src/lib/zip` helpers (entry-name validation already there per Sonar S5042) to walk the archive, pull `<span epub:type="annotation">` / `<aside epub:type="annotation">` blocks first, then fall back to plain `.opf`-spine extraction when no annotations are tagged. Reuse the existing HTML parser to strip markup.
- Kindle clippings: a single text file with `==========`-delimited entries. One regex split, then a parser per entry extracting `book title`, `author`, `highlight text`, and the date. No new dependency.

**Field mapping.** Vocab cards have a stable schema: `word`, `sentence`, `book`, `definition`. The shape feeds straight into the field-mapping panel already shipped in PRs #2631 and #2637 — same UI, new card type registered in `ParserRules`. No new component.

**Card template (v1, opinionated).**
- Front: the highlighted passage (the `sentence`).
- Back: book title and author (the `book` field), with `word` and `definition` shown if filled.
- `word` defaults to the full highlighted passage. We deliberately do **not** try to auto-extract the word from the sentence in v1 — that's where the existing toolchains break, and getting it subtly wrong is worse than not doing it. The mapping panel lets the user override `word` per row before download if they want a single-word front.

Why: the reader chose to highlight that passage for a reason. Reproducing the passage as the card front respects that choice; the book attribution makes the card legible weeks later. Anything cleverer is v2, gated on whether the riskiest assumption holds.

**Images.** EPUB images already inline through the existing pipeline. No new work; just call this out so the engineer doesn't re-implement extraction.

**Deck naming.** The first parsed book title becomes the deck name. If multiple books are present in `My Clippings.txt`, one sub-deck per book under a parent deck named after the file.

## What we are NOT doing

- No auto-translate. v2 follow-up if v1 ships and the first-card-review rate clears the bar.
- No auto-define. Same gating logic.
- No DRM-protected Kindle containers (`.azw`, `.kfx`). The user must export to `My Clippings.txt` themselves. Stated plainly in the upload helper text.
- No bulk reorganization of existing decks on the user's account.
- No new pricing tier or quota change. EPUB uploads count against the existing monthly limit.

## Acceptance criteria

- [ ] Fixture `tests/fixtures/epub/sample-with-annotations.epub` produces an `.apkg` whose import in Anki Desktop shows the expected N cards with `sentence`, `book`, `author` populated, and `word == sentence` by default.
- [ ] Fixture `tests/fixtures/kindle/My Clippings.txt` (multi-book) produces a parent deck plus one sub-deck per book, with cards in each.
- [ ] Field-mapping panel renders the four-field schema and lets the user reassign columns before download.
- [ ] Upload helper text on the dropzone reads: `EPUB, Kindle My Clippings.txt, .zip, .html, .md, .csv, .apkg`. No marketing.
- [ ] Browser check per `.claude/rules/browser-attestation.md`: golden path on `localhost:3000`, no console errors at 375px.
- [ ] Server tsc + Jest pass; web typecheck + Vitest pass. Tests for the EPUB walker and the clippings parser are colocated.
- [ ] Decks created via this path carry a `source` tag (`source=epub` or `source=kindle-clippings`) so the leading indicator can be measured.

## Reuse note

This is greenfield-friendly because the heavy lifting already exists:
- `src/lib/zip` — entry-name validation and extraction helpers.
- `src/lib/parser` — HTML parsing, image inlining, deck assembly, `.apkg` export.
- `web/src/components/CardOptionsForm/FieldMappingPanel.tsx` — the field-mapping UI built for multi-info Notion cards and the AI converter.
- `src/routes` → `controllers` → `usecases` → `services` → `data_layer` is the request path the upload already takes; this spec adds a new parser at the service layer and a new card-type entry in `ParserRules`. No new layer.

Engineering review put this at M (3–5 days). Most of that is the clippings-format edge cases (Kindle locales) and the EPUB annotation-vs-fallback branching; the apkg export path is unchanged.

## Open questions

1. **Word vs sentence on the front.** v1 ships with `word = highlighted passage` as above. If first-card-review rate underperforms, v2 adds a one-click "extract the word" affordance in the mapping panel. Confirm we're comfortable shipping that as the v1 default.
2. **Kobo and Apple Books markup.** Both use `epub:type="annotation"` but with different wrapper elements. v1 reads any annotation tag; in v2 we may need explicit per-vendor heuristics if a fixture from either fails the round-trip. Defer per-vendor work until a real upload fails.
3. **`My Clippings.txt` locale stability.** The header line format ("Your Highlight on page X") differs by Kindle UI language. v1 supports English; the parser logs and skips non-English entries rather than failing the upload. Question: do we want to ship a follow-up that handles at least DE/ES/FR clippings, or wait for a request?
4. **Tagging.** Confirm `source=epub` / `source=kindle-clippings` is the right tag shape for the analytics pipeline that feeds the leading indicator, or whether the existing event-logging tag scheme uses a different key.

## Out of scope (next iteration)

- Auto-translate via the AI converter pipeline.
- Auto-define via the AI converter pipeline.
- Single-word extraction from the highlighted passage.
- Kobo `.kepub` and Apple Books `.epub` vendor-specific quirks.
- Non-English `My Clippings.txt` locales.
- DRM containers (`.azw`, `.kfx`).

# Flexible source interpretation for PPTX and free-form notes

## Problem

Users drop in study material the way it actually exists on their disk: a slide deck with sparse bullets and dense speaker notes, a lecture export with inconsistent heading levels, a "notes" page that mixes outline, paragraphs, and an embedded table. The conversion path accepts these formats already (PPTX via `web/src/pages/UploadPage/helpers/getAcceptedContentTypes.ts` and `src/lib/zip/zip.tsx`, with the Google Slides → PPTX route shipped in PR #2311), but the AI step assumes the input is pre-organized — one concept per slide, a clear toggle hierarchy, headings that mean what they say.

External review (May 2026) named this directly:

> The tool should ideally work smoothly with pages or files dropped into the system, including PowerPoint files and other study materials. At present, the original PPTX or notes may need to be pre-organized for the system to generate useful flashcards. … The current output can feel as though the AI independently decides what to ask and then compiles cards without enough user-directed control.

Two failure modes follow: cards come out too sparse (the AI only saw bullet headers, missed the speaker notes), or the AI invents structure that wasn't there and the user can't tell which cards came from which slide. Issue #1150 ("slides2anki — convert any presentation file") has tracked the surface for years without a fix to the interpretation step.

This is a prep-work tax: the user has to clean up their PPTX before upload to get usable cards. Removing that tax makes the product **simpler** (drop in what you have, not what the AI prefers) and **faster** (no manual re-outlining before each upload).

## Goal

A PPTX or unstructured notes export dropped in as-is produces cards that cover the same ground the source covers — slide titles, bullets, **and** speaker notes — without the user pre-organizing the file. The user sees which span of the source each card came from, so they can trust or reject the AI's interpretation.

Success looks like: a real lecture deck (sparse slides, rich notes, mixed heading depth) converted without edits, where card count tracks the actual content density and each card cites a slide number or note range.

## Non-goals

- Not a style picker. Tone, card length, and question phrasing are already covered by `userInstructions` (A3, shipped) and the open specs #2616 / #2617 / #2618 — this spec is orthogonal to those.
- Not an editor. We are not building in-app PPTX editing or pre-upload cleanup UI.
- Not new format support. PPTX is already accepted; this is about interpreting what we already ingest.
- Not a redesign of the upload flow. The drop target stays as it is.

## Proposed shape

**Pick (b): a deterministic pre-pass that normalises raw PPTX (and free-form notes) into a structured intermediate before the AI sees it.**

Why not (a) "just write a better prompt": the AI is currently asked to do two jobs at once — parse the source's structure *and* generate cards. When the source is messy, it does the first job badly and the second job blindly. A better prompt papers over the symptom; the structural ambiguity is still there on every call, and we pay for it in tokens and in card quality.

The pre-pass extracts a single intermediate shape per upload — a list of source units, each with: a stable ID (slide number, heading path, or note offset), the visible text, any speaker-notes text, and an inferred role (title / bullet / body / note / table). The AI then receives this structured list and is asked one job: turn each unit into 0..N cards, returning the source unit ID with each card. We already do similar normalisation for Notion exports in `src/lib/parser/`; this extends the pattern to PPTX and to free-form notes, where today the AI sees raw text and has to guess.

Two concrete user-visible wins fall out of the structured intermediate:

1. **Coverage is auditable.** Each generated card carries the source unit ID. The result screen can show "12 cards from 8 slides; slide 4 produced 3 cards, slide 7 produced 0 — review?" — surfacing the gaps the AI made instead of hiding them.
2. **User direction has a place to land.** The user can mark a unit "skip" or "emphasize" before generation, because units are addressable. This is the hook the reviewer is asking for ("not enough user-directed control") without inventing a new editor surface — it slots into the existing post-upload settings step.

Scope of the pre-pass:

- **PPTX**: parse `ppt/slides/slide*.xml` and `ppt/notesSlides/notesSlide*.xml` together; emit one unit per slide with notes attached. Tables get their own unit per row pair. Pure-image slides emit a unit with role `image` and an alt-text placeholder.
- **Free-form notes** (markdown, HTML, plain text dropped in): emit one unit per heading section, with body text and embedded lists preserved.
- **Notion**: no change — the existing parser already produces a structured representation; the AI step reads the same intermediate shape.

The AI call signature changes from "here's a blob, make cards" to "here's a list of units, make cards per unit and cite the unit ID." Card count is no longer a global hint; it is a per-unit decision the AI makes and explains.

## Open questions

- **Speaker-notes weighting.** Some decks have empty notes; some have a 500-word essay per slide. Do we cap notes input per slide before the AI sees it, or let the AI decide? Capping risks losing density; not capping risks token cost on a 200-slide deck.
- **Table handling.** A vocab/fact table is the easiest card source in the deck. Should we generate cards directly from table rows without the AI (deterministic), or always go through the AI (consistent)?
- **Reveal the intermediate?** Showing the user "we found 47 units in your file" before generation is honest but adds a step. Cheap win or friction?
- **Backfill for existing uploads.** Users who hit "regenerate" on an old upload — do they get the new pipeline automatically, or only on new uploads?
- **Cost ceiling.** A 200-slide deck with rich notes could 3× the token bill per conversion. Do we cap at a unit count, batch the AI call, or absorb the cost?

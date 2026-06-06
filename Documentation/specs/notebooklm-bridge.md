# Spec: NotebookLM-to-Anki paste-in bridge

Tracks #2933. NotebookLM produces well-regarded cards but has no clean Anki export and Google ships no public API; the only DOM-scrape path is blocked by an iframe sandbox. The shippable wedge today is a manual paste-in: a new front door to the existing `.apkg` pipeline, not a new product.

## Problem

NotebookLM users praise the card quality but cannot get those cards into Anki without a clean export. If Google ships native `.apkg` export, that audience moves overnight. A paste-in bridge captures them before Google does, and turns Google's missing export into a 2anki funnel. See #2933.

## Proposal

A page at `/notebooklm`:

1. User copies their generated flashcards out of NotebookLM (select all → copy).
2. Pastes the clipboard string into a textarea on `/notebooklm`.
3. Picks a format radio — *basic* (Q/A pair) or *cloze*.
4. Types a deck title, clicks Convert.
5. Server parses the pasted string into `Array<{ front: string; back: string; type: 'basic' | 'cloze' }>`, hands the parsed cards to the existing `.apkg` writer, returns the deck on the existing result page.

The parser is the only genuinely new code. The result page, download, and error handling reuse what already exists. Treat the clipboard string as untrusted user input even though the source is trusted — sanitize at the boundary with `sanitize-html` and the project allowlist.

## Resolve before parser work (blocking)

The parser's regex cannot be written until we have a real sample. **Capture an actual NotebookLM clipboard payload into a fixture first** (`src/lib/parser/notebooklm/__fixtures__/`). Until then, the parser shape is a guess. v1 defaults, all overridable once the fixture lands:

- **Customisation:** paste-in alone; no Q/A editor in v1.
- **Marketing surface:** none at launch. Instrument the `/notebooklm` route; let r/AnkiAi pickup drive traffic; decide on promotion from data.
- **Parser layout:** `src/lib/parser/notebooklm/` subfolder (alongside `guessMarkdownCards.ts`'s neighbours).
- **Cloze detection:** honour the radio choice for v1; do not auto-detect `{{c1::...}}` yet.

## Scope

- `/notebooklm` page: textarea, format radio, deck-title field, Convert.
- New parser: NotebookLM clipboard string → `Array<{ front, back, type }>`, fixture-driven.
- Sanitize parsed fields at the boundary.
- Hand parsed cards to the existing `.apkg` writer; reuse the existing result/download/error UI.
- Route instrumentation for the success metric.

## Explicitly NOT in scope

- A browser extension / DOM scraper (deferred — iframe sandbox makes it fragile; revisit only if paste-in volume justifies it).
- Google OAuth + a NotebookLM API integration (blocked — no public API; reopen if Google ships one).
- A 2anki-side generator that replaces NotebookLM's — that loses the wedge ("you trust their quality, we move the cards").
- A NotebookLM-specific paid tier (same pricing as the rest of 2anki).
- Auto-tagging from topic labels, deck merging, a landing-page banner pointing all visitors here.
- A Q/A editor (follow-on only).

## Touch points

- `web/src/` — new `/notebooklm` page; register the route in `web/src/App.tsx` (shared file — flag in any parallel batch).
- `src/lib/parser/notebooklm/` — new parser + fixture.
- Existing `.apkg` writer and upload result/download path — reused, not rewritten.

## Risks / Rails

- **Clipboard shape is unknown** — the single biggest risk. No regex before a captured fixture; otherwise we ship a parser that matches nothing real.
- **Untrusted input** — pasted text is user input; sanitize with the project allowlist; never disable it because "NotebookLM is trusted" (CWE-79).
- **Wedge may miss** — success is `N` conversions/week within 60 days (N pre-picked). Below `N/4` at 60 days → pull the route. Instrument from day one so the call is data-backed.
- **No flag gating** — ship `/notebooklm` as the unconditional default; do not hide it behind a `*_ENABLED` env switch.

## Acceptance criteria

- A real NotebookLM clipboard sample is captured as a fixture before parser code is written.
- Pasting that sample on `/notebooklm`, choosing a format and title, produces a downloadable `.apkg` whose cards match the pasted Q/A pairs.
- Parsed fields are sanitized; a paste containing markup does not inject into the output.
- The `/notebooklm` route emits an instrumentation event per conversion so the 60-day success metric can be read.
- Parser unit tests cover the fixture shape, an empty paste, and a malformed paste (graceful "couldn't read these cards" message, not a crash).

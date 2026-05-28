# NotebookLM-to-Anki paste-in bridge

## Problem

From r/AnkiAi, two posts shape the wedge.

u/EthanForvest, replying to a request for a NotebookLM-to-Anki path, said they spent *"more than 20 hours"* trying to scrape NotebookLM and hit a dead end — Google's flashcards panel renders inside an iframe sandbox that blocks DOM access from extensions. u/Mussab1 (the OP, post `1nmuuww`) framed the product gap directly: NotebookLM *"lacks customisation after it already generated"* the cards. In a separate thread (`1oqm7qp`), u/Fast_Ebb_3502 said *"I can't get it to produce more than 80 cards so it keeps on excluding info"* — yet the same thread praises the cards NotebookLM does generate.

NotebookLM is the biggest platform threat in the Reddit safari. The card quality is already there; the only things keeping users on the fence are the 80-card cap and the absence of a clean Anki export. If Google ships native `.apkg` export, market share moves overnight. A 2anki bridge captures that audience *before* Google does it themselves — and turns Google's missing export into our funnel.

NotebookLM users today have great cards trapped behind a Google iframe. We move them out in under a minute.

## Goal

A NotebookLM user can get their generated cards into Anki via 2anki in under 60 seconds, without any browser extension, OAuth flow, or scraping.

## Approach

Pick one shape, ship it, defer the rest.

### Primary — ship this

A paste-in surface at `/notebooklm`. The flow:

1. User opens NotebookLM, opens the generated flashcards panel.
2. User selects all the visible cards and copies to clipboard (Ctrl/Cmd+A → Ctrl/Cmd+C inside the panel).
3. User opens `2anki.net/notebooklm`, pastes into a textarea.
4. User picks format: *each Q/A pair as a basic card* or *each pair as cloze*.
5. User types a deck title, clicks Convert.
6. Server parses the clipboard string, hands the parsed cards to the existing `.apkg` pipeline, returns the deck.

Server-side: a new parser detects the NotebookLM clipboard shape (likely numbered or `Q:` / `A:` prefixed pairs — the exact shape is unknown until /implement, see Open questions). The parser emits `{front, back, type: 'basic' | 'cloze'}[]` and the existing apkg writer takes it from there.

### Deferred — browser extension

A Chrome/Firefox extension that scrapes NotebookLM's DOM. EthanForvest's 20-hour dead-end story makes this expensive; the iframe sandbox makes it fragile. Revisit only if paste-in volume justifies the cost.

### Deferred — Google OAuth + NotebookLM API

Google does not expose a public NotebookLM API today (verify at /implement; if one has shipped, reopen this decision). Revisit when the API exists.

### Out of scope

Building a 2anki-side AI that *replaces* NotebookLM. The pitch is: you already trust NotebookLM's quality, we just move the cards. Rebuilding the generator would lose the wedge — Google is already better at that piece.

## Detection / parsing

- Parser location: `src/lib/parser/notebooklm/` (new subfolder) **or** a single helper inside `src/lib/parser/` — see Open questions for which way to land.
- Input: a clipboard string pasted by the user. Trusted to be UTF-8, untrusted on shape.
- Output: `Array<{ front: string; back: string; type: 'basic' | 'cloze' }>`.
- The format is **unknown until /implement**. Before parser work begins, capture a real NotebookLM clipboard sample (open NotebookLM, generate cards, paste into a `.txt` file in `src/lib/parser/__fixtures__/`). Document the actual shape in this spec — or in the FEATURE.md of the new parser — before writing regex.
- Sanitize at the boundary (`sanitize-html` with the project allowlist) before the strings reach the apkg writer. Treat the clipboard as user input even when the user trusts the source.

## UI shape

A dedicated `/notebooklm` page in the existing `web/` workspace.

- One textarea (large, multi-line) — placeholder copy: *"Paste your NotebookLM cards here"*.
- Format selector: radio buttons, *Basic* (default) and *Cloze*.
- Deck title input — single line, required.
- Convert button — primary.
- After conversion: reuse the existing download surface. Same `.apkg` pipeline, same download UX.

This is not a new product. It is a new front door to the existing one. The result page, the deck download, and the error handling all reuse what's already there.

## What NOT to build

- A browser extension (deferred above).
- A paid tier specifically for NotebookLM. The bridge is priced the same as the rest of 2anki — free conversions count against the existing limits.
- Auto-tagging from NotebookLM topic labels.
- Deck merging with the user's existing decks.
- OAuth into the user's Notion or Google account for this flow.
- A landing-page banner pointing every existing visitor at NotebookLM. Land it as a niche route first; promote based on signal.

## Success metric

`N` `/notebooklm` conversions per week within 60 days of launch, where `N` is hand-picked before launch versus the current zero. Bonus: at least one r/AnkiAi mention of the bridge by someone other than us.

If `/notebooklm` conversions are below `N/4` at the 60-day mark, the wedge missed; pull the route and revisit only when NotebookLM users surface in support traffic in larger numbers.

## Open questions

1. **Clipboard shape.** What does NotebookLM actually emit when a user copies the flashcards panel? Numbered list? `Q:` / `A:` pairs? JSON? Plain prose with newlines? Must be confirmed at /implement by capturing a real sample before any parser work — the spec is honest about not knowing this today.
2. **Customisation in this PR or deferred?** Mussab1's "lacks customisation" line points at *edit cards before convert*. Bundle a Q/A editor into this PR, or ship paste-in alone and address editing as a follow-on wedge? Default recommendation: ship paste-in alone, treat the editor as a separate spec — it is its own scope and the bridge ships faster without it.
3. **Marketing surface.** Promote `/notebooklm` from the landing page, the pricing page, the conversion page, or none? Default recommendation: none at launch — let r/AnkiAi pickup do the work, instrument the route, decide based on traffic.
4. **Parser layout.** New `src/lib/parser/notebooklm/` subfolder, or a single helper alongside `guessMarkdownCards.ts`? Default recommendation: subfolder, since the parser plus its fixture plus its `*.test.ts` will be at least three files and the existing `experimental/` and `canary/` folders set the precedent.
5. **Cloze detection.** Should the parser try to auto-detect cloze syntax (`{{c1::...}}`) in the pasted text, or always honour the user's radio choice? Default recommendation: honour the radio choice for the first ship; auto-detect is a follow-on if users ask for it.

# Spec: Detect Markdown-export uploads that produce empty decks and steer to HTML

## Problem

Notion's Markdown export flattens toggle blocks into prose and bullet lists. The 2anki parser keys off toggle structure, so a Markdown export of a page that *looks* full of study material lands as a deck with zero or one card. Today these uploads fail with the same generic `EMPTY_DECK_FAILURE_REASON` as any other empty deck — it tells the user to "wrap your key terms in toggles," but their key terms *are* already in toggles. They followed the right instructions and got a blank deck with no signal that the export format is the problem.

The shape repeats on r/notion2anki across years. A representative quote from u/PlentyReading3429: *"When I upload my 2anki file i only get 1 card from it. I just dont understand it anymore."* u/theo__05: *"every time just the first toggle of the notion Page was getting converted."* u/ElTutz found the workaround themselves and posted it: re-exporting as HTML fixed almost all of their conversion problems. The fix is known to power users and invisible to everyone else.

## Goal

When a Markdown upload yields an empty (or near-empty) deck, tell the user that Markdown exports drop toggles and that re-exporting the same Notion page as HTML will produce a working deck.

## What success looks like

- Markdown uploads (`.md`, or `.zip` whose entries are predominantly `.md`) that produce **≤1 card after parsing** return a new failure reason `markdown_likely_lossy` instead of `EMPTY_DECK_FAILURE_REASON`.
- The convert-failure modal renders a single sentence naming HTML export as the fix.
- A two-week look at jobs with the new reason vs. the historical "Markdown upload + empty deck" cohort shows users re-converting with HTML within 24 hours at a measurably higher rate than the current empty-deck cohort.
- Support inbox mentions of "only 1 card" / "back is blank" from Markdown uploads drop after ship.

## Approach

Detection happens **after parse**, not before — the parser is the truth, and a pre-upload sniff risks blocking valid edge cases (a Markdown file someone hand-wrote with the right shape).

1. `src/lib/parser/` records the upload's source format on the job result. Markdown path lives in `guessMarkdownCards.ts`; tag its output with `sourceFormat: 'markdown'`. Zip uploads inspect entries — if ≥80% of card-eligible entries are `.md`, treat the upload as Markdown-sourced.
2. `src/usecases/jobs/jobFailureReason.ts` gains a branch above the `EmptyDeckError` case: if the job is empty *and* `sourceFormat === 'markdown'`, return the new `MARKDOWN_LIKELY_LOSSY_REASON` string. Existing `EmptyDeckError` callers are unchanged; the branch is a strict refinement.
3. Add a `markdown_likely_lossy` member to whatever enum the convert-failure modal switches on (engineer to confirm the exact location — likely `web/src/components/convert/` or a shared error-code module). The modal renders the new copy with no other UI changes.
4. Tests: unit test for the new branch in `jobFailureReason.test.ts` (Markdown source + empty deck → new reason; HTML source + empty deck → existing reason). One outside-in test that runs a known-lossy Markdown export fixture through the parser and asserts the failure reason.

No new endpoints, no schema changes, no migrations. The source-format tag is in-memory on the job result; if persistence is needed later for analytics, a follow-up spec adds the column.

## What NOT to build

- **No pre-upload content sniff.** The parser is the truth — sniffing would mean two implementations of "what counts as a toggle" and risks false-positive rejections on legitimate hand-written Markdown.
- **No server-side Markdown-to-HTML conversion.** It would require Notion API access to the original page, which we don't have for arbitrary exports, and we'd be guessing at structure the user already lost.
- **No separate landing page for Markdown uploads.** One generic upload entry, one specific error message — splitting the upload surface adds friction for the 90% case to fix the 10% case.
- **No in-product "redo this export for me" assistant.** Out of scope; the user re-exports from Notion in two clicks once they know what to do.
- **No new error for "1 card looks lossy" on non-Markdown sources.** A 1-card HTML or PDF deck is plausibly correct; only the Markdown path gets this treatment.

## Copy

Exact user-facing string in the convert-failure modal:

> Notion Markdown exports flatten toggles — re-export this page as HTML and the toggles become flashcards.

This passes the VOICE.md "what happened + what to do" test: the first half states the cause (Markdown export flattens toggles), the em-dash leads to the action (re-export as HTML). Sentence case, no exclamation, no apology, specific to Notion (the named source), specific to the fix (HTML export). One line.

The corresponding constant lives next to `EMPTY_DECK_FAILURE_REASON` in `jobFailureReason.ts`.

## Open questions

1. Should the threshold be ≤1 card or ≤2 cards? A 2-card deck from a Markdown export is almost certainly also lossy, but it's a soft call. Engineer should pick one and note the rationale in the PR; we can tune from the data.
2. For zip uploads with mixed `.md` and `.html` entries, what ratio counts as "Markdown-sourced"? Proposal: ≥80% of card-eligible entries are `.md`. Open to a tighter or looser cut once the engineer sees the parser's actual entry distribution in fixtures.
3. Does the convert-email path render the same modal copy, or does the email use a shorter variant? Default: same string in both places to avoid drift; engineer flags if the email template can't fit one line of body copy.

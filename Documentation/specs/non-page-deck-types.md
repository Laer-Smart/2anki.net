# Spec: Wire up non-page deck types in the parser

Issue: #2239

## Problem

On `/rules`, deck-type selection used to expose many block types (`toggle`,
`heading_1/2/3`, `column_list`, `quote`, list items, `child_page`,
`child_database`, `database`). The parser only ever honoured `'page'` — every
other entry was silently dormant. During the Rules redesign the UI was simplified
to expose only `page` + `database` (one "Decks and sub-decks" card), and the
parser's `DECK_TYPE_ALLOWLIST` was tightened to `['page', 'database']`. A
migration normalised 443 of 6603 `parser_rules` rows (6.7%) that carried dormant
non-page entries down to `page,database` so behaviour wouldn't silently change.

The feature is **deferred by an explicit prior decision**: the designer
recommended merging Decks into Sub-decks for the redesign, and re-splitting them
needs a fresh design pass. Shipping the parser change without a UI affordance
would silently re-split those 443 users' decks. This spec documents the plan;
it does **not** override the deferral — implementation waits on a design pass.

## Proposal

When demand and a design pass justify it, re-enable non-page deck types as an
**explicit, opt-in** UI affordance, then teach the parser to honour them:

1. **UI** — bring back a deck-type chip group on `/rules` (the design pass decides
   whether it's a fourth grouped card or a re-split of Decks from Sub-decks). The
   default stays `page` + `database`; users opt back in to other types explicitly.
2. **ParserRules** — add a `deckTypes()` accessor and widen
   `DECK_TYPE_ALLOWLIST` to include the re-enabled types. Keep the
   unknown-type guard in `setDeckTypes`.
3. **BlockHandler** — in `findFlashcardsFromPage`, for each block whose type is in
   `DECK` but is not `page`/`database`/`child_page`, create a **top-level** deck
   from that block's children (mirror the existing `child_page` / `SUB_DECKS`
   traversal but write to the top-level decks array).
4. **Precedence** — when a block type is in both `DECK` and `FLASHCARD`, DECK
   wins, matching today's `child_page` behaviour.

## Scope (in)

- `ParserRules.deckTypes()` accessor + allowlist widening for re-enabled types.
- `findFlashcardsFromPage` traversal honouring non-page DECK entries as top-level
  decks, with the DECK-over-FLASHCARD precedence rule.
- The `/rules` chip group to set non-page deck types (default unchanged).
- Tests: deck-type traversal for each re-enabled type, the precedence rule, and a
  default-unchanged regression so the 443 migrated rows keep `page,database`.

## Explicitly NOT in scope

- Implementing ahead of the design pass — the re-split UI is a designer decision
  (recorded deferral in #2239). No parser change ships without the opt-in UI.
- Auto-migrating the 443 normalised rows back to their old types — they opt back
  in explicitly via the restored UI, never silently.
- Adding deck types beyond the dormant set the issue lists.

## Touch points

- `src/lib/parser/ParserRules.ts` — `deckTypes()`, `DECK_TYPE_ALLOWLIST`.
- `src/services/NotionService/BlockHandler/BlockHandler.ts` —
  `findFlashcardsFromPage` traversal.
- `web/src/pages/RulesPage/RulesPage.tsx` — restored deck-type chip group.
- New tests beside `ParserRules.ts` and `BlockHandler.ts`.

## Risks / Rails

- **Conversion hot path.** `findFlashcardsFromPage` is on the conversion path.
  The new branch must not add a second full traversal pass — reuse the existing
  loop structure; don't re-walk the block tree.
- **Silent behaviour change.** The 443-row precedent is the core rail: a parser
  change without the opt-in UI silently re-splits real users' decks. Ship UI and
  parser together, default unchanged. A default-unchanged regression test is
  mandatory.
- No auth/payments/migration surface. If the re-enabled set ever needs a data
  migration, that is a separate reviewed migration PR.

## Acceptance criteria

- With default rules (`page,database`), output decks are byte-identical to
  today — verified by a regression test covering the migrated-row default.
- With a non-page deck type opted in via the restored UI, a block of that type
  becomes a top-level deck sourced from its children.
- A type present in both DECK and FLASHCARD resolves as a deck (DECK wins).
- The `/rules` UI lets a user opt into non-page deck types and persists the
  selection; the design pass has signed off on the affordance.
- No change to conversion output for users who never touch the new UI.

# Spec: Per-column rules for Notion tables

Issue: #2452 (follow-up from #2445)

## Problem

Notion tables today follow one fixed contract (#2445): column 1 = front, column 2 = back, columns 3..N = an inline sub-table on the back. Learners with wider tables want columns 3+ to drive metadata — a column of topic labels becomes Anki tags, a column of subjects becomes deck names — instead of being dumped into the back body. There is no way to express that mapping.

## Prior trio deferral — restated and honored

The #2445 trio **deferred per-column rules out of v1 on purpose.** This spec does not overturn that; it sets up the work *for when the signal arrives*, and the implementation gate below must be satisfied before `/implement` runs. The deferral reasons, still binding:

- Tag inference from arbitrary cell text is noisy.
- The Rules schema must grow a per-column structure (not just the existing `flashcard_is` string list).
- No usage data yet justified the UX cost.

**Do not implement until at least one demand signal is recorded** (per the issue's "When to revisit"): support tickets asking how to tag cards from a column, survey responses from learners with 4+ column tables, or a measured gap where table cards land but expected tags/decks are missing. This spec is the draft that waits for that signal — it is a `/spec-draft-pr` artifact, not an `/implement`-ready ticket, until demand is logged in the PR thread.

## Proposal

When demand is confirmed, add an opt-in per-column mapping for columns 3+, defaulting to today's behavior so existing decks are unchanged.

- New `parser_rules.table_column_rules` JSON column, shaped `{ "3": "tag", "4": "deck_name" }`. Absent / unset → current inline-sub-table behavior for every column. Allowed values: `back_body` (default), `tag`, `deck_name`, `skip`.
- `tableRowsToCards` reads the rule per column index and dispatches: `back_body` keeps the sub-table cell, `tag` appends the cell text as a card tag (sanitized via the existing tag-parse helper), `deck_name` routes the card to a named subdeck, `skip` drops the cell.
- `/rules/:id` exposes a per-column dropdown for columns 3+ under the existing `Table` chip, with the four options. Columns 1 and 2 stay fixed (front/back).

Single-column tables (skipped today) are out of this spec — see below.

## Scope

- Knex migration adding `table_column_rules` (JSON, nullable) to `parser_rules`, then `pnpm kanel` regen.
- `src/lib/parser/ParserRules.ts` — new field, parse/serialize, safe default when absent.
- `src/services/NotionService/blocks/lists/BlockTable.tsx` — `tableRowsToCards` reads the per-column rule and dispatches.
- `web/src/pages/RulesPage/RulesPage.tsx` — per-column section under the `Table` chip.
- Tag values run through the existing tag sanitizer; deck names through the existing subdeck-name path.

## Explicitly NOT in scope

- Improving the 1-column table case (front-only cards / skip). The issue flags it as an opportunity; defer to a separate spec so this one stays one concern. Mention but do not build.
- Per-cell rules, regex extraction, or conditional mapping — far past current demand.
- Rules for columns 1 and 2 (they remain front/back by contract).
- Auto-detecting which column "should" be a tag. Explicit user choice only; no inference (the original noise concern).

## Touch points

- `migrations/` (new) + `src/data_layer/public/` (kanel-regenerated, do not hand-edit)
- `src/lib/parser/ParserRules.ts` (parser layer)
- `src/services/NotionService/blocks/lists/BlockTable.tsx` (Notion block layer)
- `web/src/pages/RulesPage/RulesPage.tsx` (web)

## Risks / Rails

- **Migration.** New nullable JSON column on `parser_rules`; must be backward compatible — existing rows read as "no per-column rules" and behave exactly as today. Route through `migration-reviewer` before flip-ready. Regenerate types with `pnpm kanel`; never hand-edit `src/data_layer/public/`.
- **Output regression.** The default path must be byte-identical to current behavior for any table without a configured rule. A characterization test on `tableRowsToCards` with no rules guards this.
- **Tag noise** (the original deferral reason) is mitigated by making mapping explicit and opt-in, not inferred. Sanitize tag values with the existing helper so cell text can't inject malformed tags.
- No auth / payments surface. Integration surface is the Notion table block shape only.

## Acceptance criteria

- A demand signal is recorded in the PR thread before `/implement` (the deferral gate).
- A table with no `table_column_rules` produces identical cards to today.
- A column mapped to `tag` adds the sanitized cell text as a card tag; `deck_name` routes to the named subdeck; `skip` drops the cell; `back_body` keeps current behavior.
- `/rules/:id` lets a user set per-column rules for columns 3+ under the `Table` chip, persisted across reloads.
- Migration is reversible and additive; `pnpm kanel` regen committed. `/check` green.

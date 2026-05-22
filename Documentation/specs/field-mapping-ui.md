# Field-mapping UI for multi-info cards

## Problem

External review (May 2026) flagged the gap directly: "A detailed field-mapping window is needed so the user can specify exactly which information should go into each card field, especially when multiple pieces of information need to be organized in a specific way on one card."

Today, when a Notion database has more than two columns or uses non-canonical names, the converter cannot guess which column is the front and which is the back. PR #2508 shipped the backend half of the fix — `inferColumnMapping` auto-detects canonical names, and when it cannot, the conversion throws a structured `NOTION_DATABASE_COLUMNS_AMBIGUOUS` error carrying the full column list (`err.columns`). The error surfaces to the user as a generic "Map columns manually" message in the failure toast, with no way to act on it. Users either rename their Notion columns to match our canonical list, fall back to single-column page conversion, or give up. That is rework the product is asking them to do, and it is the opposite of "drop something in, get a clean deck back."

## Goal

Let a Notion database user pick which column feeds which Anki field, in-product, in one pass, the first time the converter cannot guess. **Simpler:** the user does not rename Notion columns or rebuild a database; they map once and the converter remembers. **Faster:** no round-trip to support, no abandoned conversion. **More beautiful:** the failure becomes a guided step instead of a red toast.

This unblocks the most common multi-info shape — a Notion database with `Question`, `Answer`, plus extra columns the user wants on the back. Backend support already exists from #2508; this spec is the UI layer.

## Non-goals

- **Not** a generic note-type designer. Anki front/back is the only target field pair in v1. Mapping into custom note types with N user-defined fields stays out until v2.
- **Not** the chat "control board" mapping chat output to templates — that overlap is audited as item C11 and gets its own spec. The two will share design language (column → field row, preview pane) but not implementation. Coordinate when C11 lands; do not build a shared abstraction before then.
- **Not** issue #2500 (Notion H1/H2/H3 as fields) — that is page-export shape, not database shape, and needs a different backend.
- **Not** issue #2452 (per-column transformation rules) — v1 is column-to-field mapping only, no per-cell transforms.
- **Not** issue #1211 (extra-field card types) — that work is stale and depends on the note-type designer we are explicitly deferring.
- **Not** template `{{field}}` validation (#2329) — separate concern, separate spec.

## Proposed shape

**Entry point: modal triggered by the `NOTION_DATABASE_COLUMNS_AMBIGUOUS` error.** Not a settings-time editor. Reasons:

1. The user reaches the mapping screen at the exact moment they care about it — mid-conversion, with the database already loaded. A settings-time editor forces them to think about Anki internals before they have hit a problem.
2. The error path is already structured. The frontend already receives `code: 'NOTION_DATABASE_COLUMNS_AMBIGUOUS'` and `columns: string[]`; the modal is a pure UI change on top.
3. One entry point keeps the surface small. If a settings editor proves necessary, it lands later, hangs off the same mapping store, and reuses the same row component.

**The modal:**

- Header: "Map your columns" — short, sentence case, no period (per VOICE.md).
- Body: a two-row form, one per Anki field. Each row is `Front` / `Back` label + a select populated from `err.columns`. Default selection: `inferColumnMapping`'s best guess (which the backend already computes — return it in the error payload as `suggested: { frontField, backField }` so the modal does not re-run inference).
- Preview pane below the form: render the first row of the database with the chosen mapping applied, so the user sees a sample card before committing. Reuses the existing card-preview component.
- Primary action: "Convert with this mapping". Secondary: "Cancel".
- Persistence: on success, store the mapping per `notion_database_id` in the existing user settings table so the next conversion of the same database skips the modal. Schema change: add a `notion_database_mappings` jsonb column to `users` (or a sibling table if the row is hot — engineer to decide at implementation time).

**Backend changes required:**

- Extend the `NOTION_DATABASE_COLUMNS_AMBIGUOUS` error to include `suggested: { frontField?: string, backField?: string }` from `inferColumnMapping` so the modal can pre-select.
- Add a route to receive `{ notionDatabaseId, frontField, backField }` and persist it, then re-trigger conversion with the locator populated.
- Read the saved mapping on subsequent conversions before throwing — if a saved mapping exists for this `notion_database_id`, use it and skip the error.

**Why not a settings-time editor.** Two reasons beyond "smaller surface": (1) users do not browse a settings page hoping to map Notion columns — they map because something failed. (2) A settings editor implies a list of saved databases, which implies an index page, which is a feature on its own. The modal pattern keeps the work to the failure path where users already are.

## Open questions

1. **Mapping scope per user vs per upload.** Saved per `notion_database_id` is the obvious shape, but a user may have several Notion workspaces. Is `notion_database_id` globally unique across workspaces, or do we need `(workspace_id, database_id)` as the key? Engineer to confirm from `@notionhq/client` ID semantics before the migration.
2. **What happens when the database schema changes.** If the user adds or removes a column in Notion after saving a mapping, the saved column name may no longer exist. Behaviour: if the saved `frontField`/`backField` is missing from `columns`, re-throw `NOTION_DATABASE_COLUMNS_AMBIGUOUS` with the new column list and a `staleMapping: true` flag so the modal can show "Your saved mapping references a column that no longer exists — pick again."
3. **More than two fields.** The reviewer explicitly mentioned "multiple pieces of information…on one card." V1 ships front/back only. The data model should allow N field rows so v2 can extend without a migration — store as `{ fields: { front: 'Question', back: 'Answer' } }` jsonb, not as two columns.
4. **C11 overlap.** The chat control board needs the same row component (column/field → target). Land the modal first with a self-contained row; do not extract a shared component until C11 has shipped and the second use case has settled. Premature abstraction.
5. **Empty-column behaviour.** If the chosen front column is empty for a given row, do we skip the row, render an empty card, or surface a per-row warning? Default proposal: skip the row, count the skip in the conversion summary toast ("Converted 84 of 87 rows — 3 had no front content"). Confirm with the designer.

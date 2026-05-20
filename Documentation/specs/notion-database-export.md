# Notion database → Anki (one card per row)

**Issue:** #2502
**Status:** draft — demand gate not yet cleared (see below before `/implement`)

---

## Problem

The parser handles Notion pages only. Users who store vocab, drug lists, exam terms, or formula sheets in Notion **databases** cannot use 2anki today. `BlockHandler.ts:325-338` treats each database row as a sub-page and recurses into it — there is no row-as-card path.

---

## Audience

Language learners, medical students, exam-prep users. Workflow: Notion database → Term / Definition columns → `.apkg`. Two-field cards are the dominant shape.

---

## Demand gate (PM-required, blocks `/implement`)

Before engineering starts: scan 20 power-user Notion workspaces via Discord + support email for **explicit database-source asks**. Demote to backlog if fewer than 5 unprompted requests surface.

---

## Scope — v1 in

- New upload source `source=notion-database` on the existing `/api/upload` route. No new route.
- One card per database row. Default note type (Basic); overridable.
- Auto-infer front/back column from well-known names:
  - Front candidates: `Term`, `Word`, `Front`, `Question`, `Vocabulary`
  - Back candidates: `Definition`, `Meaning`, `Back`, `Answer`, `Translation`
- When auto-inferred: show one-line confirmation — "Mapped automatically — Term to Front, Definition to Back" + "Change mapping" link. No mapping screen.
- When ambiguous or user clicks "Change mapping": show the mapping UI (two dropdowns — Front, Back only).
- Default mapping is two fields (Front, Back). No Extra field by default.

## Scope — v1 out

- Inline Notion tables embedded in pages (issue #2452 — different surface, future infra-sharing opportunity).
- Multi-note-type selection at conversion time.
- Syncing/updating an existing deck from the same database.

---

## Touch points

| File | Change |
|---|---|
| `src/services/NotionService/NotionAPIWrapper.ts:257-298` | `queryDatabase` already returns rows — reuse as-is |
| `src/services/NotionService/BlockHandler/BlockHandler.ts:325-338` | Add row-as-card branch; existing page-recursion path must be untouched |
| `src/controllers/NotionController.ts:353-367` | Dispatch to new use case when `source=notion-database` |
| `src/usecases/` | New use case: iterate rows, apply column mapping, emit one note per row |
| `/api/upload` route | Accept `source=notion-database`; route to new controller branch |

New controller test: database ID with `source=notion-database` → new use case; page ID → existing use case. Both assertions in one test file.

---

## Measuring success

At 30 days post-launch:
- Conversion count where `source=notion-database` (absolute demand signal)
- % of those conversions that reach `.apkg` download without the user touching the mapping screen (target ≥ 80% — validates auto-infer quality)

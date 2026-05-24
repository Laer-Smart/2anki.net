# Database preview on the search results page

### Trio synthesis

- **PM:** Outcome is cutting database-conversion abandon rate to ≤50% of baseline within 30 days; before building, instrument abandon to confirm the blindfold (not mapping confusion) is the actual driver.
- **Designer:** New `/preview/database/:id` page, 960px surface, 50-row table, stats line shows `N rows · M columns · Front: X · Back: Y`, mapped columns marked with a `●` dot; preview is read-only — mapping picker stays on `/downloads`.
- **Engineer:** New `GET /api/notion/database/:id/preview` endpoint returning `{ title, columns, mapping, samples, rowCount }`; server runs `inferColumnMapping`; hard-cap `page_size = 10`; effort M (~6h).
- **Agreement:** Separate `/preview/database/:id` route, new endpoint, server-side inference, eye icon unhidden in `SearchObjectEntry`, no mapping picker on the preview itself.
- **Conflict:**
  - *Row count:* PM and Engineer say 10 (latency, cost), Designer says 50 (data density). Ship 10 in v1; revisit if usability testing shows 10 is too few to judge column quality.
  - *Inferred mapping display:* PM said "show all columns neutrally" (worry: API cost), Designer said "mark with a dot." Resolved toward Designer — inference runs once server-side, no extra API call, the dot is cheap. PM cost concern was based on a misread of the architecture.
  - *Ambiguous columns on preview:* Engineer suggested rendering the picker inline; Designer wants the picker to stay on `/downloads`. Resolved toward Designer — preview's job is visibility, conversion path keeps its single mapping moment.
- **Resulting plan:** Add `GET /api/notion/database/:id/preview` (server runs `inferColumnMapping`, returns 10 sample rows + mapping). Add `/preview/database/:id` page (table, stats line, dot badges for inferred Front/Back). Unhide eye icon for databases. No new modal. Instrument `database_preview_viewed` and `convert_clicked_from_preview` so we can verify the abandon-rate hypothesis after launch.

---

## Outcome

Cut the database-conversion abandon rate to ≤50% of baseline within 30 days of ship. Abandon = a user opens the field-mapping modal on `/downloads` and closes without clicking Convert, OR clicks Convert on a database and never returns to `/downloads`. Secondary leading indicator: `convert_clicked_from_preview` / `database_preview_viewed` ≥ 0.6.

## Goal alignment

"Drop something in, get a clean deck back" requires the user to trust the input before they spend a minute waiting on conversion. With field mapping live (PR #2631), databases are first-class converters, but the eye icon is still hidden for them — users have to convert blind or jump to Notion in another tab. Removing the blindfold is a per-funnel-step unlock for the largest object type in Notion exports and supports retention of database-heavy users on the path to 300K.

## Problem

A user finds a Notion database in 2anki's search results. They want to know whether to convert it: how many rows, what columns, will the result look like sensible cards? Today they get nothing — pages get an eye icon, databases don't. They open Notion in a second tab or convert blind and discover on `/downloads` that the database has 4 000 rows or that "Definition" is mostly empty. With ambiguous columns they hit the mapping modal cold, with no sense of the data they're mapping.

## Riskiest assumption

Users abandon at the field-mapping modal because they can't see the data, not because mapping itself is confusing.

## Smallest test

Before building, ship two analytics events: `mapping_modal_opened` and `mapping_modal_closed_without_convert`. Sample 20 sessions over a week. If ≥12 of them have no prior visit to a database in the same workspace (the user hasn't inspected the data), the blindfold hypothesis holds — build the preview. If most abandons happen *after* the user picks columns, the problem is mapping confidence and we spec inference improvements first.

The instrumentation is two days of work; the preview is six. Worth the gate.

## Scope

**In:**
- Eye icon visible on database rows in `SearchObjectEntry` (remove the guard at line 129).
- New page at `/preview/database/:id` showing database title, total row count, column list with inferred Front/Back marked, and the first 10 rows as a read-only table.
- New endpoint `GET /api/notion/database/:id/preview` returning `{ title, columns, mapping, samples, rowCount }`.
- Empty, loading, and error states per VOICE.md.
- "Convert to Anki" and "Open in Notion" actions on the preview page.

**Out (v1):**
- Editing rows in 2anki.
- Pagination or full-row enumeration beyond the first 10.
- Multi-data-source disambiguation (one data source per database is the common case).
- Inline column mapping on the preview page — the picker stays on `/downloads`.
- Generated-Anki-card preview (separate spec).

## User story

As a Notion user with a database in my workspace, I want to see what's inside it before I convert, so I can decide whether to convert at all and whether my columns will produce sensible cards.

## Acceptance criteria

- [ ] Eye icon renders on database rows in `SearchObjectEntry` and routes to `/preview/database/<id>`.
- [ ] The preview shows the database title (h1), a stats line (`N rows · M columns · Front: X · Back: Y` or `Column mapping needed` when ambiguous), and the first 10 rows in a read-only HTML table.
- [ ] Columns inferred as Front and Back are marked in the header with a `●` dot using `--color-primary`. Tooltip on hover: "Used as card front" / "Used as card back".
- [ ] If the database has 0 rows, render `This database has no rows yet.`
- [ ] If Notion is unreachable, render `We couldn't read this database. Check that 2anki still has access in Notion, then try again.` with a retry button.
- [ ] If the database 404s, render `This database is no longer available. It may have been deleted or moved in Notion.`
- [ ] Loading state: `Reading your database` (no ellipsis spinner).
- [ ] Cell text truncates at 40 chars with the full text in `title` attribute (VOICE.md "Showing user data inline").
- [ ] "Convert to Anki" button on the preview page hits the same `get2ankiApi().convert(id, 'database', title)` path as `SearchObjectEntry` and navigates to `/downloads` on 202.
- [ ] Row-cap footer: `Showing 10 of N rows. Convert to see all of them.` (omit when `rowCount === totalRowCount`).
- [ ] `database_preview_viewed` and `convert_clicked_from_preview` events fire.
- [ ] No raw Notion API rows reach the client — the controller maps to a typed `DatabasePreviewResponse`.
- [ ] Vitest covers the three states (loaded, empty, error); Jest covers the new use case and service method against a mocked Notion client.
- [ ] Keyboard-navigable; row count announced to screen readers.

## Open questions

1. **Row count.** v1 ships 10 (engineer's hard cap, PM agreement). Designer recommended 50. Resolve by watching `convert_clicked_from_preview` after launch — if users preview and then convert without reading the table, 10 was enough.
2. **Multi-data-source.** Engineer's riskiest tech assumption: `NotionAPIWrapper.queryDatabase` with multiple data sources fetches 10 per source, not 10 total. A 5-minute spike against a known multi-data-source DB before implementation will tell us whether v1 needs an explicit data-source pick or can defer it.
3. **Ambiguous mapping copy.** Stats line shows `Column mapping needed` in warning color when inference is ambiguous. Designer also recommended that the mapping picker on `/downloads` carry over the preview's row sample as context (so the user doesn't pick blind there either). Defer to the implementation PR.

---

## Design notes

**Layout.** Single-surface table preview, `sharedStyles.pageWide` (1120px max, visually ~960px). One `.sectionCard`. No tabs, no sidebar. Reuse `PreviewPage.module.css`'s `.backLink`, `.titleRow`, `.headerLinks` patterns verbatim.

**Structure top to bottom:**

```
← Back to Notion search

[Database title]                    [Convert to Anki]  [Open in Notion ↗]

──────────────────────────────────────────────────────────────────────────
  14 rows · 6 columns · Front: Word · Back: Definition
──────────────────────────────────────────────────────────────────────────

  WORD ●       DEFINITION ●    EXAMPLE          TAGS       CREATED
  ─────────    ──────────────  ────────────     ────────   ─────────
  Osmosis      Movement of …   Water passes …   Biology    …
  …
  Showing 10 of 214 rows. Convert to see all of them.
```

**Stats line.** `--color-text-secondary`, `var(--text-sm)`, between the title row and the table. Plain text, not a badge.

**Inferred column dot.** Filled `●` in `--color-primary` next to inferred Front and Back column headers. Other columns plain. No data-cell coloring, no legend.

**Mobile (375px).** Table scrolls horizontally inside `.sectionCard`. Don't truncate columns on small screens.

**Primary action.** "Convert to Anki" — `sharedStyles.btnPrimary` + `sharedStyles.btnInline`, top-right of title row. On click: `get2ankiApi().convert(id, 'database', title)` → navigate to `/downloads` on 202.

**Secondary action.** "Open in Notion ↗" — `styles.pageLink`.

**Not included.** No "Edit conversion rules" link (rules page doesn't handle databases yet). No inline column picker (picker lives on `/downloads`).

**Copy strings.**

| Surface | String |
|---|---|
| Page heading (h1) | The database's own title |
| Stats line — known mapping | `14 rows · 6 columns · Front: Word · Back: Definition` |
| Stats line — ambiguous | `14 rows · 6 columns · Column mapping needed` (warning color on the third fragment only) |
| Column header tooltip | `Used as card front` / `Used as card back` |
| Row-cap footer | `Showing 10 of 214 rows. Convert to see all of them.` |
| Empty state | `This database has no rows yet.` |
| Error — Notion unreachable | `We couldn't read this database. Check that 2anki still has access in Notion, then try again.` |
| Error — 404 | `This database is no longer available. It may have been deleted or moved in Notion.` |
| Loading | `Reading your database` |
| Converting button label | `Converting…` |
| Back link | `← Back to Notion search` |

---

## Technical pre-flight

**Layers touched:**
- `src/routes/NotionRouter.ts` — new route `GET /api/notion/database/:id/preview`.
- `src/controllers/NotionController.ts` — new `previewDatabase` method.
- `src/usecases/notion/GetDatabasePreviewUseCase.ts` — new file; orchestrates query + infer.
- `src/services/NotionService/NotionAPIWrapper.ts` — extend `queryDatabase` signature with optional `pageSize?: number` (defaults to current `DEFAULT_PAGE_SIZE_LIMIT`).
- `web/src/lib/backend/Backend.ts` — new `getDatabasePreview` method.
- `web/src/pages/DatabasePreviewPage/DatabasePreviewPage.tsx` — new page.
- `web/src/App.tsx` — wire `/preview/database/:id` lazy-loaded.
- `web/src/pages/SearchPage/components/SearchObjectEntry/index.tsx` — remove the `getType(type) !== 'database'` guard.

**Endpoint.** `GET /api/notion/database/:id/preview` (separate from the existing query route so the preview can hard-cap `page_size` with no caller override). Response:

```ts
{
  title: string;
  columns: string[];
  mapping: { frontField: string | null; backField: string | null; ambiguous: boolean };
  samples: Array<{ front: string; back: string }>;
  rowCount: number;        // rows returned in this preview (≤ 10)
  totalRowCount: number;   // best-effort total; may equal rowCount when has_more is false
}
```

**Routing.** Separate `/preview/database/:id`, not a branch inside `/preview/:id`. Reasons: completely different data shape, different loading state, different empty/error states. Sharing the route would mean a runtime type-detect + conditional render, harder to test, harder to navigate.

**Inference.** Server runs `inferColumnMapping` inside the use case. Client just displays the result. No second round trip for the mapping.

**Page size.** Hard-code `page_size = 10` in the use case. `queryDatabase` default is 200; that's fine for conversion but not for a synchronous preview. Notion's `data_sources.query` accepts up to 100. Expected latency: 800–1400ms (one `databases.retrieve` + one `data_sources.query` with 10 rows).

**Security.** Endpoint behind `RequireAuthentication`. Owner token gates the Notion call. No raw property objects leaked — controller maps to the typed response.

**Testing.** Unit test the use case for: (a) clear mapping, (b) ambiguous mapping, (c) empty database. Component test for `DatabasePreviewPage` covering the three states. No migration, no data-layer changes.

**Effort: M (~6 hours):** use case + controller + route ~1.5h; new page ~2h; `Backend.ts` + integration ~1h; tests ~1.5h.

**Riskiest technical assumption.** Multi-data-source databases: `queryDatabase` loops over data sources and merges. "First 10 rows" semantics may multiply (10 per source). 5-minute spike before build.

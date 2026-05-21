# NotionService

Wraps the Notion SDK (`@notionhq/client`) and the OAuth dance. Owns token storage hand-off, top-level-page caching, and block walking for the converter.

## Responsibilities

- **OAuth:** `getNotionAuthorizationLink` and the redirect handler in the controller layer. Tokens land in `INotionRepository`.
- **Top-level pages cache:** `topLevelPagesCache` + `topLevelPagesRefreshGate` — pages are stale after `TOP_LEVEL_PAGES_STALE_AFTER_MS` (5 minutes). The gate prevents thundering-herd refreshes when many tabs hit the picker at once.
- **Block walking:** `BlockHandler/` and `blocks/` recursively fetch a page's blocks and hand them to the parser. Pagination, image URL refresh, and rate-limit handling live here.
- **Database as flashcards (row-as-card):** `BlockHandler.findFlashcards` routes `parentType === 'notion-database'` to `findFlashcardsFromDatabaseRows`, which queries the database, auto-infers the front/back column mapping via `lib/notionDatabase/inferColumnMapping` (canonical names: Term/Word/Front/Question/Vocabulary on the front; Definition/Meaning/Back/Answer/Translation on the back), and emits one Anki note per row. Callers may pass explicit `frontField` / `backField` on the `Finder` to bypass auto-infer (used by the picker UX). When the mapping is ambiguous and no explicit fields are provided, the method throws an `Error` with `code === 'NOTION_DATABASE_COLUMNS_AMBIGUOUS'` and a `columns: string[]` payload so the job framework can surface the picker. Only `title` and `rich_text` property types are read in v1. Rows with empty front or back text are skipped. The existing `parentType === 'database'` branch (recurses into each row as a sub-page) is unchanged and intentionally separate from this path.
- **MCQ classification:** when `settings.mcqEnabled` is true, `BlockHandler.findFlashcards` runs `detectNotionApiMCQ` (from `lib/parser/findNotionToggleLists`) against the rendered back HTML of each toggle. If the children render as `<ul class="to-do-list">` with exactly one `.checkbox-on`, the note becomes an MCQ note (mcq=true, options + correctIndices populated, back cleared). When `mcqEnabled` is off the path is a no-op. MCQ takes precedence over cloze and input detection on the same block.
- **Table blocks:** when `table` is in `flashcard_is`, `BlockHandler.getFlashcards` handles each `table` block with an early branch: it fetches `table_row` children once via `api.getBlocks`, then calls `tableRowsToCards` (from `blocks/lists/BlockTable.tsx`) to produce `{front, back}` pairs — one per data row. Column 1 = front, column 2 = back. Rows where col1 or col2 is empty are skipped. 1-column tables produce no cards. Columns 3..N appear as an inline `<table>` appended to the back. When `has_column_header` is true the first row is skipped from card seeding. `BlockTable` (the back-body renderer) also handles the case where a `table` block appears inside an existing card's back-body — it emits a full `<table>` with optional `<thead>` when the column header flag is set. Standalone `table_row` blocks render to an empty string in `blockToStaticMarkup` — their cells are owned by the parent `table`, so if a walker ever hands one through directly (e.g. children iteration after the table has already rendered) we drop it instead of leaking `unsupported: table_row` + JSON to the user.
- **File uploads:** `NotionAPIWrapper.uploadFile` uses the Notion file uploads API (`fileUploads.create` + `fileUploads.send`) to upload media (images) to Notion's storage. Returns a `file_upload` ID that can be referenced in image blocks. Used by the APKG import flow.
- **Identity helpers:** `getNotionId`, `isValidNotionId`, `NotionColors`.

## Calling pattern

Every outbound call must go through `instrumentedAxios` (from `services/observability/`) or the wrapped `NotionAPIWrapper.ts`. Do not import `axios` or call `notion.request` directly from this dir.

`NotionAPIWrapper`'s constructor takes `(key, owner, blocksCache?)`. The optional `blocksCache: IBlocksCacheRepository` (from `data_layer/BlocksCacheRepository.ts`) backs `getBlocks` — when present, `all`-mode reads check the cache before hitting Notion, and writes persist the response. Pass it in production via `NotionService`'s constructor; omit it in tests for a no-op (no caching, no DB access). Never import `getDatabase` here.

## Things to know before editing

- **Authorize URL needs `redirect_uri`:** `getNotionAuthorizationLink` must include the `redirect_uri` query param (sourced from `NOTION_REDIRECT_URI`). Notion rejects the authorize request with "Missing or invalid redirect_uri" if it's absent. The companion `redirect_uri` on the token exchange (`oauth/token`) is separate but must match.
- **Cache invalidation:** writes (e.g. user disconnects, token refresh) call `invalidateTopLevelPagesForOwner`. Forgetting this leaves stale pages visible to other tabs for up to 5 minutes.
- **Refresh gate:** `tryClaimRefresh` returns false for the second concurrent caller — that caller should serve stale data, not block. Don't change this to a mutex without thinking about the perf tail.
- **Webhooks:** the receiver in `routes/AnkifyWebhookRouter.ts` is intentionally inactive; see `Documentation/ankify/notion-webhooks-deferred.md`. Polling at 5 min carries the near-realtime story today.
- **Token hashing:** never log raw tokens. Use `hashToken` from `lib/misc/hashToken` for any audit trail.
- The Notion SDK throws `APIErrorCode.RateLimited` — handle by surfacing a user-friendly message ("Notion is busy, retry in a moment"), not by silently retrying.

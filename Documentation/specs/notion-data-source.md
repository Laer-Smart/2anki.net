# Spec: Handle Notion `data_source` parent type in `findFlashcards`

## Why

Prod has been crashing with `Error: Unsupported 'data_source'! Please report a bug.` inside `BlockHandler.findFlashcards` (`src/services/NotionService/BlockHandler/BlockHandler.ts:367`). The throw fires on `parentType: 'data_source'`, which Notion's API now hands back as a first-class parent type alongside `page` and `database`.

Notion rolled out **multi-source databases** (a database backed by one or more data sources). The data-source object behaves like a row container — same iteration shape as a database. `NotionAPIWrapper` already understands the concept (`database.data_sources`, `parentType === 'data_source_id'`) but the switch in `findFlashcards` was never widened.

When a user converts a Notion page that contains a multi-source database child — or points the converter directly at a data source — the conversion dies with a 500 and the user sees nothing useful. Low frequency (1 hit in the last 48h) but the failure mode is "your whole deck disappears."

## What changes

`BlockHandler.findFlashcards` (`src/services/NotionService/BlockHandler/BlockHandler.ts`) currently routes on `parentType`:

```ts
if (parentType === 'page') { ... }
else if (parentType === 'notion-database') { ... }
else if (parentType === 'database') { ... }
else { throw new Error("Unsupported '${parentType}'! ..."); }
```

Widen the routing so `data_source` is treated like `database` — query its rows, build one flashcard branch per row, same `findFlashcardsFromPage` recursion the database arm already uses. The wrapper methods called on the `database` arm (`api.queryDatabase`, `api.getDatabase`, `api.getDatabaseTitle`) already accept the data-source ID against the current Notion API surface — confirm by reading the existing `NotionAPIWrapper` calls; if any of them needs a separate `queryDataSource` path, add a thin equivalent rather than overloading the database method.

The `else` branch becomes the real safety net: an unknown `parentType` no longer crashes the conversion. Instead, log the value (anonymized — just the type string, no IDs) and return an empty `Deck[]`. The caller already handles empty decks via `EmptyDeckError` with our friendly "wrap your key terms in toggles" copy. Better to lose one branch of a multi-page conversion than to 500 the whole job.

## What doesn't change

- The two existing parent types (`page`, `notion-database`, `database`) keep their exact behavior.
- The recursive traversal in `findFlashcardsFromPage` and the global-seen-IDs guard are unchanged.
- `EmptyDeckError` copy and surfacing stays put.
- Public APIs, route shape, response payload — all untouched.

## Constraints

- **Sentry-style observability for the fallback.** When the `else` branch fires, log via the project's normal observability path (see `src/services/observability/`) with the unknown `parentType` string. We need to find out fast if Notion ships *another* new parent type.
- **No reporter PII.** Per `.claude/rules/support-confidentiality.md` — don't log workspace names, deck titles, or block IDs in the fallback log. Type string only.
- **Test the prod-reported case.** Add a `BlockHandler.findFlashcards.test.ts` fixture covering `parentType: 'data_source'` end-to-end — assert it routes to the multi-row branch and returns the expected number of decks. Mock the `NotionAPIWrapper` at the SDK boundary (per `.claude/rules/testing.md`); do not stub `BlockHandler`'s internal methods.
- **Sonar cognitive complexity.** The current `findFlashcards` is already a 4-branch if/else; adding a 5th branch is fine but if we add the fallback log + the data-source case, consider extracting a small `routeByParentType` helper to keep it under Sonar's S3776 threshold. Lead with the positive (`if (parentType === ...)`) per S7735.

## Out of scope

- Webhook re-trigger on data-source changes (the polling story per `src/lib/ankify/FEATURE.md` is unchanged).
- New UX surface for users to opt out of converting data-source rows. Today, all rows convert; that stays.
- A retroactive re-run of jobs that previously failed with this exact error. The user can re-upload — single-shot fix.

## Acceptance criteria

1. Reproduce: a unit test with `parentType: 'data_source'` exists and **fails** on `main` (proving we'd have caught the bug) and passes after the fix.
2. Add a unit test for an unknown `parentType` (e.g. `'unknown_future_type'`): it returns `[]` and logs once via the observability path, does not throw.
3. `pnpm test src/services/NotionService/BlockHandler/` is green.
4. `/check` is green (server tsc + web typecheck + web vitest + web lint).
5. `sonar-scanner` locally before flipping ready — no new cognitive-complexity or nesting smells. See `.claude/rules/sonar.md`.
6. Changelog entry under `web/src/pages/WhatsNewPage/changelog/YYYY-MM-DD-notion-multi-source-databases.json`, type `fix`, sentence-case, no implementation detail. Suggested wording: *"Notion pages containing multi-source databases convert without errors"*.
7. Manual: convert a real Notion page containing a multi-source database via `/upload` and confirm the deck builds. Document in the PR's Browser check section.
8. Production verification after deploy: tail `~/.pm2/logs/server-error.log` via `/deploy-status` and confirm no more `Unsupported 'data_source'!` lines for 24h.

## Implementation order

1. Failing test in `BlockHandler.findFlashcards.test.ts` (`parentType: 'data_source'`).
2. Widen the switch — route `data_source` to the database arm, swap the throw for a log + empty return.
3. Verify the test now passes.
4. Add the unknown-parentType fallback test.
5. `pnpm kanel` is not needed here (no migration).
6. Manual conversion test + Browser check.
7. Changelog JSON.
8. `/check` + `sonar-scanner` + flip ready.

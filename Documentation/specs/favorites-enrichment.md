# Split favorites enrichment out of FavoriteService

### Single-investigator synthesis

- **What:** `FavoriteService.getFavoritesByOwner` mixes two concerns — fetching favorite rows from the DB and enriching each row with Notion data (title, emoji) via `api.getPage` / `api.getDatabase`. The existing `XXX: This should be moved to a different service.` comment at `src/services/FavoriteService.ts:38` flags the smell.
- **Why now:** the inline Notion fetches give `FavoriteService` a hard dependency on `NotionService` (passed as a method argument), and bury a side-effect (`this.delete(f.object_id, owner)` on a 404) inside what looks like a read path. Cleaning now keeps FavoriteService a thin facade over the favorites repo and lets the enrichment + cleanup logic stand on its own.
- **Plan:** introduce `GetEnrichedFavoritesByOwnerUseCase` (or similar) that takes `FavoritesRepository` + a Notion API client, returns the same shape the controller renders today, and absorbs the stale-favorite cleanup. `FavoriteService.getFavoritesByOwner` either delegates to it or goes away entirely.

## Outcome

`FavoriteService` becomes a thin facade over `FavoritesRepository` with no service-to-service coupling at the method-argument level. The Notion-enrichment path moves into a dedicated use case with its own tests. No user-visible change. No changelog entry.

## Goal alignment

Direct trace to `src/services/CLAUDE.md` — "Services receive repository interfaces via constructor — never import knex or the database directly. Contain reusable domain logic shared across multiple use cases." Today `FavoriteService.getFavoritesByOwner` takes `NotionService` as a runtime argument, calls `api.getPage` / `api.getDatabase`, and triggers a self-mutation (delete) inside a read — three smells in one method. Splitting it pays the same hygiene dividend as PR #2703 in the jobs use cases: one less precedent for the next contributor to copy.

## Problem

The method does four things in one block:

1. Read favorite rows for `owner` via `GetAllFavoritesByOwnerUseCase`.
2. Acquire a Notion API client via `notionService.tryGetNotionAPI(owner)`.
3. For each favorite, call `api.getPage` or `api.getDatabase` to enrich it with title/emoji.
4. On Notion 404 (`APIResponseError`), call `this.delete(f.object_id, owner)` to garbage-collect stale rows.

(2)–(4) are not "favorites" — they're "display this user's favorites with Notion context, and prune dead ones." That belongs in a use case, not the service facade. Today the only caller (`FavoritesController.list` → `/api/favorites`) doesn't care which class owns the logic, so the split is cost-free at the API boundary.

## Riskiest assumption

There is only one caller of `getFavoritesByOwner`, and that caller is happy with whatever shape the use case returns. Confirm by grepping callers (already done — one hit, `FavoritesController.ts:52`) and snapshotting the current response in an integration test before the swap.

## Scope

**In:**
- New `src/usecases/favorites/GetEnrichedFavoritesByOwnerUseCase.ts` — takes `FavoritesRepository` + an injected `EnrichmentClient` interface (the bit of `NotionAPIWrapper` it needs: `getPage`, `getDatabase`, optionally a `delete` callback). Returns the same enriched-favorite shape today's method returns.
- Move the 404 → `delete` cleanup into the new use case. Keep it best-effort (fire-and-forget) the way it is today.
- `FavoritesController.list` swaps to instantiate the new use case (or call `FavoriteService.getEnrichedFavoritesByOwner` if we keep a delegating wrapper).
- Drop `notionService` from `FavoriteService.getFavoritesByOwner`'s signature, OR remove the method entirely if no other caller exists.

**Out:**
- Changing the response shape consumed by `/api/favorites`.
- Adding pagination, caching, or any other behavior.
- Refactoring `AddToFavoritesUseCase` / `DeleteFavoriteUseCase` — they're already in the right place.
- Renaming `FavoriteService` itself.

## User story

As a contributor reading `src/services/`, I want each service to do one job — favorites stay a thin facade over the favorites repo, enrichment lives in a use case — so I can follow `services/CLAUDE.md`'s rules without copying yesterday's bypass.

## Acceptance criteria

- [ ] `src/services/FavoriteService.ts` no longer imports `NotionService` or `APIResponseError`. Either `getFavoritesByOwner` is gone (caller moved to the new use case directly) or it delegates without touching Notion.
- [ ] New `GetEnrichedFavoritesByOwnerUseCase` lives in `src/usecases/favorites/` with a `*.test.ts` that injects a fake repo + fake enrichment client and covers: happy path, missing API client (returns `[]`), 404 triggers cleanup.
- [ ] `/api/favorites` response shape unchanged (assert with a controller test snapshot if one doesn't exist yet).
- [ ] The XXX comment is removed.
- [ ] `pnpm test src/usecases/favorites src/services/FavoriteService src/controllers/FavoritesController` green; `/check` clean.

## Open questions

1. **Keep `FavoriteService` or inline?** If after the move `FavoriteService` only wraps `AddToFavoritesUseCase` and `DeleteFavoriteUseCase`, it's three lines of indirection. Either keep it as the controller's facade (consistent with other controllers in the codebase) or drop it and have the controller instantiate the use cases directly. Engineer picks based on the precedent in neighbouring controllers.
2. **404 cleanup behaviour.** Today's code calls `this.delete(f.object_id, owner)` without awaiting it. Keep fire-and-forget, or `await` so a controller-level error handler can log failures? Recommendation: keep fire-and-forget but log on catch — the current `catch(error)` block silently swallows non-404 errors.

## Technical pre-flight

**Layers touched:**
- `src/usecases/favorites/GetEnrichedFavoritesByOwnerUseCase.ts` (new) + `*.test.ts`.
- `src/services/FavoriteService.ts` — drop `getFavoritesByOwner` or rewrite as a delegate.
- `src/controllers/FavoritesController.ts:52` — call the new use case.
- `src/routes/FavoriteRouter.ts:12` — wire the new use case into the controller.

**Tests:** the new use case gets unit tests against fake repos + fake enrichment client. `FavoritesController.test.ts` (if it exists) gets a smoke test for the controller wiring.

**Security / migration:** none.

**Effort: S (~1–2h).** Mechanical move. One new file, one method moved, one controller wiring update.

**Risk:** misreading the enriched-favorite shape today's controller emits. Mitigate with a JSON snapshot of `/api/favorites` against a seeded fake user before/after the swap.

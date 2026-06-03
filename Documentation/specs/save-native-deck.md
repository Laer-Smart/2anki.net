# Spec: Save native on-device decks to My Decks (#3051)

### Trio synthesis
- PM: Build now, keep it thin. Scale/retention play — the load-bearing paid promise "my decks follow my account across devices." Audience is narrow (paid app users on a second surface) but it's the slice we just started charging. Explicit per-deck opt-in, no auto-save. Quota is **moot** — `CheckMonthlyCardLimitUseCase:53` returns early on `isPaying`, so a paid-only save path touches zero quota code.
- Designer: Reuse the existing My Decks `Source` badge → `From the app`; an app-saved deck is an ordinary row, only the badge differs. No new component. Full button/toast/paywall/error string set specified below.
- Engineer: New endpoint + use case + repo insert; **S3-first-then-DB-row** with `storage.delete` compensation on insert failure; route the insert through `IUploadRepository` (don't copy `BuildDeckForJobUseCase:83`'s direct-DB violation); typed response, never a raw row.
- Agreement: per-deck opt-in, paid-only, no quota interaction, flat row in My Decks, reuse the existing download path, defer dedup/versioning/folders.
- Conflict 1 (paywall gate): PM wants paid-only but `RequirePaying` redirects to `/pricing` (HTML) — wrong for an XHR button. **Resolved**: gate paid-only via a JSON-returning guard (402/403 `{error:'upgrade required'}`); the designer's dialog renders off that response.
- Conflict 2 (what the endpoint accepts): the engineer sketch anchored on `ChatDeckUseCase` (rebuild from a card payload), but the **issue** is broader — on-device decks span Markdown / Notion .zip / CSV / PDF / OPML / Kindle / `.apkg`, which the server cannot rebuild. **Resolved**: the save path accepts the **built `.apkg` bytes** (multipart, like `/api/upload/file`) + metadata, not a card payload. Chat decks become just one producer of bytes.
- Conflict 3 (idempotency): PM/engineer said "allow duplicates v1"; the issue explicitly asks for a client-supplied dedupe key. **Resolved**: honor a `dedupe_key` the client already wants to send (cheap, prevents double-tap clutter); see Open questions for storage detail.
- Resulting plan: a paid-gated `POST` that accepts a built `.apkg` + metadata (`name`, `card_count`, `source:"app"`, `dedupe_key`), uploads to S3, inserts an `uploads` row, and surfaces the deck in web My Decks with a `From the app` badge — merged after #2998.

## Outcome & goal alignment
A signed-in paid app user who builds a deck on-device can tap **Save to my library** and have that deck appear in web My Decks and on their other devices. Moves toward **scale/retention**: makes "decks follow your account" true, which is a baseline expectation once the app is a paid purchase (#3050). Simpler/faster/more-beautiful: neutral — this closes a trust gap, it isn't a speed win.

## Problem statement
On-device decks never persist server-side. Plain (non-Claude) uploads stream the `.apkg` back and never write an `uploads` row; only the Claude async path calls `promoteClaudeJobToUpload`. So a paid app user who builds a deck on their Mac sees nothing in their web library — it lives only on the device they built it on. This breaks the paid promise the moment they open 2anki.net or a second device.

## Riskiest assumption + smallest test
**Assumption**: paid app users actually want on-device decks centralized at all — the app's pitch is on-device-first. **Test**: ship the opt-in button and measure the save-to-library rate among paid app deck-ready screens in the first two weeks before investing in any polish.

## Scope
**In**
- A paid-gated write endpoint accepting built `.apkg` bytes + metadata (`name`, `card_count`, `source:"app"`, client `dedupe_key`), cookie auth + `Origin: https://2anki.net`.
- Upload bytes to S3, insert an `uploads` row (reuse the `promoteClaudeJobToUpload` shape: `owner`, `key`, `filename`, `size_mb`, `source='app'`, `object_id` = null).
- Idempotency via the client `dedupe_key` so re-saving the same deck doesn't duplicate rows.
- Web My Decks: render an app-saved deck as an ordinary row with a `From the app` Source badge.

**Out (v1)**
- Versioning / save history.
- User-facing overwrite/replace UX.
- Folder placement (lands flat in My Decks).
- Persistent per-deck "synced/unsynced" badge in the app.
- "From the app" filter chip, "open in app" round-trip editing, My Decks empty-state nudge (all fast-follow).
- Any quota interaction (moot for paid users).

## User story + acceptance criteria
*As a paid app user who just built a deck on-device, I want to save it to my library so it shows up on the web and my other devices.*

- [ ] A paid, signed-in user can POST a built `.apkg` + metadata and get `200 { key, filename, size_mb }`.
- [ ] The saved deck appears in web My Decks as a normal row (download / preview / delete) with a `From the app` badge.
- [ ] The deck is re-downloadable via the existing `/api/download/u/{key}` path.
- [ ] A free user's save attempt returns 402/403 JSON `{error:'upgrade required'}` (no HTML redirect).
- [ ] Re-saving the same deck with the same `dedupe_key` does not create a second row.
- [ ] If the S3 upload succeeds but the DB insert fails, the S3 object is deleted (no orphan) and the request 5xx's.
- [ ] If the S3 upload fails, no `uploads` row is written.
- [ ] `owner` is taken from `res.locals` (auth), never from the request body.

## Leading indicator
Save-to-library rate among paid app deck-ready screens. Target: ≥~10% tap-through in two weeks, else revisit. Confirming lagging signal: web re-download of a saved native deck within 7 days.

## Open questions for the engineer
1. **Endpoint shape**: new `POST /api/deck/save` accepting multipart `.apkg` bytes, **or** extend the existing sync `/api/upload/file` path to persist when `source=app` + paid? The issue leaves it to the server. Extending the upload path reuses the whole pipeline for all formats; a dedicated endpoint keeps concerns separate. Recommend extending the sync upload persistence path — fewer new surfaces, and it captures every on-device format the app already uploads.
2. **`dedupe_key` storage**: reuse `object_id` for the client hash (collides semantically with the prune query `findAllByObjectIdAndOwner`), or add a nullable `dedupe_key` column with a `(owner, dedupe_key)` unique index? Recommend a dedicated column to keep `object_id` meaning "re-convertible source" intact.
3. **Save-size cap**: is there a max `.apkg` size for the save path? If yes, the designer's "too large" error string applies; if no, omit it.
4. **`source='app'` dependency on #2998**: this needs the `uploads.source` column. Confirm #2998 merges first.

## Design notes
- **Affordance**: secondary action on the deck-ready screen, beside the primary **Download** button. Opt-in; never silent.
- **Button states** (shared contract; button likely lives in the native-app repo): `Save to my library` → `Saving` (no ellipsis, disabled) → `Saved to my library` (inert). Failure returns the button to idle; the toast carries the error.
- **Success toast**: `Saved to my library — {N} cards. Open it on the web or any device.` Fallbacks: deck name, then bare — always keep the "Open it on the web or any device" clause (it's the *why*).
- **My Decks rendering**: add `getSourceLabel` case `'app'` → `From the app` (`web/src/pages/DownloadsPage/DownloadsPage.tsx:64-71`, `DeckRow` source union `web/src/pages/DownloadsPage/helpers/toDeckRows.ts:5-10`). App-saved deck = ordinary `file`-kind row (same download/preview/delete), badge differs. No new component.
- **Paywall dialog** (free user taps save): title `Saving decks to your library is a paid feature`; body `Free decks download to this device only. Upgrade to keep your decks in your account and open them on the web or any device.`; primary `See plans` (→ `/pricing`); secondary `Not now`. No price in copy.
- **Error strings**: network/upload fail — `Couldn't save to your library. Your deck is still on this device — try saving again.`; session expired — `Your session ended. Sign in again to save this deck.`; too-large (only if a cap exists) — `This deck is too large to save — {size} over the {limit} limit. Download it to this device instead.`
- **Known boundary**: a saved deck is a static `.apkg` in the library — no "open in app" round-trip in v1. Worth a sentence so it's not a surprise.

## Technical pre-flight
- **Layers touched**: `routes` (new/extended endpoint), `controllers` (validation + typed response), `usecases` (persist orchestration), `data_layer` (repo insert), `web` (badge label only).
- **Files likely in play**: `src/routes/ChatRouter.ts` or `src/routes/UploadRouter.ts` (depending on Q1), `src/services/UploadService.ts` (`promoteClaudeJobToUpload` :169-188, sync path :380-482), `src/data_layer/UploadRespository.ts` (:15-46, add `insertUpload(row)`), `src/lib/storage/StorageHandler.ts` (`uniqify` :29-44, `uploadFile` :110-124, `delete` :50-66), `src/lib/isPaying.ts`, a new JSON paying-guard (vs `RequirePaying.ts:22-24`), `web/src/pages/DownloadsPage/DownloadsPage.tsx`, `web/src/pages/DownloadsPage/helpers/toDeckRows.ts`. Reference row shape: `BuildDeckForJobUseCase.ts:80-89` (route the insert through the repo; **do not** copy its direct `getDatabase()('uploads').insert` at :83).
- **Write ordering (critical)**: S3 first, DB row second. On insert failure after a successful upload, `storage.delete(key)` then rethrow to `ErrorHandler`. A row must never point at a missing object.
- **Gate**: paid-only via a JSON-returning guard (402/403), **not** `RequirePaying` (it `res.redirect('/pricing')`).
- **Cross-language**: none (no Python touched; genanki packaging happens client-side on-device).
- **Migration**: `dedupe_key` column + `(owner, dedupe_key)` unique index needs a Knex migration + `pnpm kanel` (if Q2 lands on a dedicated column). `source` column is #2998's migration — not this PR.
- **Security**: validate `Origin: https://2anki.net`; cap `.apkg` size; regenerate the storage key via `uniqify` (never trust client filename); `owner` from `res.locals`, never the body; reject non-`.apkg` uploads server-side.
- **Tests (outside-in)**: mock `StorageHandler` + `IUploadRepository` (external edges). Assert happy-path insert args `{owner, key, filename, object_id:null, size_mb, source:'app'}`; `uploadFile` reject → insert never called; insert reject → `storage.delete` called; same `dedupe_key` twice → one row; free user → 402/403 JSON; `owner` from `res.locals` not body.
- **Effort**: **M** — one endpoint, one use case, one repo method, a dedupe migration, and a one-line web badge; bounded by the orphan-compensation contract and the #2998 merge dependency.

## Changelog (when the web side lands)
`feature` — `My decks now holds decks you save from the app — open them on the web or any device`

## Dependencies
Merge **after #2998** (adds `uploads.source`). Related: #3050 (paid app purchase).

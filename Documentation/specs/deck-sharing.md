# Read-only public share links for converted decks

## One-line goal

A signed-in user can turn a converted deck into an unguessable public link; the recipient sees a preview of the cards and can download the `.apkg`, without an account.

## Context

ROADMAP (per `CLAUDE.md`) names "smooth experience collaborating on Anki deck creation, whether alone or in groups." Today the only path is: convert → download → re-attach the binary somewhere out-of-band (Discord, email, AirDrop). The recipient can't preview before importing, and the sender can't send a link that "just works." Every shared deck is also an organic invite to a learner who already trusts the sender — the cheapest acquisition channel we have on the path to 300K users.

Surface anchor: `web/src/pages/PreviewApkgPage/` already renders `.apkg` cards client-side via `useApkgPreviewStream`. The `.apkg` is in DigitalOcean Spaces (S3-compatible) keyed by `uploads.key`; `StorageHandler` wraps the SDK. Auth is via `routes/middleware/`. This spec adds a sibling unauthenticated path that reuses the existing bytes and the existing preview pattern — no re-conversion, no new storage tier.

## In scope (v1)

1. **New table `deck_shares`** — minimum columns to support a single on/off bit:
   - `id` serial PK
   - `owner` integer not null (references `users.id`)
   - `upload_key` varchar not null (loose-coupled to `uploads.key`, matching `DownloadRepository` pattern)
   - `token` varchar(36) not null unique, generated with `crypto.randomUUID()`
   - `created_at` timestamptz default now()
   - `revoked_at` timestamptz nullable (null = active)
   - `view_count` integer not null default 0
   - Migration via `npx knex migrate:make deck_shares --knexfile ./src/KnexConfig.ts --migrations-directory ../migrations -x js`, then `pnpm kanel`.

2. **New `ShareRouter` → `ShareController` → `Create/Resolve/RevokeShareUseCase` → `ShareService` → `ShareRepository`.** Routes:
   - `POST /api/shares` (auth) — body `{ upload_key }`, validates owner via `uploads`, creates row, returns `{ token, url }`.
   - `GET /api/shares/:token/meta` (no auth) — wraps existing `ApkgPreviewService.getMeta` path.
   - `GET /api/shares/:token/cards` (no auth) — wraps existing cards stream with `cursor`/`page_size`/`deck_id` query params.
   - `GET /api/shares/:token/media/:name` (no auth) — wraps existing media proxy, `Cache-Control: public, max-age=3600`.
   - `GET /api/shares/:token/download` (no auth) — streams the `.apkg` via a new `StorageHandler.getFileContents(key)` callsite that skips the owner assertion (the token is the authorization). Increments `view_count`. Sets `Content-Disposition: attachment; filename=<original>`.
   - `DELETE /api/shares/:token` (auth) — sets `revoked_at = NOW()` for shares owned by the caller.

3. **New `SharedDeckPage` at route `/s/:token`** in `web/src/pages/SharedDeckPage/`. Sibling to `PreviewApkgPage`, not a flag on it. Copies the inner `CardFrame` + `useApkgPreviewStream` patterns but with a separate fetch helper pointed at `/api/shares/:token/*` (avoids the authenticated `get()` and the owner chrome on the existing page). Header: 2anki wordmark left, deck name center (medium weight, truncated past 40 chars), small muted "Shared via 2anki" right; below the header, the existing card preview UI; below that, a **Download deck** button on every viewport.

4. **Share affordance lives in the preview-page header** (`PreviewApkgPage`), next to the existing Download button.
   - Click → popover anchored to the button (not a modal).
   - Popover contents: title, read-only URL input with **Copy link** button, helper text, and a **Stop sharing** tertiary link when a link already exists. No visibility toggle, no expiry picker.
   - Downloads page (`/uploads`) gets a passive **Shared** status pill on rows with an active share; the pill deep-links into the preview page. No second control surface.

5. **Reaper interaction**: the existing free-tier upload cleanup must skip any `uploads.key` that has at least one `deck_shares` row with `revoked_at IS NULL`. Without this, shared links go 404 when the underlying file is pruned.

6. **Crawler exposure**: `noindex` `<meta>` on `SharedDeckPage`, `X-Robots-Tag: noindex` on the four unauthenticated share endpoints, and a `Disallow: /s/` entry in `web/public/robots.txt`. Share links must not show up in Google.

7. **Rate limiting** on the unauthenticated endpoints:
   - Per IP: 100 req/min across all four GET routes (scanner / probe defence).
   - Per token: 10 downloads/hour on `/download` (hotlinking / bandwidth defence).
   Implementation: in-process counter is enough for v1 — measure before pulling in Redis.

8. **Copy** (sentence case, no fanfare, per `VOICE.md`):
   - Share button label: `Share`
   - Popover title: `Share this deck`
   - Helper text under URL: `Anyone with the link can preview the cards and download the deck. They can't edit it.`
   - Copy toast: `Link copied`
   - Stop-sharing confirmation: `Stop sharing this deck? The link will stop working.` — buttons `Stop sharing` / `Keep sharing`
   - Recipient page header tagline: `Shared via 2anki`
   - Recipient revoked / invalid page: `This link was turned off by the owner.` Sub-line: `Ask them for a new one, or make your own deck on 2anki.net.`
   - Recipient deck-deleted page: `This deck is no longer available.` Sub-line: `Make your own deck on 2anki.net.`
   - Downloads row status pill: `Shared`

9. **Tests** — Jest:
   - `CreateShareUseCase.test.ts`: rejects when caller doesn't own the upload; rejects when upload doesn't exist; generates a `crypto.randomUUID()` token.
   - `ResolveShareUseCase.test.ts`: revoked share returns null; active share returns the row.
   - `ShareController.test.ts`: 401 on auth routes without session; 404 on missing/revoked token; 200 + correct `Content-Disposition` on download.
   - Reaper change covered by an integration-style use-case test against the existing cleanup.

   Vitest:
   - `SharedDeckPage.test.tsx`: renders cards from the share fetch helpers; revoked-link branch renders the revoked copy; click on Download fires `/api/shares/:token/download`.
   - Popover behaviour on `PreviewApkgPage`: open / copy / stop-sharing flows.

10. **Changelog entry** in `web/src/pages/WhatsNewPage/changelog.ts`:
    - `{ type: 'feature', title: 'Share a converted deck with a link — recipient can preview the cards and download the .apkg without an account', date: '<merge date>' }`

## Out of scope (v1 — explicitly not building)

| Item | Why deferred |
| --- | --- |
| Editing, comments, reactions, "fork this deck" | Different product. `.apkg` is an immutable artifact in v1. |
| Groups, teams, multi-owner decks, per-recipient links | 3x complexity. Revisit when we have signal that sharing is used. |
| Realtime presence / co-editing | Different product entirely. |
| Email invites or in-product inbox | Adds an email surface to maintain; ride the existing email-the-link flow. |
| Custom slugs, password-protected links, link expiry | Each is a column + a check; deciding defaults is a v2 product call. The column shape doesn't preclude adding these later. |
| Discoverable public deck library or search | Requires content index + moderation + DMCA. Months, not days. |
| Per-recipient analytics beyond `view_count` | One column is enough signal for v1. |
| Re-convert from a shared link | Recipient is read-only by design. |

## Success metric

- **Leading (30 days):** ≥8% of successfully converted decks (created in that window) get at least one share link.
- **Lagging (30 days):** ≥25% of share-link visits result in an `.apkg` download by the recipient.
- **Kill criterion:** if 30-day share-link creation is below 3%, the riskiest assumption ("senders prefer links over file attachments") is wrong — remove the route registration and revisit.

## Open questions

- Mobile layout: does **Share** sit alongside **Download** in the preview header, or move into an overflow menu on narrow widths? Designer answer needed at implementation time.
- Should the `view_count` increment fire on `/meta` (first hit per session) or on `/download` (intent), or both? Engineer judgement at implementation — recommend `/meta` so we measure recipient reach, not just import.
- Is the download endpoint a redirect to a presigned S3 URL, or a server proxy? Engineer call. Recommend server proxy for v1 (consistent with existing pattern), revisit if bandwidth becomes an issue.

## Risks

- **Privacy leak.** A user shares a deck containing personal notes. Mitigation: the helper text says so explicitly, the recipient page tags the source, and there's no public index or crawler surface. Owner can revoke instantly.
- **Hotlinking / bandwidth abuse.** Per-token download rate limit + 1h media `Cache-Control` blunt the obvious cases.
- **Token enumeration.** `crypto.randomUUID()` gives 122 bits of entropy. Existing `rejectScannerProbes` middleware already covers broad scanning; the per-IP cap above handles the rest.
- **Stale share after upload prune.** Pinning shared uploads in the reaper is the entire mitigation. Without it, every long-lived share quietly 404s.
- **Illegal content abuse via public URLs.** `revoked_at` is the admin kill switch; v1 keeps the abuse-report path manual (email support). DMCA endpoint is a v2 item if reports arrive.

## Rollout

Signed-in users only. Everyone, on by default, no flag — this is one button and a public route, not a surface that warrants gradual rollout. If creation rate spikes abuse, the kill switch is removing the route registration.

## Files this PR will touch (implementation phase)

- `migrations/<date>_deck_shares.js` + regenerated `src/data_layer/public/DeckShares.ts` via `pnpm kanel`
- `src/data_layer/ShareRepository.ts`
- `src/services/ShareService.ts`
- `src/usecases/share/CreateShareUseCase.ts`, `ResolveShareUseCase.ts`, `RevokeShareUseCase.ts` (+ tests)
- `src/controllers/ShareController.ts` (+ test)
- `src/routes/ShareRouter.ts`
- `src/server.ts` — register `ShareRouter`
- Reaper use case (locate during impl) — skip uploads with an active share
- `web/src/pages/SharedDeckPage/SharedDeckPage.tsx` + `.module.css` + tests
- `web/src/pages/PreviewApkgPage/PreviewApkgPage.tsx` — Share button + popover
- `web/src/pages/DownloadsPage/...` — passive "Shared" status pill
- `web/src/App.tsx` — `/s/:token` route
- `web/public/robots.txt` — `Disallow: /s/`
- `web/src/pages/WhatsNewPage/changelog.ts` — entry on merge
- `Documentation/specs/deck-sharing.md` — removed in the implementation PR (per spec-lifecycle)

## Effort

Medium — 4–6 engineer-days end-to-end (migration + backend + tests + front-end + reaper change + rate limiting + changelog).

## Eventual commit type

`feat:` — new user-visible capability. The spec branch is `feat/spec-deck-sharing` so it can graduate cleanly to `feat:` per the spec-lifecycle rule.

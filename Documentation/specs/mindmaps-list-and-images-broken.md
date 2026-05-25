# Spec: fix Mindmaps list and image-serving bugs

**Slug:** `mindmaps-list-and-images-broken`
**Branch:** `fix/spec-mindmaps-broken`
**Status:** draft

---

## Outcome

`GET /api/mindmaps` returns 200 for every authenticated user. `GET /api/mindmaps/images/...` returns 302 (image present in Spaces) or 410 (image gone) — never 400 or ENOENT. Both error counts in prod reach zero within one deploy.

---

## Problem

Two independent bugs crash the Mindmaps feature for non-patreon users and for any user who uploaded images before PR #2686.

### Bug 1 — `TypeError: subscriptions.some is not a function` (13×/24h, `GET /api/mindmaps → 400`)

**Root cause** (`src/controllers/MindmapController.ts`, pre-#2650):
`resolveUserContext` cast `res.locals.subscriptionInfo` directly as `AnkifyAccessSubscription[]`. `res.locals.subscriptionInfo` is the single-object shape `{ active, email, linked_email }` set by `getSubscriptionInfo` — not an array. When `hasAnkifyAccess` called `subscriptions.some(...)` (`src/lib/ankify/access.ts:21`) on that object, it threw `TypeError: subscriptions.some is not a function`. The test middleware seeded `subscriptionInfo = []` (always an array), so the crash was prod-only.

**Fix on `main`:** Two commits address this in layers:
- `e86b678` (#2650): `resolveUserContext` now calls `SubscriptionService.getUserActiveSubscriptions(email)` asynchronously, returning a genuine `Subscriptions[]`. Falls back to `[]` when `email` is falsy.
- `33f462b`: `hasAnkifyAccess` gained an `Array.isArray` guard so callers passing `undefined`/`null` degrade to `false` rather than throwing.

`hasAnkifyAccess` itself remains the single source of truth. The fix is in the caller, not in loosening the function contract.

### Bug 2 — `ENOENT: no such file or directory, stat '/media/storage/uploads/mindmaps/<id>/<uuid>/*.png'` (15×/24h, `GET /api/mindmaps/images/... → 400`)

**Root cause** (`src/usecases/mindmaps/UploadMindmapImageUseCase.ts`, pre-#2686):
Images were written to the local disk path `UPLOAD_BASE/mindmaps/<userId>/<mapId>/<uuid>.<ext>` and served via `express.static`. The path is under `/media/storage/uploads/`, which is not a persistent volume — `systemd-tmpfiles` and server restarts wipe it. Any image uploaded before a deploy is permanently gone. The serve route then attempted `fs.stat` on the missing path and propagated an unhandled ENOENT as a 400.

**Fix on `main`:** `a3eb7c37` (#2686) migrated image storage end-to-end to DigitalOcean Spaces:
- Upload: `UploadMindmapImageUseCase` now calls `StorageHandler.uploadFile(s3Key, buffer)` with key shape `mindmaps/<userId>/<mapId>/<uuid>.<ext>`.
- Serve: `GET /api/mindmaps/images/:userId/:mapId/:file` calls `StorageHandler.objectExists(s3Key)` → 302 (presigned URL) or 410 (`{ code: 'image_missing' }`). No local disk, no ENOENT.
- Orphaned DB rows (image URL in old `/api/mindmaps/images/...` format): `GetMindmapUseCase` detects the legacy path pattern and returns `{ missing: true, url: null }`. The editor renders a dashed-border placeholder via `MindmapNode.tsx`.

---

## Riskiest assumption

**The SPACES_* env vars are configured in prod.** The S3 fix hard-requires `SPACES_ENDPOINT`, `SPACES_REGION`, `SPACES_DEFAULT_BUCKET_NAME` — no local-disk fallback. If any of these are absent or wrong in prod, every upload will fail at `StorageHandler` construction time.

**Smallest test before full deploy:** SSH into the prod box, run `pm2 env 0 | grep SPACES` and confirm all three vars are set. If any are missing, add them before deploying. Do not rely on the app starting cleanly as proof — `S3Client` construction does not fail on missing vars; the first `PutObjectCommand` does.

---

## Scope

**In:**
- Deploy the two fixes already on `main` to prod.
- Confirm SPACES vars are live in the prod env before deploy.
- Verify `GET /api/mindmaps` returns 200 for a non-patreon user post-deploy.
- Verify `GET /api/mindmaps/images/...` for a pre-2686 image URL returns 410 (not ENOENT/400).

**Out:**
- Back-filling lost images (originals on disk are gone; placeholder UX is the answer).
- Any change to `hasAnkifyAccess` itself — the guard is already in place.
- UI changes beyond what #2686 already shipped (`MindmapNode.tsx` placeholder).

---

## User story and acceptance criteria

A learner with Mindmaps open in the browser expects to see their maps and be able to click into them.

**AC1.** `GET /api/mindmaps` returns 200 with `{ maps: [...], access: { hasUnlimited, ... } }` for a non-patreon authenticated user.

**AC2.** `GET /api/mindmaps/images/<userId>/<mapId>/<file>` for an image uploaded after #2686 returns 302 to a valid presigned Spaces URL.

**AC3.** `GET /api/mindmaps/images/<userId>/<mapId>/<file>` for a pre-2686 image (never in Spaces) returns 410 `{ code: 'image_missing' }` — not 400, not ENOENT.

**AC4.** Opening a map that has a pre-2686 image renders a "Image unavailable" placeholder rather than a broken `<img>` tag.

---

## Leading indicator

`GET /api/mindmaps → 400` count (currently 13/24h) drops to 0 within the first hour post-deploy.
`GET /api/mindmaps/images/... → 400` count (currently 15/24h) drops to 0 within the first hour post-deploy.

Both are already logged in the existing access log — no new instrumentation needed. Query: `pm2 logs | grep 'GET /api/mindmaps' | grep ' 400 '`.

---

## Open questions

1. **Deployment window.** Both bug-fix commits have been on `main` since 2026-05-23 with no deploy since. Is there a reason the deploy was held? Confirm before `/deploy-status`.
2. **Spaces bucket ACL.** Do presigned URLs work without public-read? (`getSignedUrl` requires the bucket to have the object but the URL itself is pre-authenticated — should be fine, but confirm once in prod.)
3. **Orphaned rows count.** How many DB rows have `data.nodes[].image.url` in the old `/api/mindmaps/images/...` form? A quick `SELECT` on prod would confirm whether placeholder UX covers all affected maps or whether we should reach out proactively.

---

## Technical pre-flight

| Layer | File(s) | Change | Notes |
|---|---|---|---|
| Controller | `src/controllers/MindmapController.ts` | `resolveUserContext` is now `async`, calls `SubscriptionService.getUserActiveSubscriptions` | Already on `main` (`e86b678`) |
| Access | `src/lib/ankify/access.ts` | `Array.isArray` guard before `.some()` | Already on `main` (`33f462b`) |
| Use case | `src/usecases/mindmaps/UploadMindmapImageUseCase.ts` | Writes to S3 via `StorageHandler` | Already on `main` (`a3eb7c37`) |
| Use case | `src/usecases/mindmaps/GetMindmapUseCase.ts` | Resolves s3Key → presigned URL; marks legacy URLs as `missing` | Already on `main` (`a3eb7c37`) |
| Route | `src/routes/MindmapRouter.ts` | Serves image via 302/410; uses `multer.memoryStorage` | Already on `main` (`a3eb7c37`) |
| Storage | `src/lib/storage/StorageHandler.ts` | `objectExists`, `listByPrefix`, `deleteObjects` added | Already on `main` (`a3eb7c37`) |

**Effort:** No new code — this spec tracks two already-merged PRs that need a production deploy. Implementation work = pre-deploy env check + deploy + post-deploy verification.

**Tests:** Regression tests already ship with each commit:
- `src/routes/MindmapRouter.test.ts` — Auto Sync subscription regression case (89 passing).
- `src/usecases/mindmaps/GetMindmapUseCase.test.ts`, `UploadMindmapImageUseCase.test.ts`, `collectMindmapImages.test.ts`, `DeleteMindmapUseCase.test.ts` — S3 path coverage.

**Security:** No new user-controlled URL flows. S3 keys are server-generated (`randomUUID()`); `serveImage` constructs the key from path params but only calls `objectExists`/`getPresignedUrl` — no SSRF vector.

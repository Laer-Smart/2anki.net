# Spec: stop the SPA calling authenticated endpoints for logged-out users

**Slug:** `anon-authed-call-noise`
**Branch:** `fix/spec-anon-authed-calls`
**Type:** fix — no behavior change for logged-in users

---

## Outcome

Logged-out users land on any page without triggering a wave of 401 responses. Server logs go quiet on `GET /api/users/usage`, `GET /api/favorite`, `GET/PATCH /api/users/me/preferences`, and image-occlusion draft endpoints. No accidental login redirects for anonymous visitors.

---

## Problem

Prod logs (last 24 h) recorded ~535 needless 401s from four unauthenticated call sites. Each one wastes a round-trip, pollutes observability, and — where the `get()` helper defaults to `redirect: true` — risks bouncing anonymous users to `/login` unexpectedly.

---

## Call-site audit

| Endpoint | File | Auth-gated today? | Verdict |
|---|---|---|---|
| `GET /api/users/usage` | `web/src/lib/backend/getCardUsage.ts` → `useCardUsage` → `Sidebar.tsx` | `useCardUsage(enabled)` is called with `!paying`. `paying` is derived from `locals` (from `useUserLocals`). `useUserLocals` calls `GET /api/users/debug/locals` unconditionally — which itself 401s and throws. When that throws, `locals` is `undefined`, `isPayingUser(undefined)` returns false, `!paying` is true, so `useCardUsage` fires. The call uses the default `get()` which has `redirect: true`. | **Unintended over-call.** Gate on `locals != null`. |
| `GET /api/favorite` | `web/src/pages/SearchPage/helpers/useFavorites.tsx` → `SearchPresenter` | `SearchPresenter` is rendered only when `notionData.connected` is true. `notionData.connected` derives from `GET /api/users/notion-connection-info`, which 401s for anon users and sets `connected = false`. However `SearchPage/useFavorites` passes `redirect: false` through `Backend.getFavorites()`, so no redirect risk. The call only fires if `SearchPresenter` mounts. `SearchPresenter` only mounts when Notion is connected — but a freshly signed-out user with a stale React tree could trigger this in the transition window. The `FavoritesPage` version is only reachable via `/favorites`, which is a logged-in route. | **Low-risk but still a spurious 401.** Gate on `isLoggedIn` in `useFavorites` (pass it as an arg) so the effect skips when auth state is not yet confirmed or absent. |
| `GET /api/users/me/preferences` (fetch) | `web/src/lib/data_layer/userPreferencesSync.ts` | All five exported functions (`scheduleSync`, `acknowledgeAnkiWeb`, `fetchUserPreferences`, `dismissUploadPrimer`, `hydrateFromServer`) already call `isAuthed()` at the top and return early if the `token=` cookie is absent. | **Intentional — leave as-is.** The guard already exists. If 401s are still occurring here, the cookie check may be racing the browser writing the cookie on login; that is a separate investigation. |
| `PATCH /api/users/me/preferences` | Same file | Same `isAuthed()` guard. | **Intentional — leave as-is.** |
| `POST /api/image-occlusion/draft` | `web/src/pages/ImageOcclusionPage/ImageOcclusionPage.tsx` | `loadLatestDraft` (on mount) and the debounced `createDraft`/`updateDraft` effect both check `if (!isLoggedIn) return` before firing. `isLoggedIn = data?.locals != null`, where `data` comes from `useUserLocals`. When `useUserLocals` 401s (anon user), `data` is `undefined`, so `isLoggedIn` is false and neither call fires. Draft image upload (`uploadImageToServer`) is also gated: `if (isLoggedIn) { ... }`. | **Intentional — leave as-is.** The 50 `POST /api/image-occlusion/draft` 401s are likely from sessions expiring mid-session, not cold anon traffic. |

**Summary of changes needed:** two genuine call sites require a fix.

1. `useCardUsage` fires when `locals` is `undefined` (anon or loading). Pass `isLoggedIn` as the enabled flag, not `!paying`.
2. `SearchPage/useFavorites` fires unconditionally on mount inside `SearchPresenter`. Accept an `enabled` param and skip the effect when false.

---

## Riskiest assumption

`useUserLocals` returning `undefined` reliably means "not logged in" — not "still loading." If it returns `undefined` transiently during the initial fetch (before settling), gating on `data != null` would suppress the call even for authenticated users until the locals query resolves.

**Smallest test:** in `Sidebar.test.tsx`, assert that `getCardUsage` is never called when the component receives `locals = undefined`. In `useFavorites.test.ts`, assert that `backend.getFavorites` is never called when `enabled = false`. Both tests should be unit-level mocks on the fetch boundary.

---

## Scope

**In:**
- `web/src/lib/hooks/useCardUsage.ts` — change the `enabled` semantics so that callers pass `isLoggedIn && !paying` (two conditions) rather than `!paying` alone.
- `web/src/components/AppShell/Sidebar.tsx` — derive `isLoggedIn` from `locals != null` and pass it through.
- `web/src/pages/SearchPage/helpers/useFavorites.tsx` — add an `enabled: boolean` parameter; skip the effect when false.
- `web/src/pages/SearchPage/components/SearchPresenter.tsx` — pass `enabled={isLoggedIn}` where `isLoggedIn` is threaded in from `SearchContainer` or derived from a new `useUserLocals` call.

**Out:**
- `userPreferencesSync.ts` — already guarded; do not touch.
- `ImageOcclusionPage.tsx` — already guarded; do not touch.
- Any server-side endpoint — auth stays as-is.
- `useUserLocals` itself — do not change retry behavior or stale-time.

---

## Acceptance criteria

1. Loading the `/upload` page (or any public page) as an unauthenticated visitor produces zero `GET /api/users/usage` requests in the browser's Network panel.
2. Loading `/notion` as an unauthenticated visitor produces zero `GET /api/favorite` requests.
3. Logged-in users still see the card-usage counter and favorites list with no regression.
4. No accidental redirect to `/login` for anonymous visitors on public pages.
5. Vitest suite green; no new TypeScript errors.

---

## Leading indicator

`GET /api/users/usage` 401 count in server logs drops from ~182/day to near 0. `GET /api/favorite` 401 count drops from ~171/day to near 0. Monitor for 24 h after deploy.

---

## Open questions

1. Should `useUserLocals` add a `staleTime` so auth state is shared across all consumers from a single request rather than refetching per component? Out of scope for this fix but worth noting.
2. The `FavoritesPage` `useFavorites` hook also has no `enabled` guard — the page itself is presumably auth-protected at the route level, so this may already be safe. Confirm during implementation.

---

## Technical pre-flight

- `useUserLocals` uses React Query with `retry: 3`. The `data` field is `undefined` until the first successful response. Gating on `data != null` means the usage counter and favorites fetch are deferred until auth state is confirmed — acceptable UX (a brief extra tick of loading).
- `useCardUsage` already accepts an `enabled: boolean` param and gates the effect on it. The only change needed is the caller passing the right value.
- `SearchPresenter` currently instantiates `new Backend()` directly inside the component — a separate smell, but out of scope; just thread `enabled` through the existing `useFavorites` hook signature.
- No server changes, no migrations, no new dependencies.

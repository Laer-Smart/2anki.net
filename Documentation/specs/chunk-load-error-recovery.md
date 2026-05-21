# Spec: Chunk-load error recovery after deploy

### Trio synthesis
- PM: Al sees the "Something went wrong loading 2anki" screen daily after deploys, and any user with an open tab when we ship gets the same dead end. We ship multiple times a day — every shipper is generating a small wave of users who hit a broken-looking app, and most of them don't have the muscle memory to hard-reload. This is the single highest-frequency UX failure on the site right now, and it specifically punishes the most engaged users (the ones who keep tabs open). Fixing it is a small client-only change, no infra coordination.
- Designer: The current `RootErrorBoundary` is correct for *real* application errors — keep its copy and structure as-is. The chunk-load failure mode should never reach the boundary; it should be intercepted earlier and resolved with a silent reload. If the silent reload itself fails (loop guard), only then fall back to the boundary, with copy that nudges toward "your browser is using an old version of the page" rather than the generic "something went wrong". No new visible UI in the happy path.
- Engineer: One-time silent reload on `ChunkLoadError` / dynamic-import `TypeError`, gated by a sessionStorage flag to prevent reload loops. Lives in `web/src/main.tsx` (or a new `web/src/lib/chunkReload.ts`) as a `window.addEventListener('error', …)` + `'unhandledrejection'` listener registered before React mounts. Add a secondary check in `RootErrorBoundary.componentDidCatch` so anything that slips past the global listener still triggers reload-on-first-encounter. Effort **S** — ~50-100 lines + tests.
- Agreement: Client-only fix in this PR. Strip the chunk-load failure out of the error boundary's happy path; trigger one silent reload on first detection per tab. Keep the existing boundary copy/UI for genuine errors.
- Conflict: Engineer initially proposed only the global `window.addEventListener('error')` path. Designer pushed back — React swallows lazy-import rejections into the boundary, so the global listener won't catch every case. Resolved by adding both: global listener catches the unhandledrejection path, boundary catches the React-internal path, both route to the same `recoverFromChunkError()` helper that owns the loop guard.
- Resulting plan: New `web/src/lib/chunkReload.ts` exports `isChunkLoadError(error)` and `recoverFromChunkError(error)`. `main.tsx` wires the global listeners before `createRoot(...).render(...)`. `RootErrorBoundary.componentDidCatch` calls `recoverFromChunkError(error)` before rendering the fallback UI; if it triggers a reload, the boundary's render is unreachable. SessionStorage flag `2anki:chunkReload:lastAt` stores a timestamp; if a second chunk-load error fires within 30s of the stored timestamp, we *don't* reload again and let the boundary render with chunk-specific copy ("This page was updated. Reload manually to load the latest version.").

**Outcome**: Daily occurrence rate of the `RootErrorBoundary` "Something went wrong loading 2anki" screen drops to ~zero for the chunk-load failure mode. Measured by the existing Sentry/error reporting hook in `RootErrorBoundary.componentDidCatch` — we expect a step-change drop on the day this ships. Target: chunk-load-error reports drop from "daily, post-deploy spike" to "only when the loop guard fires" (genuine cascading failure, should be effectively zero).

**Goal alignment**: "Simplest, fastest way to turn what you're studying into beautiful Anki flashcards." A user mid-upload who hits a stale-chunk failure either loses the upload or has to figure out the reload-and-reset dance — both add friction at the worst moment. Removing this failure mode is pure removal of friction; nothing new to learn, nothing new on screen.

**Problem**: When we deploy, Vite hashes each route's lazy chunk into a new filename (`SearchPage-BWEtNANQ.js` → `SearchPage-XYZABCDE.js`). Any browser tab that loaded the previous `index.html` is still holding a reference to the old chunk name. When the user navigates to a lazy route (or one of the lazy imports fires), the request for the old chunk hits nginx, nginx falls back to serving `index.html` (the SPA catch-all), and the browser refuses to execute `text/html` as a module. The promise from `import(…)` rejects, React renders the `RootErrorBoundary`, and the user sees `Something went wrong loading 2anki`. The real cause — a successful deploy — is invisible to them, and the "Reload" / "Reset local data" buttons look like the app is unstable. Console signature: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`, followed by `TypeError: Failed to fetch dynamically imported module: https://2anki.net/assets/<chunk>.js`.

**Riskiest assumption**: That `error.name === 'ChunkLoadError'` or `error.message` matching `/Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/` reliably identifies *this* failure mode and not unrelated dynamic imports that legitimately failed (e.g., user is offline). If we silently reload on transient network failures while a user is offline, we trap them in a reload loop until the network comes back. The sessionStorage loop guard (30s minimum interval, max 1 reload per tab session) keeps the loop bounded.

**Smallest test**: Unit test that calls `recoverFromChunkError(new Error('Failed to fetch dynamically imported module …'))` once and confirms (a) `location.reload` is called, (b) the sessionStorage flag is set, (c) a second call within the cooldown window does *not* call `reload` and does *not* update the timestamp. Mock `window.location.reload` and `window.sessionStorage`.

**Scope**:

*In:*
- `web/src/lib/chunkReload.ts` — new module exporting `isChunkLoadError(unknown): boolean` and `recoverFromChunkError(unknown): boolean` (returns true if a reload was triggered).
- `web/src/lib/chunkReload.test.ts` — Vitest coverage for the matcher, the loop guard, and the cooldown timestamp.
- `web/src/main.tsx` — register `window.addEventListener('error', …)` and `window.addEventListener('unhandledrejection', …)` before `createRoot(...).render(...)`. Both delegate to `recoverFromChunkError`.
- `web/src/components/RootErrorBoundary/RootErrorBoundary.tsx` — in `componentDidCatch`, call `recoverFromChunkError(error)` before the existing `onError` hook. If it returns true, `setState({ error: null })` so the boundary unmounts itself before the reload races in.
- `web/src/components/RootErrorBoundary/RootErrorBoundary.test.tsx` — extend existing tests (or add one) to confirm the chunk-load case does *not* render the fallback UI on first hit.

*Out:*
- Keeping the previous build's hashed assets on disk (server-side / nginx change). Documented below as the v2 belt-and-suspenders move, but not required to fix the user-visible bug.
- Service-worker-based asset pre-caching. Different architecture, not warranted by this report.
- Version-manifest polling to prompt "a new version is available — reload?". Out of scope; the silent reload covers it for free.
- Changing the deploy pipeline. The fix is client-only by design.

**User story**: As Al (or any returning user) with a tab open from before the last deploy, when I click a lazy route the page reloads itself once, I see the new version, and I never know anything went wrong.

**Acceptance criteria**:
- [ ] `isChunkLoadError(error)` returns true for: `ChunkLoadError` (Webpack-style, kept for safety), `TypeError: Failed to fetch dynamically imported module …`, and `TypeError: error loading dynamically imported module …`.
- [ ] `recoverFromChunkError(error)` calls `location.reload()` exactly once when called multiple times within the cooldown window, and returns `true` only on the call that triggered the reload.
- [ ] `main.tsx` global listeners catch the unhandledrejection path before React boundary kicks in (verified by triggering a fake dynamic-import failure in a test page).
- [ ] After the listeners are in place, an actual deploy *does not* render the `RootErrorBoundary` on a tab that was open during the deploy — the tab reloads and continues working. Verified manually post-merge.
- [ ] Loop guard: with `2anki:chunkReload:lastAt` set to `Date.now()`, calling `recoverFromChunkError` again does not trigger a reload; the boundary then renders with chunk-specific copy.
- [ ] Existing `RootErrorBoundary` tests still pass; non-chunk errors continue to render the existing fallback UI unchanged.

**Open questions**:
- Cooldown window — 30s or 60s? (Recommend 30s. The legitimate-failure case is "user is offline at chunk-load time"; once they refresh once, a real outage will still keep them on the boundary screen rather than loop.) Engineer to call it.
- Track the recovery as an analytics event? (Recommend yes, one event per `recoverFromChunkError` reload trigger, so we can measure post-deploy waves. Re-uses the existing `track()` helper. Out of v1 scope if it slows the PR.)
- Should the second-failure copy on the boundary tell the user the cause? (Recommend: yes — "This page was updated while you had it open. Reload to load the latest version." Honest, specific, no fake warmth per VOICE.md.)

**Out of scope (next iteration)**:
- v2 belt-and-suspenders: keep the previous build's assets on disk for 24h so stale tabs keep loading old chunks until the user navigates. Requires a deploy script change to rsync into a versioned dir + nginx config to fall through versioned dirs before the SPA catch-all. Useful but not necessary once the client-side reload lands.

## Design notes

**User moment**: The user opened a tab last night, left it open, came back this morning. They click "Search Notion". Today: the screen flashes white, the "Something went wrong" card appears, and they wonder if their work is lost. After this ship: the page silently reloads, takes ~600ms, and they're on the Search Notion page with their session intact.

**Surface changes**: None in the happy path. The only visible UI change is the second-failure copy on the existing `RootErrorBoundary`:

- Existing copy (kept for genuine errors): `Something went wrong loading 2anki` / `Try reloading. If that doesn't help, reset local data and reload.`
- New copy (only when chunk-load fired twice in 30s — strong signal of a real outage or a misbehaving browser cache): `This page was updated while you had it open.` / `Reload to load the latest version. If reload doesn't help, reset local data and reload.`

Per VOICE.md: sentence case, no trailing period on the headline, no fake warmth, specific over generic. The new copy names the cause (the page was updated, not "something went wrong") and tells the user what to do (reload).

**No new component, no new design token.** Reuses `RootErrorBoundary`'s existing card + button layout.

**Verdict**: Pure removal of an unwanted state. No design review needed beyond the second-failure copy above.

## Technical pre-flight

**Layers touched**:
- `web/src/lib/` (new helper module)
- `web/src/main.tsx` (global listener registration)
- `web/src/components/RootErrorBoundary/` (delegate to helper + new second-failure branch)

**Files in play**:
- `web/src/lib/chunkReload.ts` — **NEW**. Exports `isChunkLoadError(unknown): boolean` and `recoverFromChunkError(unknown): boolean`. Owns the sessionStorage key `2anki:chunkReload:lastAt` and the 30s cooldown constant.
- `web/src/lib/chunkReload.test.ts` — **NEW**. Vitest. Mocks `globalThis.location` and `globalThis.sessionStorage`.
- `web/src/main.tsx` — register `window.addEventListener('error', handler)` and `window.addEventListener('unhandledrejection', handler)` before `createRoot(rootEl).render(...)`. Handler calls `recoverFromChunkError(event.error ?? event.reason)`.
- `web/src/components/RootErrorBoundary/RootErrorBoundary.tsx` — in `componentDidCatch`, call `recoverFromChunkError(error)`; if it triggers a reload, `setState({ error: null })` to prevent a frame of the fallback UI. Add a `chunkLoad: boolean` derivation in `getDerivedStateFromError` so the render method can branch to the new copy for the second-failure case.
- `web/src/components/RootErrorBoundary/RootErrorBoundary.test.tsx` — extend with two cases: (1) on chunk-load error, the fallback UI is *not* rendered (reload is triggered, boundary unmounts), (2) on second chunk-load error within cooldown, the new "This page was updated" copy renders.

**Cross-language coordination**: None. Pure web-app change.

**Estimated effort**: **S**. ~50-100 lines of code + tests. Single PR, single workspace (`web/`).

**Security/testing/migration**:
- *Security*: No new external calls, no `eval`, no innerHTML manipulation. Reads + writes one sessionStorage key on the same origin.
- *Testing*: Unit tests for the matcher (regex coverage), the loop guard (cooldown semantics), and the boundary integration. Manual smoke test post-merge: open a tab, deploy, click a lazy route — confirm silent reload.
- *Migration*: None.

**Coordination flags for parallel bets**: None known. `web/src/main.tsx` is a low-churn file; if any parallel bet touches it, coordinate merge order.

**Rollout**: Ships behind no flag. The behavior change is fail-safe (worst case: a user hits the existing boundary, which is the current behavior). If it misbehaves in production, revert the PR — the helper is additive.

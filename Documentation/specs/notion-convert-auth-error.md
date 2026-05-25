# Notion convert — friendly session-expiry instead of raw "Authentication required"

## Outcome

A signed-in Notion user whose 2anki **session** has expired clicks "convert" and gets a clear, actionable "Your session expired — sign in again" prompt that returns them to the page, instead of a raw `{"message":"Authentication required"}` JSON blob. **Goal alignment:** removes a confusing dead-end on the core conversion path (simpler/more beautiful) and recovers an abandoned conversion (a real user this week bounced on it).

## Problem

A returning Notion user (observed this week, Safari on macOS) had the Notion workspace view open — workspace name, page list, "Switch workspace" all rendered — clicked to convert a page, and saw a banner showing the literal JSON `{"message":"Authentication required"}` with only a "Dismiss" button. Dead end.

Root of the surfaced error:
- `RequireAuthentication` returns `401 { message: "Authentication required" }` when the **2anki session** (`res.locals.owner`) is absent — this is the app login session, **not** the Notion OAuth token (that's the separate `notion_unauthorized` case in [`notion-dead-token-recovery`](notion-dead-token-recovery.md)).
- `Backend.convert` (`web/src/lib/backend/Backend.ts:329`) calls `post('notion/convert', …)`. The `post` helper (`web/src/lib/backend/api.ts:42`) returns the raw `Response` and does **no** 401 handling — unlike `get` (`api.ts:73`), which on 401 calls `redirectToLogin()`. So a 401 on a mutating action surfaces its raw body.
- `classifyError` (`web/src/components/errors/helpers/getErrorMessage.ts`) maps `unauthorized`/`401` → "Session expired. Sign in again." but does **not** match the literal string `"Authentication required"`, so it falls through to the raw-string branch and renders the whole JSON.

**Why the page looked logged-in while convert 401'd:** the page list was served from cache (react-query) from when the session was valid; the live convert POST hit the server after the session lapsed. Logs corroborate the pattern: `POST /api/notion/pages → 401` **11×/24h**.

Two defects: (1) **raw API JSON leaked to the user** (CWE-209, VOICE violation); (2) **session-expiry on a POST dead-ends** instead of prompting re-login — an asymmetry with the `get` path.

## Riskiest assumption

That this is plain session-TTL expiry, recoverable by re-login. The alternative: a **Safari cookie/SameSite/ITP** issue dropping the 2anki session cookie so POSTs lose auth while cached GETs still look fine (the session was Safari 26.2 / macOS — Safari is strictest on cookies). **Smallest test to disprove:** reproduce in Safari with the 2anki session cookie expired/cleared; confirm `convert`'s POST actually sends `credentials: 'include'` (it does, via `post`) and inspect whether Safari is purging the cookie vs genuine TTL expiry. If Safari is dropping the cookie, the fix expands to the session cookie's `SameSite`/attributes — out of scope of the UI fix but flagged here.

## Scope

**In:**
- `classifyError`: add `"authentication required"` to the existing 401/unauthorized branch → friendly "Your session expired. Sign in again to continue."
- Convert (and other mutating `post` actions) must handle 401 like `get` does: surface the friendly re-auth prompt / route to login — **never** render the raw response body. Centralize 401 handling (in `post`, or a shared response handler) rather than per-call-site.
- Sign-in action returns the user to where they were (preserve the Notion page/intent via a `redirect` param) so they can finish converting.
- Guarantee no raw API JSON is ever rendered in the convert error banner (parse → `classifyError` → `ErrorPresenter`).

**Out:**
- Changing session TTL or the auth mechanism itself.
- Notion **token** (`notion_unauthorized`) handling — covered by [`notion-dead-token-recovery`](notion-dead-token-recovery.md). These are two different 401s (2anki session vs Notion OAuth token); keep their messages distinct.
- Deep Safari cookie/SameSite changes — only investigate per the riskiest-assumption test; spec separately if confirmed.

## User story & acceptance criteria

*As a returning Notion user whose login session quietly expired, I want a clear "sign in again" prompt when I try to convert, so I can re-auth and finish — not a JSON error I can only dismiss.*

- [ ] Converting with an expired 2anki session shows "Your session expired. Sign in again to continue." with a **Sign in** action — never raw JSON.
- [ ] `classifyError` maps a 401 / `"Authentication required"` body to the session-expired friendly message.
- [ ] The Sign in action routes through `/login` and returns the user to the Notion page afterward.
- [ ] No mutating action (`convert`, favorite, etc.) renders a raw response body on 401.
- [ ] Notion-token expiry still shows its own distinct "Reconnect Notion" copy (no regression vs the dead-token spec).

## Leading indicator

`POST /api/notion/* → 401` events that end in a re-login + successful retry rise (recovered conversions); raw-JSON error impressions in session replays drop to zero.

## Design notes

- **Copy (per VOICE.md):** title "Your session expired", detail "Sign in again to keep converting.", action "Sign in" → `/login?redirect=<current>`. Reuse `ErrorPresenter`; mirror the `NOTION_UNAUTHORIZED` pattern but keep it distinct (session, not Notion token).
- Point-of-use, in the same banner slot the convert error already uses. No global banner.
- Do not show a bare "Dismiss"-only state for an auth error — the primary action must be recovery (sign in).

## Technical pre-flight

- **Layers:** `web` (api 401 handling, `classifyError`, convert error rendering). Server side already returns a consistent `401 {message}` shape — no server change required for the fix itself.
- **Files in play:** `web/src/lib/backend/api.ts` (`post` 401 handling, `get` is the reference at `:73`), `web/src/lib/backend/Backend.ts:329` (`convert`), `web/src/components/errors/helpers/getErrorMessage.ts` (`classifyError`), `web/src/pages/SearchPage/SearchPage.tsx` + its convert error surface; reference: `src/routes/middleware/RequireAuthentication.ts:33`.
- **Effort:** **S–M** — small web change; the care is in centralizing 401 handling without breaking flows that intentionally tolerate 401 (e.g. `getFavorites` uses `redirect: false`).
- **Security / testing:**
  - Never render raw error bodies to users (CWE-209).
  - Touches the auth/session path → **`/security-review` at implement time.**
  - Tests: web Vitest for `classifyError` mapping the `"Authentication required"` 401, and for the convert path surfacing the friendly prompt (not raw JSON) on 401.
- **Open question:** centralize 401 → re-auth in `post` itself vs a shared `handleResponse` used by both `get` and `post`? Prefer the shared handler so behavior is consistent and `redirect: false` opt-outs still work.

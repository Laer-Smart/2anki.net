# Spec: post-login landing for non-Notion users

**Slug:** post-login-landing-non-notion
**Branch:** feat/spec-post-login-landing
**Status:** draft

---

## Outcome + goal alignment

A user who signs in without a Notion connection should land on a page that lets them make their first deck immediately — by uploading a file. Right now they land on `/notion`, which leads with "Connect your Notion workspace" and buries "Upload a file" as a secondary fallback. This wastes the most important moment in the session and contradicts the mission: give people the simplest, fastest way to make Anki cards.

Fixing this is a direct conversion unlock. A first-session user who can drop a PDF or zip and get a deck back in 60 seconds is far more likely to return than one who hits a Notion auth wall they don't need.

---

## Problem — the user moment

**Who:** A user who signed in with Google (or email+password) and has never connected a Notion workspace. They came from a search for "PDF to Anki" or a friend's link.

**What they see now:** The `/notion` route renders `SearchPage`, which calls `useNotionData`. Because no Notion token exists, `notionData.connected === false`, so `SearchPage` renders `ConnectNotion`. The page heading reads "Get started." The primary action is "Connect to Notion." Upload appears only as grey fallback text: "Or upload a file you exported from Notion."

**Why this is wrong:**
1. The primary action requires a Notion account they may not have.
2. The secondary action is phrased as a Notion fallback ("exported from Notion"), which excludes PDF, xlsx, and markdown users.
3. The user has no path to their actual goal without first understanding what they do *not* need.

**Two separate root causes:**

- `getRedirect()` in `src/controllers/helpers/getRedirect.ts` returns `/notion` as the hardcoded default for every login with no `redirect` param. This affects the server-side login endpoint (line 61 of `getRedirect.ts`) and the Notion OAuth callback (`UsersControllers.ts:883`).
- The frontend `SearchPage` always renders `ConnectNotion` when `notionData.connected === false`, regardless of whether the user has any Notion history.

**Cross-reference:** PR #2770 (`Documentation/specs/notion-dead-token-recovery.md`) addresses unauthenticated post-Stripe buyers who also land on `/notion`. That spec handles a different entry point (Stripe checkout → `/notion` with an expired token). This spec handles the common case: direct login with no Notion history. Do not duplicate the token-recovery logic here; implement that spec independently.

---

## Recommendation: option (a) — change the default post-login landing to `/upload` for non-Notion users

**Decision:** Redirect non-Notion users to `/upload`, not to `/notion`. Do not redesign the `/notion` empty state as a hybrid upload+Notion page. Reasons:

- `/upload` already exists, works on 375 px, and has no Notion call on load. Zero new UI required.
- Splitting concerns keeps `/notion` clean: it means "Notion conversion." A hybrid empty state dilutes that.
- The segmentation is already computable server-side: a user with no Notion token in the DB is a file-only user by definition.

The secondary action ("Connect Notion") already appears in the top navigation for users who later want it. No need to surface it on the landing itself.

---

## Segmentation rule

| User state | Post-login landing | Rationale |
|---|---|---|
| Has a live Notion token | `/notion` (unchanged) | They connected Notion; Notion search is their primary path. |
| No Notion token (never connected, or revoked) | `/upload` | File upload is the default path for everyone else. |
| Came from Notion OAuth callback (just connected) | `/notion` (unchanged) | They just authorized; send them to the Notion search immediately. |
| Has an explicit `?redirect=` param | That param's target | Respect an explicit intent signal from the caller. |

The server already knows which branch to take: `getRedirect()` has the request context, and `UsersControllers` has the user row. The Notion token presence is checkable against the DB at login time.

---

## Riskiest assumption + smallest test

**Assumption:** Most users who land on `/upload` will complete a conversion without needing Notion. If a meaningful cohort actually needs Notion and now can't find it, we've moved the friction not removed it.

**Smallest test:** Ship the redirect change behind a feature flag (or simply ship it and measure for one week). Leading indicator: `/upload` → download completion rate for users who arrived from post-login redirect, compared to same cohort's `/notion` → download completion rate in the previous period. If the upload completion rate is not higher, revert and investigate.

---

## Scope in / out

**In:**
- Change `getRedirect()` default from `'/notion'` to `'/upload'` when the user has no Notion connection.
- Check Notion connection status at login time in `UsersControllers` login handler and the Notion OAuth callback.
- Update `getRedirect.ts` test expectations from `/notion` to `/upload` for the no-redirect-param cases.
- Add `/upload` to `ALLOWED_REDIRECT_PATHS` in `getRedirect.ts` (it is already listed; verify).

**Out:**
- Do not redesign `ConnectNotion.tsx` or `SearchPage.tsx`.
- Do not change the `/notion` route or the Notion OAuth callback destination for users who *have* a token.
- Do not change the `SearchPage` "Get started" header copy — that is a separate polish pass.
- Do not touch the Stripe checkout redirect path (handled in PR #2770).
- Do not add a new "Get started" hub page. `/upload` is sufficient.

---

## User story + acceptance criteria

**Story:** As a user who just signed in without a Notion account, I want to land somewhere I can immediately make a deck, so I don't hit a wall asking me to connect a tool I don't use.

**Acceptance criteria:**

1. A user who logs in via email+password with no Notion token in the DB is redirected to `/upload`.
2. A user who logs in via Google with no Notion token in the DB is redirected to `/upload`.
3. A user who logs in and has a live Notion token is redirected to `/notion` (no regression).
4. A `?redirect=<path>` query param still overrides the default for both groups (existing behavior preserved).
5. After completing the Notion OAuth flow for the first time, the user lands on `/notion` (no regression).
6. `/upload` appears in `ALLOWED_REDIRECT_PATHS` (or the allowlist is updated accordingly).
7. All existing `getRedirect` tests pass after updating the default expectation from `/notion` to `/upload`.

---

## Design notes

### What the user sees on `/upload`

`/upload` (the existing `UploadPage`) already provides:
- A file drop zone accepting `.zip`, `.html`, `.md`, `.csv`, `.xlsx`.
- No Notion call on mount.
- A heading: "Upload" (currently). No change required for this spec.

The Notion connection option is available from the navigation bar's "Notion" item for any user who later wants it. No additional copy is needed on `/upload` to advertise Notion; the nav link is sufficient.

### Copy that does NOT change in this spec

- `ConnectNotion.tsx`: "Connect your Notion workspace" heading and "Connect to Notion" button. These are correct for users who actually land on `/notion`.
- `SearchPage` subtitle copy.
- Navigation bar labels.

### Copy guidance for a follow-on polish pass (out of scope here)

If the team later redesigns the `ConnectNotion` empty state (for users who navigate to `/notion` directly after registering), use this copy:

- Heading: "Convert a Notion page"
- Body: "Search and convert pages directly. We only read the pages you share with 2anki."
- Primary: "Connect Notion" (link-styled, not primary button weight — because `/upload` is now the true entry point)
- Below: "Or upload a file — .zip, .html, .md, .csv, .xlsx" → "Upload a file" (secondary)

This is not part of this spec's implementation. Flag it as a follow-up.

---

## Leading indicator

**Upload completion rate from post-login redirect** — the percentage of users who arrive at `/upload` from the post-login redirect and successfully download a deck within the same session. Target: higher than the pre-change baseline for the same cohort on `/notion`. Measure for 7 days after deploy.

Secondary: `/notion` visit rate from the nav bar among users who landed on `/upload` first. If it rises, Notion users are finding their way; if it's flat, they were already not engaging.

---

## Technical pre-flight

### Files that decide the landing

| File | Role | What changes |
|---|---|---|
| `src/controllers/helpers/getRedirect.ts` | Returns the default redirect when no `?redirect=` param is present. Default is hard-coded to `/notion` (lines 60–61 and 67). | Change the default return value. Needs to become context-aware: return `/upload` unless the user has a Notion token. This requires passing the user's Notion-connected state into `getRedirect`, or handling the branch in the caller (`UsersControllers`). Simplest: leave `getRedirect` returning `/notion` as a safe fallback for unknown context, and override in `UsersControllers` where the user row is available. |
| `src/controllers/UsersControllers.ts:883` | Notion OAuth callback redirect — currently hardcoded `res.redirect('/notion')`. | Keep as-is (user just connected Notion; `/notion` is correct). |
| `src/controllers/UsersControllers.ts` (login handler) | Calls `getRedirect(req)` and returns the result in the `{ token, redirect }` JSON body. | After login, if no `redirect` query param was provided and the user has no Notion token, return `redirect: '/upload'` instead of `/notion`. |
| `web/src/pages/LoginPage/components/LoginForm/helpers/useHandleLoginSubmit.ts:52` | Client reads `redirect` from the login response and navigates there. | No change needed — it already respects whatever the server returns. |
| `web/src/pages/MagicLinkPage/MagicLinkPage.tsx:52` | Magic link login redirect, same pattern. | Same fix as the login handler — pass `/upload` as default when user has no Notion token. |
| `src/controllers/helpers/getRedirect.test.ts` | Tests assert the default is `/notion`. | Update test expectations for the no-param cases to `/upload` after the logic moves. |

### Effort estimate

Small. The logic change is two to three lines in `UsersControllers` (one for each login path: email/password, Google OAuth, magic link). The test update is mechanical. No new components, no migrations, no new routes.

The engineer should confirm whether the Notion-connection check can be done cheaply at login time (the user row is already loaded; a Notion token lookup adds one DB read or can be folded into the existing user-fetch query).

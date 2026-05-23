# Spec: Sign in with Apple

### Trio synthesis

- **PM** — Apple unlocks the Apple-ID-only segment that overlaps hardest with our self-directed-learner ICP (iPhone language learners, iPad professionals studying for certs); target +1.5–2.5pp /register completion in 30 days. Mint the ES256 client-secret per request; do **not** build a rotation cron. Pre-test SendGrid → `@privaterelay.appleid.com` delivery before writing any code.
- **Designer** — Apple button at position 3 (Google → Notion → Apple → Microsoft on /login; Notion → Google → Apple → Microsoft on /register), black background with white Apple mark — acts as a natural anchor in an otherwise white-bordered row. Apple HIG locks the exact label "Sign in with Apple" on both pages; accept the asymmetry vs. how Microsoft shipped.
- **Engineer** — Effort **L** (vs Microsoft's M). Six new mechanisms: ES256 JWT minting, scoped `urlencoded` middleware on the callback route, `state`-cookie CSRF defense with `sameSite=none; Secure` (the real footgun — `lax` blocks Apple's cross-site POST), `/.well-known/apple-developer-domain-association.txt` route, first-sign-in name capture from the form-post body, and the new ES256 verification branch in JWKS code. No DB migration — `oauth_identities` already accepts `provider='apple'`.
- **Agreement** — Mirror Microsoft's `oauth_identities` subject-keyed linkage; per-request client-secret minting; no schema change; require `email_verified === true`; SendGrid relay pre-test is gate 0.
- **Conflict** — Designer wants Apple at position 3 (mobile traffic), default convention was "newest provider last." Resolved: designer wins; the mobile-traffic argument is strong and Microsoft already gets less mobile usage than Apple would. Designer also breaks the "Sign up with X" /register convention by using "Sign in with Apple" on both pages. Resolved: Apple HIG is non-negotiable; spec-level annotation calls this out.
- **Resulting plan** — Ship login + register together. Build the ES256 mint inline in `AuthenticationService.ts`, scope `urlencoded` to the callback route only, add a `WellKnownRouter` for the domain-association file, persist Apple-supplied name on first sign-in. Gate everything on a 30-minute deliverability pre-test through SendGrid → a real `@privaterelay.appleid.com` address.

---

**Outcome**: Lift `/register` completion rate by +1.5–2.5pp within 30 days of launch by removing the Apple-ID-only segment's email-input bounce. Concretely: +200–350 net new activated accounts/month at current traffic. Secondary: total new signups/week +3–5% within 30 days.

**Goal alignment**: Microsoft (PR #2688) unlocked ~1137 hotmail/outlook users. Apple unlocks the segment that overlaps hardest with our self-directed-learner ICP — language learners on iPhone, professionals studying on iPad. Each provider added is one fewer reason for a busy learner to bounce. Direct simpler/faster lever toward 300K users.

**Problem**: A Mac/iOS user lands on `/login` from a search result on their iPhone. They use Sign in with Apple for everything — it's the one-tap path on iOS that also hides their real email. Today they see Google, Notion, and Microsoft. None are their daily driver. They back out. Directional sizing: of ~50K active users, the Apple-only segment is plausibly 3–6% (industry baseline for Apple-only consumer auth on EDU/productivity tools) — so ~1.5K–3K addressable today and a higher share of new mobile signups.

**Riskiest assumption**: That signups via Apple activate (upload + convert within 7 days) at parity with Google/Microsoft signups. The risk is **`@privaterelay.appleid.com` relay deliverability** — if SendGrid can't deliver our magic-link, deck-ready, and reset emails to the relay, every Apple signup is a leak.

**Smallest test**: 30 minutes of work. Send the magic-link, deck-ready, and password-reset templates from SendGrid to a known `@privaterelay.appleid.com` address (set up from a personal Apple ID). Confirm: delivery, click-through, and that `instrumentedAxios`/SendGrid logs don't flag it. **If relay delivery fails, this spec is dead until we register 2anki.net as an Apple Email Source in the developer console.** Run this before any code is written.

**Scope (in)**:
- `/login` + `/register` Apple button (parity with Microsoft).
- `GET /api/users/auth/apple/init` issues `state` cookie + redirects to Apple.
- `POST /api/users/auth/apple` callback (form_post mode), with scoped `urlencoded` middleware.
- `state` cookie verification (`sameSite=none; Secure`) before any DB touch.
- `oauth_identities` row with `provider='apple'`, `subject=<Apple sub>`.
- Account linking by verified email when the existing email matches and `email_verified === true`.
- First-sign-in name capture from the form-post `user` JSON; persist via `UsersRepository.updateName` (new two-line method).
- `/.well-known/apple-developer-domain-association.txt` route.
- ES256 client-secret minted per request from `APPLE_PRIVATE_KEY` env var.
- Server-side env: `APPLE_TEAM_ID`, `APPLE_SERVICES_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_REDIRECT_URI`, `APPLE_DOMAIN_ASSOCIATION`.
- Changelog entry.

**Scope (out)** — explicitly deferred to a follow-up issue:
- GDPR-style account-deletion endpoint Apple requires within ~6 months of launch (`POST /api/users/delete-account` with Apple Services ID auth). Track as `apple-account-deletion-followup`.
- iOS native Sign in with Apple SDK (we're web-only).
- Android/web Passkeys.
- Settings-page "Connect Apple ID" for existing accounts.
- A rotation cron for the client-secret JWT (per-request minting eliminates the need).
- An `email_is_relay` flag surfaced in account settings (defer until users ask).

**User story**: As a Mac/iOS user who uses Apple ID for everything, I want to sign in to 2anki with Apple so I can convert my Notion notes without creating another password or exposing my real email.

**Acceptance criteria**:
- [ ] SendGrid → `@privaterelay.appleid.com` deliverability test passes for magic-link, deck-ready, and password-reset templates (gate 0; no code until this passes).
- [ ] Apple button renders fourth on `/login` and `/register`, black background with white Apple mark, label "Sign in with Apple" on both pages, 20×20 logo, button height matches Microsoft.
- [ ] `GET /api/users/auth/apple/init` sets `apple_login_state` cookie (`httpOnly`, `sameSite=none`, `Secure`) and redirects to Apple.
- [ ] `POST /api/users/auth/apple` rejects with redirect to `/login` when `state` cookie missing or mismatched.
- [ ] Callback validates `id_token` signature against Apple JWKS (ES256), audience equals `APPLE_SERVICES_ID`, issuer exactly `https://appleid.apple.com`, requires `email_verified === true`.
- [ ] First sign-in persists `firstName + lastName` from `req.body.user` if present; subsequent sign-ins do not overwrite an existing non-fallback name.
- [ ] Existing user with matching verified email is linked via `oauth_identities`, not duplicated.
- [ ] Returning user lookup via `oauth_identities` on `(provider='apple', subject=<sub>)` bypasses the email check entirely.
- [ ] `users` row for new Apple signups has `signup_from='apple'` and `email_verified=true`.
- [ ] `mintAppleClientSecret()` produces a JWT with `alg=ES256`, `iss=APPLE_TEAM_ID`, `sub=APPLE_SERVICES_ID`, `aud=https://appleid.apple.com`, `exp - iat <= 180 days` (we use 1 day).
- [ ] `/.well-known/apple-developer-domain-association.txt` serves the contents of `APPLE_DOMAIN_ASSOCIATION` env var with `Content-Type: text/plain`.
- [ ] `instrumentedAxios` allowlist gets `apple_login: ['appleid.apple.com']`.
- [ ] Jest tests at the controller boundary mock Apple's JWKS; no live network in CI.
- [ ] Changelog entry written and lands in the same PR.
- [ ] Sonar local run before flipping the PR ready.

**Leading indicator + magnitude**: `/register` → first-deck-download conversion for new Apple signups within 7 days, target ≥80% of the Google baseline (i.e., Apple signups activate at near-parity). Secondary: total new signups/week +3–5% within 30 days.

**Open questions for engineer** (resolved here vs. left for implementation):

1. **`.p8` key storage** — env var (`APPLE_PRIVATE_KEY`, full PEM with `\n` newlines), parity with `MICROSOFT_CLIENT_SECRET`. Not a file path (CWE-22 surface).
2. **Rotation cron** — **do not build one.** Per-request minting with 1-day `exp` makes the JWT itself always fresh; the only thing that can revoke us is the `.p8` key being rotated in the Apple Developer Console, which is a manual operator action with no code surface.
3. **Domain-association ownership** — `WellKnownRouter` mounted from `server.ts` before the SPA catch-all; content from `APPLE_DOMAIN_ASSOCIATION` env var. Operator updates the env var when Apple regenerates the file (rare).
4. **`email_is_relay` surfacing in account UI** — out of scope; defer until users ask.
5. **Staging strategy** — Apple won't approve `localhost`. Local dev relies on unit tests; first end-to-end happens against `2anki.net` directly via a `feature-flagged` rollout, OR on a `staging.2anki.net` subdomain if one gets provisioned during implementation. Decide at implementation time, not now.

---

## Design notes

**The user moment.** An iPhone user finds 2anki through search, taps the link, lands on /login. Sign in with Apple is their daily driver — one tap, Face ID, no email exposed. They see Google, Notion, Microsoft. None are theirs. They back out. After: fourth button, one Face ID, in the app. No password, no real email handed over.

**Position.** `/login`: Google → Notion → **Apple** → Microsoft. `/register`: Notion → Google → **Apple** → Microsoft. Apple displaces Microsoft to last because Apple is far more common on mobile (where /login sees heavy traffic) and Microsoft is the least-used of the three existing OAuth options. Keep Notion in its current slot — it's the core integration.

**Style.** Black background, white Apple mark + text. The existing three buttons are all white/border-outlined; adding a fourth white button produces four identical rows. The black Apple button anchors the third position naturally without adding color noise. Matches Apple's HIG preference on light backgrounds.

**Logo.** Official Apple SVG mark at 20×20 (matching Microsoft's icon size exactly). Apple HIG's 44pt button-minimum applies to the full button, not the glyph; the existing `min-height: 2.75rem` already meets that floor.

**Label.** "Sign in with Apple" on **both** pages. Apple HIG forbids altering the exact string — App Store review enforces it and there is evidence of web implementations being flagged too. We accept the asymmetry vs. how Microsoft ships "Sign up with Microsoft" on /register. The /register page's job is to start a session, not to label the mechanism; users understand from iOS that no-account → account-created automatically.

**Mobile (375px).** Five stacked buttons is fine. Each is full-width 44px; total stack ≈ 220px before the email field. No disclosure pattern. Progressive disclosure hides a button iOS users specifically look for.

**CSS.** Add `.appleButton` to `web/src/styles/auth.module.css` mirroring `.microsoftButton`, but: `background: #000`, `color: #fff`, `border: none`, `:hover { background: #1a1a1a }`.

**Copy strings (every user-visible literal):**

| Location | String |
|---|---|
| `/login` button | Sign in with Apple |
| `/register` button | Sign in with Apple |
| Error: user cancelled at Apple | Sign-in was cancelled. Try a different option or use email. |
| Error: `email_verified` false / missing | Apple couldn't verify your email address. Try signing in with a different method. |
| Error: name capture failed (non-blocking; account still created) | We couldn't get your name from Apple. You can add it later in account settings. |
| Error: generic OAuth failure / token exchange / signature mismatch | Something went wrong with Apple sign-in. Try again or use a different option. |

The name-capture failure is **non-blocking** — the account is created, the user lands in the app, the notice appears as an inline banner that auto-dismisses.

**Verdict.** No UI changes beyond the button itself. `WithMicrosoftLink.tsx` + `.microsoftButton` is an exact template; the only net-new rule is the black background.

---

## Technical pre-flight

**Layers touched.** `routes/`, `controllers/`, `services/`, `web/`. `data_layer/` is read-only (no schema change). No `usecases/` work — Apple flow lives entirely in `AuthenticationService` + `UsersControllers`, mirroring Microsoft.

**Files edited:**
- `src/services/AuthenticationService.ts` — `loginWithApple()`, `mintAppleClientSecret()`, `getAppleJwks()`, `__resetAppleJwksCacheForTests()`, ES256 verification branch, `APPLE_JWKS_URL` / `APPLE_ISSUER` constants.
- `src/controllers/UsersControllers.ts` — `loginWithApple(req, res)`: state-cookie check, code exchange, JWKS verification, parse `req.body.user` JSON, find-or-link-or-create against `oauth_identities`.
- `src/routes/UserRouter.ts` — `GET /api/users/auth/apple/init` (sets state cookie, redirects), `POST /api/users/auth/apple` with route-scoped `express.urlencoded({ extended: false })`.
- `src/server.ts` — mount `WellKnownRouter` before the SPA catch-all.
- `src/services/observability/instrumentedAxios.ts` — add `apple_login: ['appleid.apple.com']` to allowlist; add `'apple_login'` to `OBSERVABILITY_SERVICES`.
- `src/data_layer/UsersRepository.ts` — add `updateName(id, name)` (2-line method).
- `web/src/components/forms/RegisterForm.tsx` — add `<WithAppleLink>` between Google and Microsoft.
- `web/src/pages/LoginPage/components/LoginForm/index.tsx` — same.
- `web/src/lib/text/app.document.json` — `navigation.login.apple` = "Sign in with Apple"; `navigation.register.apple` = "Sign in with Apple" (yes, identical — Apple HIG).
- `web/src/styles/auth.module.css` — `.appleButton`.

**Files new:**
- `src/routes/WellKnownRouter.ts` — single `GET /.well-known/apple-developer-domain-association.txt` route serving `APPLE_DOMAIN_ASSOCIATION` env content.
- `web/src/components/forms/WithAppleLink.tsx` (+ `.test.tsx`).
- `web/src/lib/backend/getAppleClientId.ts` (returns `APPLE_SERVICES_ID` — public, fine to hardcode in the bundle).
- `web/src/lib/backend/getAppleRedirectUri.ts`.
- `web/src/lib/backend/getAppleSignInUrl.ts` — builds the authorize URL with `response_mode=form_post`, `scope=name email`, `response_type=code id_token`.
- `web/src/pages/WhatsNewPage/changelog/2026-05-24-apple-sign-in.json`.
- `src/services/AuthenticationService.test.ts` additions and `src/controllers/UsersControllers.test.ts` additions (mirror Microsoft test volume — ~245 + ~192 lines respectively).

**No new migration.** `oauth_identities` accepts `provider='apple'` with zero schema change.

**ES256 client-secret minting.** Inside `AuthenticationService.mintAppleClientSecret()`, called once per `loginWithApple` invocation. `APPLE_PRIVATE_KEY` env var holds the PEM block with `\n`-escaped newlines; parsed once via `crypto.createPrivateKey()` at module load. JWT claims: `iss=APPLE_TEAM_ID`, `sub=APPLE_SERVICES_ID`, `aud=https://appleid.apple.com`, `iat=now`, `exp=now+86400`. Local crypto, no network — cheap, no caching needed.

**form_post callback.** Mount `express.urlencoded({ extended: false })` **route-scoped** on `POST /api/users/auth/apple` only. Do not change the global body-parser contract (`express.json()` stays as-is). Body contains `code`, `state`, `id_token`, optional `user` (JSON string).

**CSRF defense (the real footgun).** Apple's `response_mode=form_post` POSTs the callback from `appleid.apple.com` to `2anki.net` — a cross-site POST. `sameSite=lax` cookies are **blocked** on cross-site POSTs. The `apple_login_state` cookie must be `httpOnly`, `Secure`, `sameSite=none`. The `init` endpoint generates a 32-byte random nonce via `crypto.randomBytes(32).toString('hex')`, stores it in the cookie and passes it as the `state` query param. The callback verifies `req.body.state === req.cookies.apple_login_state` before any DB writes. Mismatch → 302 to `/login`.

**`/.well-known/` route.** `WellKnownRouter` defines `GET /.well-known/apple-developer-domain-association.txt`. Content from `APPLE_DOMAIN_ASSOCIATION` env var. `Content-Type: text/plain`. Mounted in `server.ts` before the SPA catch-all so it isn't swallowed by the React shell.

**First-sign-in name capture.** Controller parses `req.body.user` (if present) as JSON, extracts `name.firstName` + `name.lastName`, joins them. For new accounts, passes into the existing `userService.register(name, ...)`. For existing accounts whose `users.name` still equals the fallback (email prefix), call the new `UsersRepository.updateName()`. Apple sends this field only on the user's first authorization for a given (Services ID, Apple ID); for returning users it's absent, and the `oauth_identities` lookup short-circuits before name handling.

**ES256 verification branch.** Microsoft uses RS256. Apple uses ES256. Same JWKS-fetch + `crypto.createPublicKey({ format: 'jwk' })` pattern; `jwt.verify(..., { algorithms: ['ES256'] })`. JWKS cache is per-provider (`cachedAppleJwks` separate from `cachedMicrosoftJwks`).

**Security delta vs Microsoft:**
- **Replay**: state-cookie check guards session fixation; `code` is single-use at Apple's token endpoint.
- **`.p8` key handling**: never logged, never in web bundle, never written to disk at runtime. Loaded once at module load.
- **Subject-keyed linkage**: identical protection class to MS. Audience check (`aud === APPLE_SERVICES_ID`) rejects tokens from foreign Apple Services IDs before identity lookup runs.

**Testing.** Unit-testable: `mintAppleClientSecret` claim shape; JWKS verification with ES256; state-cookie mismatch path; `user` JSON parsing; missing-email / unverified-email redirects; `oauth_identities` find-or-link-or-create. Manual prod test only (Apple disallows localhost): end-to-end authorization on `2anki.net` after domain verification completes.

**Operator runbook** (not code, but flagged for implementation PR):
- Register the app + Services ID + Sign In with Apple key in Apple Developer Console.
- Add `2anki.net` as a verified domain; download `apple-developer-domain-association.txt`; paste into `APPLE_DOMAIN_ASSOCIATION` env on the prod box.
- Register `sendgrid.net` (or whichever Email Source we use) as an Apple Email Source so `@privaterelay.appleid.com` forwards land in the user's inbox.
- Set `APPLE_TEAM_ID`, `APPLE_SERVICES_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_REDIRECT_URI` in `.env` on the prod box.

**Risks:**
- **`sameSite=lax` + form_post is the implementation footgun.** Spec calls this out explicitly. If we ship with `lax`, every Apple sign-in fails state verification silently.
- **The `user` field is one-shot.** If a user previously authorized this Services ID under some other context and Apple considers them returning, name falls back to email prefix. Acceptable — matches Google / Microsoft fallback.
- **Apple Developer Console config blocks prod validation.** Code can be correct and still untestable until the operator runbook above is complete. Stage the PR to ship code first (behind unit tests), then run the operator setup, then flip the button on.
- **SendGrid Email Source registration is a console step, not code.** Without it, "Hide My Email" users silently miss transactional emails. The gate-0 pre-test catches this.

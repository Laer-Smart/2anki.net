# Spec: End-to-end test coverage for the auth paths

Issue: #2226

## Problem

Notion sign-in, magic-link delivery for Google-linked accounts, and password
reset were all broken at points this cycle and fixed in #2219, #2218, #2209, and
#2205. None of those three flows has end-to-end coverage, so the next regression
will only surface when a user reports they can't log in. These are the highest-
value paths in the product — a broken login blocks every downstream conversion.
We need Playwright tests that exercise each path against the mock server so a
regression fails CI instead of reaching production.

## Proposal

Add three Playwright specs under `web/tests/`, one per flow, driven by the
existing mock server (`web/mock-server/server.js`) — never a real Notion, Stripe,
or SendGrid call. Mock only the external edge:

1. **Notion sign-in** — start at `/login`, click "Continue with Notion", stub the
   OAuth callback so the mock server returns a session token, assert the redirect
   lands on the authenticated landing surface and the token cookie is set.
2. **Magic link for a Google-linked account** — request a magic link for an email
   that the mock server marks as Google-linked, capture the link the mock "email"
   endpoint would send, follow it, assert the session lands.
3. **Password reset, end to end** — request reset → follow the reset link the mock
   issues → submit a new password on the reset form → log in with the new
   password → assert authenticated.

Extend `web/mock-server/server.js` with the minimal endpoints each flow needs
(magic-link request/consume, reset request/consume) rather than introducing a
second mock harness. Match the structure of `login-loop.spec.ts` — cookie/token
assertions via `expect.poll`, generous timeouts, no real network.

## Scope (in)

- Three new `*.spec.ts` files in `web/tests/`.
- Mock-server endpoints to support magic-link and reset token issue/consume.
- Assertions on observable outcome: redirect target, token cookie presence, the
  authenticated surface rendering — not "did not throw".

## Explicitly NOT in scope

- Server-side Jest tests for the auth use cases (separate concern; these are
  browser e2e tests as the issue scopes).
- Real OAuth exchange against Notion's live endpoint — mocked at the edge only.
- Rate-limiting, CSP, or session-rotation tests beyond what the three flows touch
  (covered elsewhere, e.g. `csp-google-signin.spec.ts`, `login-loop.spec.ts`).
- Changing any auth production code — this PR is tests + mock-server only.

## Touch points

- `web/tests/notion-signin.spec.ts` (new)
- `web/tests/magic-link-google-linked.spec.ts` (new)
- `web/tests/password-reset-e2e.spec.ts` (new)
- `web/mock-server/server.js` — add magic-link and reset endpoints.
- `web/playwright.config.ts` — only if a new project/route base is needed.

## Risks / Rails

- **Auth surface.** This is test-only and must stay test-only. Do not modify
  `src/services/AuthenticationService/**`, `src/lib/Token.ts`, or any `**/auth/**`
  production path. If a test reveals a real bug, that fix is a separate `fix:` PR.
- Mock-server endpoints must use placeholder credentials only (Sonar `test1`
  waiver covers `web/tests/**`); never embed a real token or secret.
- Tests must not depend on wall-clock time or random tokens — seed/stub any token
  the reset and magic-link flows generate so assertions are deterministic.

## Acceptance criteria

- Each of the three specs passes locally via the Playwright runner against the
  mock server and in CI, with no real external network call.
- Each spec asserts a concrete outcome (redirect target + token cookie + rendered
  authenticated surface), not merely absence of an exception.
- Reverting any one of #2219/#2218/#2209/#2205 fails the corresponding spec
  (verified once during implementation, not asserted in CI).
- No production auth code changes in this PR.

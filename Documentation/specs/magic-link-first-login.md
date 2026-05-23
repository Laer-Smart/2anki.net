# Magic-link-first /login

## Problem

The /login email step hides the magic-link option as a small text link under a "Continue with email" button, so users who expect a passwordless flow are dropped into a password form they never set. Support keeps seeing "I forgot my password but I never set one" — the password fork is the wrong default.

## What changes

Three changes in `web/src/pages/LoginPage/components/LoginForm/index.tsx`, email step only.

1. **Primary CTA on the email step becomes `Email me a sign-in link`.** Click handler: `handleSendMagicLink` — calls `get2ankiApi().requestMagicLink(email, 'login')` and transitions to the existing `check-email` step. Disabled when `email.length === 0`. Loading label: `Sending`.
2. **Password becomes a secondary text link below the CTA: `Use password instead`.** Click handler: `event.preventDefault()` then `setStep('password')` (the same body that lives in `handleContinueWithEmail` today). Always visible — does not depend on email length.
3. **The old magic-link text link below the CTA is removed from the email step.** It was the secondary affordance for the same action the CTA now performs; keeping it duplicates the click target. The magic-link text link inside the password step stays as-is.

## What stays the same

- OAuth section (Notion above Google, copy and order untouched).
- `/register` page — not touched.
- Step 2 (password screen) — layout, fields, `Log in` button, `Forgot your password?` link, and the `Send a login link instead` text link all unchanged.
- Magic-link backend endpoint (`requestMagicLink`) and the `check-email` step component.
- `Forgot your password?` link on the email step.
- `Sign up — it's free` footer link.
- Email-restored-from-`localStorage` behaviour and the blur-to-persist handler.

## Files the engineer will touch

- `web/src/pages/LoginPage/components/LoginForm/index.tsx` — swap the primary CTA label and click handler; rename and demote the password affordance; remove the duplicate magic-link text link.
- `web/src/pages/LoginPage/components/LoginForm/LoginForm.test.tsx` — update the assertions below.
- `web/src/lib/text/app.document.json` — no change. `Sign in with Google` stays where it is; `Continue with Notion` stays as a hard-coded literal in the component.

### Test assertions to update

| Current | Replace with |
| --- | --- |
| `getByRole('button', { name: 'Continue with email' })` (used in 6 places) | `getByRole('button', { name: 'Email me a sign-in link' })` |
| `queryByText('Email me a sign-in link')` returning null until email is typed | Drop the negative assertion — the button is always rendered now. Keep the disabled-when-empty assertion: button is `disabled` until the email field has a value. |
| Test `transitions to password step after clicking continue` | Rewrite: clicking `Use password instead` (link) transitions to the password step. |
| Test `transitions to check-email step after clicking magic link` (currently goes via the password step) | Rewrite: type email, click `Email me a sign-in link`, assert `Check your email` appears — no detour through password step. |
| Test `shows email-me-a-sign-in-link when email is filled in on email step` | Delete — the affordance no longer depends on email presence. |

Add one new test: `Use password instead` link is visible on the email step and transitions to the password step on click.

## Success metric

- **Leading:** the `Email me a sign-in link` button is clicked on the email step on at least 60% of /login sessions that submit anything. (Today the magic-link text link is buried; password is the default.)
- **Lagging:** zero new "I forgot my password but I never set one" reports in the support@2anki.net inbox over the four weeks after merge. Currently a recurring theme.
- **Guardrail:** first-card-review rate for returning users (logged in within 7 days of last session) does not drop week-over-week after merge.

## Rollback

Single `git revert <sha>` on the merge commit. No data migration, no env vars, no DB change — the backend endpoint and the `check-email` step both already exist and are already in use.

## Out of scope

- "It's free" copy on the sign-up link.
- /register page restructure.
- Any layout change to the password step.
- OAuth button order, labels, or styling.
- Analytics instrumentation for the new CTA (track via existing route-level events; if the leading metric needs a dedicated event, file a follow-up).

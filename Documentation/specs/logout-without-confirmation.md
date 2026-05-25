# Log out without a confirmation prompt

### Trio synthesis
- **PM:** A confirmation on logout is friction on a low-stakes, fully reversible action (you just sign back in) — drop it.
- **Designer:** It's a native `window.confirm` OS dialog — off-brand for a quiet Stripe/Linear-style tool, and slower; removing it is both faster and more beautiful, with no replacement UI needed.
- **Engineer:** Trivial — delete the `confirm` gate in `AppShell.tsx:54-55`, keep `event.preventDefault()` + `logout()`; the `<a href="/users/logout">` stays as the no-JS fallback.
- **Agreement:** Remove the prompt; log out immediately on click.
- **Conflict:** none.
- **Resulting plan:** Drop the `globalThis.confirm` check in `onLogOut` so the click logs out straight away.

(Synthesis authored directly rather than via three agents — the change is a 2-line removal with no design or scope ambiguity.)

## Outcome

Clicking "Log out" signs the user out immediately, with no "Are you sure you want to log out?" pop-up. **Goal alignment:** removes a needless tap on a reversible action — simpler and faster, the core bet.

## Problem

`AppShell.tsx`'s `onLogOut` calls `globalThis.confirm('Are you sure you want to log out?')` and only logs out if the user confirms (`web/src/components/AppShell/AppShell.tsx:54-55`). Logout is low-stakes and instantly reversible — signing back in is one step — so the guard just adds friction and surfaces an off-brand native browser dialog.

## Riskiest assumption

That accidental logouts won't become a real annoyance once the guard is gone. **Smallest test to disprove:** logout is one click to undo (sign in again), and the action is explicit (the user clicked "Log out"); the cost of an accidental logout is a re-login, not data loss. If accidental-logout complaints appear, a non-blocking undo toast is the fallback — out of scope here.

## Scope

**In:**
- Remove the `confirm` gate in `onLogOut`; call `get2ankiApi().logout()` directly after `event.preventDefault()`.

**Out:**
- Any replacement confirmation, modal, or undo toast.
- Changing the logout endpoint, redirect target, or session invalidation.
- The `<a href="/users/logout">` fallback (keep it — it's the no-JS path).

## User story & acceptance criteria

*As a signed-in user, I want one click to log me out, so I don't have to dismiss a pop-up first.*

- [ ] Clicking "Log out" logs the user out with no confirmation dialog.
- [ ] `event.preventDefault()` is preserved and `get2ankiApi().logout()` is still called.
- [ ] The no-JS `<a href="/users/logout">` fallback still works.
- [ ] No `window.confirm` remains in the logout path.

## Leading indicator

Time-to-logout drops to a single click; no measurable downside expected (logout is not a tracked conversion step).

## Design notes

No new UI. Removing a native `window.confirm` — there is nothing to design, and no replacement prompt per VOICE.md ("Direct, no hedging"). The logout link label and destination are unchanged.

## Technical pre-flight

- **Layers:** `web` only.
- **Files in play:** `web/src/components/AppShell/AppShell.tsx` (`onLogOut`, lines 50-57). No server/route change.
- **Cross-language:** none.
- **Effort:** **S** — a 2-line deletion.
- **Security / testing:** No security impact (logout still invalidates the session server-side). Touches `web/src/` → browser-check attestation at merge. Test: AppShell/Sidebar Vitest asserting the logout click calls `logout()` and shows no confirm (mock `globalThis.confirm` and assert it is not called).

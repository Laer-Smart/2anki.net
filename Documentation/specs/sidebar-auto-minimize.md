# Sidebar auto-minimize during long workflows

**Priority:** Lowest of the May 2026 external review items. Park here; ship higher-impact work first. The other review items (faster conversion, clearer errors, mobile flow) move the needle on conversion and scale. This one is a quality-of-life polish for power users who already convert successfully.

**Traces to:** *simpler/faster/more beautiful* — gives the deck/page the screen it needs during the part of the workflow where the sidebar earns nothing.

## Problem

External review (May 2026) said, verbatim:

> Consider making the task bar movable, detachable, and/or auto-minimizing. This would help users maintain screen space and reduce interface friction during longer workflows.

Today, the sidebar collapses **only on a manual click** (PR #2401, #2403 shipped the 240px to 64px icon-rail toggle with `localStorage` persistence; PR #2096 introduced the persistent layout). A user mid-conversion who wants more canvas has to remember the sidebar is in their way, find the toggle, click it, and remember to expand it again later. On a 13" laptop the sidebar eats 18% of horizontal space; during a long Notion upload review or a deck-settings session that's a lot of pixels charged for a nav surface the user isn't using.

The reviewer's "movable" and "detachable" framings are heavier solutions (floating palettes, drag handles, multi-window). The "auto-minimizing" framing is the one that fits this product — invisible until needed, no new UI to learn.

## Goal

The sidebar gets out of the way on its own during the parts of the workflow where the user is focused on content (upload review, conversion, deck settings, results), and comes back the moment the user reaches for navigation. The user never has to think about it.

Success looks like:

- Median session that goes through the upload-to-download flow auto-collapses the sidebar at least once, without the user clicking the toggle.
- Manual-collapse rate (people clicking the toggle themselves) drops, because the product is doing it for them.
- Zero complaints about the sidebar "disappearing" or "fighting me" — the trigger has to feel earned, not surprise.

## Non-goals

- **Not detachable.** No floating palette, no drag-out window, no pop-out. Adds drag handles, drop targets, focus-stealing windows, and a settings panel to manage where the sidebar lives. Wrong shape for a tool people use for 10 minutes at a time.
- **Not movable.** No "snap to right edge" or "switch sides" option. One sidebar, one position, fewer decisions.
- **No new user-facing setting** for auto-minimize on/off. The collapse toggle (PR #2401) already gives users an explicit on/off; adding a second control to manage the first is the wrong direction.
- **Not changing the mobile drawer** (<1024px). Mobile already hides the sidebar; this spec is desktop-only.
- **Not changing the collapsed-state width** (64px icon rail). PR #2401's contract holds — auto-minimize means "transition to the existing 64px rail," not "introduce a third width."
- **No auto-expand on hover** in the first cut. Hover-to-peek is its own can of worms (timing, accidental triggers, focus traps). If we ship auto-minimize and users ask for hover-peek, we add it later.

## Proposed shape

**Auto-minimize the sidebar (240px to 64px) when the user enters a workflow surface and has been on it for 20 seconds without interacting with the sidebar.** Expand back when the user clicks anywhere in the sidebar or navigates to a non-workflow route.

### What counts as a "workflow surface"

The routes where canvas matters and nav doesn't:

- `/upload` and the in-progress conversion view
- `/n/*` (Notion page review)
- Deck detail / deck settings
- The download/results screen

The rest of the app — `/home`, account, history, settings index — stays expanded by default. The sidebar earns its space there.

### The trigger

1. User lands on a workflow route.
2. If the sidebar is currently expanded **and** the user hasn't manually pinned it expanded this session (see below), start a 20-second idle timer.
3. Idle = no mouse-over on the sidebar, no focus inside the sidebar, no keyboard interaction with sidebar items.
4. Timer fires → animate to 64px rail (same animation PR #2401 uses for manual collapse).
5. User hovers the rail or clicks any rail item → no expand. User clicks the toggle button → expand and **pin** for the rest of the session (no more auto-collapse this tab).

### Pinning

If the user manually expands after an auto-collapse, that's a signal: *I want the sidebar*. Set a session-scoped pin (in-memory, not `localStorage` — pin should not survive a refresh; the auto-minimize should get another chance on the next session). The pin disables auto-minimize for the remainder of the tab's life.

The existing `localStorage` key from PR #2401 stays the source of truth for the *default* expanded/collapsed preference across sessions. The session pin is additive — it overrides auto-minimize *within* a session without touching the persisted preference.

### Animation

Reuse the existing transition from PR #2401. Same easing, same duration. The user should not be able to tell auto-minimize from manual-minimize visually — the only difference is who started it.

### Telemetry

Two counters, server-side or via the existing observability path:

- `sidebar.auto_minimize.fired` — incremented when the 20s timer expires and the sidebar collapses.
- `sidebar.auto_minimize.reverted` — incremented when the user manually expands within 60s of an auto-collapse.

A high revert rate (>15%) means the trigger is too aggressive — tune the idle timer up or narrow the workflow-surface route list.

### Copy

No new strings. The toggle button keeps its existing label and aria-label. Auto-minimize is invisible — no toast, no tooltip, no "we collapsed your sidebar" message. The product just does it.

## Open questions

1. **Is 20 seconds the right idle threshold?** Pulled out of a hat. Could be 10s, could be 45s. Worth a quick instrument-and-watch period after launch before tuning. Lower bound is probably 10s (anything shorter feels twitchy); upper bound is probably 60s (anything longer and the user is already done with that screen).
2. **Should the conversion-in-progress view (active upload, spinner running) auto-collapse immediately rather than waiting 20s?** The user is staring at a progress bar; they don't need the sidebar. Possibly yes, as a follow-up — but ship the timer-based version first and see whether instant-collapse-on-conversion is even an ask.
3. **Does the session pin survive route changes within the session?** Proposed shape says yes — pin is per-tab, not per-route. Alternative: pin resets when the user leaves the workflow surface and comes back. Default to "pin survives" for the first cut (less surprising) and revisit if telemetry shows users re-pinning frequently.
4. **Do we need an escape hatch for users who genuinely hate this?** Possibly a hidden `localStorage` flag (`sidebar.autoMinimize = "off"`) that power users can set via the browser console, with no UI surface. Adding a real settings toggle reintroduces the "setting to manage a setting" problem. Decide after launch based on support volume.
5. **Interaction with the mobile drawer at the 1024px breakpoint?** None — mobile is unchanged. But: what about a user resizing their window across the breakpoint mid-session? The existing drawer handles this; auto-minimize should defer to whatever the breakpoint logic already does.

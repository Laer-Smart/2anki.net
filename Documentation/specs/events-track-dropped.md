# Spec: stop dropped analytics events

**Status:** draft  
**Branch:** `fix/spec-events-track-dropped`

---

## Outcome

`POST /api/events/track` returns 202 for every valid client-fired event. The 400 rate drops to ~0. Product analytics become trustworthy again.

---

## Problem — confirmed root cause

`EventsController.track` (line 16) rejects any event name not present in the **server-side** `KNOWN_EVENTS` set (`src/types/AnalyticsEvents.ts`). The client has a **parallel, independent** set (`web/src/lib/analytics/events.ts`). The two have drifted.

Exact vocabulary gap (today, 2026-05-25):

| Direction | Events |
|---|---|
| Client sends, server rejects (→ 400) | `paywall_dismissed`, `pricing_left`, `upload_failed` |
| Server accepts, client never sends | `email_clicked`, `email_batch_sent`, `vision_photo_converted`, `tts_lang_injected` |

The 191 daily 400s are explained by the three client-only events above. `upload_failed` was added to the client in a recent PR; some of the 400s predate it and are attributable to `paywall_dismissed` and `pricing_left`, which have been missing from the server list longer.

The server-only events (`email_clicked`, `email_batch_sent`, `vision_photo_converted`, `tts_lang_injected`) are dead weight — they accept nothing because no client sends them.

---

## Riskiest assumption

That all 191 daily 400s are caused by the vocabulary gap, not by a separate bug (e.g. a client sending a malformed payload that hits the `Invalid props` branch). Confidence is high — the `resolveProps` guard only rejects arrays and non-objects, which is unlikely in normal operation — but this should be validated before the fix is deployed.

**Smallest test:** instrument the server to log `{ eventName, reason }` at 400 for 24 hours on prod (a one-line `console.error` behind a feature flag, or by reading the existing access logs if they include the request body). The distribution of `reason` values will confirm "Unknown event name" accounts for ~191/day and "Invalid props" accounts for ~0.

---

## Scope

**In:**
- Reconcile the two `KNOWN_EVENTS` sets so they are identical at deploy time.
- Decide the long-term policy: strict allowlist (reject unknown names) vs accept-and-log (forward unknown names to the sink with a warning tag).
- Recommend: **accept-and-log unknown events** rather than 400. Rationale: a 400 silently destroys product data; a logged-but-tagged unknown event at least survives and surfaces the drift in the next audit. This is the correct default for internal analytics where the client and server are co-deployed but may briefly skew during a rolling deploy.
- Add a test that asserts the server returns 202 for every name in the client `KNOWN_EVENTS` set (prevents future drift).

**Out:**
- Changing the analytics sink or storage schema.
- Adding new event names beyond reconciling the existing gap.
- Client-side changes beyond keeping the two lists in sync.
- Persisting events to a new store (the current `EventsSink` path is unchanged).

---

## Implementation approach (two options — pick one before coding)

**Option A — Single source of truth (recommended).**  
Move `KNOWN_EVENTS` to a shared package (e.g. `src/types/AnalyticsEvents.ts` already exists on the server; publish it as a workspace export, or copy on build). The client imports from the server type. Drift becomes a type error at compile time.

**Option B — Accept-and-log unknown events.**  
Remove the strict 400 on unknown names. The controller forwards unknown events to the sink tagged with `unknown: true`. The sink logs a warning. This is a one-line change that stops bleeding immediately; the shared-source-of-truth work can follow as a separate PR.

Recommended path: ship Option B now (stops the 191/day loss immediately), then follow up with Option A to make drift a compile-time error.

---

## Acceptance criteria

1. `POST /api/events/track` with `{ name: 'paywall_dismissed' }` returns 202 (not 400).
2. `POST /api/events/track` with `{ name: 'pricing_left' }` returns 202.
3. `POST /api/events/track` with `{ name: 'upload_failed' }` returns 202.
4. `POST /api/events/track` with `{ name: 'not_a_real_event_xyzzy' }` does NOT silently succeed — either returns 400 or records the event tagged `unknown: true` (depending on which option is chosen).
5. A test asserts every name in `web/src/lib/analytics/events.ts` returns 202 from the server (regression lock).
6. `POST /api/events/track → 400` rate in prod drops to ~0 within 1 hour of deploy.

---

## Leading indicator

`POST /api/events/track → 400` in the access log. Baseline: ~191/day. Target: <5/day within 24 hours of deploy (residual noise from bots or clients on old deploys).

Secondary: `paywall_dismissed`, `pricing_left`, and `upload_failed` appear in the analytics sink with non-zero counts.

---

## Open questions

1. **Option A vs B?** Option B ships in one PR and stops the bleeding; Option A prevents future drift. Both? What timeline?
2. **Server-only dead names** (`email_clicked`, `email_batch_sent`, `vision_photo_converted`, `tts_lang_injected`): remove from the server list, or leave as forward-compatible stubs? Removing keeps the list clean; leaving avoids a server-restarts-but-old-client-still-fires race during rolling deploys.
3. **Who owns the canonical list?** If it stays duplicated, who is responsible for keeping it in sync? A CI lint step that diffs the two files would catch future drift at PR time with zero runtime cost.

---

## Technical pre-flight

- `src/types/AnalyticsEvents.ts` — server allowlist, 38 entries.
- `web/src/lib/analytics/events.ts` — client allowlist, 36 entries.
- `src/controllers/EventsController.ts:16` — the strict `KNOWN_EVENTS.has()` gate that produces 400.
- `src/usecases/events/TrackEventUseCase.ts` — no allowlist logic; receives only validated names from the controller.
- No migration needed (no schema change).
- No LLM calls touched; no Anthropic/Vertex cost delta.
- Deploy is a standard Node restart; rollback is revert + restart.

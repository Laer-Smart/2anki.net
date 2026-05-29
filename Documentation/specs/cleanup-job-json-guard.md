# Spec: Guard JSON parse in feedback-attachment cleanup sweep

### Trio synthesis
- **PM:** Guard four shapes (null / empty / malformed / non-array), still delete the DB row even when parse fails, add `.catch` on the caller, write tests.
- **Designer:** No UI changes required — server-side reliability fix.
- **Engineer:** A `safeParseAttachments(val: unknown): string[]` helper beats per-loop try/catch. Important nuance: `feedback.attachments` is a Postgres `json` column, so the `pg` driver auto-parses it before it reaches the application. The helper must handle both already-parsed values **and** stringified JSON; assuming one or the other will regress healthy rows.
- **Agreement:** scope, branch name, test plan, caller `.catch`, "drop the DB row anyway" behavior, S effort, no migration, no changelog.
- **Conflict:** none material — engineer's pg-auto-parse catch is folded into the helper contract below.
- **Resulting plan:** ship `safeParseAttachments` accepting `unknown` and returning `string[]`; apply in the loop; harden the caller; cover all five shapes in `deleteOldUploads.test.ts`.

---

## Outcome

Zero `Unhandled Rejection` lines from `deleteResolvedFeedbackAttachments` in pm2 logs over a rolling 7-day window. The nightly cleanup completes end-to-end even when a row has `attachments = ""`, `null`, an already-parsed value, or malformed JSON.

## Goal alignment

Internal reliability — does not directly move the 300K-user goal. Indirect benefit: the sweep currently leaks S3 objects (storage cost) and one poisoned row freezes every subsequent run until restart. A reliable cleanup keeps prod boring; under stricter Node policy an unhandled rejection kills the process and takes the conversion pipeline with it.

## Problem

On 2026-05-29 ~10:15 UTC the nightly sweep aborted at `JSON.parse(feedback.attachments)` because at least one acknowledged-feedback row carries `""` (or `null`) in `attachments`:

```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at deleteResolvedFeedbackAttachments (.../deleteOldUploads.ts:20:30)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at deleteOldUploads (.../deleteOldUploads.ts:33:3)
Unhandled Rejection: SyntaxError: Unexpected end of JSON input
```

The throw escapes the for-loop, the function, the `.then()` in `ScheduleCleanup.ts:13`, and the timer callback — surfacing as an unhandled rejection. Surviving rows keep their S3 attachments forever and the bad row is never deleted, so the next run hits the same poison.

## Riskiest assumption

That empty-string and `null` are the only shapes in the wild. The migration declares `table.json('attachments')`, which means the `pg` driver auto-deserializes — code calling `JSON.parse(feedback.attachments)` may be parsing a string in some rows and an already-parsed array in others, depending on driver behaviour and historical writes. A guard that only handles empty/null will leave the array-input case still broken on a different code path.

**Smallest test to disprove it:** one-shot query on prod, before merge:

```sql
select count(*),
       case
         when attachments is null then 'null'
         when pg_typeof(attachments) = 'json'::regtype then 'json'
         else 'other'
       end as shape
from feedback where is_acknowledged = true
group by shape;
```

Engineer pastes the shape distribution into the PR body. The fix handles all shapes regardless; the query just confirms what's actually in the column.

## Scope

**In**
- Guard `JSON.parse` in `deleteResolvedFeedbackAttachments` via a `safeParseAttachments(val: unknown): string[]` helper that handles null, undefined, empty string, whitespace, malformed JSON, non-array JSON, and already-parsed arrays.
- Add `.catch(console.error)` on the `setInterval` callback in `ScheduleCleanup.ts:13` so future helper rejections log instead of escaping to the process boundary.
- Always delete the row from `feedback` in the bulk DELETE — a row we can't interpret is a row we can't clean up; leaving it forces an infinite retry loop.
- New `src/lib/storage/jobs/helpers/deleteOldUploads.test.ts` covering: null, empty string, whitespace, malformed JSON, non-array JSON, valid stringified array, already-parsed array.

**Out**
- Redesigning the cleanup job, moving it to a queue, observability dashboards.
- Backfilling / repairing existing bad rows.
- Schema-tightening `attachments` to `jsonb NOT NULL DEFAULT '[]'::jsonb` at write time (worth doing later — flagged in "Next iteration").
- Batching S3 deletes.

## User story

As the operator, the nightly cleanup finishes even when one feedback row has bad JSON, so storage costs don't drift and the process doesn't crash on stricter Node policy.

## Acceptance criteria

- [ ] A row with `attachments = ""` is deleted from `feedback`; the sweep continues.
- [ ] A row with `attachments = null` is deleted from `feedback`; the sweep continues.
- [ ] A row with `attachments = "[broken"` is deleted from `feedback`; a warning is logged with the row id and the raw value's length (not the value); the sweep continues.
- [ ] A row with `attachments = "{}"` (valid JSON, wrong shape) is deleted from `feedback`; a warning is logged; the sweep continues.
- [ ] A row with `attachments` already parsed to `["a.png", "b.png"]` by `pg` calls `storage.delete` once per entry, then is deleted from `feedback`.
- [ ] A row with `attachments = "[\"a.png\",\"b.png\"]"` (stringified) behaves identically to the parsed case.
- [ ] `ScheduleCleanup.ts:13` carries a `.catch(console.error)` so any future helper rejection logs instead of escaping.
- [ ] `deleteOldUploads.test.ts` exists and covers the seven cases above.
- [ ] No `console.log` left behind; log via `console.warn` / `console.error` to match the rest of `src/lib/storage/jobs/helpers/`.

## Leading indicator

pm2 `server-*-error-*.log` carries **zero** `Unhandled Rejection: SyntaxError` lines from this helper over the 7 days following deploy. Baseline: 1 occurrence on 2026-05-29.

## Design notes

No UI changes required — this is a server-side reliability fix with no user-visible surface.

## Technical pre-flight

**Layers touched:** `lib` only. No routes, controllers, usecases, services, or data_layer.

**Files in play**

| File | Change |
|---|---|
| `src/lib/storage/jobs/helpers/deleteOldUploads.ts` | Add `safeParseAttachments` helper; apply in the loop |
| `src/lib/storage/jobs/ScheduleCleanup.ts` | Add `.catch(console.error)` on the `setInterval` callback |
| `src/lib/storage/jobs/helpers/deleteOldUploads.test.ts` | New file — does not exist yet |

**Approach**

```ts
function safeParseAttachments(val: unknown): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  if (typeof val !== 'string') return [];
  const trimmed = val.trim();
  if (trimmed === '') return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}
```

Callsite becomes:

```ts
for (const feedback of resolvedFeedback) {
  for (const attachment of safeParseAttachments(feedback.attachments)) {
    await storage.delete(attachment);
  }
}
```

The bulk `delete()` at the end runs unconditionally — a row we can't parse is still removed from the table so we don't loop on it forever.

**Caller hardening** (`ScheduleCleanup.ts:13`):

```ts
setInterval(
  () => deleteOldUploads(db)
    .then(() => console.info('deleted old uploads'))
    .catch(console.error),
  MS_24_HOURS
);
```

**Schema check (confirmed):** `migrations/20240820194742_add-feedback-table.js:7` declares `table.json('attachments')` (no `notNullable`). Kanel type in `src/data_layer/public/Feedback.ts:17` is `unknown | null`. That `unknown` is precisely why the helper takes `unknown`.

**Test plan** — `deleteOldUploads.test.ts`:

```
describe('safeParseAttachments')
  it('returns [] for null')
  it('returns [] for undefined')
  it('returns [] for empty string')
  it('returns [] for whitespace-only string')
  it('returns [] for malformed JSON string')
  it('returns [] for a JSON object (not an array)')
  it('returns the array for a valid JSON array of strings')
  it('returns the array when input is already a parsed JS array')

describe('deleteResolvedFeedbackAttachments')
  it('skips storage.delete when attachments is null; still deletes the DB row')
  it('calls storage.delete for each key in a valid attachments array')
  it('processes remaining rows when one row has malformed attachments')
  it('deletes all acknowledged feedback rows from the DB after processing')
```

Use sqlite-backed knex for the integration tests (no PG-specific SQL touched) and a jest-mocked `StorageHandler`.

**Effort:** S — ~50–60 lines including tests.

**Risks**
- `storage.delete()` already wraps the SDK call and never throws; no extra guard needed there.
- The bulk DELETE runs outside the loop, so a bad row never blocks the DB sweep. Process kill between S3 deletes and DB delete is pre-existing behaviour and out of scope.

**Security / migrations:** none.

## Open questions

- Should the warning also emit a metric (`cleanup.bad_attachments_row`)? Default: no, defer until observability dashboards are in scope.
- Engineer runs the shape-distribution query once via SSH before merge and pastes the result in the PR body.

## Next iteration (not this PR)

- Backfill: one-shot script to scrub existing bad rows out of `feedback.attachments`.
- Schema tightening: `attachments` → `jsonb NOT NULL DEFAULT '[]'::jsonb` so the write side can never produce empty/null again.
- Orphan-S3 reconciliation: separate job listing S3 keys with no matching feedback row.

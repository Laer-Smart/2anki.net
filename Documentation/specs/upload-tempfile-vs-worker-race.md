# Spec: Close the upload tempfile vs worker race

**Status**: draft (2026-05-28)
**Owner**: pm → engineer
**Surface**: `/upload` → `GeneratePackagesUseCase` → `worker_threads`

## Problem

Multer is configured with `dest: process.env.UPLOAD_BASE` in `src/lib/misc/GetUploadHandler.ts`, so uploads land on disk (typically `/media/storage/uploads/<hash>` in prod). The HTTP handler then queues a `Worker` (`src/usecases/uploads/GeneratePackagesUseCase.ts`) which reads the file later via `getFileContents` in `src/usecases/uploads/worker.ts`. Between the controller handoff and the worker read, a tmp-file reaper (systemd-tmpfiles or similar) can remove the file. In the worker, `fs.existsSync(file.path) === false`, `file.buffer == null` (multer's `diskStorage` path does not populate `buffer`), and the conversion fails.

**Empirical signal.** Nine `Buffer.from(undefined)` crashes in prod across 20–24 May 2026, all on the upload conversion path. PR #2654 (commit `b560f8dff776`, 2026-05-23) replaced the silent `undefined` return with an explicit `Uploaded file is no longer available on disk and has no buffer fallback` error — zero occurrences of that string in the logs since merge, but **the race itself is unaddressed**. The clear error makes the failure legible; users still lose their upload. We do not currently know the dwell-time distribution between multer write and worker read, but the bug only fires when dwell exceeds the reaper's threshold, so the count understates the exposure.

A user whose 40 MB Notion export gets reaped sees a generic conversion failure and has to re-upload. On a slow connection, that is the second time they have waited several minutes for an upload that never produced a deck.

## Proposed approach

**Read the file into memory in the worker immediately on dequeue, with disk as the source of truth, and stop relying on the file surviving the queue.** Concretely:

1. In `GeneratePackagesUseCase.execute`, before constructing the `Worker`, read each `file.path` into a `Buffer` and pass it on the `UploadedFile` as `buffer`. The worker's existing `getFileContents` already prefers `buffer` when `path` is unset, so passing `path: undefined` once we have the buffer in hand keeps the contract unchanged. This closes the race because the bytes are in the parent process's memory before the worker is constructed.
2. Cap the in-memory read at the free-tier upload limit (`100 MB`, from `getUploadLimits`). For paying users whose ceiling is `10 GB`, fall through to a streaming-from-disk path: keep the existing disk read in the worker, but pre-check existence in `GeneratePackagesUseCase` and fail loudly **before** spawning a worker that will fail with a less-actionable message.
3. Delete the temp file from the controller's `finally` block after the worker promise settles. We own the cleanup — no external reaper involvement.

**Why this and not the alternatives.**

- *Defer cleanup until the worker finishes (no in-memory read).* Coordinating with whatever currently reaps `UPLOAD_BASE` is fragile: systemd-tmpfiles config drifts across deploys, and the prod box (`/home/alemayhu/src/github.com/2anki/2anki.net`) was reinstalled recently. Owning cleanup in-process is portable.
- *Move multer to `memoryStorage` for everyone.* Holding 10 GB paying-user uploads in RAM for the duration of an HTTP request is the regression we cannot accept. The hybrid (memory under 100 MB, disk above) preserves the disk path for the only case where it matters.
- *Retry-on-ENOENT inside the worker.* Loops around a reaper are textbook fragile and only mask the race.

**Effort.** Single TypeScript layer (`src/usecases/uploads/`), <60 LOC of source, Jest tests at the use-case boundary. No migration, no web change.

## What NOT to build

- No tmp-file-reaper retry loop in `getFileContents`. If the file is gone, it is gone — surfacing the bytes earlier is the fix.
- No new env var for the in-memory threshold. The free-tier upload cap (`FREE_USER_MAX_UPLOAD_SIZE`, 100 MB) is the threshold; reusing it keeps two limits from drifting.
- No change to multer config. `diskStorage` (`dest: UPLOAD_BASE`) stays — it carries the >100 MB paying uploads.
- No changelog entry. The bug surfaced as a generic conversion failure for ~9 users over five days; the fix is invisible to the next 100 K. Add it back if we learn the user-facing failure rate was higher than the log count suggests.
- No spec for the >100 MB streaming path. It already works today via the disk read; we only add the existence pre-check.

## Open questions

1. What is the actual dwell-time distribution from multer write to worker read in prod? A one-time `console.info` from the controller (write time) and the worker (read time) for 24 h would confirm whether the in-memory read is doing meaningful work or just paying RAM for nothing. **Recommendation:** ship the measurement as a separate 5-line PR first, decide on the in-memory threshold from data.
2. Does the controller `finally`-block cleanup race with the existing reaper (double-unlink)? `fs.promises.unlink` on a missing file rejects with `ENOENT`; the use case should swallow that specific code only.
3. Is `pm2` cluster mode shipping these uploads to a worker on a different node, in which case `file.path` is unreadable from the worker process? **Likely no** — `worker_threads` shares the parent's filesystem view — but worth confirming since the cluster-mode audit is fresh.

## Success signal

- Zero occurrences of `Uploaded file is no longer available on disk and has no buffer fallback` in prod logs over 14 consecutive days post-deploy.
- `pm2 monit` heap-used average on the API process within ±10% of the pre-deploy 7-day baseline. Spikes during large uploads are expected; the 7-day average is the comparison.
- Conversion success rate (decks downloaded / uploads started) does not regress.

If question 1's measurement comes back showing dwell time is consistently <1 s (well under any plausible reaper threshold), the right answer may be to defer this spec and keep the explicit error from #2654. Validate the assumption before building.

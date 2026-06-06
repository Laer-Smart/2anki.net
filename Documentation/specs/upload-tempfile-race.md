# Spec: Upload tempfile-vs-worker read race — decide in-memory vs disk

Tracks #2863. Decision was deliberately gated on the dwell-time measurement from #2860. This spec records the decision criteria and the path each branch takes, so `/implement` can pick the path once the data lands. **Do not implement before the dwell data is read.**

## Problem

Multer writes each uploaded file to a temp path; the conversion worker reads that path later (`src/usecases/uploads/worker.ts`, disk branch). Between the write and the read, the OS/tmp reaper can delete the file — the latent race that produced nine `Buffer.from(undefined)` crashes (20–24 May) before #2654 patched the error message. #2654 made the failure explicit but did not close the window. #2860 added measurement-only logging — `[upload] tempfile dwell { dwellMs, mode, fileSizeBytes }` — to size the real-world window before we spend on a fix.

## Data dependency (must resolve first)

Read 24 h of prod traffic: `pm2 logs api | grep 'tempfile dwell'`, compute the p95 of `dwellMs` on the disk branch.

- **p95 < 500 ms** → race window is small. Defer the rework. Keep the explicit #2654 error. Close #2863 with the measured p95 in the close comment. No code change.
- **p95 > 5 s** → proceed with the in-memory rework below.
- **500 ms ≤ p95 ≤ 5 s** → no automatic trigger; bring the distribution to the trio and decide. Default lean: defer, keep watching.

## Proposal (only if p95 > 5 s)

Read each file into a `Buffer` in the parent process before the Worker is constructed, so the worker never touches the temp path. Eliminates the reaper window entirely for files inside the cap.

- Cap the in-memory read at the free-tier upload limit (~100 MB). Above the cap, keep the disk path.
- On the surviving disk path (paying users, over-cap files), add a pre-read existence guard so a missing temp file fails with the explicit #2654 error instead of a raw `Buffer.from(undefined)`.

## Scope

- Decision: read the dwell data, apply the criteria above.
- If triggered: parent-process buffering up to the cap, disk fallback over the cap, pre-read existence guard on the disk branch.

## Explicitly NOT in scope

- A streaming/chunked upload rewrite.
- Moving conversion off the worker model.
- Changing the free-tier upload size limit.
- Touching the Notion conversion path (this is the file-upload path only).
- Any work at all if p95 < 500 ms — that branch is a no-op plus a close comment.

## Touch points

- `src/usecases/uploads/worker.ts` — the in-memory (`file.buffer`) and disk (`file.path`) branches and the dwell logging already live here.
- `src/usecases/uploads/GeneratePackagesUseCase.ts` — where the Worker is constructed; parent-process buffering lands ahead of this.
- `src/lib/conversionPool.ts` — worker dispatch.

## Risks / Rails

- **Memory budget** — buffering files in the parent process raises peak RSS on the hot upload path. The ~100 MB cap bounds a single file; concurrent uploads multiply it. Confirm headroom against current pool concurrency before merge.
- **False-trigger** — do not implement on a hunch; the criteria above are the gate. A `fix:` changelog entry ships only if a code change ships.
- **Cap drift** — the in-memory cap must track the actual free-tier upload limit; read it from the same source, don't hard-code a second copy.

## Acceptance criteria

- The measured p95 and the resulting decision are recorded on #2863.
- If deferred: #2863 closed with the p95; no code change; no changelog entry.
- If implemented: files within the cap never read from the temp path; a missing temp file on the disk branch surfaces the explicit #2654 error, never `Buffer.from(undefined)`; a regression test reproduces the missing-temp-file case and asserts the explicit error.

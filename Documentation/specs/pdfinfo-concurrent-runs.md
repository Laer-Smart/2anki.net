# Spec: stop concurrent pdfinfo runs racing the same workspace

**Outcome**: Zero `Failed to execute pdfinfo` errors in pm2 logs over a rolling 14-day window after rollout (baseline: 4 occurrences on 2026-05-28 against one upload). Leading indicator: successful first-card-review rate on PDF uploads.

**Goal alignment**: PDF is one of the two main "drop something in, get a clean deck back" inputs alongside Notion. A silent pdfinfo failure on an unencrypted file is the exact kind of friction that kills the conversion that brought the user in.

**Problem.** In prod logs on 2026-05-28, `[PrepareDeck] convertFile pdf→images (text fallback)` fires twice for the same workspace within a single upload, with overlapping durations. `src/infrastracture/adapters/fileConversion/convertPDFToImages.ts` writes the PDF to a deterministic path (`workspace.location/<basename>.pdf`) and `src/lib/pdf/getPageCount.ts` writes a deterministic stderr log next to it (`<basename>_stderr.log`). When two invocations land on the same workspace, the second `writeFile` can land mid-spawn of the first `pdfinfo`, and the two `pdfinfo` processes can collide on the stderr log. The observed effect: `Failed to execute pdfinfo` with an empty stderr file, on a 125-page medical PDF that pdfinfo reads cleanly when run manually against the same bytes.

**Root cause hypothesis.** Two candidates, in order of likelihood:

1. `PrepareDeck.convertFile` is called twice for the same PDF entry because `input.files` already contains a duplicate (e.g. the original upload plus a copy extracted upstream by the zip/Notion path). `Promise.all(input.files.map(convertFile))` then fans out two concurrent `convertPDFToImages` calls against the same `workspace.location` and the same `file.name`.
2. The worker retries a transient pdfinfo failure that we don't currently classify as terminal, and the retry overlaps with the original because nothing in `convertPDFToImages` is idempotent against a half-written file.

The investigation has to pin which of (1) or (2) is real before we pick a fix — both shapes produce the same symptom in logs.

**Riskiest assumption**: that the duplication is at `input.files` and not somewhere deeper (e.g. a caller invoking `PrepareDeck` twice, or a Notion zip extractor that emits the same buffer under two paths). If the dup is one layer up, deduping inside `convertFile` papers over a real bug.

**Smallest test**: ship a single PR that logs the file list `PrepareDeck` receives (count, names, source path/key) at entry and at the point of `Promise.all`. Re-run the 125-page anatomy upload against staging. Within one job we'll see either two entries with the same `file.name` (case 1), or one entry that triggers `convertFile` twice (case 2). No code path changes in this PR — pure diagnostic.

**What this removes**: nothing yet — the diagnostic PR is additive. The follow-up fix will remove the deterministic `pdfPath` collision shape in `convertPDFToImages.ts` (either by dedup at the call site or by per-call temp paths).

**Primary action**: keep a PDF upload moving through the deck pipeline without a phantom failure on the rasterise fallback.

**Default behavior**: every PDF gets exactly one `pdfinfo` invocation per logical conversion. No new toggles.

**Surface vocabulary**: matches the existing `PrepareDeck` logging vocabulary (`[PrepareDeck] convertFile …`). The diagnostic adds two lines in the same style.

**Scope**:

- *In*: diagnostic logging in `PrepareDeck.ts` showing the received file list and convert-fan-out shape; one follow-up fix (chosen after the diagnostic lands) of either dedup-at-callsite *or* per-call random temp path inside the workspace for `convertPDFToImages`'s write target.
- *Out*: redesigning the worker retry policy; converting `getPageCount` away from `pdfinfo`; rewriting `extractPdfText`; touching the Vertex/Claude PDF paths.

**User story**: As someone uploading a long PDF (100+ pages), I want my upload to either succeed or fail with a real reason — not fail with `Failed to execute pdfinfo` on a file that pdfinfo handles fine.

**Acceptance criteria**:

- [ ] `PrepareDeck` logs the received `input.files` (count + names + `key`/`path` shape) at entry, and logs each `convertFile` call's `(file.name, workspace.location)` immediately before the work starts.
- [ ] After the diagnostic ships, the root cause is documented in the PR body of the follow-up fix.
- [ ] The follow-up fix makes concurrent `convertPDFToImages` calls on the same workspace safe — either there are no concurrent calls (dedup) or they no longer share `pdfPath` and `<basename>_stderr.log` (per-call temp path under `workspace.location`).
- [ ] No new `Failed to execute pdfinfo` errors in pm2 logs for 14 days post-rollout against unencrypted PDFs that pdfinfo parses manually.
- [ ] User-facing copy on PDF failures still passes `VOICE.md` — direct, specific, sentence case, no exclamation marks.
- [ ] Test layer: Jest (`src/infrastracture/adapters/fileConversion/PrepareDeck.test.ts`) covers the dedup-or-isolation behavior with two same-named PDF entries in `input.files`.

**Recommendation (opinionated)**: do the diagnostic PR first, then dedup at the `PrepareDeck` call site if case 1 holds. Dedup is the cheaper fix and removes a class of bug rather than working around it. Per-call temp paths are the fallback if the dup is genuinely produced upstream and we can't reach it.

**Open questions**:

- Does the worker's retry path re-enter `PrepareDeck` with the same `input.files`, or with a refreshed list? (Resolve by reading `worker.ts` during `/implement`.)
- Is the duplicate file entry coming from the zip/Notion extraction layer rather than the multer boundary? The diagnostic answers this.

**Out of scope (next iteration)**:

- Replacing `pdfinfo` with `pdf-lib` or `pdfjs` for page-count. The shell-out is fine when it isn't racing itself.
- Tightening the worker's retry policy. If the diagnostic shows case 2 (retry), we'll spec that separately.

**Layered architecture**: lands in `src/infrastracture/adapters/fileConversion/` (the diagnostic) and either the same file or `src/lib/pdf/` (the follow-up). No route/controller/use-case touches.

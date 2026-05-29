# Spec: Graceful error for unreadable .docx uploads

### Trio synthesis
- **PM:** Wrap `mammoth.convertToHtml` in try/catch, rethrow with a `docx_parse_failed:` sentinel, map to a structured 400 in `UploadService`, add the `PER_CODE_COPY` entry on the client. Mirror the shipped PDF pattern from #2861 exactly.
- **Designer:** Copy chosen by banned-word audit between three candidates: *"We couldn't read this .docx. It may have been renamed from another format. Try re-exporting it from Word or Google Docs."* Same surface as `pdf_processing_failed`. Code key `docx_processing_failed`.
- **Engineer:** Sentinel-prefix in adapter, regex match in `UploadService` (both sync + async paths). **Pre-existing drift:** `web/src/types/UploadErrorBody.ts` lacks the `pdf_processing_failed` code that's already on the server — fix that in the same PR. No collision on the new sentinel string (grepped). `preprocessDocxHTML` failures stay out of scope (our code, not user-input shape). No new log lines in the adapter (filename is already logged at `PrepareDeck`). S effort.
- **Agreement:** sentinel pattern, copy + code key, S effort, no migration.
- **Conflict resolved:** PM proposed two candidates inline; designer ran a VOICE banned-word audit between three and picked the specific "renamed from another format" framing. Spec adopts designer's copy verbatim.
- **Critical pre-flight finding:** server/web `UploadErrorBody` unions are out of sync (server has `pdf_processing_failed`, web doesn't). Same PR adds both `pdf_processing_failed` (drift fix) and `docx_processing_failed` (new) to the web union.
- **Resulting plan:** wrap mammoth + rethrow `docx_parse_failed:` → match `/^docx_parse_failed/` in sync + async `UploadService` paths → add code to both UploadErrorBody unions → `PER_CODE_COPY` entry → three test files → changelog entry.

---

## Outcome

Zero uploads return a raw mammoth library message to the user. Production 4xx responses on `.docx` inputs either drop to zero or carry the new structured `{ code: 'docx_processing_failed', message: '...' }` shape with VOICE-compliant text. Leading indicator: count of 4xx upload responses whose body contains `"Could not find the body element"` or any other unprefixed mammoth string over the 7 days after deploy — target zero.

## Goal alignment

"Simplest, fastest, most beautiful" includes the failure path. A first-time free user who uploads a renamed file and reads `Error: Could not find the body element: are you sure this is a docx file?` does not come back. Brand-aligned voice on every error is part of growth to 300K. This is the same wedge #2861 fixed for PDF.

## Problem

`src/infrastracture/adapters/fileConversion/convertDocxToHTML.ts` calls `mammoth.convertToHtml` with no try/catch. Mammoth's developer-facing throws pass through the worker envelope and `UploadService` returns them verbatim.

Production instance (2026-05-27, `server-blue-error-50.log`):
```
Error: Could not find the body element: are you sure this is a docx file?
    at Worker.<anonymous> (.../GeneratePackagesUseCase.ts:43:18)
```

User uploaded a misnamed `.docx` (likely `.odt`, `.rtf`, or a renamed PDF) and saw the library's rhetorical question. The PDF path already solved this shape; docx is the next instance of the same pattern.

## Riskiest assumption

That a single `docx_parse_failed:` sentinel covers every user-visible mammoth failure mode. Two ways it could be wrong:
1. Password-protected (encrypted OOXML) docx may throw a distinguishable string — if so, it warrants its own sentinel `docx_password_protected:` mirroring `PDF_NEEDS_PASSWORD`.
2. Failures may originate *after* mammoth returns — inside `preprocessDocxHTML` — and one wrap doesn't cover them.

**Smallest test:** before writing the fix, run:
```
grep -rn "throw new Error\|throw exceptions.create" node_modules/mammoth/lib
```
Enumerate the throw shapes. If password-protected encrypted OOXML throws a distinguishable message (e.g. `"This file is encrypted"`), branch the catch and emit `docx_password_protected:` instead. If not, one sentinel ships. Then `grep -n "throw\|reject" src/infrastracture/adapters/fileConversion/preprocessDocxHTML.ts` — if it has its own throws, decide whether to widen the try/catch to wrap both calls or leave them separate.

## Scope

**In**
- Wrap `mammoth.convertToHtml` (and `preprocessDocxHTML` if it has throws) in try/catch in `convertDocxToHTML.ts`. Rethrow with `new Error('docx_parse_failed: ' + original.message)`. If the smallest-test grep finds a password-protected discriminator, branch and emit `docx_password_protected: ...` for that case.
- Drop the existing `console.log('[convertDocxToHTML] conversion warnings', result.messages)` line — it was unread noise.
- `UploadService.ts` (sync upload path, line 238 vicinity): add an `else if` branch matching `/^docx_(parse_failed|password_protected)/` → returns `{ code: 'docx_processing_failed', message: '...' }` (or `'docx_password_protected'` for the password case) with HTTP 400.
- `UploadService.ts` (async upload path / `handleAsyncUpload`): the same sentinel must be handled in the job-failed catch so the structured code reaches the job-status surface, not just the synchronous path. Engineer audits both paths and confirms in the PR body.
- Add `'docx_processing_failed'` (and `'docx_password_protected'` if applicable) to **both** `src/types/UploadErrorBody.ts` and `web/src/types/UploadErrorBody.ts`.
- **Drift cleanup:** add `'pdf_processing_failed'` to `web/src/types/UploadErrorBody.ts` — currently only on the server side; this is pre-existing drift the engineer audit caught.
- `web/src/components/errors/helpers/getErrorMessage.ts`: add `PER_CODE_COPY['docx_processing_failed']` with the designer copy. If the password sentinel ships, add `PER_CODE_COPY['docx_password_protected']` too.
- Tests:
  - New `src/infrastracture/adapters/fileConversion/convertDocxToHTML.test.ts` — assert sentinel name for non-docx buffers.
  - Extend `src/services/UploadService.test.ts` — assert 400 + structured body shape on a `docx_parse_failed:` thrown error.
  - Extend `web/src/components/errors/helpers/getErrorMessage.test.ts` — assert friendly copy returned for the new code.
- Changelog entry at `web/src/pages/WhatsNewPage/changelog/2026-05-29-docx-graceful-error.json`, type `"fix"`, title `Uploads of misnamed .docx files get a clear "re-export this" message instead of a library error`.

**Out**
- Replacing `mammoth`.
- Supporting `.doc` (legacy binary), `.odt`, `.pages`, or auto-detecting and re-routing renamed file types.
- Translating mammoth's non-fatal `result.messages` warnings (the successful-with-quirks path).
- Pre-upload MIME-sniff in the browser.
- Detecting the silent-empty-deck case where mammoth succeeds but returns empty HTML — that's the same shape as the open Notion-markdown-zero-cards work and belongs there.

## User story

As someone uploading a Word document I exported from another tool, when the file isn't a real `.docx`, I want to know why and what to do — instead of a library error with a rhetorical question.

## Acceptance criteria

- [ ] `convertDocxToHTML.ts` wraps the `mammoth.convertToHtml` call (plus `preprocessDocxHTML` if it has throws) in a single try/catch.
- [ ] On catch: rethrow `new Error('docx_parse_failed: ' + original.message)`. If the smallest-test grep finds a discriminable encrypted-OOXML throw, branch and rethrow `'docx_password_protected: ' + original.message` for that case.
- [ ] The `[convertDocxToHTML] conversion warnings` `console.log` is deleted, not commented.
- [ ] `UploadService.ts` synchronous upload path matches `/^docx_(parse_failed|password_protected)/` on `err.message` and returns HTTP 400 with `{ code: 'docx_processing_failed' | 'docx_password_protected', message: '...' }`. Sits adjacent to the existing `pdfinfo_*` branch at line 238.
- [ ] `UploadService.handleAsyncUpload` job-failure path also recognises the sentinel so the job status persists the structured code, not the raw message.
- [ ] `src/types/UploadErrorBody.ts` adds the new code(s) to the union.
- [ ] `web/src/types/UploadErrorBody.ts` adds the new code(s) AND adds `'pdf_processing_failed'` (drift fix) to the union.
- [ ] `web/src/components/errors/helpers/getErrorMessage.ts` `PER_CODE_COPY` returns the designer copy verbatim for `docx_processing_failed`:
  - title: `"We couldn't read this .docx."`
  - detail: `"It may have been renamed from another format. Try re-exporting it from Word or Google Docs."`
- [ ] If the password sentinel ships, `PER_CODE_COPY['docx_password_protected']`:
  - title: `"This .docx is password-protected."`
  - detail: `"Remove the password and upload again."`
- [ ] `convertDocxToHTML.test.ts` asserts a non-docx buffer (e.g. `Buffer.from('%PDF-1.4')`) rejects with `err.message` matching `/^docx_parse_failed: /`.
- [ ] `UploadService.test.ts` asserts the 400 + structured body shape when `GeneratePackagesUseCase.execute` throws `docx_parse_failed:` (stubbed).
- [ ] `getErrorMessage.test.tsx` asserts `classifyUploadError({ code: 'docx_processing_failed', ... })` returns the designer copy.
- [ ] Changelog entry exists with matching `id` and the title above.

## Leading indicator

Over the 7 days after deploy: `grep -c "Could not find the body element" ~/.pm2/logs/server-*-error-*.log`. Baseline (7 days before): 1 occurrence in the window I sampled. Target: zero.

## Design notes

**Copy** (designer-vetted, banned-word audit passed):

| Code | Title | Detail |
|---|---|---|
| `docx_processing_failed` | We couldn't read this .docx. | It may have been renamed from another format. Try re-exporting it from Word or Google Docs. |
| `docx_password_protected` (only if smallest-test discriminates) | This .docx is password-protected. | Remove the password and upload again. |

**Surface:** the inline upload-result error area — same place `pdf_processing_failed` lands today. No new surface, no new component. The existing `classifyUploadError` → `PER_CODE_COPY` routing handles it.

**No exclamation marks. Sentence case. Periods on full sentences.** Per `VOICE.md` and `email-templates.md`.

## Technical pre-flight

**Layers touched**

| Layer | Change |
|---|---|
| `infrastracture/adapters/fileConversion/` | Wrap mammoth call, throw sentinel; new test file |
| `services/` | `UploadService.ts` adds one `else if` branch in sync catch + matching coverage in async catch |
| `types/` (server) | Add new code(s) to `UploadErrorBody` union |
| `web/types/` | Add new code(s) + fix existing `pdf_processing_failed` drift |
| `web/components/errors/helpers/` | Add `PER_CODE_COPY` entries; extend test |
| `web/pages/WhatsNewPage/changelog/` | New JSON entry |

**Files in play**

| File | Change |
|---|---|
| `src/infrastracture/adapters/fileConversion/convertDocxToHTML.ts` | Wrap mammoth, sentinel-rethrow, drop `console.log` |
| `src/infrastracture/adapters/fileConversion/convertDocxToHTML.test.ts` | New |
| `src/services/UploadService.ts` | `else if` branch in sync; async-path job-failure handler |
| `src/services/UploadService.test.ts` | One new `it()` block |
| `src/types/UploadErrorBody.ts` | Add new code(s) |
| `web/src/types/UploadErrorBody.ts` | Add new code(s) + `pdf_processing_failed` drift fix |
| `web/src/components/errors/helpers/getErrorMessage.ts` | `PER_CODE_COPY` entries |
| `web/src/components/errors/helpers/getErrorMessage.test.tsx` | One new `it()` block |
| `web/src/pages/WhatsNewPage/changelog/2026-05-29-docx-graceful-error.json` | New |

**Approach (sketch)**

```ts
// src/infrastracture/adapters/fileConversion/convertDocxToHTML.ts
export async function convertDocxToHTML(contents: Buffer): Promise<string> {
  let result;
  try {
    result = await mammoth.convertToHtml({ buffer: contents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If smallest-test grep finds a password discriminator, branch here.
    throw new Error(`docx_parse_failed: ${msg}`);
  }
  try {
    return preprocessDocxHTML(result.value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`docx_parse_failed: ${msg}`);
  }
}
```

`UploadService.ts` (mirror the PDF pattern at line 238):
```ts
} else if (err instanceof Error && /^docx_password_protected/.test(err.message)) {
  return res.status(400).json({
    code: 'docx_password_protected',
    message: 'This .docx is password-protected. Remove the password and upload again.',
  });
} else if (err instanceof Error && /^docx_parse_failed/.test(err.message)) {
  return res.status(400).json({
    code: 'docx_processing_failed',
    message: "We couldn't read this .docx. It may have been renamed from another format. Try re-exporting it from Word or Google Docs.",
  });
}
```

Same matching block lives inside `handleAsyncUpload`'s job-failure catch so the structured code reaches the job-status surface.

**Test plan**

`convertDocxToHTML.test.ts`:
- `rejects with docx_parse_failed: prefix when given a non-docx buffer (raw PDF bytes)`
- `rejects with docx_parse_failed: prefix when given a random binary buffer`

`UploadService.test.ts`:
- `returns 400 with code docx_processing_failed when convertDocxToHTML throws a docx_parse_failed error`

`getErrorMessage.test.tsx`:
- `returns docx_processing_failed copy when code is docx_processing_failed`

**Effort:** S — ~30 LOC server + ~15 LOC client + ~40 LOC tests across three files. One branch, no migration, no schema change.

**Risks**
- *`preprocessDocxHTML` failures:* in-scope per the wider try/catch. Same sentinel.
- *`result.messages` warnings:* out of scope. Mammoth still returned HTML; non-fatal.
- *Sentinel collision:* zero matches for `docx_parse_failed` in `src/` — clean.
- *Drift fix risk:* adding `pdf_processing_failed` to the web union shouldn't change any runtime behaviour because nothing in the codebase types-checks against the union as a discriminator today — but the engineer confirms with `tsc` post-edit.

**Security & migrations**
- No migration. No DB change.
- The adapter receives a `Buffer`; no filename in scope. The sentinel rethrow carries only the mammoth message text (no buffer, no user content).
- Don't add a new `console.log` in the adapter — filename is already logged at `PrepareDeck` level; duplicating it would be redundant.

## Open questions

- Mammoth throw enumeration — does encrypted OOXML produce a distinguishable string? Determines whether `docx_password_protected` ships now or stays in "next iteration." Engineer pastes the `grep -rn "throw" node_modules/mammoth/lib` excerpt in the implementation PR body.
- Does `preprocessDocxHTML` have throws of its own? The spec assumes yes and wraps both calls; if no, the second try/catch is harmless redundancy and can stay or be removed.
- Is there a `.docx` whose mammoth conversion succeeds but returns empty HTML? Out of scope here — that's the silent-zero-card pattern and belongs with the Notion-markdown work.

## Next iteration (not this PR)

- Pre-upload MIME-sniff in the browser so the user is told before the upload finishes.
- Auto-detecting renamed `.odt` / `.pages` / `.pdf` server-side and routing to the matching converter.
- Surfacing mammoth's `result.messages` warnings as "this file converted with some formatting loss" notes.
- Detecting the silent empty-HTML case and treating it as `docx_parse_failed:` rather than a 0-card success.

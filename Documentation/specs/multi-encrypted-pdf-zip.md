# Spec: ZIPs with multiple password-protected PDFs

Issue: #2411

## Problem

Password-protected PDF support (#2404) scoped multi-encrypted-PDF ZIPs to a later
version. Today:

- ZIP with **one** encrypted PDF → locked-row UI surfaces, user unlocks,
  conversion proceeds. Works.
- ZIP with **multiple** encrypted PDFs → the first to hit `PrepareDeck`'s PDF path
  throws the `PDF_NEEDS_PASSWORD` sentinel; the user can only unlock that one.
  Other encrypted PDFs in the ZIP are silently dropped or re-prompt sequentially
  in a way the UI does not handle cleanly.

This is not a regression — it is a deliberately deferred gap. **Per #2411 the
trigger to pick this up is the #2410 instrumentation:** if `format: 'pdf'` events
show a meaningful number of ZIP uploads with multiple `needsCredential: true`
files, prioritize; otherwise defer. This spec documents the chosen v2 plan so
acceptance criteria exist *before* implementation — it does not authorise
implementation ahead of that data signal.

## Proposal

When the data justifies it, ship **skip-with-warning (per-file unlock)** as v2:

- Surface one locked-row entry per encrypted PDF in the upload list.
- The user supplies a password per file; each file converts independently.
- A file that stays locked or fails to decrypt is **skipped with a clear note**,
  and the rest of the ZIP still converts. No silent drop, no broken re-prompt.

Batch password entry (one input for all encrypted PDFs sharing a password) is the
richer option but is **v3, only if data supports it** — it adds UI and a
"wrong-password-for-some-files" partial-failure state that v2 avoids.

The collection step needs to stop short-circuiting on the first sentinel: instead
of throwing on the first `PDF_NEEDS_PASSWORD`, collect every encrypted entry's
identity so the controller can return the full locked set, then accept a
credential per file on retry.

## Scope (in)

- ZIP extraction reports **all** encrypted PDF entries, not just the first.
- Upload list renders one locked row per encrypted PDF.
- Per-file credential retry; each file converts independently.
- A failed/locked file is skipped with a user-facing note; the rest still convert.
- Tests: ZIP with 2+ encrypted PDFs surfaces N locked rows; unlocking a subset
  converts the unlocked ones and skips the rest with the note.

## Explicitly NOT in scope

- **Implementing ahead of the #2410 data signal** — this is the recorded trigger;
  the spec waits on it.
- Batch / single-password-for-all entry (v3, data-gated).
- Changing single-encrypted-PDF behaviour (already works; must not regress).
- Mixed archives beyond PDFs (the encrypted-entry handling stays PDF-specific).

## Touch points

- `src/services/UploadService.ts` — ZIP iteration; collect all encrypted entries.
- `src/infrastracture/adapters/fileConversion/PrepareDeck.ts` /
  `extractPdfText.ts` — stop short-circuiting on the first sentinel.
- `src/lib/pdf/pdfPasswordSentinel.ts` — sentinel carries per-file identity.
- `src/controllers/Upload/UploadController.ts` — return the full locked set;
  `RetryPdfWithCredentialUseCase` accepts a per-file credential.
- Web upload list — render N locked rows, per-file password input, skip note.

## Risks / Rails

- **Conversion hot path + untrusted upload.** ZIP entry names must stay validated
  against path traversal (`..`, absolute, symlink) per the existing `lib/zip`
  helpers — multiplying the encrypted-entry handling must not weaken that check.
- **Memory.** Multiple PDFs decrypted in one request multiplies peak memory; cap
  the per-request encrypted-file count and the existing upload size limit. Decide
  the cap during implementation; do not decrypt unbounded files in parallel.
- **Credential handling.** Per-file passwords are user secrets — never log them
  (CWE-532); pass through the existing credential plumbing, no new sink.
- No auth/payments/migration surface.

## Acceptance criteria

- **Gate:** before implementation starts, #2410 instrumentation shows a meaningful
  count of ZIP uploads carrying multiple `needsCredential: true` PDFs. Until then,
  this stays a draft spec and ships nothing.
- A ZIP with 2+ encrypted PDFs surfaces one locked row per encrypted PDF.
- Supplying the correct password per file converts each independently into the
  deck; a file left locked or wrong-passworded is skipped with a clear note and
  does not block the others.
- Single-encrypted-PDF ZIPs behave exactly as today (regression test).
- No password value appears in any log line.

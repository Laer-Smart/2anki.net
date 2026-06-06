# Spec: Photo-to-deck — accept a zip of photos (demand-gated)

Tracks #3126. **This is deferred by default.** Photo-to-deck is image-only today; multi-select already covers most cases. A zip-of-photos input only helps archive-shaped workflows (a scanner-app export, a downloaded album). The issue explicitly says hold until demand shows up. This spec records the deferral and the shape to build *if* the trigger fires — it is not a build instruction.

## Problem

A user with an archive of lecture photos (a zip from a scanner app or an exported album) must select files one at a time on `/photo-to-deck`; there's no way to drop the zip itself. Multi-select handles the common case, so this is a gap only for archive-shaped inputs. See #3126.

## Deferral (the default outcome)

Do not build until there is a demand signal:

- support requests asking for zip upload on photo-to-deck, **or**
- feedback mentioning zips on `/photo-to-deck`, **or**
- instrumented drop attempts of a `.zip` onto the page that we could count.

Until one of those lands, this spec stays parked. If you're reading it without a signal in hand, the correct action is no code.

## Proposal (only if demand shows up)

Client-side zip extraction that feeds the **existing** per-image pipeline — the page is entirely client-side, so the zip never reaches the server.

1. User drops or selects a `.zip` on `/photo-to-deck`.
2. Extract entries client-side.
3. For each entry, run the existing validate → re-encode path (same per-image size cap, same supported image types).
4. Reject non-image entries quietly and report a count: "12 photos added, 3 files skipped".
5. Honour the existing per-photo count limit / monthly quota exactly as multi-select does.

## Scope (if built)

- Client-side `.zip` extraction on `/photo-to-deck`.
- Each extracted image flows through the current per-image validate/re-encode pipeline.
- Non-image entries skipped with a visible count.
- Existing size cap and photo-count/quota limits enforced unchanged.

## Explicitly NOT in scope

- Server-side extraction — the photo pipeline is client-side; do not move it.
- General archive formats (rar, 7z).
- Nested zips.
- PDF-in-zip or any document-in-zip — separate document surfaces exist.
- New limits or quota changes — reuse what photo-to-deck already enforces.
- Any work at all absent a demand signal.

## Touch points

- `web/src/pages/PhotoToFlashcardsPage/PhotoToFlashcardsPage.tsx` — `appendPhotos` / `handleFileInput` / `validatePhoto` and the accepted-MIME list; the zip path produces `File`s that feed the same `appendPhotos`.
- A client-side zip reader dependency or helper (check `pnpm why` for an existing one before adding; reuse if present).

## Risks / Rails

- **Zip path traversal** — even client-side, validate entry names: reject `..`, absolute paths, and symlinks before reading bytes. Reuse the safe zip-entry rules from the server upload path (CWE-22, CWE-434).
- **Decompression bomb** — a small zip can expand to gigabytes of pixels in the browser; cap total extracted bytes / decoded image count before the re-encode loop, and bail with a clear message rather than freezing the tab.
- **Quota honesty** — extracted images count against the same per-photo limit; a 200-photo zip on a free plan must hit the existing quota wall, not bypass it.
- **Bundle weight** — a zip reader adds client JS to a hot page; prefer an existing dep, and lazy-load it so non-zip users don't pay for it.

## Acceptance criteria

- Without a recorded demand signal, no code ships — the deferral holds.
- If built: dropping a zip of mixed files adds only the valid images and shows an accurate "N added, M skipped" count.
- A zip entry with a traversal name (`../x.png`) is rejected and never written/decoded.
- Extracted images respect the existing per-image size cap and the photo-count/monthly quota identically to multi-select.
- An oversized/bomb zip fails with a clear message instead of hanging the page.
- The zip reader is lazy-loaded so non-zip uploads don't download it.

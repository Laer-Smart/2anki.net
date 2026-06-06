# Image Occlusion preview: render masks server-side

Spec for #2574 (proper fix deferred from #2569). Draft for review before `/implement`.

## Problem

In the apkg gallery preview, Image Occlusion (IO) cards can't render as designed: the IO note
template ships inline `<script>anki.imageOcclusion.setup()</script>` and
`<canvas id="image-occlusion-canvas">`, both of which our preview sanitizer correctly strips. #2569
replaced the previously-broken image-only card with an honest static fallback:
*"Image Occlusion cards open with masks in Anki. Download the deck to study them."* That's truthful
but means a user previewing a deck of IO cards sees text where they expect to see the masked image —
a weak moment in the preview that undersells what they're about to download.

## Proposal (one opinionated direction)

Compose the masked image **server-side** and hand the preview a single static element it can render
without any sanitizer change:

1. Parse the IO note's `Occlusion` field. It carries cloze-style markers wrapping SVG shape
   coordinates, e.g. `[[oc1::rect 12 34 100 200]]` (rect / ellipse / polygon variants).
2. Build an SVG overlay drawing each masked region as an opaque shape.
3. Compose the overlay on top of the base `{{Image}}` field and emit one static inline SVG (image as
   an embedded `<image>` href to the existing media reference, shapes layered over it).
4. The composed output passes through the **unchanged** sanitizer — inline SVG with `<rect>`,
   `<ellipse>`, `<polygon>`, `<image>` and no `<script>`/`<canvas>` is allowed by the existing
   allowlist; if it is not, the fix is to whitelist those static SVG primitives, NOT to weaken the
   script/canvas stance.

Render the **question side only** — the mask covering the answer region — which is the at-a-glance
match to how the card looks in Anki when first shown.

Build the test corpus first (see Rails): a handful of real IO decks across the common addon variants
before implementation, so the field-format parsing is grounded in reality rather than assumption.

## Scope

- IO `Occlusion`-field parser → typed shape list (rect / ellipse / polygon).
- SVG overlay composer over the `{{Image}}` media reference.
- Wire the composed output into `ApkgPreviewService` in place of the static fallback for IO cards.
- Remove the static-fallback branch and its test once the composite renders.

## Explicitly NOT in scope

- Weakening `src/services/ApkgPreviewService/sanitize.ts`'s script/canvas stance.
- Whitelisting `<canvas>` or `<script>`.
- Reproducing the addon's "hide one / reveal all" or "hide all / reveal one" toggle interactivity —
  a static question-side composite is enough; toggles stay reserved for the real Anki app.
- The answer-side reveal view.

## Touch points

- `src/services/ApkgPreviewService/ApkgPreviewService.ts` — replace `isImageOcclusionTemplate`
  fallback (the `apkg-preview-fallback` div) with the composed-SVG path.
- New parser + composer module(s) under `src/services/ApkgPreviewService/` (e.g.
  `parseOcclusionField.ts`, `composeOcclusionSvg.ts`) — pure, heavily tested.
- `src/services/ApkgPreviewService/sanitize.ts` — **read-only confirmation** that inline SVG
  primitives survive; allowlist the static SVG tags only if needed, never script/canvas.
- `src/services/ApkgPreviewService/parseApkgNotes.ts` / `types.ts` — the `Occlusion` and `Image`
  field plus the media reference must reach the composer.
- `web/src/` — the apkg preview gallery now renders a real masked image; verify in the browser.

## Risks / Rails — read before `/implement`

- **Architectural change to the preview render path.** Preview output is browser-verified — the
  browser-attestation gate fires (the diff touches `web/src/` render). Implementation MUST tick the
  golden-path + 375px boxes after rendering real IO cards locally.
- **Build the test corpus first.** The Anki IO addon's field format is not fully documented and has
  variants. Assemble a few real IO decks per common variant before coding, and turn each into a
  fixture under `src/test/fixtures/` so the parser is pinned to real input, not a guessed grammar.
- **Sanitizer stays the security floor.** Do NOT relax the script/canvas stance to make IO render.
  If inline SVG is currently stripped, the only permitted loosening is the specific static SVG
  primitives (`svg`, `image`, `rect`, `ellipse`, `polygon`, `g`) with no event handlers and no
  script — re-run the `sanitize.test.ts` suite to prove `<script>`/`<canvas>`/`on*` still die.
- **Media reference, not raw URL.** The base image must come from the deck's bundled media (the
  existing `rewriteMedia` path), not a raw or signed URL — same durability rule as the rest of the
  apkg preview.
- **Coordinate-space correctness.** SVG `viewBox` must match the source image's intrinsic dimensions
  so masks land on the right pixels regardless of the rendered display size.

## Acceptance criteria

- IO cards in the apkg preview render a visible mask overlay that, at a glance, matches the
  question side of the same card in Anki — masked region opaque over the base image.
- The static fallback string and its test branch are removed.
- `sanitize.ts`'s script/canvas stance is unchanged; `sanitize.test.ts` still proves `<script>`,
  `<canvas>`, and `on*` attributes are stripped.
- Parser + composer are unit-tested against fixtures drawn from real IO decks covering rect,
  ellipse, and polygon shapes, plus a multi-mask card.
- `/check` green; browser-attestation boxes ticked after rendering real IO decks at desktop and 375px.

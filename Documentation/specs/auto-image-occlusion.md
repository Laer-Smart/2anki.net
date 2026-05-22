## Spec: Auto image-occlusion detection for highlighted terms

### Trio synthesis
- PM: Manual rect-drawing is the slowest step in our Image Occlusion flow; auto-suggest occlusions on highlighted/bold/underlined terms so the user reviews instead of authors. Move first-deck downloads from IO sessions up by 25% within four weeks of launch.
- Designer: Pre-fill the canvas with dashed "suggested" rects on file load; user accepts or rejects each one in place. Primary action stays **Make deck** — no new screen. Show a single tooltip the first time: "We highlighted what looks important. Tap to keep, swipe to drop."
- Engineer: Reuse the existing `ImageOcclusionPage` canvas and `OcclusionRect` shape; add a `services/imageOcclusion/AutoOcclusionService` that calls Anthropic via the existing `getAnthropicClient()` wrapper (already used by `PhotoToFlashcardsUseCase`). Effort **L** — split across two iterations: v1 = highlighted-background detection on a single uploaded image; v2 = bold/underlined + batch + AnKing note-type compatibility.
- Agreement: Trust the existing canvas; do not invent a new screen. Use Claude vision (not an open-source CV stack) for v1 because the wrapper, SSRF guard, and cost tracking already exist. Highlighted background is the highest-precision signal — start there.
- Conflict: PM wanted AnKing note-type compatibility in v1; engineer pushed back (parsing AnKing's field schema and version matrix is its own spec). Resolved: keep AnKing compatibility as an explicit follow-up spec (`auto-image-occlusion-anking.md`); v1 produces our existing IO note type.
- Resulting plan: Two-iteration build. Iter 1: server-side `AutoOcclusionService` returns suggested rects from one image; canvas renders them as dashed "suggested" overlays the user can keep, edit, or drop; ship behind a per-user flag on Auto Sync subscribers first. Iter 2: batch detection across all images in the queue + AnKing-compatible note type (separate spec).

---

**Outcome**: 25% lift in completed Image Occlusion deck downloads per IO session within four weeks of launch (leading indicator: deck downloads after first upload, scoped to `/image-occlusion`). Secondary: median time-to-first-deck on IO drops from current baseline to under 90 seconds.

**Goal alignment**: Image Occlusion is the conversion path medical and language learners pick on purpose, and it is the slowest one we offer. Cutting authoring time on the path advanced users already love compounds into the 300K-user goal through word-of-mouth in study communities (USMLE, nursing, language).

**Problem**: A recent usability tester — a professional Anki/Quizlet flashcard creator with full subscriber access — walked through the Image Occlusion flow end-to-end and reported that manual rect selection is the slowest step. Textbook pages, lecture slides, and medical notes routinely have 15–40 visually emphasized terms (highlighted backgrounds, bold, underlined). Authoring 40 rects by hand on a phone is the leak; many users abandon between upload and download because of it. Today the canvas opens empty; the first interaction the user has is drawing.

**Riskiest assumption**: That users will trust auto-suggested occlusions enough to keep most of them, rather than treating every suggestion as something to verify and edit. If acceptance rate is below ~60%, the suggestions add review burden instead of removing authoring burden.

**Smallest test**: Dogfood on 10 representative source images (3 USMLE slides, 3 nursing notes, 2 language vocab pages, 2 textbook scans). For each image, run the v1 detector and measure: (a) suggested-rect accept rate after a single human pass, (b) median time to first downloadable deck vs. the same image done manually. Ship to engineering only if accept rate ≥ 60% on at least 7 of the 10 images. Run this before adding the toggle to the user-facing UI.

**Scope (in)**:
- v1 detects **highlighted-background** terms (yellow/green/blue/pink marker overlays) on uploaded images.
- v1 detects **bold-via-OCR-confidence** terms — heavier-weight glyphs at higher OCR confidence than surrounding text.
- Server-side `AutoOcclusionService` returns suggested `OcclusionRect[]` to the existing `ImageOcclusionPage` canvas.
- Canvas renders suggestions as dashed overlays the user can keep with one tap, edit with drag-handles, or drop with swipe / delete.
- Gated to Auto Sync subscribers + lifetime Patreon users on launch (reuses `hasAnkifyAccess` if access pattern fits; otherwise gate on `isPayingUser`).
- Vision calls go through the existing `getAnthropicClient()` wrapper — never a new HTTP client; the `instrumentedAxios` SSRF guard and cost tracking pattern from `PhotoToFlashcardsUseCase` apply.
- Per-image cost ceiling: reuse `VISION_TOKEN_CEILING` from `lib/claude/countVisionTokens.ts`. Reject oversize images with the same "try a smaller image" error.

**Scope (out — explicit)**:
- **Underline detection** in v1. Underlines under a baseline are visually inconsistent (different colors, dashed vs. solid, sometimes part of a handwritten note). Defer to v2 once we see accept-rate on highlighted/bold.
- **Pure color-marked terms with no background** (e.g. a red word on a white page). Defer to v2.
- **AnKing-style Image Occlusion Enhanced note type compatibility.** This is a separate spec (`auto-image-occlusion-anking.md`) — AnKing's note type has version-sensitive fields (Header, Image, Footer, Remarks, Sources, Extra-1..5) and a card-template structure tied to specific Anki releases. Auto-detection ships first; AnKing-shape output ships second.
- **Batch detection** across all images in the IO queue. v1 runs on the active image only.
- **PDF input.** Existing IO flow already accepts images; PDFs continue through their own path.
- **An open-source CV alternative** to Claude vision. Re-evaluate only if cost-per-image exceeds a target we'll set in v1's dogfood run.

**User story**: As a medical student uploading a lecture slide full of bolded drug names and highlighted side effects, I want the app to pre-fill the occlusions for me, so I can review and download a deck in under a minute instead of drawing 30 rects by hand.

**Acceptance criteria**:
- [ ] When a user with Auto Sync access uploads an image to `/image-occlusion`, the canvas shows dashed suggested rects within 6 seconds (median) for a standard 1080p image.
- [ ] Each suggested rect carries a confidence band; below the threshold the rect is not surfaced.
- [ ] The user can keep a suggestion (one tap), edit it (drag handle, same affordance as manually drawn rects), or drop it (delete key / swipe).
- [ ] Suggestions and manual rects round-trip through the existing `OcclusionRect` shape with no new fields except `source: 'auto' | 'manual'` for analytics.
- [ ] The "Make deck" button stays the primary action; nothing else competes for visual weight.
- [ ] Free-tier users see a locked teaser with one example (no auto call made) and the upgrade CTA, matching the existing IO paywall pattern.
- [ ] A new event `auto_occlusion_suggested` (with `suggested_count`, `kept_count`, `dropped_count`) is emitted on every deck download so we can measure accept-rate in production.
- [ ] Failure modes: if the vision call errors or returns no rects, the canvas falls back silently to the empty-canvas manual flow (no error toast) — the suggestion path is additive, never blocking.
- [ ] Tests: outside-in test from controller down through `AutoOcclusionService` with Anthropic mocked at the SDK boundary; canvas component test asserting the dashed style and keep/drop interactions.

**Open questions** (resolve before engineering starts):
- Vision-call latency budget: is 6 seconds median acceptable, or should the canvas open empty and stream in suggestions when ready? Recommendation: stream in — user can start drawing if they want, suggestions appear as dashed overlays when the call returns.
- Cost ceiling per user per month: do we put a hard cap on auto-suggest calls for Auto Sync subscribers, or treat as unlimited? Recommendation: unlimited for v1, instrument cost-per-user, revisit if outliers appear in the dogfood data.
- Prompt design: do we tell Claude to also return the term inside each rect (the "answer" text for the IO note), or only the bounding box? Recommendation: return both — the user can edit the answer text in-place, same as the existing `OcclusionRect.label`.
- Should the per-image vision response cache (by image hash) so repeated uploads of the same slide don't re-spend? Recommendation: yes, cache by SHA-256 of the image bytes for 7 days.

### Design notes

**User moment**: "I just dropped a slide into the canvas. I see 27 highlighted terms on the slide. I do not want to draw 27 rectangles."

**Recommendation — one design, dashed-overlay pattern**:

1. On image load, the canvas immediately shows the image (existing behavior). A small inline status appears under the toolbar: `Looking for highlights…` (sentence case, no trailing period — matches `VOICE.md`).
2. When the vision call returns, dashed rects fade in over each detected term. Each rect carries a small chip at its bottom-right with the detected term and a `×` to drop.
3. Tapping inside a dashed rect "keeps" it — the dashes become a solid stroke, matching the manual-rect style. Hitting `Delete` or tapping the chip's `×` drops it.
4. Editing a rect (drag handles) auto-promotes from suggested to kept (same data path as a manually drawn rect — sets `source: 'manual'` on first edit).
5. The toolbar gets one new control: a small `Clear suggestions` text button (tertiary action, link-style, no border) that drops all unkept suggestions at once. No "accept all" — accepting one at a time is the verification step.
6. Empty state if no suggestions returned: existing empty canvas. No error toast. The status line under the toolbar quietly clears.

**Copy strings**:
- Status while detecting: `Looking for highlights`
- Status when done with N found: `N suggestions — tap to keep`
- Status when done with zero: (clears silently — no toast)
- Toolbar button: `Clear suggestions`
- First-time tooltip (one-time, dismissable): `Tap a dashed box to keep it. Drag to resize. Press delete to drop.`
- Upgrade banner for free tier: `Auto-detect highlights — Auto Sync only` with `Upgrade` button beside it (existing pattern).

**Tradeoff (call it out)**: Dashed overlays add visual noise on dense slides. We accept that because the user is about to interact with every term anyway — the noise is information, not decoration. If the canvas feels cluttered on the dogfood images, we'll add a `Hide suggestions` toggle in v2, not v1.

**Verdict**: minor changes — primary action and screen stay the same; one new toolbar button, one new status line, one dashed-stroke variant. No new page, no new component.

### Technical pre-flight

**Layers touched**:
- `routes/ImageOcclusionRouter.ts` — new `POST /api/image-occlusion/auto-suggest` route, multipart image upload.
- `controllers/ImageOcclusionController.ts` — new handler that gates on subscription, validates the upload via `multer` + existing safe-filename helpers, hands off to the use case.
- `usecases/imageOcclusion/AutoSuggestOcclusionsUseCase.ts` — new use case. Validates image dimensions/tokens (reuse `countVisionTokens`), checks cache, calls `AutoOcclusionService`, returns rects.
- `services/imageOcclusion/AutoOcclusionService.ts` — new service. Wraps the Claude vision call via `getAnthropicClient()`. Owns the prompt + the response parser.
- `lib/claude/` — small addition: a parser for the auto-occlusion JSON response shape (mirrors `parseClaudeVisionResponse` in `PhotoToFlashcardsUseCase`).
- `web/src/pages/ImageOcclusionPage/` — `OcclusionCanvas.tsx` learns to render dashed "suggested" rects; new toolbar button in `CanvasToolbar.tsx`; first-time tooltip flag in localStorage (this case is explicitly allowed under code-quality.md rule — ephemeral UI dismissal, existing pattern).
- `web/src/pages/ImageOcclusionPage/types.ts` — extend `OcclusionRect` with optional `source?: 'auto' | 'manual'` and optional `confidence?: number`.
- `web/src/pages/WhatsNewPage/changelog/` — one user-facing entry when v1 ships.

**Files likely in play (concrete)**:
- New: `src/routes/ImageOcclusionRouter.ts` (additive route), `src/controllers/ImageOcclusionController.ts` (additive handler), `src/usecases/imageOcclusion/AutoSuggestOcclusionsUseCase.ts`, `src/services/imageOcclusion/AutoOcclusionService.ts`, plus `.test.ts` siblings.
- Modified: `web/src/pages/ImageOcclusionPage/ImageOcclusionPage.tsx` (call the new endpoint after image add), `web/src/pages/ImageOcclusionPage/components/OcclusionCanvas.tsx` (render `source === 'auto'` with dashed stroke), `web/src/pages/ImageOcclusionPage/components/CanvasToolbar.tsx` (Clear suggestions button), `web/src/pages/ImageOcclusionPage/types.ts`.
- Migration: **none** in v1. The cache is in-memory keyed by image SHA-256, with a 7-day TTL. If we later promote the cache to Postgres, that becomes its own migration + spec.

**Cross-language coordination**: None in v1. Suggestions are TypeScript-only. The Python bridge (`create_io_deck.py`) keeps consuming the existing `OcclusionRect` shape; we're not adding fields it reads.

**Estimated effort: L (Large), two iterations.**
- v1 (highlighted-background + bold-via-OCR-confidence, single-image, gated to Auto Sync): ~2 weeks of focused work. New service + use case + controller + canvas dashed-overlay rendering + dogfood run + instrumentation + tests.
- v2 (underline, batch across queue, AnKing note-type — last item in a separate spec): another ~2 weeks. v2 only starts after v1's dogfood and four-week production accept-rate window.

**Security checklist (against `.claude/rules/security.md`)**:
- Vision call goes through `getAnthropicClient()` — already wrapped. **Do not** introduce a direct `axios` or `fetch` to a vision API; route through the existing wrapper. If we ever swap to AWS Textract or Google Vision, that call must go through `instrumentedAxios` (SSRF guard, DNS pinning) — not a raw SDK client without a wrapper.
- Image upload: validate extension server-side, regenerate filename via `lib/getSafeFilename`, cap size (reuse the existing IO multer config), reject if `countVisionTokens` exceeds the ceiling.
- Cache key is SHA-256 of image bytes — never the user-supplied filename. Cache value is the parsed JSON `OcclusionRect[]`, never the raw Claude response (avoid logging surprise PII from the model).
- New log line `auto_occlusion_call_success` mirrors `vision_call_success` in `PhotoToFlashcardsUseCase` — input tokens, output tokens, estimated cost USD, rect count. No image bytes, no user-identifying detail, no raw prompt response logged.
- Free-tier gating: enforce in the controller via `isPayingUser` before any vision call. Skipped check = burning Claude budget for free traffic.

**Testing concerns**:
- Outside-in: hit the controller with a real image fixture; mock `getAnthropicClient` at the SDK boundary (returns a canned JSON response); assert the response shape and that the cache deduplicates the second call.
- Canvas test: render `OcclusionCanvas` with a mix of `source: 'auto'` and `source: 'manual'` rects; assert the dashed stroke renders only on auto; assert tap promotes to manual; assert `Clear suggestions` removes only auto rects.
- No real network in tests (per `.claude/rules/testing.md`).
- Dogfood gate: the 10-image accept-rate test is **not** an automated test — it's a manual product gate before the UI ships. Document the result in the PR description.

**Performance budget**:
- Single vision call: median 4–6s end-to-end, hard ceiling at 12s (return what we have; user sees the empty canvas if we time out).
- Cache hit returns in <100ms — same-process LRU keyed by SHA-256.
- No sync I/O on the request thread; the Python deck-builder stays on its existing spawn path, untouched.

**How we measure this worked in production**:
- New event: `auto_occlusion_suggested` with `{ suggested_count, kept_count, dropped_count, source: 'auto' }` emitted on every deck download from `/image-occlusion`.
- Existing leading indicator: deck downloads per IO session, segmented by Auto Sync vs. free.
- Acceptance signal: `kept_count / suggested_count` ≥ 0.6 across the first 100 production sessions.
- Cost signal: median estimated cost per image ≤ $0.02. If it climbs above $0.05, the prompt needs tightening before v2.
- Rollback: feature flag in code (env var, no DB migration). Flip off, suggestions stop appearing, manual flow unchanged.

**Out of scope (next iteration → separate spec)**:
- `Documentation/specs/auto-image-occlusion-anking.md` — AnKing Image Occlusion Enhanced note-type compatibility. The AnKing note type has version-sensitive fields (Header, Image, Question Mask, Answer Mask, Original Mask, Footer, Remarks, Sources, Extra fields 1–5) and a card-template structure pinned to specific Anki releases. v1 ships with our existing IO note type; the AnKing-shape output is its own design + engineering effort.

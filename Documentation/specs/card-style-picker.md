# Spec: pre-conversion card-style selector

### Trio synthesis

- **PM**: A pre-conversion style picker turns a one-size-fits-all AI converter into a tool the user can steer in the seconds before clicking convert — the riskiest assumption is that learners actually want to choose, not just have a sensible default. Ship three preset styles in v1 (Concise, Detailed, Cloze) wired into the existing `userInstructions` plumbing; defer MCQ and min-info until their sibling specs land.
- **Designer**: The picker belongs on `/upload` itself — surfacing it after upload defeats the "pick before you click convert" intent. Render as a single row of segmented buttons (Concise / Detailed / Cloze) directly under the file dropzone with a one-line "What you'll get" hint, sentence-case labels, no preview gallery. Selection persists across uploads but is not a per-deck setting yet.
- **Engineer**: The plumbing exists — `userInstructions` (string) already threads from `CardOptionsForm` → `SettingsPayload` → `CardOption` → `ClaudeService.generateDeckInfoFromChunk` and shows up in the Claude prompt as an "Additional instructions" block. The picker is a new piece of UI state in `UploadForm` + a small `getStylePromptFragment(style)` helper that emits the same kind of additional-instructions text. No DB migration, no new route, no Python coordination. **Estimated effort: S.**
- **Agreement**: Three presets in v1, hosted on `/upload` directly above the convert action, reuse the existing `userInstructions` pipeline, available to every paid tier.
- **Conflict**: PM proposed an A/B against "no picker at all" to disprove the riskiest assumption; designer worried that A/B'ing a control already promised to a paying tester is a bad look. **Resolved**: ship to 100% and treat the leading-indicator delta (conversion → first-card-review rate, by style) as the natural experiment. The new style choice is logged with each conversion so we can read the curve afterward.
- **Resulting plan**: Add a 3-button segmented picker to `UploadForm` (Concise default), persist the choice in localStorage, plumb the selected style through the upload payload into `CardOption`, and prepend a style-specific instruction block to `userInstructions` before the Claude call. MCQ and min-info slots reserve their position in the picker but stay hidden until their sibling specs ship.

---

**Outcome**: Lift conversion-to-first-card-review rate by 8% in 30 days. Today the AI converter produces one shape of card; learners studying exam-style material vs cloze-heavy languages currently route through user instructions or settle. Adding three preset styles lets us measure which shape the audience actually keeps in Anki, and surfaces the choice at the moment of intent.

**Goal alignment**: Moves us toward "simplest, fastest way to turn what you're studying into beautiful Anki flashcards." Today the converter is fast but opinionated; this gives the user a one-tap steering wheel without making them write instructions. Faster pick = more decks downloaded per upload session = better retention at the top of the funnel.

**Problem**: A recent usability tester (a professional Anki/Quizlet creator paying for a subscription) walked through 2anki end-to-end and called out that the converter ships a single style with no way to steer it before clicking convert. The free-text "user instructions" textarea on `/card-options` already exists, but it lives behind a separate page, defaults to a long pre-filled string, and the user has to know it's there. The result: most users accept the default output, learn it's "too dense" or "not cloze-y" only after seeing the deck, and either re-upload or give up.

**Riskiest assumption**: That users want to *pick* a style. The fallback hypothesis is that they don't care which style — they just want the default to be better. If 90%+ of conversions in the first 14 days use the default (Concise), the picker is noise and we should instead invest in making Concise itself better and roll the picker back.

**Smallest test**: Ship the picker to 100% of users with telemetry that records the selected style on every conversion. Read the distribution at 14 days. If the default share is <70%, the picker is doing real work. If it's >90%, kill the control.

**Scope (in)**:

- Three styles in v1: **Concise** (default, exam-focused 1-line Q/A), **Detailed** (full explanation on the back), **Cloze** (front contains `{{c1::...}}` deletions).
- Hosted on `/upload`, directly above the convert button.
- Segmented button group, sentence case, one-line helper text per style ("What you'll get").
- Selection persists in `localStorage` (ephemeral UI state — matches existing `pageId`-less options).
- Style choice flows through the upload payload into `CardOption.userInstructions` as a prepended style-specific instruction block. The existing user-instructions textarea on `/card-options` remains the power-user override and stays as-is — it concatenates after the style block.
- Available to **every paid tier** (free, monthly, day pass, lifetime). No gate.
- Telemetry: log `selected_style` on each AI conversion via existing observability.

**Scope (out)**:

- MCQ as a fourth style — owned by `feat/spec-mcq-card-type`. When that ships, MCQ becomes the 4th button.
- Min-info splitting as a fifth style — owned by `feat/spec-min-info-card-splitting`. When that ships, "Minimum info" becomes the 5th button (or becomes the new default — see open question).
- Style preview gallery, hover thumbnails, per-style sample cards.
- Per-deck-saved style preferences (today: one preference, browser-scoped).
- Style applied to non-AI conversion paths (Notion HTML → cards via parser). The existing parser path does not run through Claude; for v1 the picker is only visible when the user's file would route through AI.
- "Heading = multiple smaller cards" as a separate toggle. That intent is folded into the future "Minimum info" style.
- Renaming the existing `/card-options` `userInstructions` textarea or moving it to `/upload`.

**User story**:

> As a learner uploading a PDF or Notion export, I want to pick a card style (Concise, Detailed, or Cloze) on the upload page before clicking convert, so the deck I get back matches how I plan to study — exam questions, explanatory notes, or cloze deletions — without having to re-upload or hand-edit afterward.

**Acceptance criteria**:

- [ ] On `/upload`, a segmented "Card style" control renders directly below the file dropzone with three options: Concise, Detailed, Cloze.
- [ ] Default selection on first visit is **Concise**.
- [ ] Selection persists across uploads in the same browser (localStorage key, scope = global, not pageId-bound).
- [ ] Below the segmented buttons, a single line of helper text describes the selected style in sentence case (e.g. "Short Q/A pairs, one fact per card.").
- [ ] When the user clicks convert and the file routes through the AI converter, the selected style produces a style-specific instruction block that is prepended to `userInstructions` before the Claude system prompt sees it.
- [ ] For Cloze: at least 60% of cards in the output deck contain `{{c1::...}}` syntax on a representative test fixture.
- [ ] For Detailed: the back-of-card body is on average ≥2× the length of Concise output on the same fixture.
- [ ] The control is keyboard-navigable (arrow keys move between segments, space/enter activates), and the active segment has a visible focus ring at 375px width.
- [ ] No upgrade prompt or "Pro only" badge appears next to any segment — every paid tier sees the full picker.
- [ ] Free-tier users see the picker but the existing free-tier conversion limits still apply (no new gating).
- [ ] Telemetry: every successful AI conversion emits `selected_style` (one of `concise` / `detailed` / `cloze`) in the existing observability log.

**Which leading indicator this moves and by how much**: Conversion-to-first-card-review rate, +8% in 30 days. Secondary: deck downloads per upload session (proxy for "did the user accept the output and move on") — target +5% within 14 days.

**Open questions for the engineer**:

1. When the upload is a Notion HTML / parser path (non-AI), should the picker still render or be hidden? Recommendation: hide for v1 — the parser doesn't consume `userInstructions`. Flag as a follow-up if we ever route Notion HTML through Claude.
2. If `feat/spec-min-info-card-splitting` ships *first* and becomes the default behavior of the converter, does "Concise" survive as a distinct option, or does "Minimum info" replace it as the default with "Concise" sliding to a secondary slot? Recommendation: defer the decision until the min-info spec is ready for review; the picker contract doesn't change either way.
3. Where exactly does the style instruction block get prepended — inside `ClaudeService.buildUserMessage` (closest to the prompt) or in `CardOption` (closer to the user's input)? Recommendation: in `ClaudeService` next to the existing `instructionsSection`, behind a typed `cardStyle` parameter. Keeps the prompt-shape logic in one file.

**Out of scope (next iteration)**:

- Custom user-defined styles (save your own preset + name it).
- Per-deck style override on `/card-options`.
- Showing sample card previews next to each segment.
- Routing the parser (non-AI) Notion path through a style-aware pass.

---

## Design notes

**The user moment**: A learner has just dropped a 40-page PDF onto `/upload` and is about to click convert. They've used the tool before; they know the default output isn't always what they want for *this* study session. Today they either accept it and live with the deck, or click into `/card-options` first to edit free-text instructions. The picker collapses that decision into one tap, in the place where the decision is already happening.

**Concrete design recommendation**:

- **Placement**: directly under the file dropzone, above the convert button, inside `UploadForm`. Not in a modal, not behind a disclosure.
- **Control**: a single horizontal segmented button group, three buttons wide on desktop, stacking to 1×3 on viewports under 480px. Each segment is a `role="radio"` inside a `role="radiogroup"` with `aria-labelledby` pointing at the "Card style" heading.
- **Labels** (sentence case, no periods):
  - `Concise` — selected by default
  - `Detailed`
  - `Cloze`
- **Helper text** (one line, switches with selection, period at end):
  - Concise: "Short Q/A pairs, one fact per card."
  - Detailed: "Full explanation on the back of each card."
  - Cloze: "Fill-in-the-blank cards with `{{c1::...}}` deletions."
- **Heading above the segmented group**: "Card style" (sentence case, no colon, weight 500, matches `pageHeader` subtitle scale).
- **No "Pro" badge, no upgrade prompt, no lock icon** — the picker is available to every paid tier.
- **Empty/error states**: no empty state; the picker is always populated. If conversion fails, the existing error handler shows the error — no style-specific copy needed for v1.
- **Selected-state styling**: filled background using the existing brand-action token (the same color as the convert button), white text. Unselected: 1px border, body text color, transparent background. Active focus ring on keyboard nav.
- **Future slots**: when MCQ and Minimum info ship, the segmented group becomes 4 or 5 wide. On viewports under 600px, switch to a `<select>` at that point — five buttons in a row at 375px will not fit.

**Copy strings**:

- Heading: `Card style`
- Buttons: `Concise`, `Detailed`, `Cloze`
- Helper text by selection: see above.
- Telemetry tag values: `concise`, `detailed`, `cloze` (lowercase, internal — not user-facing).

**Verdict**: No changes needed to the pm's scope. The control is intentionally minimal — three buttons, one line of helper text, no preview gallery. Save the previews for the iteration that adds custom user-defined styles.

---

## Technical pre-flight

**Layers touched**:

- `web` — new segmented control inside `web/src/pages/UploadPage/components/UploadForm/UploadForm.tsx`. New tiny component `CardStylePicker.tsx` co-located in the same folder. New helper `getCardStyleInstructions(style)` in a new file `web/src/lib/cardStyle/getCardStyleInstructions.ts` (string → string).
- `web` upload-payload plumbing — the upload payload sent to `/api/upload` needs to carry the selected style. The simplest path: include it in the existing `SettingsPayload` as `card-style: 'concise' | 'detailed' | 'cloze'`. The server reads it in `CardOption` and feeds it into the AI call.
- `routes` / `controllers` — no new route. Existing `UploadRouter` → `UploadController` already accepts a settings payload; the new field tags along.
- `usecases` — no new use case.
- `services` — `src/lib/claude/ClaudeService.ts` accepts an optional `cardStyle` parameter, threads it into `generateDeckInfoFromChunk`, and prepends a style-specific instruction block to the existing `instructionsSection` inside `buildUserMessage`.
- `data_layer` — **no migration**. The picker stores selection in `localStorage` only (matches existing pre-deck options that aren't pageId-bound). When per-deck saved styles are added in a later iteration, *that* spec adds a migration.

**Files likely in play**:

- `web/src/pages/UploadPage/components/UploadForm/UploadForm.tsx` — new control.
- `web/src/pages/UploadPage/components/UploadForm/CardStylePicker.tsx` — new file.
- `web/src/pages/UploadPage/components/UploadForm/CardStylePicker.test.tsx` — new file.
- `web/src/pages/UploadPage/components/UploadForm/CardStylePicker.module.css` — new file.
- `web/src/lib/cardStyle/getCardStyleInstructions.ts` — new pure helper.
- `web/src/lib/cardStyle/getCardStyleInstructions.test.ts` — new.
- `web/src/lib/types.ts` — extend `SettingsPayload` with optional `card-style` field.
- `src/lib/parser/Settings/CardOption.ts` — read `card-style` from input; expose `.cardStyle`.
- `src/lib/parser/Settings/CardOption.test.ts` — extend.
- `src/lib/claude/ClaudeService.ts` — accept `cardStyle` in `generateFlashcards` / `generateDeckInfoFromChunk`; prepend style fragment to `userInstructions`.
- `src/lib/claude/ClaudeService.test.ts` — extend.
- `src/services/UploadService.ts` — pass `cardStyle` from `CardOption` into the Claude call.
- `web/src/pages/WhatsNewPage/changelog/<date>-card-style-picker.json` — new changelog entry.

**Cross-language coordination**: none. The picker is TypeScript-only, top to bottom. No Python `create_deck/` involvement.

**Estimated effort**: **S** (small). The reasons:

- The `userInstructions` plumbing already exists end-to-end (web → settings payload → CardOption → Claude prompt). The spec adds a structured input that maps to the existing pipeline.
- No new route, no new use case, no migration, no Stripe/Patreon gating.
- The UI surface is a single segmented control plus a one-line helper.
- The fixture-based tests for Detailed/Cloze need a small Claude integration but reuse the existing `ClaudeService.test.ts` mocking shape.

**Security, testing, migration concerns**:

- **Security**: the style enum is validated server-side in `CardOption` before being interpolated into the Claude prompt — accept only the three known string values, reject anything else, fall back to Concise. No raw user input reaches the prompt under this control (the existing free-text `userInstructions` textarea is a separate, already-sanitized path).
- **Testing**: outside-in. Vitest for the picker component (renders, default Concise, persists to localStorage, keyboard-nav). Jest for `getCardStyleInstructions(style)`, `CardOption` reads `card-style`, and `ClaudeService` builds the prompt with the prepended fragment. Mock Anthropic SDK as the existing `ClaudeService.test.ts` already does — no real network.
- **Migration**: none. If a future iteration adds per-deck saved styles, that PR adds a column on `card_options` (or wherever per-deck settings live) and runs `pnpm kanel`. This spec does not.
- **Sonar**: cognitive complexity in `UploadForm.tsx` will rise slightly. Keep `CardStylePicker` as a sibling component, not an inlined render block, to keep `UploadForm` complexity flat.
- **Browser attestation**: PR touches `web/src/` so the implementer must tick the `## Browser check` boxes (golden path at localhost:3000, no console errors at 375px) before merge.
- **Changelog**: required. Type `feature`. Suggested line: `Pick a card style — Concise, Detailed, or Cloze — on the upload page before converting`.

**Sibling spec coordination**:

- `feat/spec-mcq-card-type` — when that PR lands, it adds a `mcq` enum value to `card-style`, a fourth segmented button labeled `MCQ`, and a fourth branch in `getCardStyleInstructions`. The picker contract does not change.
- `feat/spec-min-info-card-splitting` — when that PR lands, the open question above decides whether `min-info` is a fifth option or replaces Concise as the default. The picker contract does not change.
- Shared files at risk: `web/src/pages/UploadPage/components/UploadForm/UploadForm.tsx` (all three specs touch it), `src/lib/claude/ClaudeService.ts` (both AI specs touch it), `src/lib/parser/Settings/CardOption.ts` (both AI specs touch it). Merge order: this spec first (defines the picker contract), then min-info and MCQ rebase against it.

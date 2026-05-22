# Spec: Card-size control (Short / Medium / Detailed)

### Trio synthesis

- **PM**: Ship as **option (a)** — a separate three-segment control next to the style picker. Size and style are orthogonal axes (you can want a Detailed MCQ or a Short Cloze); collapsing them into one control hides that and forces users to re-pick style every time they want a different verbosity. The cost of a second control is one row of UI; the cost of overloading the style picker is a worse mental model that gets worse the moment we add a fourth style.
- **Designer**: Two adjacent controls is fine *if* they share a row and read as a sentence ("Make **Cloze** cards at **Medium** size"). Use a three-segment toggle, not a slider — sliders imply continuous tuning we won't actually deliver. Default sits on Medium and looks selected at first paint so the page never reads as "incomplete." If the upload page is already crowded, the size control collapses into the same "Card options" disclosure that holds the rest of the AI settings on smaller widths.
- **Engineer**: Smallest plumbing path is to map the chosen size to a one-line string appended to `userInstructions` inside `buildUserMessage` in `src/lib/claude/ClaudeService.ts`. No new API surface, no migration, no Python coordination. Persist the choice the same way other PDF-AI options persist (localStorage on `/upload`, `card_options` row when scoped to a Notion page). Effort: **S**.
- **Agreement**: All three want size to be its own control, not a hidden modifier on style. All three want Medium as the visible default. All three want the conversion prompt — not deck post-processing — to be the lever.
- **Conflict**: Designer flagged the "two controls on the upload page is one too many" worry; PM and Engineer pushed back that one extra segmented control is cheaper than the model confusion of conflating axes. Resolved by adopting Designer's same-row sentence-style layout so it scans as one decision, not two.
- **Resulting plan**: Add a `card-size` segmented control to the PDF-AI card-options group (Short / Medium / Detailed, default Medium). Persist alongside `user-instructions`. Server appends a fact-count and character-budget instruction line to the Claude prompt based on the chosen size. Acceptance is measured against a fixture conversion where Short shows a noticeable drop in average characters-per-card.

---

**Outcome**: Users who want fewer, denser cards get them in one click instead of typing freeform prompt overrides. Leading indicator to move: **deck-download rate after first AI conversion** by +3pp inside the PDF-AI cohort over four weeks (proxy for "the deck I got was the deck I wanted"). The cohort is small enough today that a noticeable move is plausible; if no shift appears, the riskiest assumption is wrong (see below) and the control comes back out.

**Goal alignment**: One of two specs lifting the AI conversion path from "guess what you'll get" to "pick the kind of card you want." The picker (PR #2616) handles *kind*, this handles *amount*. Both shore up the simplest-fastest mission promise — drop something in, get a clean deck back — for the users who pay us most for the AI path.

**Problem**: A recent usability tester (a professional Anki/Quizlet creator who paid to evaluate the converter) flagged that the AI output ran longer than they'd write by hand. They asked for two distinct controls: a style picker (already spec'd in #2616) and a card-size control to dial verbosity. The current draft of #2616 collapses both axes into the style picker by listing "Concise" and "Detailed" as styles — which traps anyone who wants, say, a Short MCQ. This spec teases the axes apart before #2616 lands the conflation in code.

**Riskiest assumption**: Size choice meaningfully changes Claude's output. We are sending a constraint string to a model that ignores constraint strings about half the time. If Short and Medium produce statistically indistinguishable average characters-per-card on the fixture conversion, the control is theatre and we should not ship it.

**Smallest test**: Before any UI work, run the fixture PDF (one we already use in `src/lib/claude/__fixtures__/` or equivalent) through Claude three times with the three planned instruction-string suffixes. Measure average characters-per-card and average facts-per-card across runs. If Short isn't at least 30% shorter than Detailed by character count, stop and revisit the prompt — or drop the spec.

**Scope**:

In:

- One segmented control on the PDF-AI section of `/upload` and the same row in the Notion-page card-options modal, labelled **Card size** with three options: **Short**, **Medium**, **Detailed**.
- Default value: **Medium**.
- Concrete mapping baked into `ClaudeService.buildUserMessage`:
  - **Short** — ~1 fact per card, target ~80 characters per answer. Min-info friendly.
  - **Medium** — 1–2 facts per card, target ~160 characters per answer.
  - **Detailed** — 3–4 facts per card, target ~320 characters per answer.
- Persistence: localStorage key `card-size` for `/upload`, `card_options.payload['card-size']` row when scoped to a Notion page (same pattern as `user-instructions`).
- A fixture-driven server test asserting the chosen size appears as a prompt suffix and that the output character distribution shifts in the expected direction on a canned response.

Out:

- Style choices (Cloze / Q&A / MCQ) — owned by #2616.
- Per-card editing UI after conversion.
- Min-info default behavior — owned by #2610. Min-info is what **Short** maps to here.
- A continuous slider, a numeric character budget input, or any "Custom" size. We're not letting users hand-tune the number until we've seen if three buckets is enough.
- Applying the size control to non-AI conversion paths (HTML, markdown, zip). Those don't go through Claude — there's no lever to pull.

**User story**: As someone converting a PDF to flashcards, I want to choose how much fits on each card so the deck I download matches how I actually study — denser when I want one-fact recall, longer when I want to keep context together.

**Acceptance criteria**:

- [ ] On `/upload` with a PDF selected, a **Card size** control appears in the PDF-AI options group with Short / Medium / Detailed and Medium selected on first paint.
- [ ] The same control appears in the Notion card-options modal; choice persists per page in `card_options.payload`.
- [ ] The control persists across reloads on `/upload` via localStorage (same pattern as `user-instructions`).
- [ ] On a fixture PDF, Short produces output with average answer length at least 30% shorter than Detailed, measured over a recorded Claude response fixture.
- [ ] A Jest test in `src/lib/claude/ClaudeService.test.ts` asserts the prompt suffix changes with the size argument.
- [ ] A Vitest test on the form asserts the value round-trips through the save payload as `card-size`.
- [ ] Telemetry event fires once per conversion with the chosen size value (so the leading-indicator measurement is possible four weeks in).

**Open questions**:

- Should Detailed cap at 4 facts or unlimited? Picking 4 to match the min-info spec's framing; the engineer can override if Claude routinely produces 5–6 anyway.
- Does the size control belong inside the PDF-AI disclosure or above it? Designer recommends *above* on the upload page so it's visible without a click; *inside* the disclosure in the Notion modal where the disclosure is already open. Confirm during implementation.
- Cross-cutting with #2616: if the picker ships first, Short maps to "concise" and Detailed maps to "detailed" inside whatever style is chosen — but the picker's two style entries named after sizes get renamed to true styles. If this spec ships first, the picker spec drops its "Concise" and "Detailed" entries before merging.

**Out of scope (next iteration)**:

- Per-deck size overrides ("most of this deck Medium, but the chapter on enzymes Detailed").
- Auto-detecting the right size from the document (e.g. dense textbook → Short).
- Showing the user a live "estimated card count" preview based on size + page count.

---

### Design notes

- Render the size control as a three-segment button group, not a select or a slider. Segmented controls scan as a single decision and don't open a dropdown the user has to fight on mobile.
- Layout the row as a readable sentence on widths ≥ 768px: `Card size  [ Short | Medium | Detailed ]`. On narrower widths, stack the label above the segments. Segments stretch to fill the row at the smallest width so they hit a thumb target.
- Copy strings (sentence case, no trailing periods, per `VOICE.md`):
  - Label: `Card size`
  - Segments: `Short`, `Medium`, `Detailed`
  - Help text under the control (one line, period-terminated): `Short keeps cards to one fact. Detailed packs 3–4.`
- Default selection is Medium; the segment shows its selected state on first paint — no "Choose one" placeholder.
- The control does not block submit. Users who never touch it get Medium.
- Persist the user's last choice across sessions so a returning user lands on their preferred size without clicking.
- No tooltip, no popover. The one-line help text under the control is enough; if it isn't, the labels are wrong.

### Technical pre-flight

- **Layers touched**:
  - `web/` — `web/src/components/CardOptionsForm/CardOptionsForm.tsx` (add `cardSize` state, segmented control, save payload key); colocated `*.test.tsx` for the round-trip assertion. Add to the existing PDF-AI group, not as a new section.
  - `src/lib/claude/ClaudeService.ts` — extend `buildUserMessage` to accept an optional `cardSize: 'short' | 'medium' | 'detailed'` and append a one-line instruction suffix. Wire through `generateDeckInfoFromChunk` and the public entry point.
  - `src/lib/parser/Settings/CardOption.ts` — add `cardSize` to the readable settings shape so the parser hands it to the converter.
  - `src/infrastracture/adapters/fileConversion/PrepareDeck.ts` and `convertPDFToHTML.ts` — pass the value through alongside `userInstructions`.
  - `src/controllers/` (upload + settings handlers) — accept `card-size` in the saved payload; map to the enum at the boundary, reject anything that isn't one of the three values, default to `medium` on absence.
- **Files likely in play** (concrete list, no `add -A` traps):
  - `web/src/components/CardOptionsForm/CardOptionsForm.tsx`
  - `web/src/components/CardOptionsForm/CardOptionsForm.test.tsx` (new or extended)
  - `web/src/components/CardOptionsForm/cardSizeOptions.ts` (small enum + label map, colocated)
  - `src/lib/claude/ClaudeService.ts`
  - `src/lib/claude/ClaudeService.test.ts`
  - `src/lib/parser/Settings/CardOption.ts`
  - `src/lib/parser/Settings/CardOption.test.ts`
  - `src/infrastracture/adapters/fileConversion/PrepareDeck.ts`
  - `src/infrastracture/adapters/fileConversion/convertPDFToHTML.ts`
  - One changelog entry: `web/src/pages/WhatsNewPage/changelog/YYYY-MM-DD-card-size-control.json`
- **Cross-language**: none. The control lives entirely in the TypeScript path — no Python `create_deck/` coordination needed.
- **Effort**: **S**. One state field, one prompt suffix, one save-payload key, two thin test files. The architectural work was done when `userInstructions` was wired through; this slots into the same channel.
- **Security / Sonar / migration**:
  - No migration. The value lives in `card_options.payload` (already a JSON blob) for Notion-page scope and localStorage for `/upload` scope, exactly like `user-instructions`.
  - Validate the size value at the controller boundary against the three-value enum (per `code-quality.md`: reject untrusted strings rather than passing them through to the prompt builder). Falling back to `medium` on unknown values is acceptable; logging the rejected value at debug is fine, do not return raw user input in the error response.
  - No new HTTP client, no zip extraction, no path traversal surface — Sonar should be quiet.
  - Tests: Jest at the prompt-builder boundary asserts the suffix string. The fixture comparison (Short vs Detailed character count) can be a separate manual run during implementation rather than a CI-blocking test, since it depends on a real Claude response — record one canned response per size into `__fixtures__` and assert against that.
- **Coordination with #2616 and #2610**:
  - #2616 (style picker) must drop "Concise" and "Detailed" from its style list before merging, regardless of which spec lands first. The engineer on whichever spec ships second is responsible for that diff.
  - #2610 (min-info defaults) defines what "Short" looks like in practice. If #2610 lands first, Short reuses its instruction text; if this spec lands first, #2610 inherits the Short instruction as its default.

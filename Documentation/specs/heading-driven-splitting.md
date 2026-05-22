# Spec: heading-driven card splitting as a discrete mode

### Trio synthesis

- **PM**: A recent professional Anki/Quizlet creator's usability report listed seven proposed card-generation styles; one specifically asks for "one heading = multiple smaller cards instead of one large card." This is a *user-selectable strategy* — the source document's headings become anchor concepts and the body under each heading splits into N small cards. Distinct from `#2610` (silent default min-info splitting) and `#2616` (the picker UI itself). Worth its own spec because the chunking algorithm has a different contract: the heading is the anchor, the body is the population, and the user opts in.
- **Designer**: No new UI surface in this spec — the mode plugs into the existing `#2616` picker as the payload value `card-style: heading-driven`. The user moment is "I have a structured study guide and I want the deck to mirror its outline." On the result screen, the existing card-count line ("87 cards") communicates the change; if heading detection finds zero headings the user should see a one-line note that we fell back to the default strategy — the only piece of copy this spec contributes.
- **Engineer**: Server-only. The chunking lives in a new pure helper under `src/lib/claude/` (or a sibling `src/lib/cardStyle/`), invoked from `ClaudeService.generateDeckInfoFromChunk` when `cardStyle === 'heading-driven'`. Heading detection differs by input shape — markdown (`#`/`##`), Notion `heading_1..4` blocks (already enumerated in `src/lib/parser/helpers/addHeadings.ts`), HTML `h1..h6`, .docx native heading styles, slide titles. The riskiest part is the cross-format detector, not the splitter. **Estimated effort: M.**
- **Agreement**: Ship as a discrete strategy, not a default. Plug into `#2616`'s picker via the `card-style` payload. Detect headings format-by-format with a single shared interface (`Heading[] = detect(input)`); fall back to the general splitter from `#2610` when no headings are found.
- **Conflict**: PM proposed recursing on nested headings (H2 inside H1 becomes its own sub-deck); engineer pushed back — recursion explodes card counts on heavily-nested Notion exports and complicates the contract. **Resolved**: V1 flattens — every detected heading at the deepest level present produces cards, parent headings without their own non-heading body produce nothing. If usage shows users want hierarchy, layer it in V2 without changing the picker label.
- **Resulting plan**: Add a pure `splitByHeadings(input, format)` helper that emits one heading-anchored chunk per detected heading, wire it into `ClaudeService` behind the `card-style: heading-driven` payload value, defer the picker UI to `#2616`, and fall back to `#2610`'s splitter when zero headings are detected.

---

**Outcome**: When a user opts into the heading-driven mode on a structured document, every detected source heading produces N≥1 cards whose front anchors on the heading text and whose backs hold one fact each. Measured by: on a 6-fixture set covering markdown, Notion HTML, .docx, and slide inputs, the median card count per detected heading is between 2 and 6, every card's front references the parent heading, and no fixture with zero headings throws — instead falling back to the default strategy with a logged signal.

**Goal alignment**: Predictable, scannable decks where document structure maps 1:1 to study units is the exact promise that brings learners with already-organized notes to 2anki. This raises the perceived quality of converted decks for serious learners (med school, exam prep, language learners with chapter-structured texts) without touching the default behaviour anyone else relies on. Better paid-tier output → higher retention → path to 300K.

**Problem**: A recent usability tester — a professional Anki/Quizlet creator with paid subscriber access — reviewed 2anki end-to-end and listed seven distinct card-generation strategies their workflow needs. One was specifically: "one heading = multiple smaller cards instead of one large card." Today the AI converter does not honour the source structure as a chunking axis; whatever Claude returns is whatever the prompt and chunker negotiated. For a learner whose source already organizes content by chapter/section, the resulting deck loses the outline they relied on while building the source — and they re-split manually after export. The `#2610` spec addresses *size* but is silent on *axis*; this spec defines the *axis* for users who want it.

**Riskiest assumption**: That heading detection across the formats 2anki accepts (markdown, Notion HTML, .docx, slide images, plain HTML) can be made consistent enough that "heading-driven" means the same thing to a user regardless of source. If detection silently disagrees between formats — e.g. catches `##` in markdown but misses bold-pseudo-headings in Notion — the mode is unpredictable, which is the opposite of its selling point.

**Smallest test**: Build a 6-fixture set, one per supported input shape (markdown with `#`/`##`, Notion HTML with `heading_1`/`heading_2` blocks, `.docx` with Word heading styles, HTML with `<h1>`/`<h2>`, a slide deck represented as image-extracted titles, a deliberately-unstructured input with no headings). Run `detect(format, input)` against each; assert a hand-validated `Heading[]` shape (heading text + body slice). Ship only if all six fixtures match expectation. The fixture test is the calibration tool — same pattern as `#2610`.

**Scope**:

In:
- New pure helper `src/lib/cardStyle/headingDriven/detect.ts` exporting `detect(format: InputFormat, source: string | Block[]): Heading[]`. One implementation per format, dispatched by `format`. Heading shape: `{ text: string; level: 1..6; body: string }`.
- New pure helper `src/lib/cardStyle/headingDriven/splitByHeadings.ts` taking `Heading[]` and emitting an array of `{ anchor: string; bodyChunk: string }` ready for Claude to expand into N cards each.
- Wiring in `src/lib/claude/ClaudeService.ts`: when `cardStyle === 'heading-driven'`, run `detect` first; if `headings.length > 0`, pass the heading-anchored chunks to the existing extraction call with a style-prompt fragment that says "for each chunk, produce 2–6 cards whose front anchors on the heading text and whose back holds one fact each." If `headings.length === 0`, fall back to the existing chunker + `#2610`'s splitter and log `heading-driven:fallback`.
- Format-specific detectors:
  - **Markdown**: regex on `^#{1,6} ` at line start. Body = lines until next heading of `≤` same level.
  - **Notion HTML**: `heading_1..4` block types (the existing `addHeadings` helper already enumerates them).
  - **HTML**: `h1`–`h6` tags via the existing parser. Body = sibling nodes until the next heading at `≤` same level.
  - **.docx**: Word heading styles 1–6 (the .docx ingester surfaces these). Body = paragraphs until next heading.
  - **Slide images**: the title region of each slide already extracted by the image-to-deck path becomes a level-1 heading; body = the rest of the slide's OCR'd text.
- A 6-fixture Jest suite asserting `detect()` returns the expected `Heading[]` shape per input. Detector tests are deterministic — no Claude calls.
- Update `src/lib/claude/FEATURE.md` (creating it if `#2610` hasn't landed yet) to document the heading-driven contract alongside the default min-info contract.

Out:
- The picker UI itself. `#2616` owns rendering the segmented control and adding "Heading-driven" as one of its options. This spec only commits to the **payload value** `card-style: heading-driven`.
- The general "max card size" heuristic. `#2610` owns it and runs after this spec's splitter when heading-driven mode is active (so an overly-long body under one heading still gets split further).
- Other named modes (cloze splitting, Q&A pairs, MCQ) — their own specs or absorbed into `#2616`'s defaults.
- Recursion into nested headings. V1 flattens to the deepest level present per document. Hierarchical sub-decks are a V2 question.
- Changes to the deterministic (non-AI) parser path in `src/lib/parser/`. The reporter's pain was AI-generated cards; the parser path already honours toggle/heading structure differently.
- Changes to the Ankify polling path. The mode rides on the existing AI conversion call shape — Ankify benefits transparently if/when the picker reaches that surface.
- Pricing or quota changes if card counts shift.

**User story**: As a learner uploading a chapter-structured study guide, I want to pick "Heading-driven" before clicking convert so the deck I get back mirrors my source's outline — each heading becomes a cluster of small, scannable cards anchored on that heading's name.

**Acceptance criteria**:
- [ ] `detect(format, source)` returns a `Heading[]` with the expected text, level, and body slice on each of the 6 fixtures (markdown, Notion HTML, HTML, .docx, slide, no-heading).
- [ ] When `cardStyle === 'heading-driven'` and `headings.length > 0`, the Claude prompt receives chunks shaped one-per-heading rather than the default chunker output.
- [ ] When `cardStyle === 'heading-driven'` and `headings.length === 0`, the pipeline falls back to the default chunker, `#2610`'s splitter runs, and the observability log records `heading-driven:fallback`.
- [ ] On each non-empty fixture, every emitted card's `q` (front) references the parent heading text in some form (literal substring or a paraphrase that retains the heading noun). Asserted on a deterministic stub Claude response captured in the fixture suite, not a live model call.
- [ ] For each heading, the emitted card count falls between 2 and 6 in the fixture suite (the prompt fragment asks for this range; the test verifies the contract end-to-end on captured responses).
- [ ] Cards within a heading cluster carry the same source-tag (e.g. heading text → tag) so users can re-shuffle by chapter in Anki.
- [ ] Heading text containing HTML/Markdown formatting is normalized to plain text before being used as the anchor (no `<em>` or `**` leaking into the card front).
- [ ] Very short bodies (under ~80 plain-text chars) emit one card, not the 2–6 range — short body == short cluster.
- [ ] Existing `ClaudeService.test.ts` keeps passing; the new mode is invoked only when the payload carries `card-style: heading-driven`.
- [ ] No web/ changes; no migration. Picker UI strings live in `#2616`.
- [ ] No changelog entry until `#2616` ships the picker — without the picker the mode is unreachable by users.

**Which leading indicator this moves and by how much**: Once the picker (`#2616`) ships and "Heading-driven" is one of its options, the leading indicator is the share of paid-tier uploads with detected headings that select it. Target: at least 15% of opt-ins within 30 days of the picker reaching production with this mode visible. Secondary: deck downloads per upload session for heading-driven selectors should be at parity or higher than the picker's default — anything lower means the mode is misnamed or the chunks are off.

**Open questions for the engineer**:
1. The Notion HTML "pseudo-heading" pattern — a paragraph rendered in larger/bolder text that the user *treats* as a heading but that Notion exports as `<p><strong>...</strong></p>`. V1 ignores these (heading_1..4 only). Is the false-negative rate low enough on real Notion exports to defer? Recommendation: ship V1 strict; revisit if usability feedback complains.
2. For `.docx` headings the spec assumes the ingester already surfaces Word heading styles. If it doesn't, this becomes one ingester change + the detector. Engineer to confirm against `src/usecases/handleUpload/handleDocxUpload.ts` (or wherever `.docx` lives today) before sizing the work.
3. Slide-deck inputs route through image OCR + per-slide titles. Is the per-slide title already available as a structured field, or does the detector have to re-derive it from OCR text? If it has to re-derive, expect to drop slide support from V1 and ship it as a follow-up.
4. The `card-style: heading-driven` payload value must agree with `#2616`'s wire format. Engineer should coordinate the exact string with the picker spec before implementation begins.

**Out of scope (next iteration)**:
- Hierarchical heading recursion (H2 under H1 becomes its own sub-deck).
- A "table of contents" view of the resulting deck on the result screen.
- User-tunable chunk-size targets per heading.
- Routing the parser (non-AI) path through heading-driven splitting.

---

## Design notes

No new picker UI surface in this spec — `#2616` owns rendering. The one piece of copy this spec contributes is the result-screen fallback note when the mode was selected but no headings were detected:

> Heading-driven split fell back — no headings found in your file.

Single line, sentence case, no exclamation marks, matches VOICE.md tone. Renders below the card count on the result screen only when `heading-driven:fallback` fired during the conversion. If the picker spec prefers to surface this in the picker itself (e.g. "Disabled — no headings in this file") it can read the same observability signal. Pick one surface, not both.

Card-front anchoring follows the existing card style: heading text is the noun the question pivots on, not a literal prefix. E.g. for heading "Polarised lenses", expect cards like "Which lens type cuts horizontal glare?" rather than "Polarised lenses — which lens type cuts horizontal glare?". This is enforced by the style-prompt fragment, not by string concatenation.

## Technical pre-flight

**Layers touched**: `lib` only.
- `src/lib/cardStyle/headingDriven/detect.ts` (new) — dispatch by `InputFormat`, return `Heading[]`.
- `src/lib/cardStyle/headingDriven/detect.test.ts` (new) — 6 fixtures, one per format.
- `src/lib/cardStyle/headingDriven/splitByHeadings.ts` (new) — pure shape transform `Heading[] → ChunkPayload[]`.
- `src/lib/cardStyle/headingDriven/splitByHeadings.test.ts` (new).
- `src/lib/cardStyle/headingDriven/__fixtures__/*` (new) — six input files: `.md`, `.notion.html`, `.html`, `.docx` (binary), `.slide.json` (OCR'd title + body), `no-headings.md`.
- `src/lib/claude/ClaudeService.ts` — accept an optional `cardStyle` parameter alongside `userInstructions`; when `cardStyle === 'heading-driven'`, route through the new helpers; otherwise unchanged.
- `src/lib/claude/getCardStylePromptFragment.ts` (new) — pure `(style) => string`, emits the per-style instruction block. Heading-driven returns "For each chunk, produce 2–6 cards. Each card's front references this chunk's heading; each card's back holds one fact." Other styles' strings come from `#2616`'s spec.
- `src/lib/claude/FEATURE.md` — document the heading-driven contract.

**No layer skipping**: still `lib` only. Route → controller → use case → service → lib chain stays the same. The new payload value `card-style: heading-driven` rides on the `SettingsPayload` shape `#2616` adds; this spec depends on `#2616` for the payload field name (engineer coordinates before implementation).

**Cross-language coordination**: none. All TypeScript. Slide-deck OCR already runs in the existing image pipeline (no new Python).

**Security**:
- Heading detectors read user-supplied input. Markdown and HTML parsers are already sanitised via `sanitize-html` upstream; the detector treats input as text and never executes it. No new SSRF surface — no URLs are fetched.
- Heading text is plain-text-normalised before becoming the card anchor (per the acceptance criterion) — strips embedded HTML, defends against `<script>` slipping through if upstream sanitisation ever regresses.
- No new DB columns, no new env vars, no new third-party SDK.

**Testing**:
- Detector tests are deterministic — no Claude calls. Pure-function in/out.
- The end-to-end card-count assertion uses a captured Claude response per fixture, the same pattern `#2610` proposes for its splitter test. No live model traffic in CI.

**Migration**: none.

**Sonar**:
- Six format-specific detectors share one dispatch function — keep cognitive complexity in `detect()` low by delegating each branch to a one-format helper file. Sonar S3776 will flag if the dispatch grows long.
- No `Math.random` (Sonar S2245), no `knex.raw` (S89), no fetch on user-supplied URLs (S5144).

**Effort**: M. Bounded — six detectors + one splitter + one prompt fragment + one wiring change in `ClaudeService.ts`. The risk is calibration of the detectors across input shapes, not implementation volume.

---

## Sibling specs

This spec is one of three coordinated card-generation specs from the same usability report:

- **#2610** — `feat/spec-min-info-card-splitting`: default behaviour, silent answer-length cap. Runs *after* this spec's heading-driven splitter on each chunk, so an overly-long body under one heading still respects the size cap.
- **#2616** — `feat/spec-card-style-picker`: the picker UI itself. Adds "Heading-driven" as one of its segmented options and wires the `card-style: heading-driven` payload value. This spec is unreachable to users until `#2616` ships.
- **This spec** — `feat/spec-heading-driven-splitting`: defines the heading-driven mode's chunking algorithm.

The three specs ship independently. Order doesn't matter — each is silent until both `#2616` and this spec are in main, at which point the picker option becomes live.

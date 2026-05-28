# .apkg as input — bulk transform pipeline

**Status:** draft, awaiting decision (see section 1)
**Owner:** Alexander
**Type:** wedge — opens a new input direction the product has historically rejected

## 1. Open question for Alexander (decide before /implement)

Today `src/lib/upload/getUploadValidationError.ts:24-27` rejects every `.apkg` upload with "already an Anki deck. 2anki converts source files like Notion HTML exports, not existing decks." The product has always been Notion/HTML/MD/PDF/OPML → `.apkg`, never `.apkg` → `.apkg`. Opening the reverse-input direction is an architectural shift, not a feature add. Pick one before implementation starts. The spec records the choice; the spec is the decision aid, not the decision.

- **(a) Do not open `.apkg` as input.** Protects the existing "X → .apkg" mental model. No migration risk. No support burden for users whose `.apkg` decks come from third parties with note types we do not know how to round-trip. Trade: leaves the 900-card / 21k-MCQ bulk-transform demand to AnkiGPT-style add-ons that compete on in-Anki workflow proximity we cannot match anyway. Recallit, Quickdecks, Ankit, NotebookLM, and Cardly are all generation-only too — the wedge stays unowned, but unoccupied is not the same as ours.

- **(b) Open `.apkg` as input only for the bulk-transform path.** Upload `.apkg` → pick a transform → re-emit `.apkg`. Contains the new surface. Reuses the existing `ApkgPreviewService` parser (already in tree). No new note types — v1 supports Basic and Cloze only, anything else is rejected at upload with a specific error. Predictable input shape because we own decks we generated. Trade: still has to gracefully handle third-party decks; some users will try and bounce.

- **(c) Open `.apkg` as a general second input source alongside Notion/HTML/PDF.** Simplest mental model — any source in, `.apkg` out. Trade: maximum support burden; conflates the conversion product with the editing product (per wedge #10's pre-export edit surface); makes the convert-success funnel ambiguous about what the user is actually doing (transform vs convert vs edit).

**Until Alexander resolves this, the remaining sections describe option (b) as the default candidate.** Option (a) collapses the spec; option (c) requires a separate spec for the conversion-vs-transform routing.

## 2. Problem

> "this is taking a very long time as they're doing this in batches of 10 when I have around 900 flashcards" — u/Outside_Service3339 (`1lc3imw`), r/AnkiAi

> "copying cards from Anki, switching to ChatGPT, pasting, waiting… it killed my study flow" — AnkiGPT-style add-on commenter (`1oqqcc4`), r/AnkiAi

The pattern across r/AnkiAi: a user already has a deck and wants to mutate every card in it — translate the back field, add an example sentence, cloze-ify the front, attach a hint. Today they do it 10 cards at a time in ChatGPT, or they install a third-party add-on. No web tool in the AI-Anki competitive set offers this. 2anki has the parser and the .apkg emitter; the missing piece is the LLM transform step between them.

## 3. Goal

A user can upload a `.apkg` deck, pick one transform from a fixed catalog, and download a new `.apkg` with that transform applied to every note — in one round trip, server-side, paid plan only.

## 4. Approach (option b)

1. **Unblock upload conditionally.** Change `getUploadValidationError.ts` so the `.apkg` reject only fires when the request lacks a `mode=transform` signal (route parameter, form field, or dedicated route — see open question 9b). The default upload surface keeps rejecting `.apkg` so nothing in the existing convert funnel changes.
2. **Parse with `ApkgPreviewService`.** It already extracts notes (front, back, model type, tags) from the SQLite inside the `.apkg`. Wrap its read path in a `parseApkgNotes(file)` helper if the current shape is preview-only.
3. **Reject unknown note types up-front.** If the deck contains any note model other than Basic or Cloze, bounce at upload with `"This deck uses a note type we don't support yet. v1 supports Basic and Cloze decks."` Do not silently drop unknown notes.
4. **Add `src/lib/ankify/transforms/`** with pure helpers: `applyTransform(notes, transformName)` returns a new note list. The Claude calls live in `src/services/ankify/transformService.ts` (per the `lib` vs `services` boundary in `src/lib/ankify/FEATURE.md`). Fan out per-chunk using `runChunks` from PR #2859 to bound concurrency; bound `concurrency` against the user's plan (paid users get the higher value).
5. **Emit via the existing apkg pipeline.** The transformed notes go through the same `.apkg` writer that powers Notion → Anki. The output is a normal deck.
6. **Surface.** New `/transform` page in `web/src/`: upload dropzone (apkg only), transform picker (4 options, see §5), "Transform" button. Same shell as the convert page. On submit the user gets the standard background-job experience and a download link when done. No new auth, no new analytics events beyond the existing conversion events with `type=transform`.

## 5. Transform catalog (v1)

A small finite list. The user picks one; we render the prompt template server-side with the note fields. No free-form prompts in v1.

- **Translate back field to <target language>.** Picker shows a fixed language list (10–15 popular targets); the user picks one. Front stays as-is.
- **Add example sentence to back field.** Appends an `Example:` line generated from the front+back pair.
- **Cloze-ify the front field.** Converts a Basic note's front into a cloze deletion of the most-likely target term in the back. Emits as a Cloze note.
- **Add a hint field from the existing front field.** Emits a one-sentence hint as a new field on the note, leaving front and back untouched.

Out of scope in v1: regex find/replace, image insertion, audio/TTS, automatic tagging by topic, deck merging, removing cards, deduplication.

## 6. Plan gating

Transform is **plan-paid only**. Per `reference_plan_gating_map`, the LLM call is expensive enough to leak margin on the free tier. A free user who lands on `/transform` and clicks Transform sees the existing paywall component (the same one that gates AI generation), not an error. Existing passes that set `subscriber=true` unlock this surface the same way they unlock AI generation. Lifetime/Patreon users are not separately gated.

## 7. What NOT to build (v1)

- Free-form transform prompts (security + cost surface; SonarCloud + abuse risk both bad).
- In-product Anki add-on or AnkiConnect plumbing (the moat is the web surface; the in-Anki add-on space is owned).
- Editing the parsed notes by hand before transform (that is wedge #10's pre-export edit surface — do not duplicate the editing UI here).
- `.apkg` → `.apkg` without a transform (a passthrough is not a feature; if no transform is picked, do not let the request through).
- Third-party deck preservation guarantees beyond Basic + Cloze (state the limitation in the upload dropzone copy: "Basic and Cloze decks only in v1").
- Saving a transform history per user.
- Re-ingesting a user's own previously-exported 2anki deck for "round-tripping" (covered by the general .apkg input path if it exists — out of scope unless someone asks).

## 8. Success metric

- **Volume:** 5 successful `.apkg`-input transforms per week within 60 days of launch, by anyone other than Alexander.
- **Conversion:** at least 1 user buys a paid plan specifically to access `/transform` (measurable via the funnel `funnel_diagnosis_may2026` already tracks — entry path includes `/transform`, then checkout).
- **Quality floor:** transformed decks open in Anki Desktop without import errors on a sample of 5 different source decks.

Below these, kill the surface or roll back to a single transform.

## 9. Open questions

In addition to the section 1 decision question:

- **(a) Claude cost and rate at 900 notes.** A 900-note deck with one transform per note is 900 Claude calls. At current per-call cost + rate limits, estimate the total dollar cost and wall-clock duration before /implement starts. If the answer is "$5 and 8 minutes" we ship as drafted; if it is "$40 and 45 minutes" the chunking strategy and the paywall pricing both have to change.
- **(b) How to signal "transform mode" at upload.** Options: dedicated route (`POST /api/transform/upload`), form field on the existing upload route, or a `?mode=transform` query param. Pick one before /implement; do not let the existing apkg-reject surface get accidentally unblocked for the convert path.
- **(c) Unknown note types.** v1 rejects anything other than Basic and Cloze. Confirm that "rejected at upload with a specific error" is the right shape, vs "extract known notes only and warn about the rest." Bias is toward rejection — partial decks are worse than no deck.
- **(d) GUID preservation.** Does the transformed deck preserve each note's original GUID (so an Anki user who imports it gets the new content on their existing review-history cards), or does it ship as a new deck with new GUIDs (clean import, but they lose review history on the cards they had)? The right answer depends on whether users see the output as a "replacement" (preserve GUIDs) or a "fresh deck" (new GUIDs). Default candidate: new GUIDs, because the v1 transforms change card content meaningfully.

## 10. Files in scope (option b)

- `src/lib/upload/getUploadValidationError.ts` — conditional .apkg unblock
- `src/lib/ankify/transforms/` — new pure helpers (transform names, prompt templates, note-shape mapping)
- `src/lib/ankify/transforms/*.test.ts` — colocated
- `src/services/ankify/transformService.ts` — Claude orchestration, chunking
- `src/services/ApkgPreviewService/ApkgPreviewService.ts` — extract a `parseApkgNotes(file)` read path
- `src/routes/` — one new route (or one new form field, depending on §9b)
- `src/usecases/` — new transform use case (orchestrates parse → transform → emit)
- `web/src/` — new `/transform` page; upload dropzone + transform picker; reuses the existing job-status component
- `Documentation/specs/apkg-input-pipeline.md` — this spec, removed in the implementation PR's `chore:` commit per the spec lifecycle

No migration. No new env var. No new dependency — Claude is already wired.

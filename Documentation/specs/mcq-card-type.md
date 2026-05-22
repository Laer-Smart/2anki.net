# Spec: MCQ card type for exam-prep users

### Trio synthesis

- **PM**: MCQ is mostly built — the gap is AI-generator emission and editable preview, both targeted at exam-prep retention.
- **Designer**: Keep the existing post-upload MCQ drawer; add an inline Edit affordance per MCQ card with A–D options and a Correct radio. Skipped-MCQ count stays as the failure signal.
- **Engineer**: Medium effort. The real cost is the AI prompt change, a typed response schema, and a golden-set quality gate. Editable preview needs a small server endpoint that rebuilds the `.apkg` after the user's edits.
- **Agreement**: Scope is two additions (AI emission + editable preview), not "add MCQ." The `n2a-mcq` note type and Notion-toggle detection are already in production.
- **Conflict**: PM wanted an offline 10-sample hand-score gate before flipping any flag. Designer wanted to ship behind a paying-tier opt-in and learn from real users. Engineer wanted a feature flag at the use-case layer. **Resolved**: ship behind an env feature flag (`AI_MCQ_ENABLED`), clear PM's 10-sample bar offline first, then enable for all paying tiers, and keep the flag for fast rollback.
- **Resulting plan**: Add MCQ emission to the AI converter use cases (PhotoToFlashcards, Chat) behind a feature flag, gated to all paying tiers; add an inline edit affordance to the existing MCQ preview drawer that lets the user fix stem / options / correct answer / rationale and rebuild the deck before download.

---

**Outcome**: Exam-prep users (medical students, professional certifications) receive MCQ cards from any input source — Notion, PDF, photo, chat. Editable before download. Moves MCQ-emitting conversions among paying users from 0% (AI paths) toward parity with the Notion path, and lifts paid week-2 retention by surfacing a card type this audience explicitly asked for.

**Goal alignment**: Exam-prep is one of the highest-LTV cohorts on 2anki and a segment named in a recent usability tester's report. Serving them faster with the card type they already work with shortens the "drop in, get a deck" loop and supports the 300K-user goal by retaining the cohort that pays and refers.

**Problem**: A professional flashcard creator's usability report pointed out that 2anki has no obvious path to MCQ for users who work primarily from photos, PDFs, or chat prompts. The `n2a-mcq` note type and Notion-toggle heuristic exist, but the AI generation paths (`PhotoToFlashcardsUseCase`, `ChatUseCase`) only emit basic / cloze / input. A med-student converting screenshots of lecture slides has no route to MCQ, even though MCQ is the format their board exam uses. When MCQ *is* produced via the Notion path, the post-upload drawer shows it as read-only — wrong distractors mean opening Anki to edit, which breaks the conversion flow.

**Riskiest assumption**: Claude can generate MCQ that is factually correct often enough to be worth shipping for medical / certification content. If the model produces plausible-looking but wrong answers in a domain the user trusts us with, we damage exactly the cohort we're trying to retain.

**Smallest test**: Before flipping the feature flag for any user, Alexander hand-scores correctness on a fixed 10-card sample drawn from public USMLE-style and CFA-style notes. Pass bar: 8/10 cards with a correct stem, four plausible distractors, and the correct option marked correctly. If the bar fails, iterate on the prompt before any rollout.

**Scope**

In:
- Emit MCQ from `PhotoToFlashcardsUseCase` and `ChatUseCase` when the source content reads as quiz / question material, behind an `AI_MCQ_ENABLED` env flag.
- Reuse the existing `n2a-mcq` note type — no new template.
- Inline Edit affordance on each MCQ in the post-upload preview drawer: edit stem, the four options, mark correct option, edit rationale.
- A server endpoint that rebuilds the `.apkg` from the edited card set before download.
- Gate: any paying tier (Day / Week / Monthly / Lifetime) — not Lifetime-only.

Out:
- **Pre-conversion style picker** — separate spec (`feat/spec-card-style-picker`). If both ship, MCQ becomes one of the picker's selectable styles.
- **Image-based MCQ** (image in stem or options) — separate follow-up; MCQ is text-only in v1.
- Changes to the Notion-toggle detection heuristic.
- Multi-correct MCQ in AI emission — single correct only in v1, even though `n2a-mcq` supports multi.
- New billing tier or quota change. Reuses `AiTemplateQuotaService` as-is.

**User story**: As a medical student preparing for boards, I want 2anki to turn my lecture-note photos into MCQ flashcards, and I want to fix any wrong option without leaving the results page, so that I can study with the same question format my exam uses.

**Acceptance criteria**
- [ ] `AI_MCQ_ENABLED=true` in env causes `PhotoToFlashcardsUseCase` and `ChatUseCase` to emit MCQ notes when the model classifies a source span as quiz-like.
- [ ] Emitted MCQ carries: stem, 4 options labeled A–D, correctIndex (0–3), optional rationale, and maps onto the `n2a-mcq` note type fields (`Question`, `Multiple Choice`, `Correct Answer`, `Extra`).
- [ ] Malformed AI MCQ responses (missing correctIndex, fewer than 4 options) fall back to basic and increment the existing `mcqSkippedCount` counter — no error surface to the user.
- [ ] The post-upload preview drawer renders an `Edit` link per MCQ card, opening an inline form with the fields above and a `Save and rebuild deck` button.
- [ ] Saving edits rebuilds the `.apkg` server-side and triggers download with the new file.
- [ ] Free users do not see MCQ emission from the AI path. Existing free-tier behavior (Notion-toggle MCQ) is unchanged.
- [ ] Feature flag off (`AI_MCQ_ENABLED=false` or unset) returns the current behavior for AI paths.
- [ ] LLM cost delta is documented in the implementation PR per the LLM-cost rule in `engineer.md`.

**Open questions**
- Is the `create_deck/create_deck.py` MCQ note-type rendering exercised by the AI path today, or only by the Notion upload path? Engineer to verify before adding the use-case wiring.
- The post-upload drawer rebuild — does it re-run the full conversion or just rewrite the apkg from the edited note set? Smallest viable: keep the original note set in memory / temp file and rewrite only the touched notes.
- Should the Chat path stream MCQ cards as they are generated, the way it streams basic cards today? If so, the schema needs to be incremental.

**Out of scope (next iteration)**
- Image-based MCQ.
- Pre-conversion style picker (separate spec).
- Multi-correct MCQ emission from AI paths.
- Drag-to-reorder options in the edit form.
- A confidence score from Claude shown on each MCQ.

---

### Design notes

**User moment.** A paying user converts photos / PDF / chat content and lands on the results screen. Today, the MCQ count badge appears only when Notion-toggle MCQ was detected. After this change, the badge can appear from any source. The user sees `12 multiple choice` on a paying-tier conversion and expands the drawer to verify. If a distractor is wrong, they click `Edit` on that card, fix it inline, and click `Save and rebuild deck`. The download starts with the corrected `.apkg`.

**Affordances.**
- Drawer badge (existing, unchanged): `N multiple choice` link-style with the skipped-count tooltip already in place.
- Per-card row (new): `Edit` as tertiary link-style on the right edge of each card preview.
- Inline edit form (new): four labeled rows (`Option A` through `Option D`) with a single `Correct answer` radio across them. `Rationale (optional)` textarea below. Primary action `Save and rebuild deck`. Secondary `Cancel` link.
- Save state: button text changes to `Saved` briefly, then the row collapses back to the read-only preview with the new content. No toast — the inline state change is enough.

**Copy strings.** All sentence case, no trailing periods on buttons. Per VOICE.md:
- `Edit`
- `Question`
- `Option A`, `Option B`, `Option C`, `Option D`
- `Correct answer`
- `Rationale (optional)`
- `Save and rebuild deck`
- `Cancel`
- `Saved`
- Free-tier empty state when AI MCQ would have fired (out-of-scope this spec, but noted): no copy needed — the badge simply does not appear.

**Empty / error states.** AI emission that returns malformed MCQ silently increments `mcqSkippedCount`, which already drives the existing skipped tooltip. Rebuild failure on the edit endpoint: red inline message `Couldn't rebuild your deck. Try again or download the original.` with a `Download original` secondary link.

**Mobile (375px).** The edit form stacks vertically. The four `Option` rows sit at full width with the radio at the left edge. No horizontal scroll.

**Verdict**: minor changes from the PM scope — split "preview" into the existing view path plus the new edit path. Otherwise aligned.

---

### Technical pre-flight

**Layers touched**
- `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts` — add MCQ schema branch in Claude prompt + response parsing.
- `src/usecases/chat/ChatUseCase.ts` — same.
- `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.test.ts`, `src/usecases/chat/ChatUseCase.test.ts` — new cases for MCQ emission and malformed-response fallback.
- `src/services/UploadService.ts` — extend the existing `mcqCount` / `mcqSkippedCount` accumulation to cover AI paths if it does not already.
- `src/controllers/` — new endpoint to accept an edited note set and rebuild the `.apkg` (likely a `POST /upload/rebuild-mcq` or extension to the existing download controller).
- `create_deck/create_deck.py` — verify MCQ note-type emission is reachable from the AI-driven `deck_info.json` path. No new fields; existing schema should cover.
- `web/src/pages/UploadPage/components/UploadForm/UploadForm.tsx` — add the `Edit` row affordance and the inline form. Hook into a new client-side state for unsaved edits.
- `web/src/pages/UploadPage/components/UploadForm/UploadForm.module.css` — styles for the edit form, matching the existing drawer aesthetic.
- `web/src/pages/UploadPage/components/UploadForm/UploadForm.test.tsx` — Vitest for the edit form open / save flow.

**Cross-language coordination.** TS → Python via `deck_info.json`. The MCQ note type is already supported by the upload path, so the schema is known. Engineer to confirm AI use cases populate the same shape before wiring.

**Estimated effort: M (3–5 days).** Driven by the AI prompt change, response schema validation, and the offline quality gate. The note type is free (already shipped). The drawer-edit UI is contained.

**Security, testing, migrations**
- Migration: none. No schema changes.
- AI prompt: input continues through the existing instrumented Claude client. No SSRF concern.
- AI response: parsed with `try/catch + schema check` per CWE-20. Malformed → drop card, count as skipped.
- Feature flag: read at use-case construction. Default off in production until the offline 10-sample bar clears.
- LLM cost: ~100 extra output tokens per emitted MCQ versus a basic card. State the delta in the implementation PR per `engineer.md` LLM-cost rule.
- Tests: Jest for use cases (mock Claude), Jest for the new rebuild endpoint, Vitest for the drawer edit form. Python pytest only if a gap surfaces during the AI-path verification.
- Observability: emit a log line per generated MCQ with `{ source: 'photo' | 'chat', mcqCount, mcqSkippedCount }`. Confirms emission in production and lets us watch the skipped ratio without shipping a dashboard.

**Riskiest implementation assumption.** That the prompt change yields well-formed MCQ on the first iteration. Mitigation: schema-validate every response, fall back silently, and watch the skipped ratio in logs during the first week of rollout. If skipped/total > 30%, revert.

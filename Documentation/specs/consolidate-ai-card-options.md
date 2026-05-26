## Spec: Consolidate AI card options into a "PDF & AI" section with Configure modals

**Outcome**: Users find and adjust AI card-shaping settings without scanning the full form. Leading indicator: AI-feature adoption rate (% of conversions with `claude-ai-flashcards` or MCQ enabled) increases as the options become more discoverable; current-value summaries reduce mis-configuration support tickets.

**Goal alignment**: A cleaner configuration surface lowers the friction that stops first-time users from trying the AI features — directly supporting the 300K-user growth target.

**Problem**: `CardOptionsForm` is a long flat list. AI-shaping settings are scattered in at least four locations: `process-pdfs` / `pdf-extract-text` / `claude-ai-flashcards` sit in a "PDF & AI" checkbox group; `image-quiz-html-to-anki` has its own "Image quizzes" group; Card size and MCQ blocks appear inline after "Card types"; Field mapping is buried inside "Templates"; User instructions are hidden behind a `<details>` textarea. A user who wants to tune the AI output must scroll and hunt. There is no single place that answers "what will the AI do with my content?"

**Riskiest assumption**: Moving Card size, MCQ, Field mapping, and User instructions behind modals reads as "cleaner" rather than "features hidden." If users feel the controls are gone rather than organized, adoption will not increase.

**Smallest test**: The `/dev/card-options-preview` DEV-only route renders the new section in four states (anon / free / subscriber; AI on vs off). Show it to 2–3 users before committing. Current-value summaries on each row ("Card size — Medium", "MCQ — Off") are the primary mitigation — verify they answer "where did my setting go?" without opening the modal.

**What this removes**: The inline Card size block (Short/Medium/Detailed radio after "Card types"), the inline MCQ block (Off/On toggle + read-aloud TTS), the standalone "Image quizzes" group, and Field mapping's placement inside "Templates". All four fold into one "PDF & AI" section. The `<details>` textarea for User instructions is replaced by a Configure-modal row. Net result: the form is shorter outside the section; every AI-shaping control is in one place.

**Primary action**: Configure how AI shapes card content, from a single section.

**Default behavior**: No behavior changes. All settings retain their current localStorage keys and default values. Users who never touch the section see the same output as today.

**Surface vocabulary**: Matches `CardOptionsPage`'s existing bulk-reset dialog — `useDialog(isOpen, onClose)` + native `<dialog>` + `sharedStyles.dialog / modalCard / modalHeader / modalHeaderTitle / modalClose / modalBody / modalFooter`. No new modal pattern.

**Scope**:
- In: one "PDF & AI" section (after "Links & formatting", before "Audio" and "Templates"); single-toggle rows (`process-pdfs`, `pdf-extract-text`, `claude-ai-flashcards` + Premium badge, `image-quiz-html-to-anki` + Premium badge) stay visible; four Configure-modal rows (Card size, MCQ, Field mapping, User instructions); live "Aa" font-size preview in `FontSizePicker`; deep-link hash support (`#pdf-ai`, `#card-size`, `#mcq`) that scrolls to section and auto-opens the relevant modal; DEV-only `/dev/card-options-preview` route; per-modal Vitest tests + FontSizePicker preview test.
- Out: Audio section (unchanged); localStorage key or persistence changes; Premium gating logic; server-side payload shape; any new AI features.

**Implementation notes** (for Engineer):
- New files under `web/src/components/CardOptionsForm/`: `ConfigureRow.tsx`, `CardSizeModal.tsx`, `McqModal.tsx` (absorbs `MCQ_TTS_LANGUAGE_OPTIONS`), `FieldMappingModal.tsx` (wraps existing `FieldMappingPanel`), `UserInstructionsModal.tsx`.
- Single `openModal: 'card-size'|'mcq'|'field-mapping'|'user-instructions'|null` state in `CardOptionsForm`.
- Must preserve: all localStorage keys, `computeSnapshot`/`isDirty` dirty-tracking, `serverSave` payload shape. This is a presentation regroup, not a data change.
- Hash deep-links (`ExploreCard`, upload-page badges → `#mcq`, `#card-size`, `#pdf-ai`): on mount, read `location.hash`, scroll to section, and if the hash names a modal, open it.
- `FontSizePicker.tsx`: render an "Aa" sample in a capped container at the chosen px with the numeric readout alongside.
- Web layer = Vitest only; no server changes.

**User story**: As a user configuring an AI-powered conversion, I want all AI card-shaping options in one section so that I can find and adjust them without scrolling the entire form.

**Acceptance criteria**:
- [ ] "PDF & AI" section appears after "Links & formatting" and before "Audio" and "Templates"
- [ ] Single-toggle rows (`process-pdfs`, `pdf-extract-text`, `claude-ai-flashcards`, `image-quiz-html-to-anki`) are visible without opening a modal; Premium badge shown on gated items
- [ ] Card size, MCQ, Field mapping, User instructions each show as a row with a current-value summary and a "Configure" button
- [ ] "Configure" opens a modal; settings save live on change; "Done" closes the modal
- [ ] All existing localStorage keys, dirty-tracking, and serverSave payload are unchanged
- [ ] `#pdf-ai` scrolls to section; `#card-size` and `#mcq` scroll to section and auto-open the relevant modal
- [ ] FontSizePicker shows a live "Aa" sample that scales with the slider
- [ ] `/dev/card-options-preview` renders the section in anon / free / subscriber × AI off / on states (DEV-only, absent from prod bundle)
- [ ] Per-modal Vitest tests and FontSizePicker preview test are green

**Open questions**:
- Should the "Done" button in each modal also trigger a `serverSave`, or is live-on-change sufficient? (Current form saves on blur/change — confirm the modal satisfies the same contract.)

**Out of scope (next iteration)**: Collapsing the "PDF & AI" section behind a disclosure; any AI feature additions; migrating localStorage to server-side storage; changes to the Audio section.

---

*Alternatives considered:* PM proposed a single master "Generate cards with AI" toggle with inline sub-option reveal — this was considered and rejected. The owner chose the Configure-modal approach because it scales to an arbitrary number of sub-settings per feature without making the inline form longer. The inline-reveal approach would still leave MCQ's TTS language options and Field mapping's column controls unwieldy in the main form.

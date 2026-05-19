# Spec: Stable, deterministic note GUIDs

Closes #310, #1016, and the duplicate-detection slice of #444.

### Trio synthesis
- PM: Re-converting the same source produces fresh random GUIDs, so Anki sees every note as new — duplicate explosion on re-import. This is the single biggest correctness loss in the product and the unlock for safe Auto Sync.
- Designer: No UI changes required for the default path. One small copy nudge: the existing "Use Notion ID" card option becomes redundant for the Notion path and should be hidden (the feature it gates is now always on).
- Engineer: One-file Python change in `create_deck/create_deck.py` to always assign a deterministic `guid_for(...)` instead of falling back to genanki's random GUID. No DB migration. Update `FEATURE.md` "Determinism" line, update `CardOption.useNotionId` handling, write Python tests asserting stable GUID across two runs of the same `deck_info.json`.
- Agreement: deterministic hash over `(deckName, frontField)` (or `notionId` when present) is the right key; ship behind no flag; communicate the one-time re-merge effect in the release note.
- Conflict: PM wanted to key on `(deckName, frontField)` for portability across Notion exports vs. re-uploads of the same HTML; engineer noted that for the Notion sync path `notionId` is more stable than the front field (rename-safe). Resolved: prefer `notionId` when present, fall back to `hash(deckName + front)` otherwise — both deterministic, and the two paths don't cross.
- Resulting plan: drop the `useNotionId` conditional in `create_deck.py`; always pass a deterministic GUID; communicate the one-time re-merge to existing users via the changelog and the in-app What's New.

---

**Outcome**: Re-converting the same Notion page or re-uploading the same export updates the existing notes in place instead of adding duplicates. Target: in the conversion-canary corpus, two consecutive imports of every fixture produce zero duplicate notes in Anki (manual spot-check on three real Notion exports before merge).

**Goal alignment**: A learner who edits one toggle and re-exports gets one updated card, not a polluted deck. That is the core "drop something in, get a clean deck back" loop. Removes the largest single blocker to Ankify Auto Sync (#1016) at 300K scale — without it, every poll cycle could double the user's deck.

**Problem**: Today the `.apkg` builder assigns a deterministic note GUID only when both `mt.useNotionId === true` **and** the card carries a `notionId`. Every other path — markdown uploads, HTML/zip uploads, Notion uploads where the user did not tick "Use Notion ID" (the default) — falls through to genanki's default random GUID. Re-import in Anki treats those as fresh notes, so every re-conversion appends N more cards on top of the existing N. Three years of issue traffic trace to this one branch (#310, #444, #1016, plus the trailing "duplicates on re-export" support theme).

Specific instance: in #1016 the user re-exports a page after editing a toggle in Notion. Anki reports "cards updated" because the random GUID happens to land on a fresh note row, but the user's reviewed cards keep the old text. Search → lightbulb shows the new fields, because that field-level view reads from the latest import; scheduling and content stay split.

**Riskiest assumption**: A SHA-1-based deterministic hash over `(deckName, frontField)` is stable enough across edits the user does not consider a "rename." If a user adds a leading bullet to the front of a card, the GUID flips and Anki treats it as a new note (losing review history on that one card). We accept that for v1 — it matches every other deterministic-GUID system on the market, including Anki's own duplicate-detection key.

**Smallest test**: Run the current `create_deck.py` against the existing fixture corpus, capture the per-note GUID list, apply the change, rerun, assert: (a) every GUID is now deterministic across two runs; (b) two runs of the *same* input produce identical GUID sets; (c) editing only the back field on one note keeps that note's GUID stable. Three Python tests in `create_deck/tests/`.

**Scope**:

In:
- `create_deck/create_deck.py` lines 165–178: always pass a deterministic `guid=` argument to `Note(...)`, dropping the `useNotionId` conditional.
- GUID derivation: `guid_for(card["notionId"])` when `notionId` is present and truthy, else `guid_for(deck["name"], card["name"])` (`card["name"]` is the front field after `get_safe_value`).
- `create_deck/tests/`: three Python tests covering determinism, idempotency, and back-edit stability.
- `src/lib/parser/FEATURE.md`: update the "Determinism" line from "apart from the random GUID per note" to "including the note GUID."
- `src/lib/parser/Settings/CardOption.ts`: keep `useNotionId` field so existing user settings don't crash, but stop branching on it for GUID purposes (the Python side now always assigns a stable GUID).
- `src/services/NotionService/BlockHandler/BlockHandler.ts` line 246: keep populating `ankiNote.notionId` whenever the block has an id, regardless of `useNotionId` setting — the new Python path uses it preferentially.
- `web/src/components/CardOptionsForm/CardOptionsForm.tsx`: remove the "Use Notion ID" checkbox (the behavior is now always on).
- `web/src/pages/DocsPage/content/cards/card-options.md`: drop `use-notion-id` from the internal-keys list.
- `web/src/pages/WhatsNewPage/changelog.ts`: one-line entry (see Communication below).

Out:
- The wrong-note-count slice of #444 (handled by bet 1: cloze + toggle correctness).
- Deck GUID changes — only note GUIDs change. Deck ID derivation in `create_io_deck.py` line 83 is already a SHA-1 hash and stays as-is.
- Image-occlusion deck GUIDs in `create_io_deck.py` line 58 — already deterministic, no change.
- Any change to genanki's GUID format or to Anki's CSUM index.
- Migrating existing user decks. Existing local Anki collections keep their current GUIDs; the next import after deploy will look like a fresh note-set to Anki, which Anki will then handle as a duplicate (existing card preserved, new card prompted) per its built-in duplicate UI.
- A user toggle to disable deterministic GUIDs. There is no good reason to opt out; if a power user surfaces one, we add the toggle then.

**User story**: As a student who re-exports my Notion notes after editing a definition, I want the existing card in my Anki deck to update in place, so that my review history stays intact and my deck does not double in size.

**Acceptance criteria**:
- [ ] Two back-to-back conversions of the same Notion HTML export produce identical note GUIDs for every card.
- [ ] Editing only the back field on one card in the source and re-converting keeps that card's GUID identical (the front field is the GUID key).
- [ ] Editing the front field on one card and re-converting produces a new GUID for that card only — the rest of the deck's GUIDs are unchanged.
- [ ] When `notionId` is present on a card, the GUID is derived from `notionId` alone (rename-safe for Notion-API uploads).
- [ ] Three new Python tests in `create_deck/tests/test_stable_guids.py` cover the three points above and pass in CI.
- [ ] `FEATURE.md` "Determinism" wording is updated; no other Notion fixture diff in `DeckParser.test.ts`.
- [ ] Changelog entry shipped in the same PR.
- [ ] The conversion canary (`src/lib/parser/canary/scheduleParserCanary.ts`) still runs green against the fixture corpus.

**Open questions**:
- Should the fallback (when `notionId` is absent) hash `(deckName, frontField)` or `(deckName, frontField, noteType)` where noteType is `basic|cloze|input|mcq`? Engineer's read: include noteType so converting the same front from basic → cloze produces a new note rather than overwriting (cleaner semantics). PM: lean toward including noteType. Confirm at implementation.
- For multi-deck uploads, the same front field could appear in two different decks legitimately. Deck name is included in the hash, which resolves this. Confirm no fixture in the corpus has a deck named `""` (empty) — if so, fall back to the zip basename.

**Out of scope (next iteration)**:
- Surfacing a "this card moved between decks" notice in the UI (Anki itself handles the move via GUID).
- A migration tool that rewrites existing users' `.anki2` files to the new GUIDs. Users absorb the one-time re-merge using Anki's built-in duplicate UI.

---

## Communication of the one-time effect

This change has a one-time effect: users who have already imported a deck from 2anki get fresh GUIDs on their next import after deploy. Anki's default behavior is to detect the duplicate (same first field) and prompt the user to keep the existing card or add a new one. The change must be communicated so users pick "keep existing."

- **Changelog entry** (lands in `web/src/pages/WhatsNewPage/changelog.ts`, surfaced via the in-app What's New page):
  - `Re-importing the same Notion page updates your existing Anki notes instead of adding duplicates`
- **Release notes / blog**: a short note titled "Re-import without duplicates" pointing learners at Anki's "Duplicate" dialog and recommending they pick "Keep existing" when it appears for their first post-update import.
- **No email blast.** This is a quiet win — the changelog entry plus the in-app prompt are enough. Users who have not re-imported recently see no behavioural delta beyond their next re-import.

---

## Design notes

No new UI. One subtraction: remove the "Use Notion ID" checkbox from `CardOptionsForm.tsx`. The setting is now implicit and always on; surfacing it as an opt-in confused users (every support ticket about duplicates mentions they did not know to tick it). Drop the row, drop the key from the documented internal-keys list, leave the `CardOption.useNotionId` field in place but unread.

Copy strings: none added. One removed (the form row label and helper text for "Use Notion ID").

---

## Technical pre-flight

**Layers touched**:
- `create_deck/` (Python apkg builder) — single file change in `create_deck.py`, three new tests in `create_deck/tests/`.
- `src/lib/parser/` (FEATURE.md doc update only).
- `src/lib/parser/Settings/CardOption.ts` (no semantics change, but the field becomes unread by the Python side).
- `src/services/NotionService/BlockHandler/BlockHandler.ts` (one-line change: always populate `notionId` when the block carries one).
- `web/` (form, docs page, changelog).

**Files likely in play**:
- `create_deck/create_deck.py` (the GUID branch, lines 165–178)
- `create_deck/tests/test_stable_guids.py` (new)
- `src/lib/parser/FEATURE.md`
- `src/lib/parser/Settings/CardOption.ts`
- `src/services/NotionService/BlockHandler/BlockHandler.ts`
- `web/src/components/CardOptionsForm/CardOptionsForm.tsx`
- `web/src/pages/DocsPage/content/cards/card-options.md`
- `web/src/pages/WhatsNewPage/changelog.ts`

**Cross-language coordination**: TypeScript emits `deck_info.json`; Python reads it. The change is entirely on the Python read side — no schema change to `deck_info.json`. TypeScript already populates `notionId` on Notion-sourced notes via `BlockHandler.ts`; the one-line tweak there ensures we always populate it (today the value is `undefined` when `useNotionId === false`).

**Estimated effort**: **S**. Single file change in `create_deck.py`, three Python tests, one TypeScript one-liner, one removed checkbox, one changelog line, one FEATURE.md line. Half a day end to end including a real-Notion-export sanity check before flipping the PR ready.

**Security / testing / migration concerns**:
- No security surface. `guid_for` is a SHA-256 fold; no user-controlled URL, no shell, no parsing of untrusted input.
- Testing: Python `pytest` covers the three determinism properties. The TypeScript `DeckParser.test.ts` corpus should produce unchanged output **except** for the per-note GUID — which is now stable rather than random. If any test asserts on a specific GUID value, update it to assert on stability (two runs equal) rather than on the literal value.
- The `share-files-for-debugging` flag will now leak `notionId` more often into the captured `deck_info.json`. `notionId` is already user-supplied content (block IDs from their own workspace) and is not a secret — leaving the existing redaction list untouched is correct.
- No DB migration. No backward-compat shim needed. The git history is the changelog.
- Shared files flag (per parallel-PR-coordination rules): this spec touches `web/src/pages/WhatsNewPage/changelog.ts`. Coordinate merge order with the other four bets so the changelog conflict resolves cleanly (stack newest entry on top).

**Risk register**:
- Existing power users with very large local decks may see Anki's "Duplicate" dialog 1000+ times if they re-import everything at once. Mitigation: changelog entry tells them to expect this; Anki's "Keep existing" is the safe default.
- If a fixture in the corpus depends on a specific random GUID for snapshot assertions, that snapshot needs to be regenerated. Engineer to inspect on first failing CI run.

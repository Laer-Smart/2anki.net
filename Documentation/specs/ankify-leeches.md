# Spec: Leeches tab on /ankify

### Trio synthesis
- **PM:** Retention surface for paid Ankify users — find/edit/delete/return-to-review leeches in owned decks; the deck- and note-level ownership guard is the riskiest assumption and the whole blast radius.
- **Designer:** Third tab (Decks · Find pages · Leeches), reuse the Swiss Panel deck-row + mono data column; lapse count is the hero datum; inline expander for edit (no modal), row-scoped inline delete confirm; full copy delivered.
- **Engineer:** Pure-AnkiConnect, no migration; add 4 client wrappers; note-level ownership re-check via `findNotes("nid:<id> (deck:owned …)")` is a new security primitive needing its own helper + bypass tests; effort M.
- **Agreement:** Scope = **find + edit + return-to-review + delete**; "wait" cut (it's a no-op). No DB migration. `RequireAnkifyAccess` + deck-ownership on every path. One usage event + a T+30d keep/remove issue (Surface lifecycle). Builds on the merged cockpit (#3345) — `deckOwnership.ts`, the AnkiConnect endpoint pattern, the tab bar all exist on main.
- **Conflict:** Engineer floated a cheaper v1 (Open-in-Anki to edit, drop the inline editor + PATCH). Designer + PM want inline Front/Back editing, and it is the user's explicit ask. **Resolved:** inline Front/Back editor for basic note types; Open-in-Anki fallback only for cloze/multi-field notes the editor can't render safely. PATCH endpoint stays.
- **Resulting plan:** Ship a deck-ownership-scoped Leeches tab with per-note edit (inline, Front/Back only), return-to-review (unsuspend + drop `leech` tag), and guarded delete — gated note-level by an Anki-query ownership re-check before every mutation.

## Outcome
Paid Auto-Sync/lifetime users find, edit, return-to-review, and delete their leech cards from `/ankify` without opening desktop Anki. Success = ≥25% of weekly-active Ankify users who have ≥1 leech open the Leeches tab and take ≥1 action within 30 days of ship.

## Goal alignment
Retention surface for existing paid users — **not acquisition** (acquisition work ships separately this week per the CLAUDE.md allocation rule). Lever is paid churn (18.9%/mo, 79% lifecycle). Leeches are where serious learners lose faith in a deck; a fast in-cockpit cleanup loop is a reason to keep the Auto-Sync seat. No MRR line moves directly; read at the T+30d cohort-churn review.

## Problem
Anki auto-tags a note `leech` and suspends its card after 8 lapses. The suspended cards — the user's *hardest, most-important-to-fix* material — silently drop out of review. A med/law learner running a live Notion→Anki sync for two semesters accumulates dozens of leeches she never revisits, because the only triage path is the desktop Anki browser, a context switch away from `/ankify` where she already manages these decks. The deck she pays to keep synced rots at exactly the cards that matter most.

## Riskiest assumption + smallest test
**Assumption:** the ownership guard correctly scopes both the leech query and every mutating action so a user can only see/act on notes in decks they own via their subscriptions. An unscoped `findNotes("tag:leech")`, or an edit/delete that validates only the note ID and not its deck, lets a user permanently delete notes outside their ownership. Delete is irreversible over AnkiConnect — this is the entire blast radius.

**Smallest test (before any UI):** two subscription sets (user A owns `Notion Sync::Pharmacology`, user B owns `Notion Sync::Torts`), leeches seeded in both. Assert (a) A's list query is built scoped to A's decks and returns only A's notes, and (b) an edit/delete/return targeting one of B's note IDs is rejected by the note-level re-check (see Technical pre-flight) before any mutating AnkiConnect call fires (`spy.not.toHaveBeenCalled()`). If that guard can't be made airtight, the feature doesn't ship.

## Scope
**In (v1):**
- A **Leeches** tab on `/ankify`, behind `RequireAnkifyAccess`, deck-ownership-scoped.
- **Find** — list every `tag:leech` note in owned decks: front preview, back preview, deck path (mono), lapse count (mono hero), model name. Sorted most-lapses-first.
- **Edit** — inline Front/Back expander → `updateNoteFields`, ownership re-checked first. Cloze/multi-field note types show a calm "open in Anki" fallback, never blind-write fields.
- **Return to review** — `unsuspend` the note's cards + `removeTags(noteId, "leech")`. The positive counterpart to delete; closes the leech loop the Anki manual prescribes. (Not kill-list drift: DESIGN.md bans per-card *scheduling* `suspend`/`setDueDate`/`forgetCards`; `unsuspend` is leech recovery — flag this in the PR.)
- **Delete** — per-note, row-scoped inline confirm naming the consequence → `deleteNotes`, ownership re-checked first.
- One usage event `ankify_leech_action` (`action: edit | delete | return_to_review`), plus a tab-view event; fired web-side (consistent with the cockpit double-count fix).

**Out (v1):**
- **Bulk actions** (select-all delete/return) — amplifies the ownership blast radius; contradicts "fix it, don't dump it."
- **Media/image field editing** — text-only; media notes route to Open in Anki.
- **"Wait"** as an action — leaving the row alone already is the wait.
- **Leech-prevention tuning** (lapse threshold, leech action) — that's Anki preferences, not 2anki's job.
- **Formulation-tips affordance** (Wozniak 20 rules in the edit panel) — deferred to v2; Swiss Panel restraint keeps the edit form to clean Front/Back. The `Edits save straight to Anki.` helper is enough for v1.

## User story
As a paid Ankify user with leeches piling up, I want to see every forgotten card from my synced decks in one place and fix, return, or delete it, so my hardest material starts teaching me again without opening desktop Anki.

## Acceptance criteria
- [ ] Leeches tab visible only to `hasAnkifyAccess` users; every endpoint behind `RequireAnkifyAccess`.
- [ ] List query scoped to owned decks; a note in a non-owned deck never appears.
- [ ] Edit, delete, and return-to-review each re-validate the target note's deck ownership server-side before mutating; a forged note ID for an unowned deck returns 403 and runs no mutation.
- [ ] Edit saves field changes via `updateNoteFields`; the row reflects the new front on success. Cloze/multi-field notes show the Open-in-Anki fallback.
- [ ] Delete requires an inline confirm naming the consequence ("removed from Anki and can't be recovered here") before `deleteNotes`.
- [ ] Return to review unsuspends the note's cards, removes the `leech` tag, and drops the note from the list.
- [ ] Empty state: "No leeches — every card is sticking." AnkiConnect offline → calm degrade, not a crash.
- [ ] Header count and per-row lapse count render mono + tabular per DESIGN.md.
- [ ] `ankify_leech_action` fires on each successful action; tab-view event fires on open.
- [ ] T+30d keep/remove review issue created at merge with the review date in the title.

## Leading indicator
Lagging target: monthly paid churn % for the Auto-Sync/lifetime cohort (business-baseline block, read at T+30d). Leading proxy moved week-over-week: the `ankify_leech_action` rate — share of weekly-active Ankify users with ≥1 leech who take an action — read from `/api/ops/metrics`. Watch in the first two weekly retros.

## Design notes
- **Tab:** third tab `Decks · Find pages · Leeches` with a `tabCount` badge (leech total; no badge at zero). Reuse `role="tablist"` markup + `tab`/`tabActive`/`tabCount` classes.
- **Row** (reuse `decksItem` + `decksItemData` mono column verbatim): warning-color status dot (a leech needs attention, isn't a failure) · front preview (sans 500, `truncateMiddle` ~60 chars, full text in `title`) · back preview as the muted second line, `→ ` prefixed · deck path (mono) · **lapse count as the hero datum** `⌗N` (mono, one weight up, `tabular-nums`; hover title `N lapses`) · kebab overflow. Sort most-lapses-first.
- **Overflow menu:** Edit card · Return to review · Delete card (destructive, last).
- **Edit = inline expander**, not a modal (matches the deck-location editor + FullStatsPanel disclosure; the only confirm-overlay on the surface is the shutdown confirm, reserved). Two fields (Front/Back) pre-filled + Save card / Cancel.
- **Delete = row-scoped two-step inline confirm** (swap the data column for `Delete this card? · Delete · Cancel`, `Delete` in `--color-text-danger`), not the red modal.
- **No new palette** — warning dot `--color-warning`, delete `--color-text-danger`; verify all 5 themes. HTML-strip + sanitize all card text before render (no raw card HTML in a row).
- **Copy:** helper `Cards you keep forgetting. Anki suspends a card after 8 lapses — fix it or let it go.` · edit helper `Edits save straight to Anki.` · unsupported note `This card has more fields than Front and Back. Open it in Anki to edit safely.` · delete prompt `Delete this card?` · toasts `Saved` / `Back in review` / `Card deleted` · empty `No leeches — every card is sticking.` · offline `Leeches load once Anki is running. Open Anki, then try again.` · loading `Reading your leeches`.

## Technical pre-flight
- **Layers:** `services/` (4 new `AnkiConnectClient` wrappers), `usecases/ankify/` (1 list + 3 action use cases + a shared ownership helper), `controllers/` + `routes/` (new endpoints behind `RequireAnkifyAccess`), `web/` (new tab + `LeechesPanel` component + `Backend.ts` methods + mirrored analytics events). **No `data_layer/` change, no migration** — AnkiConnect is the source of truth; persisting a leech snapshot would go stale.
- **New wrappers (`AnkiConnectClient.ts`):** `deleteNotes(notes: number[])`, `unsuspend(cards: number[])` (idempotent; `false` = nothing changed = success), `removeTags(notes: number[], tags: string)`, `cardsInfo(cards: number[])` (deck name + lapse count + suspended state). Reuse existing `findNotes`, `notesInfo` (already returns `cards?: number[]`), `updateNoteFields`, `guiBrowse`.
- **Endpoints:** `GET /api/ankify/leeches` (scoped list → mapped `LeechNote[]`, never raw `notesInfo`); `PATCH /api/ankify/leeches/:noteId` (`{ fields }` → `updateNoteFields`, 204); `DELETE /api/ankify/leeches/:noteId` (→ `deleteNotes`, 204); `POST /api/ankify/leeches/:noteId/return-to-review` (`unsuspend` cards + `removeTags(noteId,'leech')`). All: ownership guard as the first await; controller maps `AnkiConnectUnreachableError`→503, `NoteNotOwnedError`→403 (copy the `GetDeckMaturityUseCase`/`OpenDeckInAnkiUseCase` pattern).
- **SECURITY — note-level ownership (the crux):** the mutating actions take raw note IDs; deck-name ownership protects the *list* (scoped query) but not an action path. Before any mutation, re-query by ID constrained to owned decks: `findNotes("nid:<noteId> (\"deck:<ownedA>\" OR \"deck:<ownedB>\" …)")` — empty result ⇒ `NoteNotOwnedError` ⇒ 403. Uses Anki's own matcher so the boundary is identical to the list path (no TS-side drift); `noteId` validated as a finite integer at the controller boundary (no injection); deck names escaped (reuse `escapeDeckQueryValue` from `GetDeckMaturityUseCase`). Shared `assertNoteOwned(ac, ownedDecks, noteId)` helper awaited first by every action use case.
- **TS↔Python:** none — leeches are pure AnkiConnect; the `.apkg` Python packager is untouched.
- **Effort: M** — wrappers + use cases follow merged cockpit line-for-line, but the note-level ownership re-check is a new security primitive (cockpit guards are all deck-name-keyed) needing its own helper + dedicated bypass tests, plus 4 endpoints and an inline edit UI.
- **Testing:** (1) ownership-bypass per action (unowned `noteId` → 403, mutating method never called); (2) pure query-builder + ownership-query helpers via `it.each`, incl. deck names with `"`/`\` and empty-owned-decks; (3) calm-offline (`connected:false` no-call vs 503 on unreachable) at the controller boundary; (4) idempotent `unsuspend(false)` and already-deleted note; (5) event firing web-side.

## Open questions for the engineer
1. Cheapest note→deck resolution on the pinned plugin for display lapse count — `cardsInfo(notesInfo.cards)` is the assumed path; confirm no cheaper call.
2. `deck:"…"` quoting must be injection-safe against a Notion title containing `"` or ` OR ` — confirm `escapeDeckQueryValue` covers it for both the list and the `nid:` ownership query.
3. Field editor renders Front/Back only; confirm detection of "more than Front/Back" (model field count / `resolveTemplateFieldIndices`) to route cloze/multi-field notes to the Open-in-Anki fallback.
4. `unsuspend` operates on cards — confirm we pass `notesInfo.cards`; `removeTags` uses the note ID.

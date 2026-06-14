# Spec: Review tab on /ankify

### Trio synthesis
- **PM:** A calm in-browser reviewer for paid users' synced decks; undo IN; the riskiest area is grading real cards without corrupting the SRS schedule or letting a user grade cards they don't own.
- **Designer:** Onigiri's value is *focus + showing up daily*, not anime skins — deliver it within Swiss Panel via zero-chrome focus + generous whitespace + the streak we already own; **no DESIGN.md change**. Full copy + grade-button colors (status triad + blue only). Build a `/dev/ankify-review-preview`.
- **Engineer:** `answerCards([{cardId,ease}])` schedules an arbitrary card directly — no desktop-GUI/VNC coupling, the right path. Snapshot the due queue at session start; two endpoints (queue + grade); `cardsInfo` is a shared dependency with the Leeches branch. Effort **L**.
- **Agreement:** deck-picker (owned decks only) → reviewer (front → reveal → grade Again/Hard/Good/Easy → next) → done-summary; keyboard 1–4/space; the card-level ownership re-check (`cid:`) + server-side ease 1–4 validation is the crux; no migration; no TS↔Python; usage event + T+30d issue; **queued behind Leeches** (one surface in flight at a time).
- **Conflict:** card iframe sandbox — designer proposed `sandbox=""`, engineer `sandbox="allow-scripts"`. **Resolved → `allow-scripts` (no `allow-same-origin`)**: Anki card templates routinely run JS (MathJax, conditional reveal); `sandbox=""` renders those cards blank. Matches the Full-stats iframe fix (#3347). Event naming: ship **both** `ankify_review_session_started` (fires on first card = intent) and `ankify_review_completed` (fires on done-summary = completion).
- **Resulting plan:** A queued reviewer tab — pick an owned deck, review its due-card snapshot via `answerCards`, gated by a `cid:`-scoped ownership re-check and ease validation, rendered in an `allow-scripts` sandboxed iframe, in a calm zero-chrome Swiss reviewer with a streak payoff — no DNA deviation.

## Outcome
Paid Ankify users review their synced decks' due cards inside 2anki via a calm web UI, raising weekly-active reviewers among subscribers. Target: ≥25% of users who open `/ankify` in a week start ≥1 review session, within 30 days of ship.

## Goal alignment
Retention, not acquisition — gives paid Auto-Sync/lifetime users a daily reason to return; moves the monthly-active-uploader churn signal. Read `ankify_review_session_started` at `/api/ops/metrics`; reviewed at the T+30d adoption issue. This is the surface that lets sync close its loop: synced cards you can actually study from any browser.

## Problem
A lifetime user syncs a Notion med-school deck every 5 minutes but only studies when Anki desktop is open at their desk. On a phone or borrowed laptop the synced cards are stranded — the sync is healthy, the cards go unreviewed. Onigiri's 370 upvotes say the same thing: people study daily when the review surface is calm and inviting, not when it's another window to launch.

## Riskiest assumption + smallest test
**Assumption:** we can grade real cards without corrupting the user's SRS schedule or letting them grade cards they don't own. A wrong `ease` or a cross-deck `cardId` permanently damages a paying user's collection — the one error this surface cannot afford.
**Smallest test (before any UI):** a Jest test on `GradeReviewCardUseCase` proving (1) a `cardId` whose `cid:` is not in the caller's owned decks (re-checked via `findCards("cid:<id> (deck:<owned…>)")`) is rejected 403 and never reaches `answerCards` (`spy.not.toHaveBeenCalled()`); (2) `ease` outside integer 1–4 is rejected 400, no AnkiConnect call. Ownership is re-checked server-side per grade, never trusted from the client.

## Scope
**In (v1):**
- Review tab (`Decks · Find pages · Leeches · Review`), `RequireAnkifyAccess`, owned-decks only.
- Deck picker: each owned deck row shows `▲due · N learning · +new` (mono/tabular, from `getDeckStats`), a per-row **Review** button (one `--color-primary` per row), 0-due rows muted + disabled.
- Reviewer: snapshot the due queue at session start (`findCards("deck:<owned> is:due")` → `cardsInfo`); render front, reveal answer (space/tap), 4 grade buttons (Again/Hard/Good/Easy → ease 1–4) shown only after reveal; advance to next; per-card mono interval hint.
- Card HTML+CSS rendered in a **sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`)**.
- **Undo:** one-step undo of the last grade (re-show, re-grade) — cheap insurance against a misclick corrupting the schedule.
- Done-summary ("47 cards. Done." + streak line), keyboard (space reveal/next, 1–4 grade), calm-offline.
- Two usage events (`ankify_review_session_started`, `ankify_review_completed`), web-side; T+30d keep/remove issue at merge.

**Out (v1):** custom study, new-card/limit config, mid-review card editing, audio/TTS, gamification (coins/levels/restaurants/leaderboards — Swiss kill list + "sync panel, not an Anki clone"). Per-card scheduling stays OUT of the cockpit table (DESIGN.md line 62 holds — grading lives only inside an explicit review session).

## User story
As an Auto-Sync subscriber, I want to review my synced deck's due cards in a calm browser UI so I study daily without opening Anki desktop.

## Acceptance criteria
- [ ] Deck picker lists only owned decks; a non-owned deck name cannot be reviewed.
- [ ] Front shows first; answer reveals on space/tap; grade buttons hidden until reveal.
- [ ] Grade calls the server, which re-checks `cid:` ownership and validates ease 1–4 before `answerCards`; forged cardId → 403, bad ease → 400, neither calls AnkiConnect.
- [ ] Keyboard: space reveals/advances, 1–4 grade; visible focus state.
- [ ] Undo restores the last card and lets it be re-graded.
- [ ] Card HTML renders in an `allow-scripts` (no `allow-same-origin`) sandboxed iframe with the card's `css` injected.
- [ ] Empty state: "No cards due in <deck>. Synced and up to date." Offline: "Anki isn't connected. Open the Anki app on this computer, then try again."
- [ ] Done-summary: "Done — N reviewed in <deck>." with per-grade tabular counts + the streak line.
- [ ] `ankify_review_session_started` fires on the first card; `ankify_review_completed` on the summary; T+30d issue opened at merge.

## Leading indicator
Review sessions started per Ankify user per week (`/api/ops/metrics`); lagging = monthly paid-cohort churn at T+30d.

## Design notes
- **DNA call (no DESIGN.md change):** calm through zero-chrome focus + whitespace; motivation through the existing review-streak heatmap (finishing a session advances it; the done-summary points back to it). No anime, no second hue.
- **Deck picker:** reuse the row+hairline list + mono data column; due is the hero number (weight 500), learning/new tertiary; counts carry NO status-triad color (triad is sync health, not card counts).
- **Reviewer:** centered card area max-width ~640px, `--text-2xl` front, card floats (no border). Reveal = full-width secondary **Show answer**; answer below a hairline. Grade colors: **Again** = `--color-text-danger` *text* on neutral fill, **Hard** = neutral tertiary, **Good** = solid `--color-primary` (the one primary per view), **Easy** = neutral outline. Mono interval hint under each (`<1m · <6m · 1d · 4d`). Progress = thin top rule fill + mono `12 / 47`. Motion: opacity-only, 100–150ms. Loading: "Loading your cards." (no ellipsis).
- **Copy (final):** tab `Review` · button `Review` · `Show answer` · grades `Again / Hard / Good / Easy` · progress `12 / 47` · done `47 cards. Done.` · caught-up `All caught up.` · loading `Loading your cards.` · offline `Anki isn't connected.`
- Build `/dev/ankify-review-preview` (DEV-gated) rendering picker (decks-due / all-caught-up) and reviewer (front / revealed / done / offline) side by side — pick the grade-button treatment from real pixels before lock.

## Technical pre-flight
- **`answerCards` confirmed:** schedules the card loaded by id directly; no desktop-GUI/VNC coupling, does not touch `gui*` state. This is the standalone path. Snapshot the queue once at session start and grade against snapshot ids — do NOT re-query due per card (couples to scheduler timing). Fallback (only if a spike shows mis-scheduling): `guiDeckReview`→`guiCurrentCard`→`guiAnswerCard` (couples to the single VNC desktop — avoid).
- **Wrappers to add (`AnkiConnectClient.ts`):** `answerCards({cardId,ease}[])` (required); `areDue` (optional, session-start only). **`cardsInfo` is a shared dependency with the Leeches branch** — if Leeches lands first reuse its wrapper + type; else define `AnkiCardInfo { cardId, question, answer, css, deckName, due, queue }` and let Leeches rebase. Coordinate to avoid an `AnkiConnectClient.ts` conflict.
- **Endpoints (behind `RequireAnkifyAccess`):** `GET /api/ankify/review-queue?deck=<owned>` → `{ connected, cards: { cardId, questionHtml, answerHtml, css }[] }` (ownership-first via `userOwnsDeck`, `ping`, `findCards`+`cardsInfo`; `connected:false` when no client/unreachable; `DeckNotOwnedError`→403). `POST /api/ankify/review-grade` `{ cardId, ease }` → `{ graded: true }` (cid: ownership re-check + ease 1–4 validation first; 403/400/503).
- **Security:** card-level ownership re-check before `answerCards` (`findCards("cid:<id> (deck:<owned…>)")`, **`cid:` not `nid:`**); ease validated to integer 1–4; iframe `sandbox="allow-scripts"` no `allow-same-origin`; reuse `escapeDeckQueryValue` for every deck name in a query.
- **Layers:** route + controller + 2 use cases (`GetReviewQueueUseCase`, `GradeReviewCardUseCase`) + 3 client wrappers + 1 web component (`ReviewPanel.tsx`) + tab wiring. **No migration, no DB, no TS↔Python.**
- **Effort: L** — net-new reveal/grade state machine, per-card arbitrary-HTML iframe rendering, two endpoints with two ownership checks, and the `answerCards` spike.
- **Testing:** ownership-bypass on grade (403, `answerCards` never called); ease validation `it.each([0,5,1.5,'3',NaN])`→400; queue scoping (escaped owned deck + `is:due`; non-owned→403); calm-offline (queue `connected:false` 200 / grade 503); reviewer state machine (front→reveal→grade→next→summary; empty due→empty state); query-escaping with `"`/`::`.

## Open questions for the engineer
1. Run the `answerCards` spike (~1h) before building: confirm grading a snapshot-id card schedules correctly for new/learning/review cards without re-querying due.
2. Ship `questionHtml`+`answerHtml` together in the queue payload (one round-trip per session) vs reveal-fetch — recommend together (it's the user's own deck).
3. Sequencing: this is **queued behind Leeches** per the surface-lifecycle rule — start only after Leeches has a day-7 prod check + a usage signal.

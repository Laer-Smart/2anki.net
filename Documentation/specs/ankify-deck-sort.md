# Spec: Sort the Ankify synced-deck list

Origin: support signal from a lifetime Auto-Sync power user — wanted Anki-side rename tracking, flagged it bug-prone himself, and proposed the safer alternative: "be able to sort/organise on Ankify instead, which becomes increasingly useful once I have multiple decks on board."

### Trio synthesis
- **PM:** Sort the deck list (name / last-synced / backlog) so a 20+-deck user finds a deck without scanning; paid-retention quality, not acquisition; localStorage persistence; reply to the reporter to confirm sort (not folders) is the real need.
- **Designer:** Native `<select>` beside the existing search box; sort by the right-hand mono data column (Swiss Panel signature); default **Status** (health scan); add the missing empty-filter state; no folders / no drag / no custom dropdown.
- **Engineer:** Front-end only, no API/migration. v1 keys = name / last-synced / **status** (always-present row fields); **defer card-count/maturity** — they read zero when Anki is offline (a normal state) and the sort looks broken. Effort **S**. Comparator → `lib/deckSort.ts`; persist in localStorage (matches `WorkspaceBar` idiom); event via existing `track()`.
- **Agreement:** client-side sort over already-fetched subscriptions; native `<select>` (a11y + restraint); localStorage (ephemeral view state, permitted); reuse the existing search box; add the empty-filter state; one usage event; no folders / drag / Anki-rename-sync.
- **Conflicts resolved:** (1) default sort — PM "Last synced" vs Designer "Status" → **Status**, because the surface's stated job is "see at a glance that sync is healthy." (2) sort keys — Designer's "Cards due" vs Engineer's offline-unreliability → **defer Cards due to v2**; v1 ships the three always-present keys.
- **Resulting plan:** Add a native sort `<select>` to the existing control row in `NotionSubscriptions.tsx` — keys Status / Last synced / Name, default Status, persisted in localStorage; add the empty-filter-result line; fire `ankify_decklist_sorted`; pure client-side, comparator in a tested `lib/deckSort.ts`.

---

## Outcome

A power user with many synced decks can order the Decks list by **Status**, **Last synced**, or **Name** and find the deck (or the broken one) without scanning the whole list. Success: the heavy-deck cohort uses the sort control, and the Decks tab stops being a dead wall of insertion-ordered rows. Default render is health-first.

## Goal alignment

Paid-retention product quality, **not acquisition** — creates no users, not this week's acquisition change. Serves the ARPU/retention lever: `/ankify` is the lifetime/Auto-Sync surface, 79% of churn is lifecycle, and keeping the heaviest paid power users productive on the surface they live in defends the $30/mo seat. Read as a retention/engagement signal.

## Problem

The Decks list (`NotionSubscriptions.tsx`) renders subscriptions in insertion order, with only a search box above 10 decks. Insertion order maps to nothing the user thinks in (alphabetical, what synced last, what's broken). As deck count grows, finding a specific deck — or spotting a failed sync — means scanning every row. A lifetime Auto-Sync user (the heaviest Ankify user) hit exactly this and asked to sort/organise in-app.

## Riskiest assumption

That **sort** (order-on-screen) is what "organise" means here — that the user wants to *find* a deck faster, not *group/nest* decks into folders. If the real need is grouping, a flat sort won't satisfy.

## Smallest test to disprove it

Reply to the originating user with two framings — "sort by status / last sync / name" vs "group decks into folders" — and ask which matches the problem he hit. One email from the person who raised it confirms or kills the assumption before any folder work. (Sort ships regardless; folders are gated on this answer.)

## Scope

**In:**
- A native `<select>` ("Sort decks") in the existing control row beside the search box.
- Three keys, all read from always-present subscription-row fields: **Status** (failed → syncing → offline → healthy, tiebreak oldest-synced), **Last synced** (newest first; never-synced sorts last), **Name** (locale-aware A→Z, case-insensitive; "Untitled page" sorts last).
- Default = **Status**.
- Sort applies *after* the existing search filter (filter then sort).
- Choice persisted in `localStorage` key `ankify-deck-sort` (guard: unknown stored value → default).
- The missing **empty-filter-result** state (search matches nothing) ships alongside.
- Control row appears at a single threshold — lower the existing 10 to **8** so organising shows once "multiple decks" applies.
- One usage event `ankify_decklist_sorted` `{ key }` on change (no deck names/titles — support-confidentiality).
- Comparator + localStorage read/write extracted to a colocated, unit-tested `lib/deckSort.ts`.
- a11y fix while here: add a visually-hidden `<label>` to the new `<select>` AND to the existing unlabelled search input.

**Out:**
- **Cards-due / maturity sort** — depend on the Anki client being connected; offline they read zero and the order looks broken. Deferred to v2 behind a defined offline tiebreaker, gated on v1 event demand.
- Folders / grouping / nesting (gated on the smallest-test answer).
- Drag-to-reorder (implies a persisted manual order = new column/endpoint, mobile-hostile).
- A separate status filter (sort-by-Status covers the health-scan; search covers the name-hunt).
- Any server/DB change, any change to `target_deck` semantics, any custom dropdown component.

## User story

As a lifetime Auto-Sync user with many synced decks, I want to order my deck list by status, last sync, or name so I can find the deck I want — or the one that failed — without scanning the whole list.

## Acceptance criteria

- [ ] With ≥8 decks, a native sort `<select>` appears beside the search box; under 8 the list is unchanged.
- [ ] Default sort is Status (failed first, tiebreak oldest-synced); first render is health-first with no interaction.
- [ ] Last synced sorts newest first; never-synced decks sort last.
- [ ] Name sort is locale-aware A→Z; "Untitled page" decks sort last, not under "U".
- [ ] Sort applies after the search filter — narrowing then reordering both hold.
- [ ] The chosen sort persists across a reload on the same device; an unrecognised stored value falls back to default.
- [ ] Searching with no match shows a specific empty state naming the query and total count, with a clear-search action (query rendered at `font-weight: 500`).
- [ ] Changing sort fires `ankify_decklist_sorted` carrying only the key (no deck names/titles).
- [ ] The sort `<select>` and the existing search input each have an accessible label (visually-hidden `<label>` or `aria-label`).
- [ ] Sort labels are sentence case: "Status", "Last synced", "Name".

## Leading indicator moved

Retention-quality, not funnel. Watch `ankify_decklist_sorted` adoption (`/api/ops/metrics`) and Auto-Sync renewal/churn for the lifetime + Auto-Sync cohort (`/api/ops/business/metrics`). **Surface-lifecycle gate:** day-7 prod check that the event fires for real heavy users; **T+30d adoption-review GitHub issue** created at merge (review date in title) — binary keep/remove; if no heavy user sorts in 30 days, remove the control + event.

## Design notes

`/ankify` is the locked **Swiss Panel** DNA (Swiss layout + monospaced tabular data voice; signature = the right-hand mono data column). The sort control leans into the signature: Status and Last synced sort by values in the right-hand `.decksItemData` column; right-align the `<select>` over that column so the control visually owns the data it governs. Native `<select>` — no new component, no new colour ramp, WCAG-AA keyboard/SR-native, works at 375px. Reuse existing border/text tokens; Status default relies on the existing status-dot triad, no new colour. No "Sorted by X" toast — the reorder is the feedback.

Copy (VOICE.md — sentence case, no warmth):
- Visually-hidden select label: `Sort decks`
- Options: `Status` · `Last synced` · `Name`
- Search placeholder: keep existing `Search your decks`
- Empty filter result: **No decks match "{query}". Clear the search to see all {n}.** ({query} at `font-weight:500`; "Clear the search" is a tertiary action that empties the search.)

## Technical pre-flight

**Front-end only — no API, no migration.** List built from three already-wired client queries in `NotionSubscriptions.tsx`: `listAnkifySubscriptions()` (rows), `useAnkifyStats` (counts), `useDeckMaturity`. v1 keys read only from the subscription row (`notion_page_title`/`buildDeckName`, `last_synced_at`, `last_error`→`deckStatusFor`) → always present regardless of Anki connection. Card-count/maturity come from the stats/maturity queries which are empty when Anki is offline → that's why they're v2.

- **Files:** `web/src/pages/AnkifyPage/components/NotionSubscriptions.tsx` (sort state + control + apply to `filteredSubscriptions` before `.map`; `SEARCH_THRESHOLD` 10→8; empty-filter state); new `web/src/pages/AnkifyPage/lib/deckSort.ts` (comparator + persistence, matches `lib/deckName.ts`/`lib/deckBacklog.ts` pattern); `AnkifyPage.module.css` (control-row flex + select styling reusing `.decksItemData` tokens); `web/src/lib/analytics/events.ts` (add `ankify_decklist_sorted` to `KNOWN_EVENTS`); `NotionSubscriptions.test.tsx` (extend); changelog JSON.
- **Persistence:** localStorage via the existing `globalThis.localStorage?.…` idiom from `WorkspaceBar.tsx` (SSR/prerender-safe, optional chaining). Ephemeral view state — code-quality rule permits it; no DB.
- **Event:** `track('ankify_decklist_sorted', { key })` from `web/src/lib/analytics/track.ts` (fire-and-forget; name must be in `KNOWN_EVENTS`).
- **No generic sort primitive exists** in `web/src/components/` — don't build an abstraction (wait for the third use); inline the `<select>` + the extracted comparator.
- **Effort: S.** Data in hand, persistence copy-from-`WorkspaceBar`, no backend.
- **Testing (Vitest):** unit-test `deckSort.ts` (each key, null `last_synced_at` last, stable name tiebreak, empty list); component tests (changing sort reorders rendered rows — assert DOM order; filter narrows; empty-result state; persistence with mocked localStorage; `track` called with right name/props). Mock only backend/`track` at the edge.
- **a11y:** list is `<ul>/<li>` not `<table>` — no fake `aria-sort`/column headers (Sonar flags non-native interactive roles). Native `<label>`+`<select>`. The existing search input has a placeholder but no label (AA fail) — add a visually-hidden label while here. Optional polite live announcement of result count on sort/filter (keep minimal; not per-keystroke). Run `a11y-reviewer` on the diff before browser-check.

**Open questions for engineer:**
1. Exact threshold — spec says 8; confirm it reads well between the search-only and search+sort states.
2. Whether to also widen the existing search to match `target_deck`, or leave name-only (recommend leave name-only for v1).
3. Whether the result-count live announcement is worth the complexity in v1 or deferred (recommend a minimal `aria-live` count or defer).

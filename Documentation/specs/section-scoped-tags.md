# Spec: Section-scoped tags (group tag under a parent toggle)

Issue: https://github.com/2anki/server/issues/3180

### Trio synthesis
- **PM:** Fills the missing middle tag scope (between per-card and page-global); honest framing — product quality, not acquisition/revenue; default-on, no setting, byte-identical when no markers; pushes back that v1 must cover the reporter's real path (live Notion sync), not just file upload.
- **Designer:** No new UI surface — it's an authoring convention. But one existing doc string (`parser-rules.md:72`, "two scopes") is now wrong and must be updated, plus a changelog entry, or the invisible rule ships dark and nobody discovers it.
- **Engineer:** The issue's code map is accurate for the **upload path only**. The live Notion-API sync is a **separate engine** (`TagRegistry` + `BlockHandler`) — the issue's claim that `TagRegistry` is "NOT in the live tag path" is **false**. Feature is only meaningful in **cherry** mode (default/`isAll` keep top-level toggles only, so descendant cards don't exist as separate notes). The bundled `locateTags` dedupe fix is a behavior change and must be split into its own `fix:` PR to preserve the byte-identical guarantee.
- **Agreement:** All three: default-on, no setting, reuse `~~tag~~` vocabulary at a new scope, marker stripped so no spurious card, byte-identical output when no markers. Quality work, no metric.
- **Conflict:** "one path or both" — the issue half-resolved this assuming a single parser path. Engineer proved there are two independent engines and the issue mischaracterized the live one. **Resolution:** the reporter's actual flow is live Notion sync (first-time-fix.md: fix the path the user hits). v1 floor = the **Notion-API path** (`BlockHandler`/`TagRegistry`). The upload path is the cheaper, lower-value sibling — ships in the same PR if it falls out cleanly, else a fast follow-up. Final single-vs-both confirmed at `/implement` once the API-path spike lands.
- **Resulting plan:** Add section-scope tag tracking so a first-child `~~tag~~` under a parent toggle tags every descendant card (union with per-card + global, deduped), in cherry mode, on the live Notion-API path first; split the `locateTags` dedupe into its own `fix:` PR; update `parser-rules.md:72` + add a changelog entry in the same PR.

---

## Outcome

A `~~tag~~` strikethrough placed as the first body element directly under a parent toggle tags every card descended from that toggle. A multi-chapter vocab page produces correctly chapter-tagged cards without per-word typing or splitting chapters onto separate pages. Success state: a two-chapter fixture (each parent toggle carrying a distinct marker) yields child cards each carrying their enclosing section tag plus all global tags, deduped — and a page with no markers produces byte-identical output to today.

## Goal alignment

Product **quality** (simpler/faster notes→Anki), not acquisition or revenue. Touches no funnel or MRR lever. Ships **after** the week's required acquisition-facing change, never instead of it. Prior issue verdict: PARK with a build-ready spec; re-open trigger = a second independent report or a chapter-vocab cohort in churn/support. This is that build-ready spec.

## Problem

Tags exist at two scopes — per-card and page-global — with no middle level. A user who structures a page as one parent toggle per chapter, each vocab word a child toggle (one card), cannot tag a whole chapter at once. Verbatim (single ~11-month-old YouTube comment): "I use one main toggle (e.g. words from chapter 1) and write every word I need to learn as a toggle below. Now I would like to have the main toggle name as a tag, but if I put it there it will just ignore the 'just one toggle per card' setting... As I want the next group to have a different tag (e.g. words from chapter 2) I cant use it on the main page." Workaround today: type the tag per word, or split every chapter onto its own page.

## Riskiest assumption

That section scope can be tracked through the **live Notion-API render path** cleanly. `TagRegistry` is currently a flat per-card accumulator with no notion of ancestor scope; threading "every enclosing toggle's section tag" through the recursive `getBackSide`/`getChildren` walk in `BlockHandler` is a redesign, not a tweak. If section scope can't be tracked there without perturbing existing tag output, the v1 floor (API path) is wrong and needs rescoping before code.

## Smallest test to disprove it

Before building: a fixture-driven spike on the **Notion-API path** — construct the issue's two-chapter Notion block tree, assert a nested child card carries its parent toggle's `~~del~~` tag while a sibling chapter's cards do not, in cherry mode, without perturbing existing `TagRegistry` tag output on a no-marker fixture. If that can't be made to pass with an ancestor-scope addition to `TagRegistry`/`BlockHandler`, the authoring model or the path choice needs revisiting. (A parallel upload-path spike against `src/test/fixtures/section-tags.html` validates the cheaper sibling.)

## Scope

**In:**
- Section marker = strikethrough paragraph as the first body element directly under a parent toggle.
- Per-card tag set = union(per-card ∪ all enclosing section tags ∪ page-global), deduped. Nested toggles compound — a card under chapter-1 → section-A carries both.
- Marker node extracted then stripped before card extraction (no spurious card / leftover `<del>`); mirrors the existing per-card strip and 🔄 detect-then-strip.
- **Cherry mode only** — the only mode where descendant toggles become distinct cards. Inert (no-op, no error) in default/maxOne/`isAll`.
- **v1 floor = the live Notion-API path** (`BlockHandler` / `TagRegistry`) — the reporter's real flow. Upload path (`DeckParser`) ships in the same PR if it falls out cleanly; otherwise a fast `feat:` follow-up.
- Doc + discoverability: update `parser-rules.md:72`; add a changelog entry (same PR).

**Out:**
- Parent-title-as-tag (rejected — titles sanitize to ugly strings like `words-from-chapter-1`).
- Any new setting, toggle, or in-product UI surface.
- Default/maxOne/`isAll` support (descendant cards don't exist there).
- Per-group tag transforms or replace-mode.
- The `locateTags` dedupe fix — **split into its own `fix:` PR** (it changes tag multiplicity on existing decks → not byte-identical; needs its own characterization test).

## User story

As a learner who structures a Notion page as one parent toggle per chapter with each vocab word as a child toggle, I want to mark a chapter once with `~~chapter-1~~` so every card in that chapter is tagged automatically — without typing the tag per word or splitting chapters onto separate pages.

## Acceptance criteria

- [ ] A `~~tag~~` as the first body element under a parent toggle tags every card descended from it, in cherry mode, on the live Notion-API path.
- [ ] A card's final tag set is union(per-card ∪ all ancestor section markers ∪ page-global), deduped.
- [ ] Nested section toggles compound (card under chapter-1 → section-A carries both).
- [ ] The section marker node is stripped and never becomes a card itself.
- [ ] A page with no section markers produces byte-identical deck output to current main (regression fixture, both paths).
- [ ] In default/maxOne/`isAll` mode the marker is inert and produces no error.
- [ ] Upload path (`DeckParser`) covered in the same PR, or a `feat:` follow-up filed and linked.
- [ ] `parser-rules.md:72` updated to describe three scopes; changelog entry added.
- [ ] New tests colocated as `*.test.ts` (Jest), extending the `DeckParser.locateTags.test.ts` shape, asserting the union/dedupe output — not "did not throw".

## Leading indicator moved

None — internal quality. Moves no funnel or MRR metric and must not claim to. Only honest signal is qualitative: the reporter (and any second report) no longer needs the per-word/split workaround. The changelog entry is a quality note, not a funnel claim.

## Design notes

No new UI surface — authoring convention riding the existing default strikethrough format. Two same-PR copy requirements (not optional polish — the only way an invisible rule gets discovered):

1. Replace `web/src/pages/DocsPage/content/cards/parser-rules.md:72` (currently claims two scopes) with three:
   > - **strikethrough** (default) — strikethrough text becomes a tag. Where you put it sets which cards get the tag:
   >   - inside a card's toggle → tags only that card
   >   - as the first line under a parent toggle → tags every card nested under it (use this to tag a whole chapter at once)
   >   - at the page level → tags every card on the page

2. Changelog entry `web/src/pages/WhatsNewPage/changelog/<merge-date>-group-scoped-tags.json`:
   ```json
   { "id": "<merge-date>-group-scoped-tags", "date": "<merge-date>", "type": "feature", "title": "Tag a whole section at once — strikethrough text under a parent toggle tags every card nested under it" }
   ```

`RulesPage.tsx` needs **no** change (it controls tag *format*, not scope). **Open design question for engineer:** is the marker strictly the *first* child, or accepted anywhere under the parent? The docs copy says "first line" — it must match the real rule.

## Technical pre-flight

**Two independent conversion engines — they do not share tag code:**

| Path | Engine | Tag mechanism |
| --- | --- | --- |
| HTML/markdown/zip upload | `DeckParser` (`src/lib/parser/`) | `extractGlobalTags` + `locateTags` over cheerio `<del>` |
| **Live Notion API sync** | `BlockHandler` (`src/services/NotionService/`) | `TagRegistry` populated during rich-text render; `getTopLevelTags` for global |

The issue's "code already located" section maps the **upload path only** and wrongly claims `TagRegistry`/`ParserRules.TAGS` are not in the live path. They are load-bearing: `TagRegistry` (`src/lib/parser/TagRegistry.ts`) + `HandleBlockAnnotations.tsx:35` (`addStrikethrough`) + per-card assign/clear in `BlockHandler.getFlashcards` (:378/:385/:478). `BlockHandler` is built at `NotionController.ts:440` and `CreateJobWorkSpaceUseCase.ts:57`; it never calls `DeckParser`.

**Layers touched:**
- API path (v1 floor): `src/services/NotionService/BlockHandler/BlockHandler.ts`, `TagRegistry.ts`, `HandleBlockAnnotations.tsx`, `blocks/lists/BlockToggleList.tsx`. Add ancestor-section-scope tracking to `TagRegistry` (today flat per-card).
- Upload path (same-PR or follow-up): `src/lib/parser/DeckParser.ts` — section-marker extraction + `parents('ul.toggle')` ancestor walk in `extractCards` (:1291, live element in hand at :1305), union in `locateTags` (:579). Global selector `.page-body > p > del` (:499) does **not** catch a `<del>` inside `details` — confirmed, good.

**The landmine — only cherry mode is meaningful.** `findNotionToggleLists` (`src/lib/parser/findNotionToggleLists.ts:129`) gates what becomes a card independently of `maxOne`: default returns `.page-body > ul` (top-level only); `isCherry` returns every `.toggle` at any depth (the meaningful mode); `isAll` is top-level only. `maxOne` (`CardOption.ts:136`, default false) is a *second* flatten. In default mode a section `<del>` is just the parent card's own per-card tag — a no-op for the feature. UX trap: default-mode user adds a marker, sees no effect. Spec scopes the feature to cherry; inert elsewhere.

**Cross-language:** pure TS. Tags travel on `Note.tags` → `deck_info.json` → `create_deck.py`; tags array already exists, no JSON-shape change, **no Python coordination**.

**Effort:** API path = **L** (`TagRegistry` ancestor-scope redesign through the recursive render). Upload path = **M**. The issue's "~half a day" estimate covered the upload path only.

**Testing / security / migration:**
- Byte-identical guard: existing `DeckParser.locateTags.test.ts` + `Global Tag Support.html` fixture pin current behavior. Add `src/test/fixtures/section-tags.html` (cherry-mode, parent toggle with first-child `<p><del>section-tag</del></p>` + ≥2 nested child toggles) and a no-marker snapshot assertion. Mirror for the Notion-API path with its own block-tree fixture.
- The `locateTags` dedupe (:605 appends globals unconditionally → duplicates today): splitting it into its own `fix:` PR is mandatory — folding it in breaks the byte-identical claim for any page that currently has duplicate tags.
- Security: section `<del>` text flows through the same `sanitizeTags` (`src/lib/anki/sanitizeTags`). No new untrusted sink, no file/URL handling. No migration (no schema, no setting).

**Open questions for the engineer:**
1. Strict-first-child vs anywhere-under-parent for the marker (designer's docs copy says "first line" — must match).
2. Notion-API DOM vs HTML-export DOM — do they need different selectors / scope-tracking? Decides the API-path spike shape.
3. Order: does the existing per-card strikethrough strip run before or after section-marker detection? Must not double-count a marker as a per-card tag on a sibling.

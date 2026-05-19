# Spec: Notion-path conversion correctness audit

### Trio synthesis

- **PM:** Silent partial conversion is the #1 activation killer — a user who uploads a 35-toggle Notion page and gets 18 cards quietly assumes 2anki is broken and leaves. Fix the silent miss first (issues #1162, #444 wrong-count slice), then the silent over-creation (#1411), then the format gaps (#1094 code-tag clozes, #1077 `<ul>` on front).
- **Designer:** The user already knows how many toggles they had — they wrote them. The product knows how many it produced. The gap between those two numbers is the entire trust problem. Show it. Surface a "Found N toggles, made N cards" count line on the Downloads page; when N differs from a credible expected count, explain why in one sentence. No UI overhaul needed — extend the existing `actionable failure reasons` row that PR #2441 just landed.
- **Engineer:** All five issues converge on three files in `src/lib/parser/`: `findNotionToggleLists.ts` (toggle detection on 2024-format exports), `helpers/handleClozeDeletions.ts` (cloze numbering + KaTeX overlap), and the rendering pass that lets `<ul>` leak onto the front. The fixture corpus under `__fixtures__/notion-html-2024/` is the right place to lock the regression. Effort: M — pure parser-layer work, no migrations, no API surface change, gated by the existing parser canary so divergence is caught the next morning.
- **Agreement:** Three layers — (1) tighten parser correctness for the 2024 Notion HTML shape, (2) lock the corpus with one fixture per reported bug, (3) surface a `cardsCreated / togglesFound` count to the user so silent loss becomes visible.
- **Conflict:** Designer wanted the count surfaced *during* upload progress (live); Engineer flagged that the parser is single-pass and doesn't know "expected toggle count" before extraction. Resolved by surfacing on the Downloads page only, after extraction, alongside the existing failure-reason row.
- **Resulting plan:** Three bug-fix PRs in sequence (#1162 + #444 silent-loss → #1094 code-tag cloze → #1411 LaTeX over-creation), plus one small `feat:` PR for the `<ul>` front toggle (#1077) and the count display. Each PR adds at least one fixture under `__fixtures__/notion-html-2024/` and a corresponding `*.test.ts` case.

---

**Outcome:** Reduce silent-partial-conversion rate on the Notion HTML upload path. **Leading indicator:** `cards_created / toggles_found` ratio per upload, reported via a new structured log line `[parser] notion-count-ratio`. Target: median ratio at 1.0 ± 0.05 across the fixture corpus, and zero fixtures with ratio < 0.9 after the first PR ships.

**Goal alignment:** Notion is the dominant input cohort; conversion-success rate is the tightest growth lever toward 300K users. A user whose 35-toggle page produces 18 cards is a churned user the next morning.

**Problem:** Five separate open issues describe the same underlying class of bug — the Notion HTML upload path silently produces the wrong number of cards:

- **#1162** — user with 35 numbered toggles received 18 cards; no error surfaced.
- **#444** (wrong-count slice only — duplicate detection is bet 5's scope) — Notion's late-2021 toggle-format change caused the parser to miss toggles entirely on some exports.
- **#1411** — LaTeX inline formulas inside `<code>` cloze blocks generate extra cloze cards (4 from a 2-cloze source), and the trailing ones throw render errors in Anki.
- **#1094** — `<code>` tags that should become cloze deletions are sometimes left as literal `<code>` on the card.
- **#1077** — bulleted-list (`<ul>`) blocks render on the **front** of basic cards, which users complain about repeatedly; the workaround ("use the raw note template") is hostile to non-developers.

Representative instance: the #1162 reporter saw 35 numbered toggles in their Notion page and 18 cards in the resulting deck, with no indication which were dropped or why. They have to manually diff every export. They asked once, didn't get a fix in three weeks, and went quiet — the textbook activation leak.

**Riskiest assumption:** That the silent loss is reproducible from a Notion export we already have or can construct. If real-world losses are caused by Notion-side export variability we can't capture in a fixture, no amount of parser hardening fixes the reporter's problem — we'd need a runtime invariant ("toggles seen != notes emitted") with explicit user surfacing instead.

**Smallest test:** Pull one real 2024-format Notion HTML export with ≥20 nested toggles into `__fixtures__/notion-html-2024/`, snapshot the current parser output, and assert it matches the toggle count visible in the source HTML. If the snapshot already matches and we can't reproduce a miss from any export shape we construct, the assumption is wrong and the spec pivots to runtime instrumentation (the count line on Downloads) as the *primary* fix rather than the validation surface.

**Scope (in):**

1. Parser corpus expansion — one fixture per reported bug under `src/lib/parser/__fixtures__/notion-html-2024/`, each paired with a `*.test.ts` that asserts both `cardsCreated` and `togglesFound`.
2. Fix the silent-miss class (#1162, #444 wrong-count slice) — most likely in `findNotionToggleLists.ts` selector or in `DeckParser.extractCards`. Lock with fixture-driven assertions.
3. Fix the LaTeX over-creation (#1411) — in `helpers/handleClozeDeletions.ts`. The current code re-numbers KaTeX clozes inside an already-numbered span; merge KaTeX siblings the way adjacent `<code>` siblings are already merged.
4. Fix the code-tag cloze gap (#1094) — the user-visible symptom is that `<code>` inside a toggle stays as `<code>` instead of becoming `{{c1::…}}`. Most likely the `cloze` card type detection in `DeckParser` is gated on something that the user's export doesn't satisfy. Confirm via fixture before changing the gating.
5. New `CardOption` flag `front-no-list` (default `false`) that strips `<ul>` and `<ol>` from the front side of basic cards (#1077). Off by default, opt-in setting in the existing parser options sidebar.
6. New structured log line on every Notion-HTML upload: `[parser] notion-count-ratio toggles_found=N cards_created=M`. No PII. Surfaced on Downloads row as "N cards from M toggles" once the ratio is wired through `JobService` → `DownloadService`.

**Scope (out):**

- Duplicate detection / stable GUIDs (#444's second slice) — bet 5's territory; do not touch.
- BlockHandler image work — bet 2's territory.
- BlockTable changes — bet 3's territory.
- Notion API (`/notion` sync) path — this audit is the HTML upload path only. The Notion-API renderer is structurally different and produces different toggle shapes; address separately if the same numbers diverge there.
- Markdown and zip/apkg paths — out of scope unless a fix in the HTML path regresses them. The parser canary catches that.
- UI redesign of the Downloads row beyond appending the count line.

**User story:**
As a Notion user uploading a study page with 35 toggles, I want the resulting deck to contain 35 cards — and if it doesn't, I want the Downloads page to tell me how many were found and how many were made, so I know to investigate before opening the deck in Anki.

**Acceptance criteria:**

- [ ] One real (anonymised) 2024-format Notion HTML export per closed bug lives under `src/lib/parser/__fixtures__/notion-html-2024/<issue-number>-<short-slug>/`, each with a `expected.json` containing `{ togglesFound, cardsCreated, cardTypes }`.
- [ ] `DeckParser.test.ts` (or a new sibling) asserts each fixture's output matches its `expected.json` exactly.
- [ ] The parser canary (`scheduleParserCanary.ts`) picks up the new fixtures via its existing glob without modification.
- [ ] On a fixture with ≥20 toggles, `cardsCreated >= togglesFound * 0.95`. No fixture in the corpus produces a ratio below 0.9.
- [ ] `handleClozeDeletions.test.ts` gains a LaTeX-inside-cloze case from #1411 that asserts exactly 2 cloze cards (not 4) for a 2-cloze input.
- [ ] `handleClozeDeletions.test.ts` gains a `<code>` cloze case from #1094 that asserts the `<code>` text becomes `{{c1::…}}`.
- [ ] New `CardOption` key `front-no-list`, default `'false'`, wired through `loadSettingsFromDatabase` and surfaced in the existing card-options UI. When `'true'`, front-side `<ul>`/`<ol>` is stripped (children promoted to inline text or dropped — designer to confirm during implementation).
- [ ] Every upload through the Notion HTML path emits one `[parser] notion-count-ratio` structured log line with `toggles_found`, `cards_created`, and the user's hashed surrogate (per `lib/misc/hashToken`) — never the raw user id, never the page title.
- [ ] The Downloads page row for a Notion HTML upload shows `N cards from M toggles` when the two numbers diverge; just `N cards` when they match. No new column, extends the existing failure-reason cell from PR #2441.
- [ ] All five referenced issues are linked in the PR body and closed by the merge.

**How we know it worked:**

- Query: `select date_trunc('day', created_at), avg(cards_created::float / nullif(toggles_found, 0)) from job_log where source = 'notion-html' group by 1 order by 1 desc limit 14;` — the 14-day rolling median should sit at 1.0 ± 0.05 after the first PR.
- The canary email (`scheduleParserCanary.ts`) stays silent — any regression fires `SUPPORT_EMAIL_ADDRESS` at 03:00 UTC the next morning.
- Issue traffic: zero new bug reports matching "missing cards" / "extra cards" / "code didn't become cloze" / "list on front" tags for 30 days after the last PR in the sequence merges.

**Open questions for the engineer:**

1. Is the silent miss in #1162 caused by Notion's late-2021 toggle nesting (a `<summary>` wrapped inside another `<summary>`), by the `disable-indented-bullets` default in `findNotionToggleLists.ts` line 135, or by something the cloze auto-numbering does inside `extractCards`? Construct three fixtures, find out before patching.
2. Does the LaTeX over-creation in #1411 happen because `mergeAdjacentCodeSiblingsInString` merges `</code><code>` but does *not* merge `</code> <code>` (whitespace between), so a `$f$` KaTeX span surrounded by whitespace gets treated as multiple clozes? Confirm with a fixture before patching.
3. For #1077, when `front-no-list` is on and the front is *only* a `<ul>`, what should render? Engineer should propose; designer to sign off on the empty-state copy.
4. Should the count line on Downloads be raw (`27 cards from 35 toggles`) or differential-only (`27 cards — 8 toggles skipped`)? Designer's call during implementation; pm preference is raw to avoid implying we know *which* 8 were skipped.
5. The hashed surrogate in the log line — confirm `hashToken` is the right helper here or whether `lib/misc/hashUserId` (if it exists) is more appropriate. Engineer check before merging.

---

## Design notes

**The user moment.** A user has finished a Notion study page, exports it, drops the zip on 2anki, sees "Your deck is ready," downloads it, opens Anki, and sees fewer cards than they wrote. They are not at the website anymore. They have no way to tell whether the loss happened in the export, the upload, the parser, or Anki itself.

**Recommendation.** Surface the count on the Downloads row, where the user is still in 2anki and can re-upload or open a support ticket without losing context. Reuse the failure-reason row from PR #2441 — same visual slot, different copy.

**Copy strings** (sentence case, no trailing period, per VOICE.md):

- **Match:** `27 cards` (no extra info — current behavior, do not change).
- **Divergence:** `27 cards from 35 toggles — open the deck to see which made it`.
- **All dropped:** `No cards from 35 toggles — your export may be in an unsupported format. See the supported list.` (link to docs).
- **Tooltip on the count, on hover:** `2anki found 35 toggles in your Notion export and made 27 cards. If the difference looks wrong, send the export to support@2anki.net.`

The tooltip is the only place we mention support — the row itself stays clean.

**For the `front-no-list` setting,** the label in the card-options sidebar:

- Label: `Hide bullet lists on the front of cards`
- Helper: `Useful when your toggles use a bulleted answer list you don't want to see while studying.`

No new icons, no new colors. Same toggle component as the other parser options. Off by default — the cohort that wants this is small but vocal, the cohort that depends on the current behavior is everyone else.

**Tradeoff.** The count line will sometimes confuse users whose Notion page intentionally has more toggles than cards (because some toggles are notes-not-flashcards). v1 ships the raw count and we learn from support volume.

**Verdict:** minor changes — extend existing Downloads row.

---

## Technical pre-flight

**Layers touched.** `src/lib/parser/` only on the server. `web/` on the Downloads page (the existing failure-reason cell). No `routes/`, `controllers/`, `usecases/`, `services/`, `data_layer/`, or `migrations/`.

**Files likely in play:**

- `src/lib/parser/findNotionToggleLists.ts` — silent-miss class.
- `src/lib/parser/DeckParser.ts` — `extractCards`, `extractToggleLists`, `extractCardsFromParagraph`; threads the count through to the result.
- `src/lib/parser/helpers/handleClozeDeletions.ts` — LaTeX over-creation, code-tag cloze gap.
- `src/lib/parser/Settings/CardOption.ts` — new `front-no-list` key.
- `src/lib/parser/__fixtures__/notion-html-2024/` — corpus expansion.
- `src/lib/parser/canary/scheduleParserCanary.ts` — no code change expected; verify the fixture glob picks up the new subdirectories.
- `web/src/pages/DownloadsPage/` — extend the existing failure-reason cell.
- Test siblings: `DeckParser.test.ts`, `findNotionToggleLists.test.ts`, `handleClozeDeletions.test.ts`.

**No cross-language coordination.** This is pure TypeScript parser work; the Python `create_deck/` step is downstream of the note count and unaffected.

**Estimated effort: M.** Four bug fixes in one well-tested module plus a small front-end count display. The cost is in fixture construction (need real 2024-format Notion exports — anonymise before committing) and in being disciplined about *one fixture, one assertion, one PR* rather than a single mega-PR.

**Security / privacy:**

- Fixture exports must be anonymised — no user emails, real names, or page titles that identify a specific person. Replace with `Lorem` / `User A` / `User B`.
- The new log line emits a hashed surrogate, never the raw user id. Verify with the security rules table in `.claude/rules/security.md` (CWE-532 row).
- No new HTTP calls, no new file writes outside the existing parser workspace, no new SQL.

**Migration:** none. `CardOption` is constructed from a key/value bag with a default, so the new `front-no-list` key works for existing users with no DB change.

**Testing.** Outside-in: each fixture goes through `DeckParser.build()` end-to-end (not just the helper). Mock only the filesystem-of-the-upload boundary; internal helpers run for real. Per `.claude/rules/testing.md`, do not assert "did not throw" — assert the concrete count and card-type shape from `expected.json`.

**Sequencing.** Four PRs, smallest-scope first per `parallel-pr-coordination.md`:

1. `fix: lock Notion HTML 2024 fixture corpus` — corpus + assertions only, no parser change. Confirms which fixtures currently fail and pins the baseline.
2. `fix: cloze deletions inside LaTeX code blocks` (#1411) — `handleClozeDeletions.ts`.
3. `fix: code tags become cloze deletions on Notion HTML upload` (#1094) — `handleClozeDeletions.ts` + `DeckParser.ts`.
4. `fix: silent missing toggles on 2024 Notion HTML exports` (#1162, #444 wrong-count slice) — `findNotionToggleLists.ts`.
5. `feat: hide bullet lists on the front of cards (opt-in)` (#1077) — `CardOption.ts` + parser pass.
6. `feat: show toggles-found / cards-created on Downloads` — small web PR, builds on the count threading from the earlier fixes.

Each PR includes a changelog entry per `CLAUDE.md`'s changelog rules (user voice, no implementation details).

**Risks.** A correctness fix is also a behavior change for the users whose existing decks rely on the *current* output. If a heavy user has built study habits around the over-counting in #1411, fixing it will produce fewer cards in their next deck — which is correct but surprising. The Downloads count line softens this by making the new number visible and explainable.

# Spec: Nested markdown tables in the heuristic upload path

### Trio synthesis
- PM: Users increasingly paste AI-generated content into Notion before exporting to 2anki, and a list-with-an-embedded-table is the canonical shape of an AI-summarised study note. Right now that exact shape converts to a card where the bold renders but the table leaks `| --- |` pipes as plain text, which makes the card look broken to a student opening Anki to study. User 10781 (2 years on 2anki) flagged it; the 30-day blocks-cache scan shows we have a large overlap of users on this workflow. The market is moving toward AI-paste-to-Notion as the default authoring path — fixing the renderer here is more durable than telling users to reformat their notes.
- Designer: The visual symptom — bold next to literal pipe characters in the same paragraph — looks like a half-finished export, not a feature limitation. There is no setting the user can flip to fix it today, and we should not ship a "render Markdown? [toggle]" prompt as a workaround for a renderer bug. The right answer is silent: the same upload that produced broken cards last week should produce clean cards next week, with no new UI. Reserve user-facing copy only for the case where rendering fails (then the existing Downloads-page failure-reason line is the place, not a new modal).
- Engineer: Showdown does not render GFM-style tables that sit inside a list item without blank-line separators. That is standard CommonMark behaviour and a known showdown limitation; markdown-it with the `markdown-it-multimd-table` (or remark + remark-gfm) does handle it. The clean fix is to swap the markdown converter in `src/lib/markdown.ts`. Risk: `markdownToHTML` is called from four places (`guessMarkdownCards.ts`, `handleNestedBulletPointsInMarkdown.ts`, `getFileContents.ts`, `experimental/FallbackParser.ts`); a library swap shifts behaviour for every upload path, not just the heuristic one. Mitigation: pin behaviour with fixture tests against real exports before the swap. Effort **M**.
- Agreement: Fix the renderer, don't add a user-facing toggle. Swap showdown for a CommonMark-compliant library that handles nested tables. Lock the existing happy-path output with snapshot fixtures *before* the swap so we can measure exactly what changes.
- Conflict: PM wanted a preprocessor (insert blank lines around tables) as a faster v1; Engineer pushed back — preprocessors that munge user markdown create silent surprises elsewhere (e.g. tables inside blockquotes, tables inside paragraphs that the user intended as a single block), and we'd still be on showdown for everything else. Resolved by going straight to the library swap; the preprocessor would be a worse fix carrying technical debt forward. Designer agreed: silent munging of input is the kind of "we did something the user didn't ask for" failure mode VOICE.md says to avoid.
- Resulting plan: One PR. Step 1 add fixture-snapshot tests against `markdownToHTML` covering the current happy paths (Q&A labels, heading body, separator pattern, nested bullets, file-load passthrough). Step 2 swap showdown for markdown-it inside `src/lib/markdown.ts`, configured for GFM tables, simple line breaks, and no header IDs (matching today's behaviour). Step 3 add the regression fixture: the Galactosaemia bullet-with-table block must render to `<ul><li>...</li></ul>` with an embedded `<table>`, and the bold inside the `<li>` must survive. Step 4 manually re-run the existing parser canary fixtures and confirm card counts match. No new user-facing surface.

**Outcome**: Notion markdown exports that contain tables nested in bullet points render with HTML tables instead of pipe-character text. Measured by (a) the new fixture test failing on showdown and passing on the new library, and (b) re-running the daily Notion parser canary (#2382) against the existing fixture corpus — card counts and structural output must remain stable for non-table content.

**Goal alignment**: "Simplest, fastest way to turn what you're studying into beautiful Anki flashcards." Tables are how learners structure comparison content (drug class vs. mechanism, symptom vs. differential). When a table renders as raw pipes, the card stops being beautiful and stops being usable — and the user has no way to know it's our bug. This is the AI-paste workflow that is fast becoming the default. Fixing the renderer here compounds across every future user on that workflow.

**Problem**: When a user uploads a Notion markdown export and the standard parsers produce zero cards, `DeckParser.applyHeuristic` (introduced 2026-05-05 in commit `d3d0a86c0841`) routes through `guessMarkdownCards.ts`, which calls `markdownToHTML(front)` and `markdownToHTML(back)` on each detected note. `markdownToHTML` in `src/lib/markdown.ts` uses `showdown` with the `github` flavor. Showdown does not parse tables that sit inside a list item without blank-line separators — standard CommonMark behaviour. Real example from the support inbox (user 10781):

```markdown
- **Galactosaemia** and other inborn errors of metabolism
| Category | Cause | Mechanism / Explanation |
| --- | --- | --- |
| Increased Production of Bilirubin | Haemolytic disease | Excessive breakdown |
```

Showdown emits:

```html
<li><strong>Galactosaemia</strong> and other inborn errors of metabolism<br />
| Category | Cause | Mechanism / Explanation |<br />
| --- | --- | --- |<br />
| Increased Production of Bilirubin | Haemolytic disease | Excessive breakdown |</li>
```

The `<strong>` renders. The table doesn't — `|` and `---` reach the Anki card as plain text. Reproduced locally with showdown 2.1.0 against the canonical snippet above.

**Riskiest assumption**: That swapping showdown for markdown-it (with the table plugin) does not silently change output for content already converting correctly. `markdownToHTML` is called from four spots, not just the heuristic path:

- `src/lib/parser/guessMarkdownCards.ts` — every heuristic pattern (six call sites)
- `src/lib/parser/handleNestedBulletPointsInMarkdown.ts` — nested bullet back/front rendering
- `src/lib/parser/getFileContents.ts` — generic markdown file load
- `src/lib/parser/experimental/FallbackParser.ts` — experimental fallback

A library swap that fixes the table case but quietly reformats output elsewhere is a worse PR than the current bug. Locked down by step 1 of the plan (fixture snapshots taken from the current showdown output) — anything that changes for non-table content is a deliberate decision, not an accident.

**Smallest test**: Fixture test in `src/lib/markdown.test.ts` (new) that feeds the Galactosaemia snippet to `markdownToHTML` and asserts the output contains `<table>` and `<th>` elements. Currently fails (showdown emits `<li>...| --- |</li>`); passes after the library swap.

**Scope**:

*In:*
- `src/lib/markdown.ts` — swap `showdown` for `markdown-it` (or chosen equivalent), configured for GFM tables, simple line breaks, no header IDs, `simpleLineBreaks: true` parity.
- `src/lib/markdown.test.ts` — **NEW**. Fixture tests for the current happy paths (taken from showdown output before the swap) + the Galactosaemia table-in-list regression case.
- `package.json` / `pnpm-lock.yaml` — add `markdown-it` (+ table plugin) + `@types/markdown-it`; remove `showdown` + `@types/showdown` once nothing references them.
- `src/lib/parser/guessMarkdownCards.test.ts` — extend with a "bullet contains a table" case at the integration level.
- `src/lib/parser/__fixtures__/notion-markdown-2026/` — **NEW** directory mirroring the Notion HTML fixture corpus (#2379), seeded with one real export containing the bullet-with-table shape. Used by the heuristic test and by the parser canary.
- `src/services/NotionService/FEATURE.md` — note for the next editor: `markdownToHTML` now uses markdown-it with GFM tables; do not reach back to showdown without re-running the fixture suite.

*Out:*
- Bug A (xmlMode cheerio double-escape of `&nbsp;`). Shipped in a sibling PR. Out of scope here.
- Refactor of `guessMarkdownCards.ts` heuristic patterns themselves. The detection logic is correct; the bug is purely in `markdownToHTML`.
- Notion API path. That path renders blocks directly via `blockToStaticMarkup` and never touches `markdownToHTML`.
- A user-facing "render Markdown? [toggle]" prompt. Designer and Engineer agreed: silent fix, no new UI.
- A preprocessor that inserts blank lines around tables. Considered and rejected — see Conflict above.

**User story**: As a student who pastes AI-summarised tables into Notion and exports to markdown, when I upload that file to 2anki, the resulting cards show real HTML tables instead of pipe characters and `---` separator rows.

**Acceptance criteria**:
- [ ] Galactosaemia fixture: `markdownToHTML` output contains exactly one `<table>` element with a `<thead>`, three `<th>` cells, and the data row as `<td>` cells.
- [ ] Bold survives: `<strong>Galactosaemia</strong>` is still present in the rendered `<li>` (or wherever markdown-it places it — equivalent semantic mark-up).
- [ ] Pre-swap snapshot tests (taken from current showdown output for Q&A labels, heading body, separator pattern, nested bullets, generic file load) continue to pass *or* differences are explicitly reviewed and re-snapshotted with a one-line justification per case.
- [ ] Parser canary (#2382) re-runs against existing Notion HTML fixtures with stable card counts.
- [ ] No new user-facing UI surface. The fix is invisible to the user except that broken cards stop being broken.

**Open questions**:
- markdown-it vs. marked vs. remark — which library wins on (a) GFM nested table support, (b) bundle size for the web workspace if `markdownToHTML` is ever imported there, (c) test coverage upstream. Engineer to call after a 30-minute spike.
- Do we ship the table plugin (e.g. `markdown-it-multimd-table`) or rely on markdown-it's built-in GFM table support? Built-in handles the canonical case; the plugin adds row/column spans, colspans, etc. Default: built-in unless fixtures demand otherwise.
- Should we keep showdown around as a fallback feature flag for one release in case the swap regresses something we missed? Recommend no — fixture coverage is the safety net, a flagged dual-library is more risk than the fix it guards.

**Out of scope (next iteration)**:
- Re-evaluating the heuristic detection patterns themselves. Some users with content shaped slightly differently from the five current patterns get zero heuristic notes today. Worth a separate scan.
- Surfacing "your markdown had N tables — N rendered" on the Downloads page. Useful telemetry, separable feature.

## Design notes

**User moment**: The student opens Anki, taps through their new cards from this morning's upload, hits the Galactosaemia card. Today: a wall of `|` and `---` text where the table should be. After this ship: a clean two-column comparison table with bordered cells, the bold "Galactosaemia" still bold above it. They don't know we changed anything — they just don't notice the card the way they noticed it was broken last week.

**Surface changes**: None. No new UI, no new copy, no new toggle, no error state. The visible change is "tables that used to be pipes are now tables" — described in the changelog entry only.

**Changelog entry** (lands in the same PR per CLAUDE.md): `Markdown tables inside bullet points now render as tables on your cards` — sentence case, no trailing period, names the surface (markdown tables) and the shape (inside bullet points), no engineering vocabulary.

**Verdict**: Pure removal of a renderer failure. No design review needed beyond the changelog entry.

## Technical pre-flight

**Layers touched**:
- `src/lib/` — one file (`markdown.ts`) + one new test (`markdown.test.ts`).
- `src/lib/parser/__fixtures__/` — new fixture dir mirroring the existing `notion-html-2024/` pattern.
- `src/lib/parser/` — one test file extended (`guessMarkdownCards.test.ts`).
- `package.json` / `pnpm-lock.yaml` — dependency swap.

**Files in play**:
- `src/lib/markdown.ts` — replace `showdown.Converter` with the chosen library; preserve the `simpleLineBreaks: true` / `noHeaderId: true` parity behaviour.
- `src/lib/markdown.test.ts` — **NEW**. Snapshot tests for current behaviour + Galactosaemia regression case.
- `src/lib/parser/__fixtures__/notion-markdown-2026/galactosaemia.md` — **NEW**. The canonical bullet-with-table snippet.
- `src/lib/parser/guessMarkdownCards.test.ts` — extend to load the new fixture and assert table HTML reaches the resulting note.
- `package.json` — add markdown-it + type defs; remove showdown + type defs.
- `src/services/NotionService/FEATURE.md` — paragraph noting the converter swap and the fixture corpus.

**Cross-language coordination**: None. The Python deck builder consumes whatever HTML lands in `deck_info.json`; library swap on the JS side is transparent to it.

**Estimated effort**: **M**. Library swap is mechanical; the work is in the fixture coverage that locks the rest of the parser behaviour. Single PR, single workspace (`src/`).

**Security/testing/migration**:
- *Security*: New dependency adds attack surface. Default to markdown-it (widely audited, used by VuePress, Hexo, Discord, GitLab); avoid lesser-known forks. Run `pnpm audit` post-add. No new untrusted-content paths — the markdown input was already untrusted user content.
- *Testing*: Snapshot tests + the regression fixture + the daily Notion parser canary. Manual smoke: re-upload a known-good markdown export from before the change and diff card counts.
- *Migration*: None. The change applies to future uploads only; existing decks in users' libraries are unaffected (they were already converted).

**Coordination flags for parallel bets**: Bug A (the xmlMode cheerio fix) touches `src/lib/parser/DeckParser.ts`. This spec touches `src/lib/markdown.ts` and `guessMarkdownCards.ts`. No overlap. If Bug A lands first, rebase; if this lands first, Bug A rebases. Coordinate via the merge queue.

**Rollout**: Ships behind no flag. Fixture coverage is the safety net. If the swap regresses something we missed, revert is one-commit — no schema, no data migration, no side effects beyond `markdownToHTML` output.

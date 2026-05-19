## Spec: Image and media fidelity end-to-end

### Trio synthesis

- PM: Broken images and mis-placed images are the #1 "this tool is broken" screenshot users share — fix the user-visible defect first; the Notion image cache is a scale lever stacked on the same code path, so ship them together.
- Designer: No new UI surface. The whole feature is "the card looks the way the user laid it out in Notion / their HTML export." Reserve copy work for one place — the existing failure-reason on the Downloads page, so a deck that converts with N broken images shows "N images couldn't be loaded — Notion link expired" instead of silently shipping placeholder icons.
- Engineer: Three bug clusters in two layers — HTML upload path (`src/lib/parser/DeckParser.ts` image lookup + `embedFile`), Notion API path (`src/services/NotionService/BlockHandler/BlockHandler.ts` toggle child ordering + `embedImage` URL refresh), and a code-block renderer (`src/services/NotionService/blocks/BlockCode.tsx`, `helpers/blockToStaticMarkup.ts`). Image cache slots in cleanly at `helpers/downloadMediaOrSkip.ts` — content-addressed on the Notion S3 path (URL stripped of signed-query), TTL 24 h, on-disk LRU bounded by size. Effort M.
- Agreement: One PR, one wave. The HTML path bug (#928) and the Notion path bug (#417) share root cause (image filename collision / wrong-card binding), and `downloadMediaOrSkip` is the natural cache seam. The code-block fix (#1451) is ~30 lines of CSS + `white-space: pre` on the rendered `<pre>`, cheap to bundle.
- Conflict: Engineer wanted to defer the cache (#566) to a follow-up; PM held the line — the same wave touches the same file, splitting it doubles QA cost. Resolution: cache stays in scope, but it's the last commit and is feature-flagged off (`MEDIA_CACHE_ENABLED`) so it can be reverted independently without losing the bug fixes.
- Resulting plan: One PR that (a) fixes HTML-upload image resolution, (b) fixes Notion toggle-image binding so the right image lands on the right card, (c) renders code blocks with preserved whitespace and a monospace stack, (d) adds a content-addressed cache in `downloadMediaOrSkip` behind a flag, and (e) surfaces "N images couldn't be loaded" on the Downloads page failure-reason line.

---

**Outcome**: Conversion-success rate (decks that report zero broken-image warnings / decks downloaded) climbs from the current baseline (sample 50 recent support replies — Alexander estimates ~25% mention an image issue) so that under 5% of decks ship with broken-image warnings within 30 days of merge. Notion API egress from the converter on warm pages drops by at least 60% on repeat conversions of the same page (measured via `instrumentedAxios` sink for the `notion` channel, image URLs only).

**Goal alignment**: Output quality is the precondition for word-of-mouth growth past 300K users. A learner who screenshots a card with a broken image does not refer the product. A deck with the right image on the right card is the unit of value we promise on the landing page.

**Problem**: Three recurring failure modes, plus one scale headwind, all converge in the media handling code:
1. HTML upload (#928, 11 comments, May 2026): user converts a Notion HTML export, opens the deck in Anki, sees the generic broken-image placeholder PNG on every card. The image files exist in the uploaded zip but `DeckParser.embedImagesInCardContent` can't resolve the path — usually because the zip uses backslashes (Windows export), nested-directory suffix matching fails, or `decodeURIComponent` strips a character `embedFile` expects.
2. Notion path (#901, #417, 20 combined comments): user puts a toggle with an image inside, and Anki shows that image on a *different* card. Root cause is in `BlockHandler.getBackSide` / `embedImage`: when two toggles on the same page reference images, the generated unique filename (`getUniqueFileName(url)`) can collide because the Notion signed-S3 URL is the same when the underlying file is the same — `S3FileName(url)` strips query params and the suffix is identical, so the second image overwrites the first in `addMedia`, and the first card's `<img src>` now points at the second card's bytes.
3. Code blocks (#1451): triple-backtick code in Notion renders as a single-line blob in Anki. `BlockCode.tsx` emits `<pre><code>…</code></pre>` correctly but the rich-text mapper concatenates without preserving newlines, and the rendered HTML hits Anki's default card styling which collapses whitespace.
4. Notion image rate-limit pressure (#566): every conversion re-downloads every image from Notion's CDN — for a recurring user converting the same page twice in a day, that's 100% wasted egress and a real risk under Notion's free-tier rate limit when Auto Sync usage grows.

Specific instance: support thread for Sid-2002 (#928) — uploaded a multi-megabyte HTML export, every card showed the broken-image icon, user gave up. Marcelo (#417) said "I am still using it, although I have to insert images manually to notes" — the user is doing our job by hand because we can't.

**Riskiest assumption**: That the image-collision theory (item 2 above) is the *primary* driver of #901 / #417 — and not Anki's media-sync behavior, which Alexander has previously pointed to in the issue comments. If the bug is actually media-sync on the user's end, our fix lands and the screenshots keep coming.

**Smallest test**: Before writing fix code, reproduce locally: take a Notion page with two toggles, each containing a different Notion-hosted image, run it through the current converter, open the resulting `.apkg` in `unzip`, and `sha256sum` every embedded image. If two cards reference the same media filename for visually-different source images, the theory is confirmed. If filenames differ but the bytes are identical, the issue is upstream of `addMedia` (in `embedImage` URL fetch). Either way, the failing test gates the fix. Repeat for the HTML-upload path with a Windows-exported zip (backslash paths). Half a day of work; the result determines whether we ship the planned fix or pivot.

**Scope (in)**:
- HTML upload path: fix path resolution in `embedFile` for backslash entries, nested-directory suffix matches, and double-encoded URI fragments; add a structured warning when a referenced image can't be found.
- Notion API path: fix image filename collision in `BlockHandler.embedImage` so per-card images get a card-scoped suffix (block ID prefix), preventing one image overwriting another in `CustomExporter.addMedia`.
- Notion API path: verify toggle children render in document order in `getBackSide`; if reordering is happening (#901), fix it.
- Code blocks: preserve newlines and whitespace in `BlockCode.tsx` (render plain-text inside `<code>` with a real `\n` join, not the auto-flatten), add `white-space: pre` to the deck CSS for `pre.code`. Same fix for the HTML-upload path's code-block rendering if a regression is found.
- Image cache: content-addressed cache keyed on `S3FileName(url)` (i.e. URL with signed query stripped) in `downloadMediaOrSkip`. On-disk under `WORKSPACE_DIR/.media-cache/`, size-bounded LRU (200 MB default, env-tunable), 24 h TTL. Behind `MEDIA_CACHE_ENABLED` env flag (default on in prod after one week of soak, off in tests).
- Surface broken-image counts on the Downloads page failure-reason field — reuse the existing actionable-failure-reason work from PR #2441.

**Scope (out)**:
- Cloze deletion edge cases (bet 1).
- BlockTable rendering (bet 3).
- Notion video / audio fidelity — out of scope; only image + code block + the cache layer.
- Anki media-sync user education (separate doc work, not code).
- Background pre-warming of the cache (cache is filled on first request only).
- Notion webhook-driven image refresh (deferred per `Documentation/ankify/notion-webhooks-deferred.md`).

**User story**:
1. As a learner who exports a Notion page (HTML or via the OAuth flow) with images and code blocks, I want every card in the resulting Anki deck to show the same image and the same formatted code my source page showed, so I don't have to fix the deck by hand.
2. As a power user converting the same Notion page multiple times in a day (e.g. revising notes), I want repeat conversions to be noticeably faster, so I'm not penalised for iterating.

**Acceptance criteria**:
- [ ] Failing tests added first (TDD): one Jest test per bug cluster — `DeckParser.test.ts` regression for HTML-upload image resolution (Windows-zip fixture), `BlockHandler.test.ts` regression for two-toggles-two-images-no-collision, `BlockCode.test.ts` regression for newlines preserved.
- [ ] Existing `__fixtures__/notion-html-2024/` corpus still produces bit-for-bit identical output (the canary holds the line).
- [ ] When an image referenced in HTML can't be resolved, the conversion finishes; the deck downloads; the Downloads page row shows "N images couldn't be loaded" using the actionable-failure-reason surface from PR #2441 (specific noun, not "an error occurred").
- [ ] In a deck with two toggles each carrying a different Notion-hosted image, the resulting apkg has two distinct media entries and the front-card `<img src>` matches the back-card `<img src>` of the *correct* card. Asserted by `sha256sum`-ing the embedded media and comparing against the original Notion download.
- [ ] Code blocks in the rendered card preserve newlines and tabs (assert via snapshot of the rendered HTML containing `\n` between source lines), and render in a monospace font via deck CSS.
- [ ] `MEDIA_CACHE_ENABLED=true` makes a second conversion of the same Notion page (same images, same session) hit the cache for at least 90% of images (verified via `instrumentedAxios` sink counter).
- [ ] Cache eviction works: filling past `MEDIA_CACHE_MAX_BYTES` evicts the oldest entries; a unit test covers this with a 1 MB cap.
- [ ] Cache path resolution is safe — entries are written under `WORKSPACE_DIR/.media-cache/<sha256(stripped-url)>` with explicit `path.resolve` + base-dir prefix assertion (per `.claude/rules/security.md` CWE-22 row).
- [ ] No new HTTP client introduced; all media downloads continue to go through `instrumentedAxios` (per `.claude/rules/dependencies.md`).
- [ ] Changelog entry in `web/src/pages/WhatsNewPage/changelog.ts` in the same PR — voice-compliant, e.g. "Notion images stay on the card you put them on" plus "Code blocks keep their line breaks."

**Open questions**:
1. Cache eviction policy: pure LRU on size, or LRU with a per-image-hash refcount so we never evict an image still referenced by an in-flight conversion? Engineer recommendation: start with size-LRU + a 5-minute eviction grace window after last read, which covers the in-flight case empirically without adding refcount complexity.
2. Should the cache survive across server restarts (on-disk) or be per-process (in-memory)? Default to on-disk under `WORKSPACE_DIR`. The prod box has the storage and a restart is a clean-cache-on-restart penalty we don't want to pay every deploy.
3. When an HTML-upload image can't be resolved, do we (a) skip the `<img>` tag entirely, (b) leave the original `src` in place and let Anki show its broken-image icon (current behavior), or (c) substitute a tiny inline transparent PNG so the card layout doesn't collapse? Designer recommendation: (a) — remove the `<img>` and let the rest of the card render, so the user sees what we *could* convert. Surface the count on the Downloads page row.
4. Code block syntax highlighting (bonus point in #1451): out of scope for v1. Track as follow-up issue.
5. Does the Notion API path need the same "N images couldn't be loaded" reporting, or only the HTML upload path? PM recommendation: both — the surface is the same `JobService` row, so it's free.

**Out of scope (next iteration)**:
- Syntax highlighting in code blocks (Prism / highlight.js).
- WebP / AVIF re-encoding for cache size reduction.
- Per-user cache namespacing (current design is shared across all users — fine because Notion signed-URL paths embed the user/workspace ID, so cache hits naturally segment).
- Pre-fetching images while the parser is still walking blocks (concurrency win, but raises Notion rate-limit risk).
- Cache hit-rate dashboard in observability (engineer log line is enough for v1).

---

### Design notes

Verdict from designer: **no new UI surface**, one copy string change:

- Downloads page row, failure-reason field (reuse PR #2441 surface): when a deck converts with any unresolved images, append `— N images couldn't be loaded` to the existing failure-reason text. Sentence case, no trailing period (per `VOICE.md`). Singular: `1 image`. Plural: `12 images`. No "approximately", no "around". The number is the count of `<img>` tags we skipped — exact.
- Do not surface "N images were cached from a previous run" — that's engineering performance theatre, not a user moment.
- Do not add a tooltip explaining what an image cache is. Users don't care about our cache.

If the deck has zero unresolved images, the row reads exactly as it does today. No "all images loaded successfully" confirmation — that's fake warmth.

### Technical pre-flight

**Layers touched**:
- `services/NotionService/BlockHandler/BlockHandler.ts` — fix `embedImage` filename collision (suffix with `block.id.slice(0, 8)`), audit `getBackSide` for order preservation.
- `services/NotionService/blocks/BlockCode.tsx` — preserve newlines in `richText` mapping; render with explicit `\n`-joined children rather than the auto-flatten.
- `services/NotionService/helpers/downloadMediaOrSkip.ts` — wrap in cache layer (new sibling `mediaCache.ts` pure helper for the lookup + write; the file orchestrates).
- `services/NotionService/helpers/getImageUrl.ts` — no change expected; verify.
- `lib/parser/DeckParser.ts` — fix `embedFile` path resolution for backslash + nested-suffix edge cases; thread a `brokenImageCount` onto the `Deck` for surfacing.
- `lib/parser/exporters/embedFile.ts` — same.
- `services/observability/instrumentedAxios.ts` — no change; the cache sits *above* it (cache hit returns early; cache miss goes through the existing instrumented call).
- `usecases/uploads/*` / `controllers/Upload/*` — thread `brokenImageCount` onto the existing failure-reason payload (already a structured field after PR #2441).
- `web/src/pages/WhatsNewPage/changelog.ts` — changelog entry.
- `web/src/pages/Downloads/*` — display the appended `— N images couldn't be loaded` segment.

Layers *not* touched: `routes/`, `data_layer/`, migrations. No new DB column needed — `brokenImageCount` lives on the existing job-failure-reason structure (in-process during conversion, then serialised into the existing field that PR #2441 already wired through to the Downloads page).

**Cross-language coordination**: None. The Python builder (`exporters/CustomExporter`) sees only the final HTML and media list; the fixes are upstream of it.

**Effort**: M. Estimated 3 working days end-to-end: half a day on the reproduction test (the smallest-test step above), one day on the three bug fixes plus tests, one day on the cache + soak flag + docs, half a day for review fixes and Sonar bounces.

**Security, testing, migration concerns**:
- Cache path traversal: writing user-derived bytes to disk requires explicit `path.resolve(baseDir, sha256(strippedUrl))` and `resolved.startsWith(baseDir + path.sep)` assertion (`.claude/rules/security.md`, CWE-22 row). Use `crypto.createHash('sha256')` — never `Math.random()` (Sonar `typescript:S2245`).
- Cache poisoning: only insert into the cache after a successful 200 response from `instrumentedAxios`; never cache 403/404 (already handled in `downloadMediaOrSkip` — those return null and skip).
- Test rules: outside-in. Mock only the network (`instrumentedAxios.get`) and the filesystem at the cache layer. Real `BlockHandler`, real `DeckParser`. No `.only` / `.skip` left behind.
- Migration: none.
- Sonar: run `sonar-scanner` locally before flipping the PR ready — cognitive-complexity additions to `embedFile` and the new `mediaCache.ts` are the likely bouncers (`.claude/rules/sonar.md`).
- Worktree: this is bug-fix work touching the conversion hot path. Use `EnterWorktree` per `.claude/agents/engineer.md` worktree policy.
- `/security-review` not required (no auth / payments / external-API integration changes beyond passing the same URL through a cache); flag at PR review if reviewer disagrees.
- Files **not** to touch this wave (parallel coordination per `.claude/rules/parallel-pr-coordination.md`):
  - Cloze / toggle parsing surface (bet 1 owns it).
  - `BlockTable.tsx` and table-related helpers (bet 3 owns it).
  - `web/src/App.tsx`, `sitemap.xml`, `prerenderLandingPages.ts` (cross-PR conflict targets).
  - The changelog entry will conflict with the four other bets — coordinate merge order and rebase on `origin/main` immediately before `gh pr ready`.

**Telemetry**:
- Log a single structured line per conversion with `brokenImageCount`, `mediaCacheHits`, `mediaCacheMisses`, `mediaCacheBytesServedFromDisk`. No PII (no URLs, no user IDs in cleartext — hash the user ID via `hashToken` if it appears).
- Add a counter to the existing `observabilitySink` for `notion.image.cache.{hit,miss,write,evict}`.

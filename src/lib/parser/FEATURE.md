# parser — Notion → Anki conversion

The hot path. Every Notion page, HTML export, markdown file, or zip the user uploads ends up running through this directory. Performance and correctness here directly move the 300K-user goal.

## Entry points

- `DeckParser.ts` — orchestrates a full conversion: file → blocks → notes → packaged `Deck`. `DeckParserInput` accepts an optional `pdfCredential?: string` that is threaded through to the PDF extraction layer; never log or store it. Exposes `writeDeckInfo(ws)` alongside `build(ws)`: the former runs the full card-processing phase and writes `deck_info.json` but stops before spawning Python, returning the path — used by the batch build path in `getPackagesFromZip`.
- `Deck.ts` / `Note.ts` / `Package.ts` — domain types for what a card looks like. `Note` carries `customFields?`, `customFieldNames?`, and `customModelName?` for the N-field path used by the apkg-input transform pipeline — when present, the Python card-generator builds a genanki Model with the named fields instead of the default 2-field Basic/Cloze shape, preserving the source deck's note-type structure.
- `findNotionToggleLists.ts` — toggle-list detection on the Notion HTML export. The original primitive the project was built on.
- `guessMarkdownCards.ts` — fallback for raw markdown without toggle structure.
- `exporters/CustomExporter.ts` + `embedFile.ts` — write the `.apkg` (sqlite + media) for download. `configure()` wraps `JSON.stringify` to convert `RangeError` (V8 "Invalid string length") into `DeckTooLargeError` so the caller gets a typed error instead of a raw engine exception. When `settings.ttsAutoDetect` is true it samples the first 25 card fronts via `lib/anki/detectCardLanguage`, sets `settings.frontLang` (`'ja' | 'zh' | 'ko' | 'en'`), and emits one `tts_lang_injected` analytics event — `create_deck/helpers/get_model.py` reads `frontLang` from settings and prepends `{{tts <lang>:Front}}` (or `:Text` for cloze) to the front template of basic/cloze/input cards; MCQ keeps its dedicated `mcqTts*` keys. `deckInfoPath()` returns the absolute path to the written `deck_info.json` — used by the batch build path.
- `WorkSpace.ts` — `Workspace.subdir(parentLocation)` creates an isolated subdirectory workspace within an existing workspace location. Used by the batch build path to give each deck in a batch its own `deck_info.json` without collision.
- `exporters/DeckTooLargeError.ts` — typed error thrown when the deck payload is too large to serialize. Caught by `UploadService` and mapped to a clean 400 response.
- `extractPdfText.ts` — extracts per-page text from a PDF buffer using `pdf-parse`. Accepts an optional `credential` parameter passed as `{ userPassword }` to `pdf-parse`. Returns `isDrmLocked: true` when average chars/page is below 10 (DRM or image-only PDF); returns `needsCredential: true` when `pdf-parse` throws a `PasswordException` (encrypted PDF with no or wrong credential). Logged via `[extractPdfText] result` for production monitoring.
- `synthesizeCardsFromPdf.ts` — converts `PdfPage[]` into `PdfCard[]` using the slide-pair model: page N is the card front, page N+1 is the back. Blank pages in either slot are skipped. Pure function, no I/O.
- `xlsx/` — spreadsheet → cards path.
- `parsers/parseOpml.ts` — pure function, input OPML string → `MindmapData`. Uses cheerio in xmlMode to walk `<outline>` elements. Each parent→child outline pair becomes one edge. Falls back to `_note` attribute when `text` is absent. Throws on malformed XML or missing `<body>`.
- `parsers/parseBrainstormsJson.ts` — pure function, input Brainstorms JSON string → `MindmapData`. Validates `nodes[]` and `edges[]` arrays; throws if either is absent or if the text is not valid JSON. Accepts the shape `{ nodes: [{id, label}], edges: [{source, target}] }`.
- `canary/scheduleParserCanary.ts` — daily job (03:00 UTC) that runs the fixture corpus through the live parser and emails `SUPPORT_EMAIL_ADDRESS` on any count divergence. Wired in `server.ts`.
- `sourceUnits/` — deterministic pre-pass that normalises raw PPTX and free-form notes into a structured intermediate before any AI step. Exports `SourceUnit` (id, visibleText, speakerNotes, role), `extractPptxSourceUnits(buffer)` (async, uses `fflate` to unzip and regex to parse slide/notes XML), and `extractNotesSourceUnits(content, format)` (pure, splits markdown or HTML by heading sections). No HTTP, no SDK, no DB. The AI generation step reads this intermediate and cites `SourceUnit.id` per card to make coverage auditable.

## Flow

1. Upload lands in `controllers/Upload/` and dispatches to `usecases/uploads/`.
2. `DeckParser` reads the file, picks a strategy (toggle list / nested bullets / markdown / xlsx), normalises styles via `extractStyles`, and emits `Note[]`.
3. `CustomExporter` writes the apkg using `better-sqlite3` and the media bundle.
4. The download URL goes back to the user via `JobService` / `DownloadService`.

## Constraints

- **Memory:** users upload 1 GB+ Notion exports. Stream where possible; never `readFileSync` an upload. The express body limit is `1000mb` for a reason.
- **CPU:** parsing happens inline on the request worker. Anything > 50 ms per card needs a justification; anything > 5 s of total work belongs in a background job.
- **Determinism:** the same input must produce the same `.apkg`, including the note GUID. Tests rely on this.
- **No comments inside cards.** The conversion preserves user content as-is — don't inject "generated by" footers.

## MCQ detection

**Opt-in.** The MCQ pipeline is disabled by default. Detection only fires when the user has enabled it under Card options (`mcq-enabled` key on `CardOption`, default `false`). When off, both the Notion-HTML and markdown paths skip MCQ classification entirely — output is bit-for-bit identical to pre-MCQ behaviour.

Two entry points when enabled: `DeckParser.extractCards()` classifies a Notion toggle as MCQ when its children are either `to_do` blocks (one with `checked: true`) or bulleted list items (one fully bolded with `<strong>`). For markdown uploads, `handleNestedBulletPointsInMarkdown.ts::buildNoteFromBack` runs `detectMarkdownMCQ` against the markdown-it-rendered HTML of the back side, matching `<ul><li><input type="checkbox" checked=""></li>...</ul>` (GFM task list via `markdown-it-task-lists`). When a markdown note is classified as MCQ, `note.back` is cleared — the options live in `note.options` and the Python builder writes them into the dedicated `Multiple Choice` field; leaving the back populated would cause the options to render twice (once in the choices list, once under "Explanation").

**`isMCQ` predicate** (Notion HTML) lives in `findNotionToggleLists.ts` and is called from `DeckParser.extractCards()`. It inspects `<span class="checkbox-on">` for the to-do path and `<strong>` annotations for the bold-fallback path. It returns the index of the marked option, or `-1` if none or more than one is marked.

**`detectMarkdownMCQ` predicate** (markdown) lives in `findNotionToggleLists.ts`. It walks the back-side DOM, requires every `<ul>` it sees to consist entirely of `<li>` elements whose first child is an `<input type="checkbox">`, and returns `{ isMcqShape, correctIndex, options }`. The exact-one-checked rule mirrors the Notion path.

**`detectNotionApiMCQ` predicate** (Notion sync at `/notion`) lives in `findNotionToggleLists.ts`. The Notion SDK renderer emits `<ul class="to-do-list"><li><div class="checkbox checkbox-on|checkbox-off">…</li></ul>` for to-do children; this detector looks for that shape and returns the same result type as the others. Called from `services/NotionService/BlockHandler` when `mcqEnabled` is true.

**`Note` fields for MCQ cards:**
- `mcq: boolean` — true when the note was classified as MCQ
- `options: string[]` — the text of each option in order
- `correctIndices: number[]` — index of the marked option (v1 always has exactly one)
- `isValidMCQNote()` — returns true when `mcq`, at least 2 options, and exactly one `correctIndices` entry

**Failure modes (fall back to Basic/Cloze, counted in `mcqSkippedCount`):**
- Zero markers found in an otherwise MCQ-shaped toggle
- Two or more markers (ambiguous)
- Only one option

**Count threading:** `DeckParser.extractCards()` returns `{ cards, mcqCount, mcqSkippedCount }`. These are stored on the `Deck` object and summed in `PrepareDeck`, then sent as `X-MCQ-Count` / `X-MCQ-Skipped-Count` response headers.

**Authoring guide:** `web/src/pages/DocsPage/content/cards/mcq.md` — user-facing guide rendered at `/documentation/cards/mcq`. Update both the body and the brief MCQ section in `card-types.md` when the detection contract changes.

## Block-decision classifier (`intent/`)

`intent/classifyBlock.ts` exports a pure function `classifyBlock(input, rules)` that mirrors the block-filtering predicate inside `BlockHandler.findFlashcardsFromPage`. It returns one of three decisions:

- `'card'` — the block type is in `flashcardTypes`, or it is a toggleable heading and `'toggle'` is in `flashcardTypes`.
- `'recurse'` — `type === 'child_page'` (BlockHandler will recurse into it).
- `'skip'` — everything else.

This is the single source of truth for "what will the parser do with this block?" Both `BlockHandler` and the preview endpoint use it — keeping them in sync by construction. `ClassifyInput` carries `type` and `hasToggleableHeading`; `ClassifyRules` carries `flashcardTypes` from `ParserRules.flaschardTypeNames()`. Pure function — no I/O, no SDK imports.

## Things to know before editing

- `DeckParser.test.ts` is the integration safety net. Anything that changes the output shape needs a green run there.
- `__fixtures__/notion-html-2024/` is the permanent regression corpus for the late-2024 Notion HTML export format. Add new Notion export patterns here rather than as ad-hoc inline strings in tests.
- `helpers/handleClozeDeletions.ts` merges adjacent `<code>` siblings before numbering clozes. This handles the case where Notion emits one `<code>` per formatting run (bold, italic, color) within a single cloze span.
- `experimental/` is exactly that — gated behind feature flags. Don't fold it into the main path until the flag is removed.
- `Settings/` reads per-user parser overrides from `ParserRulesService`. New options need both a setting and a sensible default.
- `getFileContents.ts` is the only conversion-path file in this dir that touches the filesystem at request time. `canary/scheduleParserCanary.ts` reads fixture files at job time — that is intentional and isolated to the canary subdirectory.
- **Cheerio in the heuristic markdown path uses fragment mode, not xmlMode.** `embedImagesInHtml` (called from `applyHeuristic`) walks the markdown-it-rendered HTML to rewrite `<img>` srcs. `cheerio.load(html, null, false)` preserves named HTML entities like `&nbsp;` correctly. `xmlMode: true` *double-escapes* them to `&amp;nbsp;` (because `&nbsp;` is not a valid XML entity) — that bug shipped on 2026-05-05 and rendered as visible `&nbsp;` text in user cards before being reverted.
- **Notion S3 presigned URL fallback.** Both `embedImagesInCardContent` (toggle/HTML path) and `embedImagesInHtml` (markdown heuristic path) now handle `<img src="https://prod-files-secure.s3…">` URLs that would otherwise be skipped by `isImageFileEmbedable`. When a ZIP entry whose basename matches the URL filename is present, the image is read from the local ZIP entry instead of the expired S3 URL. The helper `exporters/resolveNotionS3ImageFromZip.ts` is the lookup function; the Notion Live API path (via `BlockHandler`) fetches fresh URLs and is unaffected.
- **`<aside>` tags are stripped before card-boundary parsing and before rendering.** Notion's markdown export wraps callout blocks in `<aside>…</aside>`. `handleNestedBulletPointsInMarkdown` strips those wrapper lines from the raw content before the line loop so they never bleed into card backs. `markdownToHTML` strips them before passing content to `markdown-it` so they never appear as escaped `&lt;aside&gt;` text in rendered card HTML. Only the opening/closing tag lines are removed; the content inside is preserved.
- This module depends on `lib/anki/` for the lower-level Anki primitives (deck filename, cardgen, sanitization). Don't duplicate those helpers here.

# Claude lib — card generation contracts

The claude lib converts HTML content into Anki flashcards using the Anthropic API. Two mechanisms enforce the minimum-information principle:

**Prompt enforcement** (`SYSTEM_PROMPT` in `ClaudeService.ts`): Claude is instructed to produce one fact per card. Multi-fact paragraphs must be split into separate cards at extraction time. Tables of N rows produce N cards. Cloze cards are exempt (already single-fact by nature). If `userInstructions` explicitly requests detailed or longer cards, those instructions override the min-info default.

**Post-parse splitter** (`splitOversizedCards.ts`): A server-side safety net that runs after `parseDeckResponse` and before `expandCompactDeckInfo`. For every non-cloze card whose answer plain-text exceeds 600 characters, the splitter divides the answer along sentence boundaries (`.`, `!`, `?` followed by whitespace). Grouped sentences are kept together as long as the combined length stays under 600 chars. Output is clamped to 3× the input card count to guard against runaway fragmentation. Degenerate case (single sentence > 600 chars): kept as-is. HTML tags are balanced on each split fragment via cheerio.

**What is intentionally NOT split:**
- Cloze cards — splitting a cloze answer breaks the deletion syntax
- Cards already under 600 plain-text chars — no change
- Single-sentence answers over 600 chars — degenerate case, kept as-is

**Observability:** After each chunk, a structured log line records `inputCardCount`, `outputCardCount`, `avgAnswerLenBefore`, `avgAnswerLenAfter`, and `chunkIndex` under the `[Claude] splitOversizedCards` key. `parseDeckResponse` truncates anything after the last `]` so trailing prose doesn't break `JSON.parse`; when non-whitespace bytes are stripped, it emits a `[Claude] Trailing prose stripped` warning with `chunkIndex`, `strippedBytes`, and an 80-char sample — grep this to track model drift.

**Override path:** `userInstructions` passed to `generateDeckInfo` flow into the prompt as an "Additional instructions" block. A user asking for "keep cards detailed" or similar will get the prompt's min-info rules deprioritised in Claude's output — the splitter ceiling still applies as a hard guard.

**Tag normalization:** `normalizeTag(raw: string): string` (exported) converts a raw tag string from Claude's response into a safe Anki tag: lowercase, spaces→`_`, non-`[a-z0-9_]` characters stripped, capped at 32 characters. Called in `expandCompactDeckInfo` (Claude-text path) and in `buildDeckInfo` inside `PhotoToFlashcardsUseCase` (Photo-to-Deck path). Empty tags (e.g. all-punctuation input) are filtered out before the card is written. The `SYSTEM_PROMPT` already declares `"tags": string[]` in the schema; `expandCompactDeckInfo` now normalizes every tag the model emits and drops empty results.

**Math delimiter contract:** `ANKI_MATH_FRAGMENT` (exported from `ankiMathFragment.ts`) is a short instruction block injected into every Claude prompt that may produce math content. It instructs Claude to use `\(...\)` for inline math and `\[...\]` for display math, never `$...$` or `$$...$$`. Chemistry uses `\(\ce{...}\)` via mhchem. The fragment is shared across `SYSTEM_PROMPT` (exported from `ClaudeService.ts`), `buildVisionPrompt`, and `buildVerbatimPrompt` in `PhotoToFlashcardsUseCase.ts` to prevent the three copies from drifting.

**Usage logging:** `logClaudeUsage(label, usage)` from `logClaudeUsage.ts` writes one `[claude-usage] label=… input=… output=… cache_create=… cache_read=…` line per Claude response to `console.info`. Every server-side Claude call site is responsible for calling it after the response (or `finalMessage` for streams) — labels: `ClaudeService`, `ChatUseCase`, `claudeFileConversion`, `AINoteTypeUseCase`, `OstController`. The helper is the single grep target for proving cache hit rate in prod. Missing or null cache fields render as `0`. Per `.claude/rules/security.md`, the log line carries no PII, secrets, or user content — just token counts.

---

## Heading-driven contract (`cardStyle: 'heading-driven'`)

`generateDeckInfo` accepts an optional fifth argument `cardStyle?: string`. When `cardStyle === 'heading-driven'`:

1. The stripped HTML is passed to `detect('html', strippedContent)` from `src/lib/cardStyle/headingDriven/detect.ts`, which returns a `Heading[]` — one entry per `h1`–`h6` tag.
2. If headings are found, `splitByHeadings(headings)` from `src/lib/cardStyle/headingDriven/splitByHeadings.ts` produces one `ChunkPayload` per leaf heading (deepest level present; headings with empty bodies are skipped).
3. Each chunk is sent to Claude as a separate `generateDeckInfoFromChunk` call with the card-style prompt fragment injected — "For each chunk, produce 2–6 cards. Each card's front references this chunk's heading; each card's back holds one fact." The fragment comes from `getCardStylePromptFragment.ts`.
4. If zero headings are detected, the pipeline logs `[Claude] heading-driven:fallback` and falls through to the default `chunkHtmlByDetails` path unchanged. No error is thrown.

**The mode is dormant until the picker UI (`#2616`) ships.** No caller currently passes `cardStyle: 'heading-driven'`; the default path is entirely unchanged when `cardStyle` is absent or any other value.

**Format support:** The `detect` dispatcher handles `'markdown'` (regex on `^#` lines) and `'html'`/`'notion-html'` (cheerio `h1`–`h6` traversal) via `detectMarkdown.ts` and `detectHtml.ts` respectively. Docx and Notion exports are already converted to HTML before reaching `generateDeckInfo`, so the `'html'` detector covers them. Slide images are out of scope for V1.

**Cost and latency:** Each detected heading becomes one Claude call. A document with 10 headings produces 10 parallel Claude calls instead of 1–2 default chunks. Latency is bounded by the slowest call (parallel dispatch). Token cost scales linearly with heading count. Prompt caching applies to the shared `SYSTEM_PROMPT` block.

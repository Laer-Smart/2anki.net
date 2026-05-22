# Claude lib — min-info contract

The claude lib converts HTML content into Anki flashcards using the Anthropic API. Two mechanisms enforce the minimum-information principle:

**Prompt enforcement** (`SYSTEM_PROMPT` in `ClaudeService.ts`): Claude is instructed to produce one fact per card. Multi-fact paragraphs must be split into separate cards at extraction time. Tables of N rows produce N cards. Cloze cards are exempt (already single-fact by nature). If `userInstructions` explicitly requests detailed or longer cards, those instructions override the min-info default.

**Post-parse splitter** (`splitOversizedCards.ts`): A server-side safety net that runs after `parseDeckResponse` and before `expandCompactDeckInfo`. For every non-cloze card whose answer plain-text exceeds 600 characters, the splitter divides the answer along sentence boundaries (`.`, `!`, `?` followed by whitespace). Grouped sentences are kept together as long as the combined length stays under 600 chars. Output is clamped to 3× the input card count to guard against runaway fragmentation. Degenerate case (single sentence > 600 chars): kept as-is. HTML tags are balanced on each split fragment via cheerio.

**What is intentionally NOT split:**
- Cloze cards — splitting a cloze answer breaks the deletion syntax
- Cards already under 600 plain-text chars — no change
- Single-sentence answers over 600 chars — degenerate case, kept as-is

**Observability:** After each chunk, a structured log line records `inputCardCount`, `outputCardCount`, `avgAnswerLenBefore`, `avgAnswerLenAfter`, and `chunkIndex` under the `[Claude] splitOversizedCards` key.

**Override path:** `userInstructions` passed to `generateDeckInfo` flow into the prompt as an "Additional instructions" block. A user asking for "keep cards detailed" or similar will get the prompt's min-info rules deprioritised in Claude's output — the splitter ceiling still applies as a hard guard.

**Tag normalization:** `normalizeTag(raw: string): string` (exported) converts a raw tag string from Claude's response into a safe Anki tag: lowercase, spaces→`_`, non-`[a-z0-9_]` characters stripped, capped at 32 characters. Called in `expandCompactDeckInfo` (Claude-text path) and in `buildDeckInfo` inside `PhotoToFlashcardsUseCase` (Photo-to-Deck path). Empty tags (e.g. all-punctuation input) are filtered out before the card is written. The `SYSTEM_PROMPT` already declares `"tags": string[]` in the schema; `expandCompactDeckInfo` now normalizes every tag the model emits and drops empty results.

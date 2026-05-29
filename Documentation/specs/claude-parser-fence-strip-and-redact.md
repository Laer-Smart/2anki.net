# Spec: Harden Claude JSON parser and scrub user material from error logs

### Trio synthesis
- **PM:** Replace the brittle regex + `lastIndexOf(']')` strip with a real array extractor; redact three log sites; drop `raw` from thrown error messages; add fixture-based tests; ship a changelog entry; target ≥ 80% drop in `[Claude] Failed to parse` lines.
- **Designer:** Silent success on recovery. On unrecoverable failure use a single user-facing line — *"Something went wrong while making your cards. Try again — if it keeps happening, email support@2anki.net."* — same string for both throw paths. Route via `UPLOAD_FALLBACK` (or a new `claude_parse_failed` code) in `web/src/components/errors/helpers/getErrorMessage.ts`, **not** the existing `stripped.length < 280` branch which would surface the raw server message verbatim.
- **Engineer:** A 4-line `extractJsonArray(text: string): string | null` using `indexOf('[')` / `lastIndexOf(']')` covers all observed failure modes — `jsonrepair` already handles content fixup. **Narrow the existing fence regex to `/^```json\n?|^```\n?|```\s*$/gm`** (line-anchored) so triple-backticks inside card content are not eaten — a pre-existing latent bug. Redaction helper reuses already-imported `createHash`. **Drop the `suffix` field** — end of array = the last card's answer text; highest leak risk. No layer changes; the new static error message flows through `runChunks` → `UploadService.handleAsyncUpload` unchanged.
- **Agreement:** scope, no new dep, fixture tests, M effort, no migration, changelog on, three log sites redacted, two thrown error sites unified.
- **Conflict resolved:** PM proposed a depth-walking tokenizer; engineer demonstrated it's overkill (and risks a new "truncated string mid-walk" failure mode `jsonrepair` already handles). Spec adopts the simple extractor + narrowed regex.
- **Resulting plan:** narrow the fence regex, add `extractJsonArray` + `redactClaudePayload` (no `suffix`), swap three log sites to redacted shapes, replace two `throw new Error(...raw...)` sites with one static message + a new `claude_parse_failed` upload-error code, update the client error router, add fixture tests, ship the changelog entry.

---

## Outcome

`[Claude] Failed to parse response as JSON` lines in pm2 stderr drop by ≥ 80% over the 7 days after deploy. Affected jobs return real decks instead of 0 cards. Zero bytes of user study material land in stderr or in any thrown `Error.message` — the redacted log shape is the only diagnostic emitted.

## Goal alignment

Silent 0-card returns on Claude jobs make users churn after the first paid conversion. This recovers conversions we already paid Claude tokens for *and* lets us keep pm2 logs long enough to debug the next failure without leaking study material.

## Problem

2026-05-28, `server-green-error-55.log`. One German medical deck. Claude generated ~40 cards across 11 chunks. Chunks 0, 2, 5, 7, 8, 10 recovered via `jsonrepair`. One chunk failed because Claude wrapped its response in a code fence the regex didn't strip — `lastIndexOf(']')` truncated the trailing fence but the leading ``` ```json ``` stayed attached, `JSON.parse` died, the user got 0 cards, and ~5 KB of anatomy notes is now sitting in pm2 stderr verbatim. The same shape recurs across the fleet — every chunk that fails leaks its full payload to disk.

## Riskiest assumption

That `[` … `]` slicing is enough to extract the JSON array reliably. The assumption is wrong if Claude ever emits a `[` *inside* a string value before the real array start (e.g., `"Here's an array: [1, 2, 3]\n\`\`\`json\n[...]"`). The existing `jsonrepair` fallback covers the in-content-bracket case at the content layer, but if the slice itself is mis-anchored, even `jsonrepair` can't recover.

**Smallest test to disprove it:** pull five real "Failed to parse" raw payloads from current pm2 stderr (`grep -B0 -A30 'Failed to parse response as JSON' ~/.pm2/logs/server-green-error-*.log | head -200`), anonymize them (replace card text with `Lorem ipsum` of equal length, keep structure), drop them in `src/lib/claude/__fixtures__/`, and run the new extractor offline. Target: 4 of 5 parse to a valid `CompactDeck[]`. If fewer than 4, the assumption is wrong and we add a string-aware bracket walker before merging.

## Scope

**In**
- Narrow the per-chunk fence regex at `ClaudeService.ts:538` from `/```json|```/g` to a line-anchored variant `/^```json\n?|^```\n?|```\s*$/gm` so triple-backticks inside JSON string values are never eaten.
- Add `extractJsonArray(text: string): string | null` — locate the first `[`, locate the last `]`, return the slice or `null`. Apply it inside `parseDeckResponse` *before* `JSON.parse`.
- Add `redactClaudePayload(text: string): { length: number; prefix: string; sha256_prefix: string }` (no `suffix`). Use the already-imported `createHash` from `node:crypto`.
- Swap three log sites to the redacted shape:
  - `ClaudeService.ts:426` (`Failed to parse response as JSON`) — redact `raw`, `cleaned`, `toParse`
  - `ClaudeService.ts:440` (`Response is not an array`) — redact `raw`, `cleaned`
  - Anywhere else `raw`/`cleaned`/`toParse` is logged (audit the file)
- Replace `throw new Error(\`Claude returned invalid JSON:\n${raw}\`)` (line 435) and `throw new Error('Claude returned unexpected JSON structure (not an array)')` (line 441) with a single thrown error whose `name` is `'ClaudeParseError'` and whose `.message` is a stable code like `'claude_parse_failed'`. Never embed payload.
- Add `claude_parse_failed` to `UploadErrorBody['code']` and to `PER_CODE_COPY` in `web/src/components/errors/helpers/getErrorMessage.ts` with the designer's copy:
  - title: `"Something went wrong while making your cards."`
  - detail: `"Try again — if it keeps happening, email support@2anki.net."`
- Wire the `ClaudeParseError` thrown by `parseDeckResponse` to set `code: 'claude_parse_failed'` on the upload-error body emitted from `UploadService.handleAsyncUpload` (so the client error router routes correctly instead of falling through to `stripped.length < 280` which would leak the static server message verbatim).
- Fixture-based tests in `src/lib/claude/ClaudeService.test.ts` covering the cases below. Fixtures go in `src/lib/claude/__fixtures__/`.
- Changelog entry at `web/src/pages/WhatsNewPage/changelog/2026-05-29-claude-fence-stripping.json`.

**Out**
- Switching to Claude tool-use / structured output (eliminates the parse step entirely but is a larger refactor of `generateDeckInfoFromChunk` and the prompt).
- Replacing `jsonrepair` with anything else.
- Redesigning chunking, retry policy, or `runChunks` orchestration.
- A `claude_parse_failures` observability table.
- Adding a depth-walking tokenizer (deferred until a production failure proves the simple extractor isn't enough).

## User story

As a paid user converting a long Notion page, I want every chunk Claude returns to land in my deck, so I get the cards I paid for instead of a silent 0-card download — and if something does go wrong, I see one short instruction, not a stack trace.

## Acceptance criteria

- [ ] Fenced JSON ( ```` ```json\n[...]\n``` ```` ) parses to the array.
- [ ] Fenced JSON with trailing prose after the closing fence parses to the array.
- [ ] Fenced JSON with leading prose before the opening fence parses to the array.
- [ ] A card whose `a` field contains the literal substring ` ``` ` round-trips through `parseDeckResponse` without truncation. (Regression guard for the narrowed regex.)
- [ ] Fence with extra blank lines between ` ``` ` and `[` parses.
- [ ] Payload with no `[` throws an error whose `.message === 'claude_parse_failed'` (or `.name === 'ClaudeParseError'`) and emits exactly one `console.error` with shape `{ chunkIndex, sha256_prefix, length, prefix }` — no `raw`, no `cleaned`, no `toParse`.
- [ ] The two existing `throw new Error(\`Claude returned ...${raw}\`)` sites are gone. Snapshot the thrown error message and assert it does not contain `[{`, ` ``` `, or any substring of the input.
- [ ] At least four of the five anonymized prod-fixture payloads parse successfully under the new extractor.
- [ ] `getErrorMessage.ts` returns the designer's copy for the new `claude_parse_failed` code; the test asserts on the exact title + detail string.
- [ ] Changelog entry file exists, `id` matches filename, `type: "fix"`, title is `"Large Claude jobs no longer fail when Claude wraps the response in code fences"`.

## Leading indicator

Count of `[Claude] Failed to parse response as JSON` lines in pm2 over a 7-day window after deploy. Baseline (7 days before): pull from prod via `grep -c "Failed to parse" ~/.pm2/logs/server-*-error-*.log` and record in the implementation PR body. Target: ≥ 80% reduction. Engineer pastes both numbers into the PR body before merge.

## Design notes

Two user-visible moments to handle:

**Moment A — Successful recovery (most common).** Silent. The user sees their cards, download button, card count. No toast. No "we fixed something in the background" message. The system worked; the user gets the result.

**Moment B — Unrecoverable parse failure (rare after fix).** Inline on the upload result screen (not a toast — toasts are dismissible, this is the final state of a job they waited up to 90 seconds for). Copy:

> **Something went wrong while making your cards.**
> Try again — if it keeps happening, email support@2anki.net.

Tertiary "Try again" button next to the message (same input, no new upload required).

**Moment C — "Response is not an array" failure (very rare).** Same surface, same copy, same button. From the user's perspective B and C are identical: they waited, they got nothing, they should try again. One string covers both.

Banned words audit (per VOICE.md):
- No "oops", no exclamation marks, no "unparseable" (non-technical users don't know that word).
- Sentence case. Period on the detail line. Em-dash for the "if it keeps happening" aside.

## Technical pre-flight

**Layers touched:** `lib/claude/` (server) and `web/src/components/errors/helpers/` + `web/src/types/UploadErrorBody.ts` + `web/src/pages/WhatsNewPage/changelog/` (client). No routes, controllers, use cases, services, or data layer.

**Files in play**

| File | Change |
|---|---|
| `src/lib/claude/ClaudeService.ts` | Narrow fence regex; add `extractJsonArray`; add `redactClaudePayload`; swap 3 log sites; replace 2 thrown errors with one stable `ClaudeParseError` |
| `src/lib/claude/ClaudeService.test.ts` | Add fixture-based tests; assert no payload leaks into error message |
| `src/lib/claude/__fixtures__/` | New directory — five anonymized prod payloads as `.txt` files |
| `src/services/UploadService.ts` | Map `ClaudeParseError` to `{ code: 'claude_parse_failed' }` in the failed-job body |
| `src/types/UploadErrorBody.ts` (or wherever the union lives) | Add `'claude_parse_failed'` to the `code` union |
| `web/src/types/UploadErrorBody.ts` | Mirror the union |
| `web/src/components/errors/helpers/getErrorMessage.ts` | Add `claude_parse_failed` to `PER_CODE_COPY` |
| `web/src/pages/WhatsNewPage/changelog/2026-05-29-claude-fence-stripping.json` | New |

**Sketch**

```ts
// src/lib/claude/ClaudeService.ts

function extractJsonArray(text: string): string | null {
  const start = text.indexOf('[');
  if (start === -1) return null;
  const end = text.lastIndexOf(']');
  if (end < start) return null;
  return text.slice(start, end + 1);
}

type RedactedPayload = { length: number; prefix: string; sha256_prefix: string };
function redactClaudePayload(text: string): RedactedPayload {
  return {
    length: text.length,
    prefix: text.slice(0, 80),
    sha256_prefix: createHash('sha256').update(text).digest('hex').slice(0, 12),
  };
}

class ClaudeParseError extends Error {
  constructor() { super('claude_parse_failed'); this.name = 'ClaudeParseError'; }
}
```

`parseDeckResponse` becomes (sketch):
```ts
const cleaned = raw.replace(/^```json\n?|^```\n?|```\s*$/gm, '').trim();
const toParse = extractJsonArray(cleaned) ?? cleaned;
try { parsed = JSON.parse(toParse); }
catch {
  const repaired = tryRepairDeckArray(toParse);
  if (repaired) { parsed = repaired; console.log('[Claude] Recovered malformed JSON via jsonrepair', { chunkIndex }); }
  else {
    console.error('[Claude] Failed to parse response as JSON', {
      chunkIndex,
      raw: redactClaudePayload(raw),
      cleaned: redactClaudePayload(cleaned),
      toParse: redactClaudePayload(toParse),
    });
    if (looksLikeEmptyContentExplanation(cleaned)) throw new Error(EMPTY_CONTENT_USER_MESSAGE);
    throw new ClaudeParseError();
  }
}
if (!Array.isArray(parsed)) {
  console.error('[Claude] Response is not an array', { chunkIndex, raw: redactClaudePayload(raw), cleaned: redactClaudePayload(cleaned) });
  throw new ClaudeParseError();
}
```

**Test plan** — concrete `it()` titles (server):

```
describe('extractJsonArray')
  it('returns the array substring from clean JSON')
  it('returns the array when leading prose precedes the [')
  it('returns the array when trailing prose follows the ]')
  it('returns the array when fences are stripped to leave only [...]')
  it('returns null when no [ is present')
  it('returns null when [ appears but no matching ] follows it')

describe('redactClaudePayload')
  it('returns length + 80-char prefix + 12-hex sha256 prefix')
  it('returns the full text as prefix when payload is shorter than 80 chars')
  it('handles multi-byte unicode (German umlauts) — hash is stable')
  it('is deterministic — same input ⇒ same output')

describe('parseDeckResponse — regression guards')
  it('recovers a fenced response that currently fails (German medical deck fixture)')
  it('preserves backticks inside JSON string values (code-card fixture)')
  it('throws ClaudeParseError with message "claude_parse_failed" when unrecoverable')
  it('thrown error message contains no substring of the input payload')
  it('emits exactly one console.error with redacted payload shape')
```

Client tests (Vitest, `web/`):
```
describe('classifyUploadError — claude_parse_failed')
  it('returns the designer copy for code: "claude_parse_failed" instead of falling through to UPLOAD_FALLBACK')
```

**Effort:** M. Extractor + helper + class = ~25 lines. Three log-site swaps + two throw replacements = ~10 lines. New error code wire-up across server + client = ~6 lines. Tests are the fat — ~18 `it()` blocks plus five fixtures. Changelog file = 1 file.

**Risks**

- *Backticks inside card content* — the narrowed regex (line-anchored, multiline) only matches fences at line start/end; backticks inside JSON string values stay intact. Add an explicit regression test.
- *Truncated string mid-bracket* — `extractJsonArray` returns a slice that may end mid-string if Claude truncated its output. That's exactly when `jsonrepair` shines; the existing fallback handles it.
- *`runChunks` partial-success path* — `runChunks` reads `r.reason.message` (line 601-606) and logs `failures` at line 610. The new `.message === 'claude_parse_failed'` flows through identically — no payload leak through that re-log because the message is stable.
- *Client-side fallthrough* — `classifyUploadError` currently has a `stripped.length < 280` branch (line 166-168) that would surface `'claude_parse_failed'` as the user-facing title verbatim. The new `PER_CODE_COPY` entry intercepts the code before that branch is reached. Test asserts this explicitly.

**Security/migrations**

- No migrations.
- Redacted payload still leaks: `length` (~document size), `prefix` first 80 chars (deck name + possibly first card's question stem), `sha256_prefix` (12 hex chars — used only for log correlation, never identity/auth). `suffix` field is **dropped** because end-of-array carries the last card's answer text — highest leak. Acceptable trade-off; matches what's already logged via `[Claude] chunk done { deckName, … }`.

## Open questions

- Should the redacted shape become a Sentry breadcrumb later, or is pm2 grep enough? Default: pm2 only this PR; defer Sentry.
- The narrowed fence regex assumes Claude only ever emits fences at line boundaries. If we ever see an inline fence (`Here's the deck \`\`\`json [...]\`\`\` end.`), the regex won't strip it but `extractJsonArray` still finds the `[`. Confirmed safe — flag in PR body for reviewer eyes.

## Next iteration (not this PR)

- Move to Claude tool-use / structured output (eliminates the entire parse-and-repair stack — but is a larger refactor of `generateDeckInfoFromChunk` and the prompt).
- Add a `claude_parse_failures` counter table so we can plot the leading indicator without grepping pm2.
- Wire a Sentry breadcrumb on `ClaudeParseError` so prod failures surface in one place instead of stderr.

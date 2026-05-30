# Photo-to-flashcards: guard the Claude Vision JSON parse

## Outcome

When the Claude Vision model returns malformed or truncated JSON, a user
converting a photo gets a clean, actionable error instead of a raw 500 with a
stack trace, and the prod error log stops carrying `SyntaxError: Unexpected end
of JSON input` / `Expected ',' or '}' after property value in JSON` from the
photo-to-deck path.

## Problem

The `/api/image-occlusion/photo-to-deck` endpoint runs the uploaded photo
through Claude Vision and parses the model's text output as JSON to build the
deck. The parse is unguarded:

- `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts` →
  `parseClaudeVisionResponse(raw)` calls `JSON.parse(toParse)` with no
  try/catch (around line 276).
- `PhotoToFlashcardsController.create` wraps the use-case call in a try/catch,
  but the catch only maps `e.status === 403 | 413 | 429` and **rethrows
  everything else** (around line 139). A `SyntaxError` has no `status`, so it
  propagates to `ErrorHandler` as an unhandled 500.

The model truncates its output when it hits `max_tokens: 4096` (dense pages,
verbatim transcription of a full slide), or emits a stray trailing comma/brace —
both produce exactly the two SyntaxError variants seen in the last 48h of prod
logs. The stack trace surfaces at the controller's `await this.useCase.execute(...)`
call frame, but the throw site is `parseClaudeVisionResponse` inside the use
case.

**This is a downstream AI-response parse, not the request body.** The route
parses the request body with `express.json({ limit: "20mb" })`; a malformed
request body is already rejected by Express's body parser as a 400 before the
controller runs. So the fix is a **handled conversion failure**, not
request-body validation.

## Riskiest assumption + smallest test

**Riskiest assumption:** that every malformed-JSON failure on this path is a
*transient* model output problem (retryable / "try a clearer photo"), not a
deterministic bug in our prompt or post-processing that would make a clean 4xx
misleading.

**Smallest test:** before writing the fix, pull the last 48h of
`vision_call_success` vs. SyntaxError counts from prod and eyeball whether the
failures cluster on a specific mode (`verbatim` / `dense` / `mcqEnabled`). If
they cluster hard on one mode, that mode's prompt may be over-running
`max_tokens` every time — the guard still ships (no user should see a 500), but
we file a follow-up to raise `max_tokens` or tighten that prompt. The guard is
correct either way; the cluster check only tells us whether a second fix is
needed.

## Scope

**In:**
- Wrap `JSON.parse` in `parseClaudeVisionResponse` in a try/catch.
- On parse failure (and on the existing "not an array" case), throw a
  status-coded conversion-failure error — same shape as the existing
  `makePayloadTooLargeError` / `makeFreeQuotaReachedError` helpers (an `Error`
  carrying a numeric `status`), so the controller maps it cleanly.
- Map that status in `PhotoToFlashcardsController.create`'s existing catch
  alongside 403/413/429, returning the mapped 4xx with a VOICE.md-compliant
  message. Use 422 (Unprocessable Entity) — the request was valid, but we
  couldn't turn the model's response into a deck.
- Log the failure internally (hashed/sanitized, no raw model text, no image
  bytes) so we keep a prod signal after the 500s stop.

**Out:**
- Any change to the Vision prompt text or the photo pipeline itself
  (`buildVisionPrompt`, `buildVerbatimPrompt`, `buildHeadingDrivenVisionPrompt`,
  density/mode/MCQ logic). This PR is purely input-guarding the parse.
- Raising `max_tokens` or adding a retry/repair pass on the model output. If the
  48h cluster check shows a deterministic over-run, that's a separate follow-up.
- The request-body validation path — already handled by `express.json()`.

## Acceptance criteria

1. A use-case-level test: `parseClaudeVisionResponse` (or `execute` with a stub
   Anthropic client returning truncated JSON like `[{"deck":"X","cards":[{"q":`)
   throws the conversion-failure error carrying `status === 422`, **not** a raw
   `SyntaxError`. Written failing-first against current `main`.
2. A controller test: `PhotoToFlashcardsController.create`, with a use case that
   throws the conversion-failure error, responds `422` with the VOICE.md message
   in `{ message }` — proven by a test that currently fails (the rethrow path
   surfaces an unhandled throw today).
3. The "not an array" branch and the parse-failure branch both route through the
   same conversion-failure error (no second unhandled path left behind).
4. No raw model text, image base64, or stack trace reaches the client or the
   log line.

## User-visible? / Changelog

User-visible: yes — a photo conversion that previously 500'd now returns a clear
message. Warrants a **fix** changelog entry at implement time, e.g. "Photo
conversions that can't be read return a clear message instead of failing
silently" (final wording per VOICE.md, no implementation detail). If the
implementer finds the 500 was effectively invisible to users (caught by the
front-end as a generic failure already), downgrade to "no changelog — internal
robustness, no new user-facing copy" and say so in the PR body.

## Open questions

1. **Status code: 422 vs 502?** The request is well-formed (→ 422), but the
   failure is "our upstream model gave us garbage" (→ 502). 422 keeps it in the
   client-actionable family ("try a clearer/smaller photo") and matches how
   413/429 are already surfaced on this endpoint. Recommend 422; flag if Al
   prefers 502.
2. **Retry vs. fail?** v1 fails clean. Should a single retry (or a
   trailing-bracket repair like the existing `lastIndexOf(']')` salvage) come in
   the same PR, or a follow-up once we see the cluster data? Recommend
   follow-up — keep this PR to pure guarding.
3. Is the same unguarded `JSON.parse`-on-model-output pattern present on other
   AI paths (Notion-to-cards, transform pipeline)? Out of scope here, but worth
   a grep before closing — if so, file a tracking issue.

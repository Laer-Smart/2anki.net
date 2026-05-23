# Spec: Replace Vertex AI with Claude for PDF/image → HTML conversion

## Why

`@google-cloud/vertexai` SDK is deprecated by Google as of 2025-06-24 and removed on **2026-06-24** (~13 months out). The prod logs already emit the deprecation warning on every boot. Migrating now — not at the deadline — gives us a quiet window to validate output quality against real user uploads.

We use Vertex AI in two places: PDF→HTML conversion (`convertPDFToHTML`) and image-quiz→HTML conversion (`convertImageToHTML`). Both feed into the same downstream `<ul class="toggle">` parser the rest of 2anki already understands. The Anthropic SDK is already in our deps and has vision + PDF support, so a swap stays inside an existing wrapper boundary.

Secondary win: today's Vertex wrapper silently swallows errors and returns an empty string, which the parser then turns into an `EmptyDeckError` with no real cause. Moving to Claude gives us the chance to surface a real error.

## What changes

Replace these five files under `src/infrastracture/adapters/fileConversion/`:

- `vertexAIUtils.ts` — delete
- `contentGenerationUtils.ts` — delete
- `constants.ts` — delete (Vertex-specific config: project, location, safety settings)
- `convertImageToHTML.ts` — rewrite to call Claude via the existing project wrapper
- `convertPDFToHTML.ts` — rewrite to call Claude via the existing project wrapper

Add one new file:

- `claudeFileConversion.ts` — single internal helper that wraps `@anthropic-ai/sdk` for both PDF and image input. Centralizes model, max_tokens, retry, and error mapping. Uses **`claude-sonnet-4-6`** as the default model (matches our `claude-api` skill guidance: strongest vision per dollar; flash-tier latency would lose quality on dense PDFs).

Drop `@google-cloud/vertexai` from `package.json` and `pnpm-lock.yaml`. Re-run `pnpm install`. Remove any env vars / GCP service-account references that are Vertex-only (none should be left at call sites once the imports are gone, but grep `.env.example`, `Documentation/`, deploy scripts to confirm).

## What doesn't change

- Both public functions keep identical signatures: `convertImageToHTML(imageData: string): Promise<string>` and `convertPDFToHTML(pdf: string, userInstructions?: string): Promise<string>`. All call sites stay the same.
- The same `<ul class="toggle">` HTML contract the downstream parser expects. The existing system prompts move over verbatim — Claude follows the same instructions; no prompt re-engineering this spec.
- The `removeFirstAndLastLine` markdown-fence stripper stays in the image path because Claude wraps HTML output in code fences the same way Gemini did. Verify and remove only if Claude reliably doesn't fence.
- The user-instruction override on PDF conversion (`userInstructions?` arg) stays.

## Constraints

- **Prompt caching.** The `SYSTEM_INSTRUCTIONS` block (~600 chars) and `DEFAULT_PDF_TO_HTML_INSTRUCTIONS` (~700 chars) are reused on every PDF call. Wrap them in a `cache_control: { type: 'ephemeral' }` system block per the `claude-api` skill. Image conversion gets the same treatment for its text prompt. Cuts repeat-call cost ~90% on the prompt portion and lowers latency.
- **Model:** `claude-sonnet-4-6`. Surface as `process.env.CLAUDE_FILE_CONVERSION_MODEL` for future swaps without redeploying. Default if unset.
- **PDF support** needs the `anthropic-beta: pdfs-2024-09-25` header (or whatever's current at implementation time). Image input is GA, no beta header needed.
- **Max tokens** stays at 8192 (parity with Vertex config) — long PDFs already hit this ceiling and that's the existing behavior. If we ever raise it, do it as its own change with a metric check.
- **Streaming** is fine to drop. The current code streams only to concatenate the result; nothing visible to the user is incremental.
- **Error handling.** Replace the swallowed-error pattern. If Claude returns an error, throw a typed `FileConversionError` with the upstream message. Let `ErrorHandler` middleware surface a generic message; the typed error lets the use case decide whether to retry vs hard-fail.
- **No SSRF concern.** Anthropic SDK calls a fixed host. `instrumentedAxios` is not needed (it's for user-controlled URLs).
- **Cost guardrail.** Sonnet 4.6 vision is ~$3/MTok in, ~$15/MTok out. A 10-page PDF runs roughly $0.05–0.15. We do not currently meter or cap per-user file conversion. Out of scope for this spec — flag for follow-up if volume bites.

## Out of scope

- Per-user usage caps for file conversion (separate spec if needed).
- Prompt tuning. We carry today's instructions over verbatim; quality regressions get their own spec.
- Streaming response to the client.
- Falling back to Vertex on Claude errors. Hard cut — Vertex code is gone.
- Image formats beyond what we accept today (PNG only at the upload boundary).

## Acceptance criteria

1. `@google-cloud/vertexai` is gone from `package.json`, `pnpm-lock.yaml`, and any imports in `src/`.
2. The five files listed in *What changes* are deleted or rewritten as described.
3. `pnpm test` is green, with new unit tests for `claudeFileConversion.ts` covering: happy path returns HTML, error path throws `FileConversionError`, PDF call sets the beta header, system prompts are passed with `cache_control: ephemeral`.
4. Manual verification before flipping the PR ready: upload one of the test PDFs under `src/test/fixtures/` (or a real Lasith-style PDF) end-to-end through `/upload` and confirm a non-empty deck comes back. Add this to the PR's Browser check section.
5. SonarCloud security rating on new code is A (run `sonar-scanner` locally before flipping ready, per `.claude/rules/sonar.md`).
6. No changelog entry — this is a pure backend swap, the user sees the same deck either way. Note "no changelog entry — internal SDK swap" in the PR body.

## Implementation order

1. Add `claudeFileConversion.ts` and tests.
2. Rewrite `convertImageToHTML` and `convertPDFToHTML` to call it.
3. Delete the four Vertex files.
4. Drop the dep, regenerate lockfile.
5. End-to-end manual upload test.
6. `/check` + `sonar-scanner` + flip ready.

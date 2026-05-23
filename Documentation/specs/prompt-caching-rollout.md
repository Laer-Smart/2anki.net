# Spec: Prompt caching rollout across all server-side Claude calls

### Trio synthesis
- **PM:** Borderline skip-the-spec change (~3 line edits + one helper, <50 LOC). In-scope: cache_control on the missing call sites + usage logging. Out: pre-warming, 1h TTL, tools-array caching.
- **Designer:** No UI changes required. Latency improvement isn't user-perceptible at the affected surfaces; existing copy stays.
- **Engineer:** Layers touched: `usecases/`, `controllers/`, `src/lib/claude/`. Effort S. Flagged risks: (a) the 4,096-token minimum may silently no-op caching on Opus paths, (b) per-request interpolation in a system prompt silently defeats caching, (c) stream usage block must be read from `finalMessage.usage` after stream close.
- **Agreement:** Add `cache_control` to `AINoteTypeUseCase`; add a small usage-logging helper; do **not** add a system prompt to `PhotoToFlashcardsUseCase` (separate concern); no UI.
- **Conflict:** PM said skip `OstController` (admin-only, no leverage); engineer said include it for correctness. **Resolved in favor of engineer** — the edit costs nothing, keeps the rule simple ("all server-side system prompts use cache_control"), and we'd rather not maintain a skip list.
- **Resulting plan:** Convert two `system: string` arguments to single-block arrays with `cache_control: { type: 'ephemeral' }`, add `src/lib/claude/logClaudeUsage.ts`, wire it into all five Claude-calling sites, add tests mirroring `claudeFileConversion.test.ts:79`. One PR.

---

## Outcome

Within seven days of merge: `cache_read_input_tokens / total_input_tokens ≥ 40 %` on `AINoteTypeUseCase`, `ChatUseCase`, and `claudeFileConversion`, observable via the new `[claude-usage]` log lines. Per-call Claude input-token spend on the AI-generation surface drops by ~25–35 % at constant volume.

## Goal alignment

AI generation is the single most expensive per-request surface in the codebase. Cutting unit cost is what lets the AI features stay generous on the free tier as we push toward 300K — students churn at cost gates, and the funnel narrows if we have to clamp quotas. This change is the cheapest available lever on that cost.

## Problem

Seven Claude API call sites in `src/`. Four already pass `cache_control: { type: 'ephemeral' }` on the system block. Three do not:

| Call site | Status | Volume |
|---|---|---|
| `src/controllers/OstController.ts:136` | missing | admin-only (Al) |
| `src/usecases/ai/AINoteTypeUseCase.ts:252` | missing | medium; same prompt re-runs within session |
| `src/usecases/imageOcclusion/PhotoToFlashcardsUseCase.ts:406` | no system prompt at all | high |

Bulk-volume surfaces (file conversion, chat, ClaudeService) are already cached, so this is tidy-up — not a rescue. The real leverage is `AINoteTypeUseCase`, where the same module-level `SYSTEM_PROMPT` is reused across consecutive calls in a single user session and is currently uncached.

We also have **zero observability** on cache hit rate today, which means we cannot prove caching is working on the already-cached paths either.

## Riskiest assumption + smallest disproof

**Assumption:** our system prompts clear Anthropic's per-model minimum (1,024 tokens for Sonnet 4.5/4.6; 4,096 for Opus 4.5+/Haiku 4.5). Below the floor, `cache_control` is silently ignored — no error, no cache, no log line.

**Smallest test:** before the edit, run a one-off `npx tsx` script that imports `OST_SYSTEM_PROMPT`, `SYSTEM_PROMPT` from `AINoteTypeUseCase`, and the system prompt strings used in `ChatUseCase` / `ClaudeService` / `claudeFileConversion`, then prints `Math.ceil(text.length / 4)` as a rough token estimate. Anything under 4,500 chars warrants a real tokenizer pass before declaring done. Record the numbers in the PR body.

## Scope

**In:**
- Add `cache_control: { type: 'ephemeral' }` to system blocks in `AINoteTypeUseCase.ts` and `OstController.ts`.
- New helper `src/lib/claude/logClaudeUsage.ts` that emits `[claude-usage] label=… input=… output=… cache_create=… cache_read=…` to `console.info` from the response or `finalMessage` of every Claude call.
- Wire the helper into all five cached call sites (the three pre-existing + the two new).
- Tests mirroring `claudeFileConversion.test.ts:79` and `ChatUseCase.test.ts:414` for each newly cached call site.

**Out:**
- Pre-warming on a timer (cf. `feedback_no_auto_stripe_sync` — don't auto-schedule what isn't obviously safe).
- 1-hour TTL.
- Caching the `tools` array (we don't pass one).
- Multi-breakpoint strategies.
- A dashboard or metrics endpoint — logs only.
- Adding a system prompt to `PhotoToFlashcardsUseCase` (behavior change; separate spec).

## User story + acceptance criteria

User-facing impact is "the AI features stay affordable and available as the user base grows" — there is no visible change. Acceptance is therefore measurement-based:

- [ ] Token-floor pre-check completed and char-count numbers pasted into the PR body.
- [ ] `cache_control` added to the two identified call sites.
- [ ] `logClaudeUsage` emits one structured line per Claude response with a call-site label.
- [ ] One unit test per newly cached call site asserts the `cache_control` shape.
- [ ] Seven days after merge: `[claude-usage]` log inspection on prod shows `cache_read / total_input ≥ 40 %` on at least `AINoteTypeUseCase`, `ChatUseCase`, and `claudeFileConversion`. Posted as a follow-up PR comment.
- [ ] No regression in existing test suite; `/check` clean.

## Leading indicator

`cache_read_input_tokens / total_input_tokens`, aggregated per call-site label from the `[claude-usage]` lines. Target: ≥ 40 % within seven days on the three high-volume paths. This is the single number that proves the change worked.

---

## Design notes

No UI changes required. The three surfaces involved (chat, PDF/file flashcard generation, AI note-type generation) already have appropriate loading copy, and the latency improvement from caching is below perception threshold on streamed responses and dwarfed by other pipeline steps on the batched ones. Existing AI-error copy ("The AI is briefly unavailable — try again in a moment.") is accurate regardless of caching state.

---

## Technical pre-flight

**Layers:** `usecases/`, `controllers/`, `src/lib/claude/`. No routes, services, data layer, or web.

**Files to modify:**
- `src/usecases/ai/AINoteTypeUseCase.ts` — convert `system: SYSTEM_PROMPT` → `system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }]`.
- `src/controllers/OstController.ts` — same conversion for `OST_SYSTEM_PROMPT`.
- `src/lib/claude/ClaudeService.ts` — add `logClaudeUsage` call in the existing `finalMessage` handler.
- `src/usecases/chat/ChatUseCase.ts` — add `logClaudeUsage` call in the existing stream-end handler.
- `src/infrastracture/adapters/fileConversion/claudeFileConversion.ts` — add `logClaudeUsage` call after each `messages.create` returns.

**Files to add:**
- `src/lib/claude/logClaudeUsage.ts` — single exported function taking `(usage, label)`. Writes one `console.info` line per call. No DB, no PII, no secrets.
- `src/lib/claude/logClaudeUsage.test.ts` — asserts the log shape and that missing optional fields default to `0`.

**Files to update with new test cases:**
- `src/usecases/ai/AINoteTypeUseCase.test.ts` — assert `system` arg has `cache_control` ephemeral on its first block (and that `logClaudeUsage` was invoked).
- `src/controllers/OstController.test.ts` (or its colocated equivalent) — same assertion.

**Streaming usage detail:** Anthropic's stream surfaces final usage in `finalMessage.usage` after the stream closes; `message_start` carries cache reads but `message_delta` carries the totals. Both `ClaudeService` and `ChatUseCase` already consume `finalMessage` for error handling — attach `logClaudeUsage` there; do not add a new event listener.

**Cross-language coordination:** none. TypeScript-only change.

**Effort:** **S.** Two prop conversions, one ~20-line helper, ~5 test additions. No migrations, no schema changes, no new deps.

**Risks / unknowns:**
1. **Token floor silently no-ops the cache.** Mitigated by the riskiest-assumption test above. If a prompt is under the model's floor, either switch that path to Sonnet (1,024-token floor) or leave the change but note that no cache will land for that surface.
2. **Per-request interpolation defeats the cache.** If `SYSTEM_PROMPT` or `OST_SYSTEM_PROMPT` turns out to interpolate a date, user ID, or any other per-request value, the prefix hash changes every request and caching silently does nothing. **Read each constant in full before editing, not after.**
3. **Stream usage block location.** If `ClaudeService` or `ChatUseCase` consumes the stream as a raw iterator instead of via `finalMessage`, the usage block is discarded. Verify both call sites surface `finalMessage` before wiring logging; if not, the helper goes in at the call site that does see usage.

---

## Open questions for engineer

1. **Do `SYSTEM_PROMPT` (`AINoteTypeUseCase`) and `OST_SYSTEM_PROMPT` clear the per-model token floor on the model each path actually calls?** If under-floor, do we switch to Sonnet (1,024-token floor) or accept that path's caching is a no-op?
2. **Are either of those constants byte-identical across requests** (no template literals interpolating a date / user ID / deck name)? If not, the cache will never hit and the change is theatre.
3. **Does the current `ClaudeService` stream handler expose `finalMessage`, or is it consumed raw?** If raw, the logging needs a different attach point.
4. **Borderline-spec question for PM:** is this small enough that we should skip the spec lifecycle entirely and ship as an inline brief? (Per `feedback_skip_spec_for_tiny_changes`.) Recommendation here is: keep the spec because of the observability piece, which is novel enough to warrant a one-page reference for future PRs that want to reuse `logClaudeUsage`.

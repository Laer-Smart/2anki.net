# Notion convert worker — surface dead-token failures

### Trio synthesis
- **PM:** The convert worker is *not* broadly silent — `performConversion` already writes user-facing reasons via `SetJobFailedUseCase` → `job_reason_failure`, rendered inline on the Downloads page. The genuinely silent path is narrow: a Notion-auth failure in the worker that either (a) escapes to the fire-and-forget `.catch(console.error)` and leaves the job stuck non-terminal forever, or (b) lands in the catch but falls through to the generic "Something went wrong" reason with the token never flagged. Build it as a **bug fix, not a feature** — it rides existing rails (`job_reason_failure`, the Downloads failure row, #2770's `markTokenInvalid`), so the cost is low. Frame the scope precisely or engineering will over-build.
- **Designer:** Reuse the existing Downloads failure-panel row (the expandable `failurePanel`). Write a `notion_token_expired` sentinel into `job_reason_failure`; the frontend swaps the generic text for reconnect copy **only when `source === 'notion'`**. Copy reuses #2770's exact phrasing — "Reconnect Notion" — no second variant. No restart button for this failure (`restartable: false`); restarting with a dead token fails identically. No global banner, no nag for file-only users.
- **Engineer:** Two failure modes, both post-202: a worker token re-fetch that finds **no token** throws before `performConversion`'s catch → job stuck `running`; a **revoked** token 401 propagates *into* the catch but `jobFailureReasonFromError` doesn't recognize `APIResponseError{code:'unauthorized'}`, so it returns the generic reason and never calls `markTokenInvalid`. `Unauthorized` is already non-retryable in `withRetry`, so treating a worker 401 as terminal matches existing behavior. Fix in the catch + `jobFailureReason`; reuse #2770's `markTokenInvalid`. **Hard dependency on #2770.** Effort **S**. No migration.
- **Agreement:** Bug fix, not a feature; reuse the Downloads failure row + #2770's reconnect routing; gate the reconnect copy to Notion-sourced jobs; no banner, no new surface, no migration; depends on #2770 landing first.
- **Conflict & resolution:** PM described the silent path as the missing-token throw stuck in `running`; engineer described the revoked-token 401 caught-but-generic. These are **complementary halves of the same defect**, not a contradiction — both are "a worker-side Notion-auth failure the user can't see or recover from." **Resolved: cover both.** Any Notion-auth failure in the worker must (a) drive the job to a terminal `failed` state carrying the reconnect reason, and (b) flag the token invalid when a token exists.
- **Resulting plan:** In the conversion worker's failure handling, detect a Notion-auth failure (missing token *or* `APIResponseError` `unauthorized`), set the job `failed` with a `notion_token_expired` reason via `SetJobFailedUseCase`, and call #2770's `markTokenInvalid(owner)` when a token row exists. Frontend: the Downloads failure panel renders the reconnect CTA for Notion jobs carrying that reason. No restart button, no banner, no migration.

## Outcome

A returning Notion user whose access is revoked *between* listing pages and the queued conversion running gets a clear, terminal answer — "Notion connection expired. Reconnect Notion." — on the Downloads page, and the next visit to a Notion surface already shows the reconnect prompt #2770 built. No convert job is ever left spinning in `running` forever on a dead token. **Goal alignment:** the product says what happened (the W21 theme that also drove #2737 and #2770), and the conversion path stops leaking non-terminal jobs — quietly more correct for everyone, a real recovery path for the few who lose their Notion connection mid-convert.

## Problem

`POST /api/notion/convert/` enqueues a job and returns **202** immediately ("Added to your downloads"). The Notion fetch happens later in the background worker. When the stored token is dead by the time the worker runs, one of two things happens, both invisible to the user:

1. **Stuck job.** The worker's token re-fetch finds no token and throws before `performConversion`'s own try/catch exists. The throw escapes to the controller's fire-and-forget `.catch((err) => console.error(...))`. The job is left `running`/`processing` forever — never terminal, polluting the user's in-progress count indefinitely.
2. **Useless reason.** The token exists but is revoked; the Notion 401 propagates into `performConversion`'s catch, but `jobFailureReasonFromError` doesn't recognise an `APIResponseError` with `code: 'unauthorized'`, so it falls through to `genericFailureReason` ("Something went wrong on our end… email support"). The job is `failed` but with no actionable reason, and the token is never flagged — so the next Notion action 401s too, with no reconnect path surfaced from this flow.

## Riskiest assumption

That a worker-side Notion 401 reliably means "token dead," not a transient blip — i.e. marking the token invalid on the first worker 401 is safe. **Mitigation/test:** `APIErrorCode.Unauthorized` is already excluded from `withRetry`'s retryable set (only rate-limit/5xx/timeout retry), and #2770 already treats a 401 as terminal in the search and poll paths — this change matches existing, tested behavior. The soft `invalidated_at` flag (not a hard purge) is the safety margin: a mistakenly-flagged live token is recovered by one reconnect click, which clears the flag.

## Scope

**In:**
- In the conversion worker's failure handling, detect a Notion-auth failure: a missing-token throw **or** an `APIResponseError` with `code === 'unauthorized'`.
- On that failure: set the job to `failed` via `SetJobFailedUseCase` with a `notion_token_expired` reason, **and** call #2770's `markTokenInvalid(owner)` when a token row exists.
- Ensure the missing-token throw no longer escapes to a bare `console.error` leaving the job non-terminal.
- Add a `notion_token_expired` reason recognised by `jobFailureReasonFromError`.
- Frontend: the Downloads failure panel renders a "Reconnect Notion" CTA (→ `/notion`) for jobs whose `source === 'notion'` and whose reason is the sentinel; no restart button for that failure. Fall through to the existing generic display when the sentinel is absent.

**Out:**
- Any migration — #2770 already adds `notion_tokens.invalidated_at` and `markTokenInvalid`/`clearTokenInvalid`. This spec must not merge before #2770 is on `main`.
- Proactive token-health check at enqueue time (extra round-trip on the happy path; #2770's search path already catches dead tokens earlier).
- Auto-retry / auto-reconnect of the failed job.
- Email or push notification for the failure.
- Any change to the canvas/export modal, the generic `job_reason_failure` reasons that already work, or the convert HTTP contract (still 202).
- A global banner or any nag for users who never connected Notion.

## User story & acceptance criteria

*As a Notion user whose access was revoked after I queued a conversion, I want the Downloads page to tell me my connection expired and let me reconnect, so I'm not staring at a job that never finishes.*

- [ ] A convert job whose token is missing when the worker runs ends in `failed` (never stuck in `running`), carrying the `notion_token_expired` reason.
- [ ] A convert job whose token returns `unauthorized` from Notion ends in `failed` with the `notion_token_expired` reason — not the generic "something went wrong" string.
- [ ] On both, `markTokenInvalid(owner)` is called when a token row exists.
- [ ] The Downloads failure panel shows "Notion connection expired. Reconnect Notion" (→ `/notion`) for a Notion-sourced job with that reason, and shows no restart button for it.
- [ ] A non-Notion (file/upload) job that fails for an unrelated reason is unaffected — generic reason, no reconnect CTA.
- [ ] No migration is introduced.

## Leading indicator

Count of convert jobs left non-terminal (`running`/`processing`) past the worker timeout that trace to a revoked/absent Notion token — today unbounded, should trend to ~0. Secondary: a healthy non-zero count of `failed` convert jobs carrying the `notion_token_expired` reason (proof the path is exercised), and reconnect-completions among users who hit it.

## Open questions for the engineer

- Centralise the "Notion-auth failure → fail job + mark invalid" logic in one place the worker calls, vs inline in `performConversion`'s catch plus the pre-`performConversion` throw site? Prefer one helper if both sites can route through it; otherwise mirror #2770's inline pattern.
- Does the failure panel need a structured sentinel (prefix string like the existing `COLUMNS_AMBIGUOUS_PREFIX`) or is a stable reason constant + `source === 'notion'` check enough to branch the CTA? Pick the lighter one that the Downloads page already supports.
- Confirm the worker has the `database`/Knex handle to instantiate `NotionRepository` for `markTokenInvalid` (the worker already instantiates repositories inline).

## Design notes

- **Surface:** the existing Downloads `failurePanel` expandable row. No new component, no banner, no toast.
- **Copy (per VOICE.md), reusing #2770's phrasing:**
  - Reason / panel text: "Notion connection expired. Reconnect to keep converting pages."
  - CTA: "Reconnect Notion" → `/notion` (exact string and destination from #2770).
  - If a page title is available, prepend it the way the panel already handles context: "Couldn't convert <title>. Notion connection expired."
- **No restart button** for this failure (`restartable: false`) — a restart with the same dead token fails identically.
- **Suppression:** render the reconnect CTA only when `source === 'notion'`. File uploads have nothing to do with the Notion token; never show the raw sentinel string.

## Technical pre-flight

- **Layers touched:** `lib/storage/jobs/helpers` (`performConversion` catch), `usecases/jobs` (`jobFailureReason` — new reason; `SetJobFailedUseCase` already exists and guards double-set), `lib/conversionPool` (the missing-token throw site), `data_layer` (`NotionRepository.markTokenInvalid` — already added by #2770), `web` (Downloads failure panel CTA).
- **Files in play:** `src/lib/storage/jobs/helpers/performConversion.ts`, `src/usecases/jobs/jobFailureReason.ts` (+ test), `src/lib/conversionPool.ts`, `src/controllers/NotionController.ts` (the swallowing `.catch` at ~216), `web/src/pages/DownloadsPage/DownloadsPage.tsx` (failure panel ~429–459).
- **Cross-language:** none (TS only).
- **Effort:** **S** — ~10 lines of backend across two files plus tests; the frontend CTA is another ~15 lines and could split out, but the spec keeps them together since the reason string and the CTA are one user-visible behavior.
- **Dependency:** **must land after #2770** — `INotionRepository.markTokenInvalid` and the `invalidated_at` column don't exist on `main` until then. Rebase on `main` once #2770 merges before implementing.
- **Security / testing:** unit-test `performConversion` with a `NotionAPIWrapper` that throws `APIResponseError{code:'unauthorized'}` → assert job `failed` + `notion_token_expired` reason + `markTokenInvalid` called; and a missing-token path → assert job `failed`, not stuck. Web test: Downloads panel renders the reconnect CTA for a Notion job with the sentinel and hides it for a file job. No network in tests — stub the SDK at the module boundary.

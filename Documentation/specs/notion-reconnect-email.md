# Spec: Reconnect Notion email on token invalidation

### Trio synthesis
- **PM:** Fire one transactional email on the NULL→timestamp transition for `notion_tokens.invalidated_at`. Idempotent. Reset on reconnect. Out of scope: rate-limit failures, proactive expiry warnings, backfill, dashboard banner.
- **Designer:** Subject `Your Notion connection expired`. CTA `Reconnect Notion`. **No dashboard banner** — existing error path covers the interaction case, email covers the silent-sync case, a third surface is noise. Skip `workspace_name` in body (HTML-injection risk); workspace-name personalization deferred.
- **Engineer:** New `MarkNotionTokenInvalidUseCase` at `src/usecases/notion/` — repo stays persistence-only, service stays domain-only. Use the existing `UsersRepository.getEmailById` convention. **Add `reconnect_email_sent_at` column** + atomic conditional UPDATE (`WHERE reconnect_email_sent_at IS NULL`) to close the duplicate-send race. Static template body (only `{{ctaUrl}}`). SendGrid SDK direct (existing convention).
- **Agreement:** scope, use-case layering, idempotency via new column, no banner, transactional (no unsubscribe), no `instrumentedAxios`.
- **Conflict resolved:** designer proposed `{{workspaceName}}` in subject as an enhancement; engineer flagged user-supplied interpolation needs escaping; designer agreed it's marginal value. Spec keeps subject **static** for v1; workspace personalization moved to Next iteration.
- **Critical open question carried into scope:** the Ankify polling/sync path (`src/lib/ankify/jobs/`) and any other Notion call site may currently swallow `APIErrorCode.Unauthorized` without invoking `markTokenInvalid`. If so, the silent-sync users this email is *for* never trigger it. **Acceptance criterion** added: every Notion-client call site that catches `unauthorized` must route through the new use case.
- **Resulting plan:** new column + use case orchestrating (flag flip → email → atomic gate write); convert the two `NotionController` call sites and the Ankify poller to invoke the use case; new transactional template; 11 tests; changelog entry.

---

## Outcome

30% of users who receive the email click through and reconnect within 72h, restoring their sync. Baseline today is 0% because no email fires. Leading indicator: `notion_tokens` rows whose `reconnect_email_sent_at` was written within the last 72h **and** whose `invalidated_at` is now NULL again (= they reconnected).

## Goal alignment

Silent Notion-token death is invisible churn on exactly the users who use 2anki most — daily Notion → Anki sync. Recovering them keeps the active-uploader curve compounding toward 300K instead of leaking from the top.

## Problem

On 2026-05-29, `server-blue-error-60.log`:

```
@notionhq/client warn: request fail { code: 'unauthorized', message: 'API token is invalid.' }
@notionhq/client warn: request fail { code: 'unauthorized', message: 'API token is invalid.' }
```

Concrete user shape: a daily-sync user's token expires Tuesday. Wednesday–Friday no cards arrive in Anki. The user opens 2anki Saturday wondering why their deck looks stale, sees the in-app "Reconnect Notion" link, and reconnects — three lost study days they didn't know about. Users who never open the tab churn silently.

Today the web client surfaces `Your Notion connection expired — Reconnect Notion` (in `getErrorMessage.ts`) only when the user makes a request. The email closes the out-of-band loop.

## Riskiest assumption

That `NotionService.markTokenInvalid(owner)` is the single chokepoint where every invalid-token event flows. If the polling/sync path catches `APIErrorCode.Unauthorized` without invoking `markTokenInvalid` — or if a direct repository write or maintenance script sets `invalidated_at` — the email never fires for those exact silent users.

**Smallest test:** `grep -rn "invalidated_at\|APIErrorCode.Unauthorized\|code: 'unauthorized'" src/` before implementation. Every site that detects an unauthorized Notion response must route through `markTokenInvalid` (which the new use case wraps). Any site that bypasses it is either rewired or explicitly named in "Out of scope".

## Scope

**In**
- Migration: `npx knex migrate:make add_reconnect_email_sent_at_to_notion_tokens --knexfile ./src/KnexConfig.ts --migrations-directory ../migrations -x js` — adds `reconnect_email_sent_at TIMESTAMPTZ DEFAULT NULL` to `notion_tokens`. Then `pnpm kanel` to regenerate `src/data_layer/public/NotionTokens.ts`.
- New `MarkNotionTokenInvalidUseCase` at `src/usecases/notion/MarkNotionTokenInvalidUseCase.ts` orchestrating: flag flip → email lookup → conditional gate UPDATE → email send.
- New repository methods on `INotionRepository`:
  - `setReconnectEmailSent(owner): Promise<boolean>` — runs `UPDATE notion_tokens SET reconnect_email_sent_at = now() WHERE owner = ? AND reconnect_email_sent_at IS NULL`, returns whether the row was claimed (`affectedRows === 1`).
  - On `clearTokenInvalid(owner)` and on `saveNotionToken` (fresh OAuth), `reconnect_email_sent_at` resets to `NULL`.
- New `IEmailService.sendNotionReconnectEmail(email: string): Promise<void>` + constants entry `NOTION_RECONNECT_TEMPLATE` in `src/services/EmailService/constants.ts`.
- New template `src/services/EmailService/templates/notion-reconnect.html` — mascot header, dark-mode + responsive blocks, "The 2anki Team" sign-off, **no unsubscribe row** (transactional). Only `{{ctaUrl}}` variable.
- Rewire `NotionController.ts:118` and `NotionController.ts:141` to invoke the new use case instead of `void this.service.markTokenInvalid(owner)`.
- Audit every site that catches `APIErrorCode.Unauthorized` (Ankify poller + others surfaced by the grep) and route it through the use case.
- Tests: 9 use-case unit tests + 2 controller integration tests (full list below).
- Changelog entry at `web/src/pages/WhatsNewPage/changelog/2026-05-29-notion-reconnect-email.json`, type `"feature"`, title `Notion sends you an email when your connection expires so you can reconnect without checking the site`.

**Out**
- Rate-limit `429` failures (self-healing, no email).
- Proactive "your token may expire soon" emails before invalidation.
- Backfilling emails to users whose tokens were already invalidated before this ships.
- In-app banner on `/dashboard`.
- Workspace-name personalization in subject or body (escaping work + marginal value; deferred).
- Email retry/queue. Best-effort send; the user still sees the in-app error on next visit.

## User story

As a user whose Notion sync silently stopped, I want an email when my connection expires so I can reconnect from wherever I am — without first noticing my Anki deck went stale on its own.

## Acceptance criteria

- [ ] Migration adds `reconnect_email_sent_at` column; `pnpm kanel` regenerates `NotionTokens.ts`; no manual edit to `src/data_layer/public/`.
- [ ] `MarkNotionTokenInvalidUseCase.execute(owner)` calls `notionRepository.markTokenInvalid(owner)` first — the flag flip is the source of truth and happens regardless of what follows.
- [ ] The use case looks up the recipient via `usersRepository.getEmailById(owner)`. If the lookup returns undefined, the use case logs `{ owner, reason: 'no_email_on_file' }` and exits without sending.
- [ ] `setReconnectEmailSent(owner)` is called *before* the email send and only sends when it returns `true` (atomic gate). Concurrent invalidations race-resolve to exactly one email.
- [ ] Email send failures are try/caught: logged with `{ owner }` and `hashToken(bot_id)` if useful, **never the email address or raw token**. Failure does not throw out of the use case (it's already fire-and-forget from the controllers).
- [ ] `clearTokenInvalid(owner)` and `saveNotionToken` (on fresh OAuth) reset `reconnect_email_sent_at = NULL`.
- [ ] Subject line: `Your Notion connection expired` (static, no variables).
- [ ] Pre-header text: `Syncing paused — reconnect to keep converting Notion pages into Anki decks.`
- [ ] Body opening: `2anki lost access to your Notion workspace and can no longer convert your pages.`
- [ ] Body second line: `Reconnect your Notion account and your next conversion will pick up where you left off.`
- [ ] CTA button label: `Reconnect Notion`, links to `${process.env.DOMAIN}/notion`.
- [ ] Muted helper: `Your existing Anki decks are unaffected. Only future conversions from Notion require reconnection.`
- [ ] Sign-off: `The 2anki Team` (no exclamation marks, no "Happy studying").
- [ ] Footer tagline: `2anki.net — Turn what you study into Anki flashcards`. No unsubscribe row.
- [ ] Template structurally matches `inactivity-warning.html` (mascot header, dark-mode block, responsive block) per `email-templates.md`.
- [ ] Every site in `src/` that catches `APIErrorCode.Unauthorized` from `@notionhq/client` now routes through the use case. `grep -rn "unauthorized" src/ --include='*.ts'` confirms zero `markTokenInvalid` bypasses post-merge.
- [ ] Changelog entry exists; `id` matches filename; title matches the suggested copy exactly.

## Leading indicator

For the 7 days after deploy: count of `notion_tokens` rows where `reconnect_email_sent_at` was written and `invalidated_at` was subsequently cleared within 72h. Target: ≥ 30% reconnection rate. Baseline: 0% (no email today). Engineer pastes the 72h reconnection rate after the first full week into the implementation PR comments.

## Design notes

**Email content** (per `email-templates.md` + `VOICE.md`):

| Element | Copy |
|---|---|
| Subject | `Your Notion connection expired` |
| Pre-header | `Syncing paused — reconnect to keep converting Notion pages into Anki decks.` |
| Body opener | `2anki lost access to your Notion workspace and can no longer convert your pages.` |
| Body action | `Reconnect your Notion account and your next conversion will pick up where you left off.` |
| CTA | `Reconnect Notion` → `{{ctaUrl}}` |
| Muted helper | `Your existing Anki decks are unaffected. Only future conversions from Notion require reconnection.` |
| Sign-off | `The 2anki Team` |
| Footer | `2anki.net — Turn what you study into Anki flashcards` (no unsubscribe) |

**No in-app banner.** The existing error message in `getErrorMessage.ts` (`Your Notion connection expired — Reconnect Notion → /notion`) covers the interaction case at the point of failure. The email covers the silent-sync case. A dashboard banner adds a third touch on the same action without adding information; build it later if telemetry shows it's needed.

**Mobile rendering.** Copy the responsive block from `inactivity-warning.html` lines 18–23 verbatim — stretches `.email-card` to full width and tightens padding below the 600px breakpoint. The CTA button's `padding: 12px 32px` with `display: inline-block` stays tap-friendly at 375px.

## Technical pre-flight

**Layers touched**

| Layer | Change |
|---|---|
| `data_layer/` | Migration; new `setReconnectEmailSent` repo method; update `clearTokenInvalid` + `saveNotionToken` to reset the gate |
| `services/EmailService/` | New `sendNotionReconnectEmail` method; new template; new constant |
| `services/NotionService/` | No change — repository handles the gate write; service stays a thin pass-through |
| `usecases/notion/` | New `MarkNotionTokenInvalidUseCase` (new directory) |
| `controllers/` | `NotionController.ts:118` and `:141` swap from `service.markTokenInvalid` to `useCase.execute`. Any Ankify poller / upload controller site that catches `unauthorized` does the same. |
| `lib/ankify/` | If `scheduleAnkifyPolling.ts` or `services/ankify/*` catches `unauthorized` without routing, rewire. |
| `web/` | Changelog entry only — no UI changes |

**Files in play**

- `migrations/<timestamp>_add_reconnect_email_sent_at_to_notion_tokens.js` (new)
- `src/data_layer/public/NotionTokens.ts` (regenerated — do not hand-edit)
- `src/data_layer/NotionRespository.ts` (extend `INotionRepository`; add repo method; update `clearTokenInvalid` + `saveNotionToken`)
- `src/usecases/notion/MarkNotionTokenInvalidUseCase.ts` (new)
- `src/usecases/notion/MarkNotionTokenInvalidUseCase.test.ts` (new)
- `src/services/EmailService/EmailService.ts` (new `sendNotionReconnectEmail`)
- `src/services/EmailService/constants.ts` (new `NOTION_RECONNECT_TEMPLATE`)
- `src/services/EmailService/templates/notion-reconnect.html` (new)
- `src/services/EmailService/EmailService.test.ts` (extend with template-load test)
- `src/controllers/NotionController.ts` (swap 2 call sites to use case)
- `src/controllers/NotionController.test.ts` (extend; existing test asserts `markTokenInvalid` is called — update to assert use-case `execute` invoked instead)
- `src/lib/ankify/jobs/scheduleAnkifyPolling.ts` *or* the Ankify sync service (audit + rewire if needed)
- `web/src/pages/WhatsNewPage/changelog/2026-05-29-notion-reconnect-email.json` (new)

**Approach — orchestrator sketch**

```ts
// src/usecases/notion/MarkNotionTokenInvalidUseCase.ts
class MarkNotionTokenInvalidUseCase {
  constructor(
    private readonly notion: INotionRepository,
    private readonly users: Pick<IUsersRepository, 'getEmailById'>,
    private readonly email: IEmailService
  ) {}

  async execute(owner: number): Promise<void> {
    await this.notion.markTokenInvalid(owner);

    const claimed = await this.notion.setReconnectEmailSent(owner);
    if (!claimed) return;

    const recipient = await this.users.getEmailById(owner);
    if (recipient == null) {
      console.warn('[notion-reconnect] no_email_on_file', { owner });
      return;
    }

    try {
      await this.email.sendNotionReconnectEmail(recipient);
    } catch (err) {
      console.warn('[notion-reconnect] email_send_failed', { owner });
      // do not rethrow — flag flip is already persisted; user will see in-app error on next visit
      // do not roll back the gate — retry policy is out of scope
    }
  }
}
```

The gate is claimed *before* the send so a concurrent retry can't double-send. The trade-off: a transient SendGrid outage burns the gate without delivering the email. Acceptable for v1 (the in-app error path still catches the user on next visit); a retry queue is deferred.

**Test plan**

`MarkNotionTokenInvalidUseCase.test.ts`:
```
it('calls markTokenInvalid on the repository')
it('looks up the recipient via getEmailById')
it('claims the gate atomically via setReconnectEmailSent before sending')
it('sends the email when the gate claim succeeds')
it('does NOT send when the gate claim returns false')
it('does NOT send when getEmailById returns undefined')
it('does NOT throw when email send fails — caller is fire-and-forget')
it('does NOT log the recipient email address on failure')
it('logs owner id and a reason code on every non-happy path')
```

`NotionController.test.ts` updates:
```
it('invokes MarkNotionTokenInvalidUseCase when Notion returns Unauthorized on search')
it('invokes MarkNotionTokenInvalidUseCase when Notion returns Unauthorized on searchTopLevelPages')
```

Ankify poller test (if rewired):
```
it('invokes MarkNotionTokenInvalidUseCase when polling encounters APIErrorCode.Unauthorized')
```

**Effort: M.** Migration + Kanel regen + new use case + new repo method + new email method + new template + 2 controller swaps + Ankify-poller audit + 11 tests + 1 changelog entry. ~250 LOC including tests.

**Risks**
- *Email service outage:* gate is claimed before send; transient failure leaves the gate burned without delivery. Acceptable v1 trade-off; user still sees in-app error on next visit. Documented in scope.
- *Race / duplicate send:* fully closed by `WHERE reconnect_email_sent_at IS NULL` clause in the atomic UPDATE.
- *HTML injection:* body is static; only `{{ctaUrl}}` is interpolated, constructed from `process.env.DOMAIN`. No user-supplied data touches the template.
- *Bypass risk:* PM/engineer-flagged — any Notion call site that catches `unauthorized` without routing through the use case becomes a silent dead-end. Acceptance criterion + grep gate addresses this.

**Security & migrations**
- Migration required. Nullable `TIMESTAMPTZ`, no default. Existing rows treated as "not yet sent" — correct semantics.
- Never log the recipient email address. Use `owner` ID + `hashToken(bot_id)` from `src/lib/misc/hashToken` for debug surrogates (already convention in `NotionService.ts:10`).
- SendGrid SDK direct (existing convention across 14 send methods). Do not route through `instrumentedAxios`.

## Open questions

- Confirmed before coding: list every site that catches `APIErrorCode.Unauthorized` from `@notionhq/client`. Engineer pastes the grep output in the implementation PR body so reviewer can verify zero bypasses.
- 7-day follow-up nudge if the user doesn't reconnect after the first email — defer until open-rate data exists.

## Next iteration (not this PR)

- `{{workspaceName}}` personalization in the subject line, with proper escaping for unusual workspace names — designer wanted it, engineer flagged escaping work, deferred as a copy enhancement after we have open-rate baselines.
- Follow-up "still disconnected after a week" email.
- Backfill: a one-shot email send to users whose tokens were invalidated *before* this ships.
- Retry queue for transient SendGrid failures.
- Proactive "your token expires soon" warning if Notion ever exposes that signal.
- In-app banner on `/dashboard` — only build if telemetry shows users land there without converting despite the invalidated state.

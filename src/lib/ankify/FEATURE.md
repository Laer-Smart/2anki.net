# ankify — Notion → Anki sync

Background-job factories and pure helpers for the Ankify product (separate from the one-shot conversion path). No HTTP, no SQL, no third-party SDK clients here — those live in `src/services/ankify/`.

## What's here

- `jobs/scheduleAnkifyPolling.ts` — schedules the Notion poll loop (5-min cadence; webhook story is deferred per `Documentation/ankify/notion-webhooks-deferred.md`).
- `jobs/scheduleAnkifyReaper.ts` — cleans up dead/expired sessions and tokens.
- `scheduler/instance.ts` — singleton scheduler; survives one process lifetime.
- `nextDailyRunAt.ts` — pure cron-ish next-run calculation. Heavily tested.
- `notionWebhookSignature.ts` — HMAC verification for Notion's webhook payloads. Currently unused in prod (see deferred doc) but kept ready and tested.
- `access.ts` — `hasAnkifyAccess(user, subscriptions, autoSyncProductId)` returns true when `users.patreon === true` **OR** `subscriptions` contains an active row whose `stripe_product_id` equals `autoSyncProductId`. Single source of truth for the gate; consumed by `RequireAnkifyAccess` middleware, `ValidateAnkifySessionTokenUseCase`, and `AnkifyWebhookRouter`. Pass `process.env.AUTO_SYNC_PRODUCT_ID ?? ''` as the third argument at every call site. Exports `AnkifyAccessUser` and `AnkifyAccessSubscription` interfaces. `AnkifyAccessSubscription.stripe_product_id` is optional so that existing `Subscriptions` DB rows (which lack the column pre-migration) pass the type check — once `pnpm kanel` runs after the migration, the generated type will include it.
- `transforms/` — pure helpers for the bulk `.apkg`-input transform pipeline. `types.ts` defines `ParsedNote`, `TransformedNote`, the `TransformName` catalog (`translate_back`, `add_example`, `cloze_front`, `add_hint`), and the supported target-language list for `translate_back`. `prompts.ts` builds the per-note system + user prompt for each transform. `applyTransformedFields.ts` maps the LLM JSON result back onto the note, flipping `modelKind` to `'cloze'` for `cloze_front`. No Claude calls here — those live in `src/services/ankify/transformService.ts`. Plan gating for the transform surface uses `isPaying` (paid plan), not `hasAnkifyAccess` — Ankify and Transform are distinct paid surfaces.

## Things to know before editing

- **Gate:** Ankify is accessible to users with `patreon = true` (lifetime/grandfathered) **or** an active `subscriptions` row with `stripe_product_id === AUTO_SYNC_PRODUCT_ID` ($30/mo Auto Sync). Use `hasAnkifyAccess` from `access.ts`; do not reintroduce hard-coded emails. To widen further, edit `access.ts` only. Every call site must pass the subscription rows and `process.env.AUTO_SYNC_PRODUCT_ID ?? ''` — the caller is responsible for fetching subscriptions from the DB (see `RequireAnkifyAccess` for the pattern).
- **Don't add a global `NOTION_WEBHOOK_SECRET`** to docs or setup. That env var was the single-user shape and goes away when the deferred work resumes (per-subscription secrets, auto-registration via the user's OAuth token).
- **Pure functions only.** If you reach for `axios`, `knex`, or `@notionhq/client`, the code belongs in `services/ankify/`.
- The poll cadence is intentional — Notion's free-tier rate limits punish anything tighter. Don't drop it without measuring.

# Convert-failure UX: tighten the generic catch-all and ship a public status page

## Problem

Two recurring failure modes leave users with nowhere to go.

Generic per-conversion failure — the message every parser-class failure currently falls back to: *"Could not create a deck using your file(s) and rules. Make sure to at least create one valid toggle or verify your settings."* (u/BeatsbySaach, u/IndustryRadiant5597, u/NervousAd6018 on r/notion2anki — IndustryRadiant5597 hit this during exam week with no recourse.) Today, anything not classified as `EmptyDeckError`, `PythonExitError`, `COLUMNS_AMBIGUOUS`, Notion-unauthorized, or `pdfinfo_*` falls through to `genericFailureReason()` in `src/usecases/jobs/jobFailureReason.ts:44`, which only tells the user to email support with a job ID.

Site-down silence — when 2anki is actually unavailable, users have no way to confirm it: *"Is 2anki not working for anyone else?"* (u/lushkin) — co_amoxiclav_: *"yea wtf down since at least 4 hours ago for me"*; responsibleicarus: *"Same here, it's been down for at least 8 hours for me… I was mid uploading a deck, too."* Six independent "is 2anki down?" threads (u/Mother-Cantaloupe346, u/Effective-Suspect197, u/Perfect_Agency4628, u/Puzzleheaded_Big6256, u/lushkin, plus an older deleted post `10yrm6y`) show the same pattern: no status page, so the user asks the room.

## Goal

Tell the user what actually went wrong with their conversion, and give them a public page to confirm whether 2anki itself is the problem.

## Part A: the generic-error message

File: `src/usecases/jobs/jobFailureReason.ts`.

Add explicit branches before the final `return genericFailureReason(jobId)` for the failure classes we already know about from logs and support inbox. Each gets a one-line message that answers *what happened + what to do* per VOICE.md. Errors are classified by inspecting `error.name`, `error.code`, or the message prefix — not by parsing free-form messages.

| Class | Trigger | Message |
| --- | --- | --- |
| `parser_crash` | Uncaught exception from `src/lib/parser` (HTML, Markdown, XLSX) — wrap parser entry points to tag with `code = 'PARSER_CRASH'` | "Couldn't read this file. It may be malformed or use a structure we don't recognise yet. Try re-exporting from the source app, or send the file to support@2anki.net." |
| `worker_timeout` | Worker thread exceeds the per-job time budget (currently aborted with a generic Error) | "This conversion took longer than the time budget. Try splitting the file into smaller pieces, or remove very large embedded images." |
| `notion_rate_limit` | `APIResponseError` with code `rate_limited` (already imported from `@notionhq/client`) | "Notion is rate-limiting us right now. Wait a minute and convert again." |
| `notion_object_not_found` | `APIResponseError` with code `object_not_found` | "We couldn't open that Notion page. Share it with the 2anki integration in Notion, then try again." |
| `apkg_too_large_for_anki` | Output `.apkg` exceeds the AnkiWeb upload limit (250 MB) — checked after build, before delivery | "This deck is over Anki's 250 MB upload limit. Split it by toggling fewer pages, or upload directly to Anki desktop." |
| `zip_invalid` | `lib/zip` helpers raise an unzip / path-traversal / size error | "Couldn't read this zip. Make sure it's the Markdown & CSV export from Notion, not the HTML export." |
| `pdf_password_protected` | `pdfinfo_*` already classified — keep, but split a more specific subclass for password-protected | "This PDF is password-protected. Remove the password and try again." |

Generic fallback stays as a last resort:

> "Something went wrong on our end converting this file. Job ID `${jobId}`. Check status at 2anki.net/status — if everything's green, email support@2anki.net with the job ID."

The job ID + status link are the two affordances the current message lacks.

Wire-format: `UploadErrorCode` in `src/types/UploadErrorBody.ts` already exists; add the new codes there so the frontend can render per-class help inline instead of plain text. Backwards-compatible — older clients fall back to the human message.

## Part B: the status page

A new public route at `/status` on the web app (not gated, no PII, no auth) renders a single page with five live signals:

1. **API** — `GET /api/health` returns `{ ok: true, uptime, version }`. Add this route if it doesn't already exist; keep it cheap (no DB hit).
2. **Database** — a sub-second `select 1` from `/api/health/db`. Separate from API so a Postgres outage doesn't take the whole probe down.
3. **Notion** — last successful Notion API call within the past 5 minutes (read from a small in-memory ring buffer the existing NotionAPIWrapper writes to).
4. **Stripe webhooks** — last verified webhook receipt timestamp.
5. **Last deploy** — read from `process.env.DEPLOY_SHA` and `process.env.DEPLOY_TIME` written by the deploy workflow.

Plus a short incident strip — the last 3 entries from a flat `incidents.json` file Al edits by hand and the deploy pipeline ships. Format: `{ "id", "start", "end", "summary" }`. No DB, no admin UI, no subscriber notifications.

**Data source — pick one: live read from the server.** Render the status block by calling `/api/status` (a new endpoint that returns the five signals as one JSON payload, ~50 ms). Reason: a static JSON file written by the deploy pipeline only updates on deploy, which is exactly when status is most likely to be wrong. pm2/uptime probe is a second job to keep running; the live endpoint is one route on the server we already run. If the API itself is down, the page renders a fallback ("API unreachable — see r/notion2anki") which is the correct signal.

The convert-failure modal in the frontend gains one trailing line under the failure reason: *"Something looks off? Check status."* linking to `/status`. No tracking, no popover, no inline status — just a link.

## What NOT to build

- A full Statuspage.io clone (incident timeline, severity levels, component dependencies).
- An incident-history archive page beyond the 3-line strip on `/status` itself.
- Subscriber notifications (email, SMS, RSS, push).
- Per-region or CDN status charts — we run one box.
- A role-based admin status dashboard — separate concern; this spec is the public-health page only.
- A status-page CMS or rich-text incident editor — Al edits a JSON file.
- Auto-incident detection from logs — out of scope; manual.

## Success metric

When `/status` exists and the convert-failure modal links to it, the next "is 2anki down?" thread on r/notion2anki should either:

- Self-resolve in the first comment ("see 2anki.net/status — they were down 14:00–14:22 UTC, deploy at 14:25"), or
- If status is green, prompt the user to share a repro (file, error message, job ID) instead of asking the room whether the site works.

Tracking: scan the subreddit monthly for "is 2anki down" / "not working" threads; count how many include or reference `/status` within 24 hours. Target: 80% of such threads reference the page within 3 months of ship.

## Open questions

1. **Uptime data source.** This spec proposes a live read from `/api/status` (one server, one route). Alternatives considered: a static JSON file written by the deploy pipeline (stale during outages), or a third-party uptime probe like Better Stack / Uptime Kuma (extra dependency, extra credential). Should we instead front the page with a probe so the page survives a full server outage? If yes — which probe, and who owns the credential?
2. **SSR / prerender.** Should `/status` be added to `web/scripts/prerenderLandingPages.ts` so the shell HTML is cached by search engines and CDNs, with the live block hydrating client-side? Or kept as a pure SPA route to avoid stale prerendered timestamps?
3. **Failure-modal component reuse.** Does the existing convert-failure surface render through a shared component we can extend with the *"Check status"* link, or are there several copies across `web/src/pages/upload/`, `web/src/pages/notion/`, and the job-progress polling UI? If multiple, the spec's scope grows by one consolidation pass — flag in the implementation plan.
4. **Notion rate-limit classification.** The `@notionhq/client` `APIErrorCode` enum exposes `rate_limited` but not all wrapper layers re-throw it intact. Confirm `NotionAPIWrapper` preserves the `code` field before treating Part A's `notion_rate_limit` branch as free.
5. **AnkiWeb 250 MB limit verification.** AnkiWeb's hard upload ceiling has shifted before (it was 100 MB a few years ago). Confirm the current limit before shipping the `apkg_too_large_for_anki` copy with a literal number.

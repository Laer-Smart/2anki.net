# Photo-to-deck discoverability + mobile capture

### Trio synthesis

- **PM:** validation experiment — surface photo-to-deck on `UploadPage` + `HomePage`, instrument the funnel, set a ≥5% attempt-rate bar; data either justifies iOS investment or kills it.
- **Designer:** one surface only (`UploadPage`, below `UploadForm`, above `UpsellCard`), styled as the existing `.primer` strip; `HomePage` is a dead surface because it `Navigate`s logged-in users to `/upload` at `HomePage.tsx:113`.
- **Engineer:** telemetry plumbing exists (`track()` → `/api/events/track` → `EventsRepository`); event names live in two parallel allowlists (`web/src/lib/analytics/events.ts` and `src/types/AnalyticsEvents.ts`) that must be edited together or the server returns silent 400s; server already records `vision_photo_converted` on success (and uses it as the quota counter — do not break this).
- **Agreement:** the goal is measurement, not a redesign; the existing `PhotoToFlashcardsPage` stays untouched; success criteria gate the iOS decision.
- **Conflict:** PM wanted two surfaces (UploadPage + HomePage). Verified empirically — `HomePage.tsx:113` redirects logged-in users to `/upload`, so a HomePage tile would never reach the audience this experiment is testing. **Resolution: drop HomePage from scope**, ship UploadPage only. This also removes a confounding variable from the funnel read.
- **Post-review scope addition (by Alexander, after trio):** add mobile camera input to `PhotoToFlashcardsPage` — without it, surfacing photo-to-deck to mobile users is half a fix. Folded into this spec rather than split, since shipping the entry strip without the camera path would force a same-week follow-up PR touching the same page.
- **Resulting plan:** add one `.primer`-styled entry strip on `UploadPage` (logged-in users), add a "Take a photo" button to `PhotoToFlashcardsPage` using `capture="environment"` shown on touch devices, register four new web-tracked events in both event allowlists, fire them from the strip and from the upload + 429 paths, ship a SQL snippet for weekly funnel reads. Decide on iOS after 30 days of data.

---

## Outcome

Within 30 days of launch, ≥5% of weekly active uploaders attempt at least one photo-to-deck conversion, and ≥60% of those attempts produce a downloaded `.apkg`. Move the leading indicator "photo-to-deck attempt rate" from effectively unmeasured (the feature is reachable only via the sidebar) to a defensible weekly number. This is a validation experiment, not a feature build — the data either justifies the next investment (mobile-web camera polish or an iOS app) or kills it.

## Goal alignment

A photo of a textbook page is the shortest possible "drop something in, get a clean deck back." If learners actually use it, it is the simplest, fastest path we have — and the wedge for the next 100K users coming from mobile. If they don't, we stop debating iOS and reinvest the slot.

## Problem

Photo-to-deck ships at `/photo-to-deck` but is linked only from the logged-in AppShell sidebar. The main `UploadPage` — where every file-uploader lands — shows `.zip / .html / .md / .csv / .apkg / .pdf` affordances but offers no "got a photo?" path. We are debating whether to build an iOS app for a feature whose web demand we have never measured because users cannot find it.

## Riskiest assumption + smallest test

**Assumption:** a meaningful share of learners want to convert a photo into a deck at all. Every downstream argument — iOS, mobile capture polish, multi-page — collapses if web stays at near-zero uptake.

**Test:** surface photo-to-deck on the one surface uploaders touch (`UploadPage`), instrument the funnel end-to-end, run for 30 days, read the numbers. No redesign, no new capability — only discoverability and measurement.

## Scope

**In:**
- One entry strip on `UploadPage`, styled to match the existing `.primer` block, placed below `<UploadForm>` and above the upsell wrapper.
- A "Take a photo" button on `PhotoToFlashcardsPage` that opens the rear camera on touch devices (`<input type="file" accept="image/*" capture="environment">`), rendered alongside the existing dropzone (which keeps its "choose from library / drop a file" behavior). Visible to all devices; hidden via `@media (hover: hover) and (pointer: fine)` on pointer-precise desktops where it would read as noise.
- Four new web-tracked events: `photo_entry_point_viewed`, `photo_entry_point_clicked`, `photo_upload_started`, `photo_quota_reached`. Registered in both `web/src/lib/analytics/events.ts` and `src/types/AnalyticsEvents.ts`. `photo_upload_started` carries `{ source: 'camera' | 'library' }`.
- A documented SQL snippet (`Documentation/queries/photo-to-deck-funnel.sql`) returning weekly counts for each event plus the attempt-rate ratio against weekly active uploaders, with a split on `source` so we can see camera vs library uptake.
- Tests: Vitest for the strip's render + click; Vitest for the "Take a photo" input firing with the camera source; Vitest for the 429 path firing `photo_quota_reached`; Jest for `EventsController` accepting the new names.

**Success threshold (decides next step):**
- **Continue / scope iOS:** ≥5% of weekly active uploaders attempt photo-to-deck in any week within the first 30 days, **and** ≥60% upload→download success rate, **and** ≥1 free→paid conversion attributable to a `photo_quota_reached` paywall hit.
- **Kill:** <2% attempt rate sustained across all 4 weeks. Photo-to-deck stays where it is; iOS is shelved.
- **Hold:** 2–5%. Hold one more month, try one copy variation, then decide.

**Out:**
- `HomePage`, `LandingPage`, `ConvertLandingPage`, `NotionLandingPage` — logged-in `HomePage` is a dead surface (redirects to `/upload`); logged-out surfaces are out until logged-in uptake is proven.
- Redesigning `PhotoToFlashcardsPage` beyond adding the camera button, multi-page capture (one photo per session for now), OCR improvements, batch upload.
- The iOS app itself. This spec exists to decide whether iOS is worth scoping.
- New paywall copy. Existing free/paid gating stays untouched.
- A/B testing the entry-point placement. Single variant for the first 30 days.

## User story + acceptance criteria

**Story:** As a logged-in learner on the upload page, I want to know that 2anki can turn a photo of my notes into cards — not just files — so that when I'm holding a textbook or handwritten page I take the photo instead of bouncing.

**Acceptance criteria:**
- [ ] `UploadPage` shows the entry strip (logged-in users only), routing to `/photo-to-deck`.
- [ ] Strip styling reuses `.primer` (no new visual pattern, no new icon library).
- [ ] Free-plan hint renders only for non-paying users; copy matches `PhotoToFlashcardsPage.tsx` line 181 verbatim.
- [ ] `PhotoToFlashcardsPage` shows a "Take a photo" button on touch devices. Tapping it opens the rear camera on iOS Safari and Android Chrome; the captured photo flows into the same `handleFile`/`handleConvert` path.
- [ ] On pointer-precise desktops (`@media (hover: hover) and (pointer: fine)`), the "Take a photo" button is hidden; the dropzone remains the sole entry point.
- [ ] `photo_entry_point_viewed` fires on mount of the strip; `photo_entry_point_clicked` fires on CTA click.
- [ ] `photo_upload_started` fires when `handleConvert` begins, with `{ source: 'camera' | 'library' }`; `photo_quota_reached` fires on the 429 path.
- [ ] All four event names are registered in both allowlists and pass `EventsController.test.ts`.
- [ ] `Documentation/queries/photo-to-deck-funnel.sql` exists and returns weekly counts plus a camera-vs-library split.
- [ ] No change to the conversion pipeline, no change to free/paid limits.

## Leading indicator + threshold

`weekly photo-to-deck attempts / weekly active uploaders` ≥ 5% within 30 days. Sustained <2% kills the iOS scope.

## Open questions

- Does the entry strip belong above or below the existing UploadPage primer block? (Designer: below `UploadForm`, above `UpsellCard` — primer location TBD by the engineer when wiring.)
- Should `photo_quota_reached` carry `{ used, limit }` props? (Recommended yes — keeps the funnel honest about who's blocked vs who chose not to convert.)
- Define "weekly active uploader" in the SQL: any user who fires `upload_attempted` or its equivalent in a 7-day window. Engineer to confirm the existing event name and standardize.

---

## Design notes

**The user moment.** A logged-in user has just arrived at `/upload` with something to convert — notes on their phone, a textbook photo, a lecture slide — and doesn't realize "drop a file" doesn't cover photos they take on the spot.

**Recommendation.** Add a single, low-height entry strip on `UploadPage`, placed below `<UploadForm>` and above the `upsellWrapper`. Reuse the exact visual pattern of the existing `.primer` block in `UploadPage.module.css` — same `background: var(--color-bg-secondary)`, same left accent border, same `border-radius: var(--radius-lg)`, same `max-width: 800px`. An inline 16px camera icon (`color: var(--color-text-secondary)`) using the existing icon-import pattern is acceptable; no new icon library. Single link-style CTA (`btnInline` from `shared.module.css`) navigating to `/photo-to-deck`. No modal, no inline form. The strip is non-dismissible at this stage — small enough not to nag, and we don't want dismissal state on the server before the experiment runs.

**Copy.**
- Headline: **Try photo to deck**
- Subline: **Snap a textbook page, lecture slide, or handwritten notes — we'll make the cards.**
- CTA: **Open photo to deck**
- Free-plan hint (non-paying only): **Free plan: 5 photos per month**

Sentence case, no trailing periods on the button. "Open photo to deck" mirrors "Download deck" — names the destination, not the system action. The subline reuses the page's own concrete examples for consistency. Do not reuse "Snap a photo, get cards" as the strip headline — that is the destination page's H1 and would create a confusing echo.

**States.** Static strip — no loading, no empty state. The free-plan hint hides while `useUserLocals` is still loading rather than flashing a placeholder; renders based on `isPayingUser(data?.locals)` matching `PhotoToFlashcardsPage.tsx:181`. No remaining-photo counter on the strip itself.

**Mobile camera capture (post-trio addition).** Below the existing dropzone on `PhotoToFlashcardsPage`, render a primary-style button labeled **"Take a photo"** wired to a hidden `<input type="file" accept="image/*" capture="environment">`. The button container is hidden via `@media (hover: hover) and (pointer: fine)` so pointer-precise desktops continue to see only the dropzone. On phones and tablets, the button sits above the dropzone (camera is the more direct action on those devices). After capture, the same `handleFile` handler runs — preview, deck-name placeholder, convert flow all unchanged. Copy: "Take a photo" (primary), "or pick from your photos" as a subtle label above the dropzone on touch devices. No icon — the action verb carries it. Telemetry: `photo_upload_started` fires with `source: 'camera'` when the photo comes from the camera input, `source: 'library'` for the dropzone path.

**Verdict.** UploadPage is the right and only surface for the entry strip. `PhotoToFlashcardsPage` gets the minimal camera addition described above and nothing else. The tradeoff this design does not handle: a mobile user who taps the UploadForm dropzone immediately may scroll past the strip without seeing it. Acceptable for a validation experiment; if click-through is positive, the next step is a chip in `UploadSourceChips` alongside Dropbox and Google Drive — out of scope here.

## Technical pre-flight

**Layers touched.**

| Layer | Status |
|---|---|
| `routes/`, `controllers/`, `services/`, `data_layer/` | Read-only |
| `usecases/` | Read-only — `vision_photo_converted` already fires from `PhotoToFlashcardsUseCase` and feeds the quota counter; do not modify |
| `web/` | Primary edit surface — entry strip + event firing in `PhotoToFlashcardsPage` |
| Event allowlists | **Edit both** `web/src/lib/analytics/events.ts` and `src/types/AnalyticsEvents.ts` together |

**Files in play.**
- `web/src/pages/UploadPage/UploadPage.tsx` — add the entry strip below `<UploadForm>`, above `upsellWrapper`. Extract as a named component (Sonar S3776 risk if inlined with auth/plan conditionals).
- `web/src/pages/UploadPage/UploadPage.module.css` — reuse `.primer` styles; no new class unless absolutely needed.
- `web/src/pages/PhotoToFlashcardsPage/PhotoToFlashcardsPage.tsx` — add a second hidden `<input>` with `capture="environment"` plus a labeled "Take a photo" button; track which input fired and pass that as `source` to `photo_upload_started`. Add `track('photo_quota_reached', { used, limit })` in the 429 branch.
- `web/src/pages/PhotoToFlashcardsPage/PhotoToFlashcardsPage.module.css` — hide the camera button on `@media (hover: hover) and (pointer: fine)`; reorder so camera button sits above the dropzone on touch devices.
- `web/src/lib/analytics/events.ts` — add four new names to the `KnownEvent` union.
- `src/types/AnalyticsEvents.ts` — add the same four names to the `KNOWN_EVENTS` Set.
- `web/src/pages/UploadPage/UploadPage.test.tsx` — new entry strip renders, click navigates, `track('photo_entry_point_clicked')` fires.
- `web/src/pages/PhotoToFlashcardsPage/PhotoToFlashcardsPage.test.tsx` — assert `track('photo_quota_reached')` fires on the 429 path.
- `src/controllers/EventsController.test.ts` — extend to accept the four new event names.
- `Documentation/queries/photo-to-deck-funnel.sql` — new file.

**Telemetry gap.**

| Funnel step | Today | Action |
|---|---|---|
| Entry-point viewed | not recorded | add `photo_entry_point_viewed` |
| Entry-point clicked | not recorded | add `photo_entry_point_clicked` |
| Upload started | not recorded | add `photo_upload_started` in `handleConvert` |
| Conversion succeeded | recorded server-side as `vision_photo_converted` | no change — already powering the quota counter |
| Quota hit | 429 handled in UI but no event fired | add `photo_quota_reached` |
| Upgrade after paywall | known event `paywall_upgrade_clicked` exists | reuse if the page surfaces an upgrade CTA on 429 |

**Frontend telemetry approach.** `track()` from `web/src/lib/analytics/track.ts` POSTs to `/api/events/track` (anon-id middleware in place). Endpoint validates against `KNOWN_EVENTS`. Adding events requires editing both allowlists in the same PR — drift returns silent 400s because the client `.catch(() => {})`s.

**Cross-language coordination.** N/A — TypeScript only.

**Effort.** **M.** The UI strip is small, but coordinating both allowlists, firing four events across two files, and writing tests adds up.

**Security + testing notes.**
- `TrackEventUseCase.stripPiiKeys()` strips `email|token|password|filename|content|title`. Event props stay non-PII: `{ surface: 'upload_page' }`, `{ used, limit }`. User id is in `res.locals.owner`, not in props.
- Events table `name` column is `VARCHAR(64)` — no migration needed; enforcement is the allowlist.
- Sonar S3776: extract the entry strip as a named component; do not inline an auth/plan branch in `UploadPage.tsx`.

**Out of scope (flag).**
- A/B testing the entry-point placement — no experiment infrastructure; single variant for the 30-day read.
- Changing the free quota of 5 photos/month.
- Making `/photo-to-deck` accessible to anonymous users.
- A full upgrade modal on the 429 path (the page currently shows an error string; modal is a separate paywall design task).
- Backfilling historical analytics — events count only from the date this ships.
- Multi-photo capture (take several photos, one deck). The camera button takes one photo per session, same as the existing dropzone. Multi-shot is the obvious next step if camera adoption is real.
- Native camera permissions/error states beyond what the browser file input already provides.

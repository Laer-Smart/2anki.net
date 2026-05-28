# Spec: Reposition the Auto Sync pitch to the moment of pain

## Problem

> "lately I've started getting duplicates in my deck" — u/moussakzm (`n4xeif`)

Every edit to a Notion page changes the upstream block IDs, which changes the card GUIDs on re-export, which lands in Anki as duplicate cards next to the originals. Re-uploading an edited Notion page is the natural workflow for a self-directed learner — they study, find a gap in their notes, fix the note in Notion, re-convert. Today the only fix is "manually going through and deleting all of the 'duplicated' nested cards" (u/Mochapine_, via `Normal_Ad_9690`). The audience has been asking for this since 2022 (u/SterileCreativeType, `106bp19`) and the question recurs across r/notion2anki (`1k95th8`, `yxydot`, `jdfv36`, `1mvmmq2`).

Auto Sync ($30/mo) is the product that solves this. It exists, ships today, and is gated behind `hasAnkifyAccess`. The audience cannot find it: on 2026-05-24 the product had **0 active subscriptions and 1 external user ever** (who bounced because the initial sync returned `created: 0` with no diagnostic).

The pitch lives only on `/pricing`. The user only sees it by deliberate navigation. By the time they hit the duplicates pain, they have already left `/pricing` behind — they are on the convert-success surface, or downloading a deck from email, or back on `/account` looking at their history.

## Goal

Surface Auto Sync at the in-product moment the user perceives the duplicates pain, using the user's own words, with a one-click path to subscribe.

## Approach — placements, ranked by leverage

### Primary (must ship): convert-success surface

When a deck is successfully built from a Notion source the user has uploaded before (same Notion page id, or same deck title within the last 90 days), render a single line below the download button:

> Edited this page in Notion? Auto Sync keeps your deck up to date — try it free.

Link the line to `/pricing#auto-sync` (anchored — the pricing page should scroll to the Auto Sync card so the user lands on the offer, not the comparison table).

The pitch only fires on re-uploads. First-time uploads of a Notion source see nothing.

### Secondary: download-deck delivery email

For re-conversions where the user received the deck via the convert-link email (rather than direct download), add one paragraph to the end of the email body, above the sign-off:

> P.S. Edited this page in Notion? Auto Sync keeps your deck up to date — see how it works.

The link points to `/pricing#auto-sync`. The email is already a commercial template by the spec in `.claude/rules/email-templates.md` (it now contains an upsell pitch), so the send path must exclude `email_preferences.marketing_opt_out = true` users and the template must carry the unsubscribe footer.

### Tertiary: /account banner under PlanDetails

For signed-in users whose conversion history shows more than 1 successful deck built from any Notion source over the past 30 days, render a small banner under PlanDetails:

> Your decks already sync with us. Want them to sync with Anki too?

Link the banner to `/pricing#auto-sync`. Dismissible. Hidden for users who already have Auto Sync access (`hasAnkifyAccess === true`) and for users with no Notion conversions on record.

### Out of scope

- Auto Sync mentions on landing pages — wrong audience; they have not hit the pain yet.
- Upgrade modals interrupting the convert flow — friction at the wrong moment.
- Push notifications, Discord posts, broadcast email campaigns — out-of-product channels.
- A separate Auto Sync onboarding page beyond what `/pricing#auto-sync` already shows.
- An in-product free trial of Auto Sync — separate product decision; gating still flows through `hasAnkifyAccess`.

## Copy

Every line is sentence case, no trailing period on UI labels, no fake warmth, no exclamation marks. Each line answers what the user is feeling and what to do next.

| Placement | Copy | Link |
| --- | --- | --- |
| Convert-success (re-upload) | Edited this page in Notion? Auto Sync keeps your deck up to date — try it free. | `/pricing#auto-sync` |
| Convert-success CTA button | See how Auto Sync works | `/pricing#auto-sync` |
| Convert-link email P.S. | Edited this page in Notion? Auto Sync keeps your deck up to date — see how it works. | `/pricing#auto-sync` |
| /account banner | Your decks already sync with us. Want them to sync with Anki too? | `/pricing#auto-sync` |
| /account banner dismiss | Not now | (sets dismissal record) |

The convert-success line and the email P.S. share the same opening phrase ("Edited this page in Notion?") on purpose — the audience already used those words on Reddit, and consistency across surfaces lets the pitch carry from screen to inbox.

## Targeting and no-spam guard

The pitch must not feel like a campaign. Three guards:

1. **Re-upload signal only.** The convert-success line and the email P.S. only fire when the user has uploaded the same Notion source before. The signal source (page id, deck title, or upload hash) is an open question — see Open questions.
2. **Audience eligibility.** Hide every placement when `hasAnkifyAccess === true` for the current user. Auto Sync subscribers and lifetime/patreon users never see the pitch.
3. **Per-user dismissal, 60 days.** Each placement has its own dismissal record (so dismissing the /account banner doesn't suppress the next convert-success pitch). Dismissal persists in the database via a new `pitch_dismissals` table or equivalent — not `localStorage`, per the code-quality rule on cross-device persistence. Dismissal clears after 60 days so a user who dismissed in May still sees the pitch in July if they hit the pain again.

The email channel additionally honours `email_preferences.marketing_opt_out`, matching the existing pattern for commercial templates.

## What NOT to build

- An A/B framework for the pitch copy. Pick one line, ship it, measure against a baseline of 0 active subs. The first version of a feature shipping into a 0-baseline market does not need A/B infrastructure to learn.
- Paid acquisition campaigns built around this pitch. Auto Sync is a feature that solves a real workflow; it does not yet need a separate ad surface.
- An in-product chat or survey asking "did your edits propagate to Anki?" — the duplicates are visible to the user; we do not need to ask.
- A new dedicated Auto Sync landing page. `/pricing#auto-sync` is enough until the conversion rate from the in-product pitch tells us otherwise.
- A free trial of Auto Sync as part of this spec. The pitch can say "try it free" only if the free-trial decision lands first; otherwise drop the "try it free" suffix and keep the link CTA carry the offer. Resolving this is in Open questions.

## Success metric

**Primary:** N new Auto Sync subscriptions in 30 days post-launch, where N is measurable against today's baseline of 0 active subs. Target floor: 3 subscriptions in 30 days proves the pitch lands. Below 3 in 30 days means the placement is wrong or the offer (price, free trial) is wrong, not the copy.

**Secondary:** Convert-success pitch click-through rate above 2% on re-upload events. Click-through measured as `(clicks on the convert-success Auto Sync line) / (eligible re-upload events shown the line)`. Lower than 2% over the first 14 days = the line is invisible or the audience does not connect "duplicates pain" to "Auto Sync" — revisit copy.

**Counter-metric:** Convert-success page abandonment rate must not rise. If users start bouncing off the success page when the pitch appears, the line is in the wrong place.

## Open questions

1. **Email templating slot.** Does `convert-link.html` (or the live convert-success email template) have a way to conditionally render a P.S. block for re-conversions only? If the existing template engine cannot do conditional sections, a new template is needed — which is more work than the pitch warrants. Verify before scoping.
2. **Convert-success component anchor.** Is the convert-success page a stable, single component that can host the pitch line without restructuring? If the success state is rendered inline inside the conversion controller's response, we may need a new component before the pitch can land.
3. **Re-upload detection signal.** Where does "re-upload of the same Notion source" get computed? Three candidates: (a) Notion page id from the export (most precise, but Notion-export-only), (b) deck title fuzzy match (false positives on common titles like "Anatomy"), (c) upload hash (precise, but doesn't survive a user editing the page — which is exactly the case we want to detect). The job repository likely has enough state to answer this; needs a one-day investigation before the engineering scope is final.
4. **Free-trial framing for "try it free".** Does Auto Sync offer a free trial today, or does the "try it free" wording need to be dropped from the convert-success copy? If no trial exists, the pitch becomes "Auto Sync keeps your deck up to date — see how it works" and the CTA carries the conversion.
5. **Re-upload window.** Does "the same Notion source within the last 90 days" match how users actually re-upload, or is 30 days closer to the natural study cycle? Pull the distribution of re-upload intervals from the job repository before fixing the window.

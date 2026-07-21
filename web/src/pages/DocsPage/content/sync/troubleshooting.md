---
title: When sync gets stuck
description: Three things to try when your deck won't update.
---

Sync runs every five minutes in the background. Most of the time you don't notice it. When it does get stuck, it's almost always one of the three things below.

**Plan:** Auto Sync subscribers and Lifetime (sync is gated by the same access as [How sync works](/documentation/sync/how-it-works))

## Page didn't sync

You edited a Notion page. The deck in Anki didn't update. Try, in order:

1. **Wait five minutes.** Sync polls on a five-minute cadence to stay inside Notion's free-tier rate limits. If you just edited, it might not have run yet.
2. **Open the Ankify dashboard.** Each subscribed page shows the last run time and any error from that run. If you see an error, it usually points right at the cause.
3. **Check the page is still shared with the 2anki integration.** Notion sometimes drops the connection after a workspace change. Open the page in Notion, click **Share → Add connections**, and re-add 2anki.
4. **Check Anki is open with AnkiConnect running.** Sync writes to Anki through AnkiConnect — if Anki isn't open on the device that holds the deck, the run completes on our side but the deck doesn't change.

If the dashboard shows runs are succeeding but the deck still isn't updating, it's almost always AnkiConnect. Restart Anki, then trigger a manual sync from the dashboard.

## Anki shows a "Duplicate" dialog on re-import

The first time you re-import an existing deck after this change, card IDs switch to a new stable format. Anki's built-in "Duplicate" dialog appears once — pick **Keep existing**. Your reviews stay intact, and future re-imports update silently without prompting.

## I see a real duplicate deck

If two copies of the same cards exist in Anki, the older copy was imported before the ID change. Delete the older deck in Anki — keep the one with your review history. Future re-imports of the same source update the remaining deck in place.

If both decks have review history you care about, [contact us](/documentation/help/contact) before deleting either — we can sometimes merge.

## I revoked access by mistake

If you removed 2anki from your Notion workspace, sync stops running and the dashboard shows an authentication error. To restore:

1. Go to [2anki.net](https://2anki.net/) and sign in again with Notion.
2. Re-share the pages you want to sync — open each in Notion, click **Share → Add connections**, and pick 2anki.
3. Existing subscriptions resume on the next run. You don't need to re-subscribe.

Your card history isn't lost. The dashboard remembers which Notion pages mapped to which Anki decks.

## Still stuck?

If none of the above helped:

- Check [Common problems](/documentation/help/common-problems) for any error message you're seeing.
- [Contact us](/documentation/help/contact) — include the Notion page name, the Ankify run timestamp, and the error message from the dashboard.

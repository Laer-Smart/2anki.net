---
title: Send your reviews back to Notion
description: Push how often you got each card right back into your Notion database.
---

Review export writes your Anki review history into a Notion database. After a study session, each card's row updates with the date you studied and how many reviews it has — visible right next to your notes in Notion.

**Plan:** Available to Auto Sync subscribers and Lifetime members. The feature lives in the Ankify dashboard.

## What you'll see in Notion

Each card 2anki originally made from your Notion page maps to one row in the database you pick. After a sync runs, two properties update:

- **Date** — when you last reviewed the card.
- **Reviews** — total times you've reviewed the card.

Notion stays your source of truth for the question and answer. 2anki only writes those two numbers — it never touches your card content.

## Turning it on

1. Make sure the source page is already syncing through Auto Sync — see [How sync works](/documentation/sync/how-it-works).
2. Pick a destination database. You have two options:
   - Use an existing database that already has the right shape (a **Date** date-typed property and a **Reviews** number-typed property).
   - Let 2anki create a fresh database for you from the Ankify dashboard. It comes pre-set with the right shape.
3. From the Ankify dashboard, open the page's settings and turn on **Export reviews to Notion**.
4. Pick the destination database.
5. After your next Anki study session, the database rows fill in on the next sync cycle.

## Required Notion properties

The database needs these properties. Names must match exactly. Types in parentheses.

| Property | Type   |
| -------- | ------ |
| Date     | Date   |
| Reviews  | Number |

You can have other properties on the database too — 2anki only writes the two above. The Ankify dashboard shows a green check next to databases that already have the right shape, so you can pick one without guessing.

:::warning
If a property is missing or the wrong type, the sync skips that row silently. The Ankify dashboard run log shows which rows updated and which didn't.
:::

## Limits

- Review export runs on the same five-minute cadence as sync. It isn't real-time.
- Only cards 2anki originally created from that Notion page are tracked. Cards you added by hand in Anki don't match back.
- If you delete the Notion row, the matching Anki card stays — Anki is the source of truth for what you study, Notion is the source of truth for what you wrote.

If a row isn't updating, see [When sync gets stuck](/documentation/sync/troubleshooting).

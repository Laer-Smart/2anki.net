# GA4 bot-filter checklist — W21 (2026-05-18 → 2026-05-24)

Property: **286902985** (2anki.net)

Retro context: W21 new-user and Direct traffic totals are bot-distorted. Real human signal
(returning-user traffic) is -12.6% week-over-week, not the headline -20% shown in the raw
overview. This checklist applies a referrer-spam / bot filter to isolate the human baseline.

---

## Part 1 — Apply the filter

> **PENDING — Alexander**

1. Open [GA4 Admin](https://analytics.google.com/analytics/web/#/p286902985/admin) and select
   property **286902985**.
2. Go to **Data Settings → Data Filters**.
3. Click **Create filter**.
4. Choose **Bot and spam filtering**.
   - Filter name: `W21-bot-filter` (or your preferred convention)
   - Filter type: **Exclude** internal traffic is already separate; this step targets referrer
     spam.
5. Alternatively, create a **Custom filter** of type **Exclude** on dimension
   `Session source / medium` matching the known spam patterns observed in W21:
   - Contains `semalt`
   - Contains `buttons-for-website`
   - Contains `best-seo-solution`
   - Contains `seopowa`
   - Add any others from the Sessions by Source/Medium report with suspiciously round numbers
     or < 0 s session duration.
6. Set filter state to **Active**.
7. Click **Save**.

> Note: GA4 filters apply going forward. To retroactively clean W21 data, use the **Comparisons**
> feature (step below) rather than expecting filtered-view backfill.

---

## Part 2 — Re-pull W21 numbers with a comparison segment

> **PENDING — Alexander**

1. In GA4, open **Reports → Acquisition → Traffic acquisition**.
2. Set the date range to **2026-05-18 → 2026-05-24**.
3. Click **Add comparison** (top of the report).
4. Create a comparison segment that **excludes** the spam sources identified above:
   - Dimension: `Session source` does not contain `semalt` (add each pattern as a separate
     condition with AND logic).
5. Note the **New users** and **Sessions** counts for the filtered vs unfiltered comparison.
6. Record the delta in the table below.

---

## Part 3 — Compute the delta

Fill in after step 2 above:

| Metric | Raw (unfiltered) | Filtered | Delta |
|--------|-----------------|---------|-------|
| New users (W21) | — | — | — |
| Sessions (W21) | — | — | — |
| Returning users (W21) | — | — | — |
| Direct sessions (W21) | — | — | — |

Pre-filter retro note: raw new-user count was inflated; returning-user signal of **-12.6%** WoW is
the more reliable signal and does not require bot-filter adjustment because bot traffic by
definition has no returning-user cookie.

---

## Part 4 — Update the retro record

> **PENDING — Alexander**

Once the filtered numbers are in hand, update the W21 retro doc (or add a comment to issue #2778)
with:
- Filtered new-user count and % change from W20
- Whether the Direct traffic spike collapses under the filter (expected: yes)
- Revised WoW headline for the retro summary

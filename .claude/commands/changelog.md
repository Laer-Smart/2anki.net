---
description: Turn recent merged PRs into a user-facing changelog entry (also seeds blog/SEO content)
argument-hint: optional date range, e.g. "last 14 days"
---

Use the `pm` agent (with help from `designer` for tone).

This is the **batch / backfill** tool — it builds blog and SEO copy from a window of merged PRs. Per-PR changelog entries belong in `web/src/pages/WhatsNewPage/changelog/` (one JSON file per entry) and are added in the PR that ships the change (see CLAUDE.md > Changelog). By the time `/changelog` runs, those entries should already exist; this command consolidates them into distribution copy.

1. Pull merged PRs from the last $ARGUMENTS (default: 14 days). Use `gh pr list --state merged --search "merged:>=YYYY-MM-DD"`.
2. Cross-reference the JSON files in `web/src/pages/WhatsNewPage/changelog/` for entries dated in that window — they are the curated user-voice source. Note any merged user-visible PR that does not have an entry and flag it explicitly so the gap can be backfilled.
3. Group by user-visible category:
   - **New** — net-new features
   - **Improved** — enhancements to existing features
   - **Fixed** — bug fixes worth mentioning
   - **Behind the scenes** — perf/infra (only mention if user-perceptible)

4. Write each entry in user voice — what the user can now do, not what we changed. Follow the conventions in CLAUDE.md > Changelog (sentence case, no trailing period, ~120 chars, no hedge filler, no implementation details). Bad: "Refactored Notion image extractor." Good: "Notion pages with embedded images convert even when one image fails to load."

5. Output two formats:
   - **Short** (in-app changelog modal, ~150 words)
   - **Long** (blog post draft, ~600 words, SEO-aware — title with target keyword, H2 sections, one screenshot placeholder per feature)

The blog version is the seed for distribution content. Spanish translation is a separate pass — note which entries are most worth localizing.

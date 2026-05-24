---
description: Mine watering holes for product opportunities; observe conversations, sort findings into pain killers vs money multipliers
argument-hint: <market name, archive path, or URL set>
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

Sales Safari — direct observation of a market in its natural habitat. Listen, don't ask. The market already said what it wants; you just need to read what they wrote. Based on Amy Hoy & Alex Hillman's 30x500 method.

Target: $ARGUMENTS

## Why this skill instead of interviews

Interviews are unreliable. Prospects misremember what they do all day, can't accurately name their own pain, rationalize their purchases, and won't always tell the truth. Conversations in their natural habitat — subreddits, forums, mailing lists, Discord, support inboxes — are richer and more honest because they aren't performed for you.

## Process

1. **Identify watering holes** (skip if `$ARGUMENTS` is already an archive path or URL set).
   - Search `<market> + forum / mailing list / subreddit / Discord / wiki / meetup / awards / tutorials / user group / blog`.
   - Aim for 3+ active sources. List them back to the user before reading — they may want to redirect you.

2. **Decide research shape.**
   - **<100 conversations:** read sequentially yourself.
   - **>100 or multiple sources:** fan out 2–4 parallel `Agent` forks, each given an explicit slice (file list, URL set, or thread-ID range). Each fork returns under 1200 words: per-conversation tagging plus a Themes section. Don't peek at fork transcripts.

3. **What to capture per conversation** (one line each):
   - **Job:** what is the user trying to do?
   - **Pain point:** where is the friction?
   - **Tools they reach for today** — competitors, alternatives, hand-rolled workarounds.
   - **Signal words used verbatim:** *easier, faster, less, more, relief, finally, broken, hate, brutal, hell, drowning, give up.* These are the strongest signal.
   - **Acquisition tag:** YES / NO for this product. Skip threads tagged NO at synthesis time.
   - **1-line opportunity** if there is one. Skip the line if not.

4. **Categorize findings into two buckets** at synthesis:
   - **Pain killers** — reduce risk, anxiety, stress, fear, uncertainty, guilt, frustration. Look for skills they struggle with, repetitive tasks, things they avoid doing that they should, things they're afraid of.
   - **Money multipliers** — new revenue, wider customer reach, lower costs, ability to charge more. Look for where their money comes from, inefficiencies, how to charge more, new markets.

5. **Output (synthesis pass).**
   - **Cross-cutting themes table:** theme | count across slices | what it means.
   - **Strategic threats:** competitors named, new entrants, platform shifts (e.g., a marketplace giant shipping the feature natively).
   - **Ranked acquisition wedges** with effort estimate (S / M / L) and one-line rationale each.
   - **"If you only do one thing" pick** — single highest-leverage wedge with the trade-off explained in one sentence.
   - **Crazy ideas / weak signals** — the items you didn't rank but are worth knowing.

6. **Use the market's vocabulary verbatim.** If a user wrote *"make cards from X automatically,"* that exact phrase belongs in landing copy. Do not translate to product-marketing-ese ("automated content ingestion"). The whole point is to speak as one of them.

7. **Run `/trio` before specing anything.** The output of this skill is `/trio`'s input, not `/spec-draft-pr`'s. Pm validates prioritization, designer validates UX framing, engineer validates feasibility — only then does anything graduate to a spec.

## Anti-patterns

- **Stopping at vibes** ("language learners care about audio"). Always cite the thread or message ID so the trio can audit.
- **Sanitizing user voice.** If they wrote *"I'm drowning in cards,"* don't translate to *"users report card volume challenges."*
- **Naming reporters.** Strip names, workspace names, deck titles per `.claude/rules/support-confidentiality.md`. Use role or numeric ID.
- **Generating specs in the same pass.** Different cognitive mode — synthesis here, specs after `/trio`.
- **Proposing customer interviews.** Default is observation; only suggest interviews if the user explicitly asks or the watering holes turn up dry.
- **Re-mining the same archive every week.** Set a cadence (monthly for active subreddits, quarterly for forums). Re-mining the same conversations produces the same insights and trains learned helplessness.

## When to reach for this

- "What should we build next?"
- "Here's a Reddit dump / Discord export / support inbox — find opportunities."
- "We need a marketing angle for X."
- "How can we grow <market>?"

## When NOT to

- The user already did the research and is asking you to execute.
- The decision is internal (architecture, dep bumps, refactors) with no user-facing surface.
- A specific known user reported a specific bug — that's a ticket, not market research; reach for `/triage-feedback` or jump straight to a fix.

# Spec: homepage multi-source ingestion framing

## Outcome

Lift first-week organic acquisition by reframing the homepage hero, AI converter page, and Quizlet landing page around multi-source ingestion (Notion, PDF, Quizlet, Markdown, HTML, CSV) instead of Notion-only. Leading indicator: homepage hero bounce rate drops 5 points week-over-week; AI converter page upload-zone scroll-to-engagement rate at 375px improves measurably (Quizlet landing).

## Goal alignment

Mission says "drop something in, get a clean deck back" — the current hero implies that "something" must be Notion. Fixing that is both simpler/faster/more beautiful (the homepage stops lying about what we accept) and a 300K-scale lever (we stop turning away every non-Notion searcher arriving from r/Anki, Reddit, and "convert X to Anki" queries).

## Problem

Acquisition signal from a 50-thread r/Anki sweep shows recurring "make cards from X automatically" intent across PDFs, ebooks, Instagram saves, and subtitles. The 2anki homepage hero leads with Notion, so source-specific searchers read the headline, conclude we're Notion-only, and bounce before scrolling to the source list strip. Separately, an "AI slop deck" was moderator-removed on r/Anki; community comments warn against AI-fabricated decks. Our AI converter page has no stance distinguishing *conversion* (source-faithful) from *generation* (fabricated facts), which leaves a returning skeptic with nothing to anchor on. AnkiDroid's GSoC 2026 native LLM generator is shipping into AnkiDroid itself — our moat must be multi-source ingestion, not prompt-to-deck, and the homepage has to reflect that.

## Riskiest assumption

That broadening the hero subhead to enumerate formats does not erode conversion from Notion-led searchers (our largest historical inbound segment). If Notion-intent users read the broader subhead and feel less confident the product handles their flow, hero CTA clicks from Notion-referred traffic drop and the move is a wash.

## Smallest test

After ship, watch homepage CTA click-through segmented by referrer (Notion-related searches vs everything else) for one week against the prior week. If Notion-referrer CTR drops more than 5%, revert the hero subhead and keep the AI converter and Quizlet landing changes (they don't affect the Notion path).

## What we're changing

1. **Hero subhead** — `web/src/pages/HomePage/components/Sections/hero/index.tsx`. Replace the current Notion-led subhead with: `Notion, PDF, Quizlet, Markdown, HTML, CSV — drop any of these and get an Anki deck back.`
2. **AI converter page** — copy line directly above the upload zone reads: `Your notes in, your cards out — we don't invent facts or fill gaps.` (Component path to be confirmed during implementation; the existing AI converter page is the only surface.)
3. **Quizlet landing page** — `web/src/pages/LandingPage/copy/quizlet.ts` (copy already exists). Fix the layout so the upload zone is the first thing visible at 375px viewport height, not the third section. Hero copy, source list strip, and SEO content move below the fold.

## What we're NOT doing

- Not redesigning the homepage, AI converter page, or Quizlet landing page beyond the three changes above.
- Not adding new components, illustrations, or marketing sections.
- Not touching the source list strip lower on the homepage — only the hero subhead.
- Not changing the AI converter's pipeline, models, prompts, or output behavior — copy-only.
- Not building EPUB, Kindle, subtitle, or Instagram ingestion as part of this spec.
- Not changing the protected `100 cards per month` string on `/pricing`.

## User story

As a learner arriving on 2anki.net from a non-Notion query (e.g. "Quizlet to Anki", "PDF to flashcards"), I want the homepage to tell me in one sentence that my source is supported, so that I scroll to the upload zone instead of bouncing to a competitor.

## Acceptance criteria

- [ ] Homepage hero subhead reads exactly: `Notion, PDF, Quizlet, Markdown, HTML, CSV — drop any of these and get an Anki deck back.` — Oxford comma, em dash, sentence case, no trailing period beyond the period already in the sentence.
- [ ] AI converter page shows `Your notes in, your cards out — we don't invent facts or fill gaps.` directly above the upload zone, visible without scrolling on a 1280×800 viewport.
- [ ] Quizlet landing page at 375px viewport renders the upload zone in the first scroll position (top of the page below nav), with hero copy reflowed below.
- [ ] No console errors on homepage, AI converter, or Quizlet landing at 375px or 1280px.
- [ ] Browser check section in the PR body: both `[x] Golden path on localhost:3000` and `[x] No console errors at 375px` ticked (per `.claude/rules/browser-attestation.md`).
- [ ] Changelog entry added to `web/src/pages/WhatsNewPage/changelog/` with `type: "style"` describing the multi-source framing (one line, sentence case, no trailing period, user voice — see CLAUDE.md changelog rules).

## Open questions

- AI converter page component path — needs a one-grep confirmation during implementation (`web/src/pages/AIConverter*` or similar).
- Does the Quizlet landing page's existing copy file need a structural change (component reorder) or only a CSS order/flex change? Implementer to choose the smallest diff.
- Do we keep the existing hero illustration, or does the new subhead read better with reduced visual weight on the illustration? Designer call at implementation time; default is keep as-is.

## Out-of-scope follow-ups

- EPUB and Kindle ingestion — separate spec when prioritized.
- AnkiWeb sync push — engineer ruled out (fragile reverse-engineered protocol).
- Subtitle / SRT deck creation — deferred.
- Instagram and other social-source ingestion — deferred; revisit if r/Anki signal sustains.
- Per-source landing pages for PDF, Markdown, HTML, CSV beyond the existing Quizlet landing — defer until the framing change shows it pulls traffic worth specializing.

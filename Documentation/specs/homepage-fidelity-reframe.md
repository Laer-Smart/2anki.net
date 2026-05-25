# Spec: Homepage fidelity reframe

**Type:** `feat:` (copy + a dev-only preview route)
**Status:** Draft — awaiting `/implement`
**Part of:** SEO recovery, following the canonical-host redirect (#2793)

## Problem

The homepage hero leads with generality, not the moat. Today it reads:

- **Headline:** "Your notes, ready to study in Anki"
- **Subhead:** "Notion, PDF, Quizlet, Markdown, HTML, or CSV — drop a file and get an Anki deck back."

Both are true and neither is wrong, but they bury what makes 2anki different from every other converter: the decks come out **correct in Anki** — proper cloze, atomic cards, the right note types — so the user doesn't have to fix them by hand. The endorsed positioning leads with that fidelity moat and reframes AI as a feature that *serves* fidelity rather than the headline act.

Separately, the meta description (`web/index.html`) says "Drop a Notion page, PDF, or markdown file and get a beautiful Anki deck back. Free and open source." The top related SERP query is Notion, but the description doesn't lead with it and doesn't claim the fidelity moat that wins the click.

## Recommendation (one)

Reframe the homepage hero and meta description around **Anki fidelity, led by Notion**, and reposition AI as a supporting feature. Ship the copy behind a side-by-side `/dev/home-preview` route so Al picks the final headline from rendered candidates rather than from a doc.

### Hero copy (recommended candidate — variant A)

- **Headline:** Flashcards that work in Anki
- **Subhead:** Drop a Notion page and get a deck you don't have to fix — proper cloze, atomic cards, the right note types. PDF, Quizlet, Markdown, HTML, and CSV too.

Ship two more candidates in the preview route so the choice is visual, not theoretical:

- **Variant B — moat-as-claim:** "The converter whose decks you don't have to fix" / "Notion, PDF, and more in, clean Anki cards out — cloze, atomic cards, and note types done right."
- **Variant C — Notion-forward:** "Notion to Anki, done right" / "A deck you can study the moment it lands — correct cloze, atomic cards, and note types. PDF, Quizlet, Markdown, HTML, and CSV too."

All three lead with fidelity and name Notion first among formats. Final wording is Al's pick from the preview; the implementer ships the chosen variant as the live hero and leaves all three in the preview route.

### AI repositioned as a feature that serves fidelity

The hero keeps the existing "AI is off / Create an account to turn it on" badge as-is — it already frames AI as opt-in, not the headline. Where AI is described in body copy, frame it as serving fidelity, not as the selling point: **"AI that respects Anki's format — proper cloze, atomic cards, correct note types."** Do not elevate AI above the fidelity line. Do not add a new AI hero, banner, or section.

### Meta description (rewritten, Notion-led, `web/index.html`)

Replace the four matching `content="Drop a Notion page, PDF, or markdown file and get a beautiful Anki deck back. Free and open source."` strings (the `description`, `itemprop`, `og:description`, and `twitter:description` tags) with:

> Convert Notion to Anki and get a deck you don't have to fix — proper cloze, atomic cards, and the right note types. PDF, Markdown, and more. Free and open source.

Leads with the Notion query, claims the fidelity moat, stays under ~155 characters for the SERP snippet. Keep the existing `<title>` ("Convert Notion to Anki Flashcards — 2anki.net"), keywords, and JSON-LD untouched.

### Testimonial slots (optional, placeholder only)

Optionally add 1–2 testimonial slots under the hero to carry the fidelity story in a real voice. **Do NOT fabricate quotes or attribute fake people.** Spec them as empty PLACEHOLDER slots — render nothing (or a dev-only stub visible solely in `/dev/home-preview`) until Al fills them with real, sourced r/Anki quotes. The production homepage ships with zero testimonials unless Al supplies real ones in the same PR.

## What NOT to build

- **No pricing changes.** The `/pricing` copy and "100 cards per month" are protected strings (VOICE.md) — do not touch them, do not restate the limit on the homepage.
- **No new pages** and **no changes to other landing pages** (`NotionToAnki`, `PdfToAnki`, `QuizletToAnki`, etc.) — those have their own prerendered meta via `web/scripts/prerenderLandingPages.ts`; leave it alone.
- **No fabricated testimonials**, no stock avatars, no invented names or institutions.
- **No new AI section, badge, or hero.** AI stays opt-in and supporting.
- **No JSON-LD, title, or keyword changes.** Scope is the hero copy + the meta description + the preview route only.
- **No layout, component, or design-system rework.** This is a copy reframe, not a redesign — reuse the existing hero markup and styles.

## Required: `/dev/home-preview` route

Per the repo's visual-direction rule, implementation **must** ship a `/dev/home-preview` route gated on `import.meta.env.DEV`, rendering all three headline/subhead candidates side by side (and the testimonial-slot stub if built). Follow the existing pattern — `/dev/account-preview` and `/dev/notion-preview` — with direct prop injection, no auth gate, no nav link, no analytics. The route stays in the repo after merge as a regression check.

## Shared files implementation will touch

- `web/src/pages/HomePage/HomePage.tsx` — live hero headline + subhead; the AI-feature framing line if added.
- `web/index.html` — the four meta-description strings (`description`, `itemprop`, `og:description`, `twitter:description`).
- `web/src/App.tsx` — register the `import.meta.env.DEV`-gated `/dev/home-preview` route (shared file — coordinate merge order with any other in-flight PR touching `App.tsx`).
- New: `web/src/pages/HomePagePreview/` (or similar) — the preview page component. New file, no conflict.

## Success check

- Hero leads with the fidelity moat; Notion is the first format named.
- Meta description leads with "Convert Notion to Anki" and claims the fidelity moat, under ~155 chars.
- `/dev/home-preview` renders all candidates and does not ship a chunk in `pnpm --filter 2anki-web build`.
- No production testimonial copy exists unless Al supplied real quotes.
- `/pricing` and "100 cards per month" untouched.

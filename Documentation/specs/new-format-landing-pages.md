# Spec: new format landing pages (PowerPoint, GoodNotes, AI generator wedge)

**Status:** draft, awaiting `/implement`
**Type:** feat
**Owner:** engineer (after trio)

## Why

After the canonical-host redirect (#2793), GSC shows a growing demand cluster we don't rank for: "anki flashcard generator / ai anki card maker / anki creator", plus "powerpoint to anki" and "goodnotes to anki". We have proven format-landing infrastructure (`/pdf-to-anki`, `/quizlet-to-anki`, etc.) and three of these terms map to capabilities we already ship. Capturing them is pure SEO upside toward 300K, with no new product surface to build.

Positioning is fixed: **lead with Anki fidelity** — we turn your real notes into real cards. AI is a supporting feature, never the headline. Each page must be honest about what 2anki actually does.

## Feature-existence findings (investigated, not assumed)

| Page | Real capability? | Evidence | What the page says |
| --- | --- | --- | --- |
| `/powerpoint-to-anki` | **Yes — native** | `src/lib/parser/sourceUnits/extractPptxSourceUnits.ts` parses `.pptx` slide text + speaker notes; Google Slides export maps to `.pptx` in upload (`createGoogleDriveDownloadLink.ts`). | Honest native PowerPoint import. Slides become cards; speaker notes carry across. |
| `/goodnotes-to-anki` | **No native importer** (correct — GoodNotes exports to PDF) | Zero GoodNotes references in source. PDF import exists (`extractPdfText.ts`, `synthesizeCardsFromPdf.ts`). | Routes the user through the existing PDF flow honestly: "Export your GoodNotes notebook as PDF, drop it here." Must NOT claim a native GoodNotes importer. Handwriting needs a text layer (typed notes / OCR'd export) — say so. |
| `/ai-flashcard-generator` | **Partial — a real study chat exists, gated** | `/chat` (auth-gated) runs Claude: free tier = Haiku, 20 msgs/mo; `patreon` = Sonnet + MCQ (`src/usecases/chat/ChatUseCase.ts`). It generates cards from text you type/paste. PDF conversion is deterministic, not AI (`synthesizeCardsFromPdf.ts`). | Ranks for the AI term, converts the click to fidelity. The chat's own prompt already refuses to hallucinate from images. Honest line: "We don't hallucinate flashcards from PDFs — we turn your real notes into real cards." Then point to upload (fidelity) and mention chat as the supporting AI surface. Must NOT promise an autonomous "AI generator" that invents cards from nothing. |

## What we're building

Three top-level format landing pages, leading with fidelity, each honest about the real capability above. They follow the **existing** top-level format-page pattern (e.g. `/pdf-to-anki`) exactly — a `LandingCopy` module, a thin wrapper component, a route, a prerender entry, a sitemap URL. No new framework.

1. `/powerpoint-to-anki` — "Make Anki flashcards from a PowerPoint" — native `.pptx`, slides + speaker notes become cards. FAQ: which slide content becomes a card, speaker-notes behaviour, Google Slides via export, image-only slides.
2. `/goodnotes-to-anki` — "Turn GoodNotes into Anki flashcards" — H1 leads with fidelity, subhead routes through PDF: "Export your notebook as PDF, drop it here." FAQ: handwriting needs a text layer, how to export PDF from GoodNotes, what becomes a card (same as `/pdf-to-anki`).
3. `/ai-flashcard-generator` — "Turn your notes into Anki cards" (wedge — ranks AI, converts to fidelity). Subhead: real notes in, real cards out — no hallucinated cards. FAQ: what the AI actually does (study chat generates cards from text you provide), what it does NOT do (invent facts, read images), how the chat is gated (sign-in, free Haiku tier with monthly cap).

All three copy decks follow VOICE.md: specific, direct, no fake warmth, sentence case, no exclamation marks, no banned words ("powerful", "seamless", "amazing").

## Ships in ONE PR

All three pages touch the same shared files, so they ship together (one PR, off clean `main`) — splitting them would create three-way conflicts on `App.tsx`, the prerender script, and the sitemap.

## Shared files the implementation touches

- `web/src/pages/LandingPage/copy/powerpoint.ts`, `goodnotes.ts`, `ai-flashcard-generator.ts` — new `LandingCopy` modules (one per page).
- `web/src/pages/LandingPage/PowerpointToAnki.tsx`, `GoodnotesToAnki.tsx`, `AiFlashcardGenerator.tsx` — new thin wrappers (mirror `PdfToAnki.tsx`).
- `web/src/App.tsx` — three `lazy()` imports + three `<Route>`s (mirror the `/pdf-to-anki` block). **Shared file — coordinate merge order.**
- `web/scripts/prerenderLandingPages.ts` — add the three copies to `LANDING_COPIES`. **Shared file.** Update `prerenderLandingPages.test.ts` for the new count/paths.
- `web/public/sitemap.xml` — three new `<url>` entries. **Shared file.**
- Tests: a `*.test.tsx` per new page (renders, asserts H1/canonical), per the testing rule that new sources ship with tests.

## What NOT to build

- **No page that promises a non-existent feature.** No "native GoodNotes import", no "AI that reads your handwriting", no autonomous "generate a deck from a topic" that invents facts. If the page can't be honest, it doesn't ship.
- **No comparison-vs-Ankify page.** Ankify is our own integrated product, not a competitor.
- **No new landing-page framework, component library, or config abstraction.** Reuse the `LandingCopy` + wrapper + route + prerender + sitemap pattern that `/pdf-to-anki` already uses. Do not refactor the existing pages to fit a new shape.
- **No new upload/parser code.** PowerPoint and PDF import already work; the pages route to the existing `/upload` flow.
- **No changes to the `/chat` gate, model selection, or limits.** The AI page describes the existing surface; it does not alter it.

## Success criteria

- Three pages live at the slugs above, prerendered with correct `<title>`, meta description, and canonical, listed in the sitemap.
- Each leads with fidelity; none overclaims. GoodNotes page routes through PDF honestly; AI page converts the AI term to the fidelity message.
- `/check` green; prerender test updated; one changelog entry (`feature`) — "PowerPoint, GoodNotes, and AI flashcard pages" framed in user terms.

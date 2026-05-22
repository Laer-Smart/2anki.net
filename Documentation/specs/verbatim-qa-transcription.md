# Verbatim Q&A / MCQ transcription from images

## Problem

A large segment of learners already has practice material — past exams, review sheets, MCQ booklets, tutor handouts — on paper or as photos. Today the only way to study those in Anki via 2anki is to retype every question and answer by hand. The existing Photo-to-Deck flow (and PR #2612, which adds MCQ emission) is **generative**: the model reads source material and *invents* new questions from it. That is the wrong shape when the user already has the questions they want to study. External review (May 2026) called this out directly:

> Add the ability to upload a picture of a test or review sheet and have the AI accurately transcribe existing Q&A or MCQs verbatim into a chosen template. Support accurate transcription of already-prepared practice material, since many users prefer to revise from questions they already have.

Issue #1156 ("img2anki OCR Support") was opened on this exact need and closed without shipping. Issue #2573 covers heading-heuristic Q/A extraction from digital PDFs — a different surface (text, not pixels) and a different problem (structure inference, not OCR).

## Goal

Let a user upload one or more photos of a question sheet and get back an Anki deck whose cards are **verbatim copies** of the questions and answers on the page. No paraphrasing. No invented distractors. The cards match what is on the paper, full stop.

Trace to 300K users: this unlocks a user segment we currently turn away — students with stacks of past papers, professionals with printed review books, language learners with workbook pages. Every one of those is a person whose first interaction with 2anki today ends with "I'd have to retype everything." Removing that wall converts a sizeable share of the photo-upload traffic we already see into completed decks.

## Non-goals

- **Not generation.** The model must not invent questions, rephrase prompts, expand abbreviations, generate distractors, or "improve" answers. If the source page has four MCQ options and one is blurry, transcribe what is legible and flag the rest — do not fill the gap.
- Not a replacement for PR #2612's generative MCQ path. They sit side by side: generative produces cards *about* source material; verbatim copies cards *from* source material.
- Not digital-PDF text extraction (that is issue #2573).
- Not handwriting recognition as a first cut. Printed and clearly hand-printed pages only at launch; cursive is a follow-up.
- Not multi-page document stitching at launch. One upload = one batch; the user can upload a second batch for a second page.

## Proposed shape

**Surface:** a mode toggle on the existing Photo-to-Deck page, not a new route. Two radio options at the top of the upload form:

- *Generate cards from this material* (default — the current behaviour, including PR #2612's MCQ output)
- *Transcribe questions verbatim* (new)

Picking the verbatim option swaps the prompt sent to the model and the template selection logic. Same upload widget, same progress UI, same delivery — only the prompt and the card-shape detection change. This keeps the learning curve flat and lets us A/B the mode split.

**Prompt contract (verbatim mode):**

> Transcribe the questions and answers on this page exactly as written. Do not paraphrase. Do not invent questions. Do not add distractors. Do not expand abbreviations. If text is illegible, output the token `[illegible]` in place of that character or word. Preserve original ordering. Return structured JSON with one entry per question.

**Template selection:** auto-detected from the structured JSON the model returns:

- If every entry has `{ question, options[], correct_index }` → **MCQ template** (the one PR #2612 ships).
- If every entry has `{ question, answer }` and no options → **Basic template**.
- If an entry has `{ text, cloze_spans[] }` → **Cloze template**.
- Mixed pages produce a mixed deck; each card uses the template appropriate to its source entry.

The user does not pick a template — the page picks one. If detection is ambiguous, default to Basic and surface the count of skipped/ambiguous entries in the result screen ("82 cards. 3 entries skipped — couldn't tell the format").

**Storage and review:** transcribed cards land in the same `decks` table as any other Photo-to-Deck output. No new schema. The mode is recorded on the deck row (`source_mode: 'verbatim' | 'generative'`) so we can measure mix and so the result screen can show "Transcribed from your upload" vs "Generated from your upload" honestly.

## Open questions

- **Confidence surface.** Do we show per-card confidence in the review step, or only flag `[illegible]` cards? Surfacing every confidence number adds noise; flagging only the uncertain ones is cleaner but hides graceful degradation.
- **Multi-page batching.** Users will upload an 8-page past paper as eight separate photos. Do we stitch them into one deck automatically (same upload session) or one deck per photo? Probably one deck per session, but needs a quick check against current Photo-to-Deck batching behaviour.
- **MCQ correct-answer detection.** Many practice sheets show the answer key on a different page or at the bottom in small print. If the model can't see the answer, do we emit the MCQ with no correct answer marked (forcing the user to fill it in), or refuse the card? Leaning toward emit-without-answer with a banner in the result screen.
- **Cost ceiling.** Photo-to-Deck already has a per-user monthly limit; verbatim transcription uses the same vision call. Does it count against the same quota, or get its own? Default: same quota — keeps the pricing page honest.
- **Quality bar before ship.** What's the accept rate (transcription matches source) we need on a 50-page eval set before flipping the toggle on for everyone? Suggest 95% character-level accuracy on printed pages as the bar; below that we ship behind a feature flag.

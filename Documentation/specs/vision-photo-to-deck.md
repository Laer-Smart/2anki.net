# Claude Vision — photo → deck

**Issue:** #2506
**Status:** spec / not yet implemented

## What

A learner uploads a photo (textbook page, whiteboard, lecture slide, handwritten notes). Claude Vision extracts atomic Q/A pairs. They get a `.apkg` back. No Notion. No file format conversion. No export step.

## Why

Removes the largest capture step we have ever removed. Every other 2anki input today requires the learner to first move content into a structured tool. Photo is zero friction. Audience: students, language learners, certification preppers who do not live in Notion.

**Leading indicators:**
- First-session deck-download rate from photo uploads
- Photo-source share of `/upload` volume at 30 days

## v1 scope

**In:**
- One photo → one deck → `.apkg` download
- Web upload page (`ImageOcclusionPage`) is the surface — reuse the existing upload affordance
- Claude Vision through the existing `ClaudeService` + `instrumentedAxios` pipeline
- Deck written via the existing genanki path used by `CreateImageOcclusionDeckUseCase`
- Feature-gated behind `hasAnkifyAccess` (same gate as other Claude features) while Vision spend is unproven

**Out:**
- Batch upload, multi-page stitching
- PDF input
- Region/diagram detection
- Handwriting-specific tuning (let the base model carry it; measure first)
- Mobile-native app

## Riskiest assumption (P0 — kill the feature if this fails)

> Claude Vision returns card-quality Q/A pairs from a single photo of a dense page without heavy prompt engineering.

**Smallest test:** one engineer, one day, one prompt, three real photos (textbook page, lecture slide, handwritten notes).
**Pass condition:** 2 of 3 produce decks a learner would actually study from. Fewer → moonshot dies cheap before any route is written.

## Cost cap (P0 — implement before any user-facing UI)

A 4 K photo tiles into ~15 Claude Vision tiles ≈ $0.005 × 15 = ~$0.075 per photo. Twenty photos in one session → ~$1.50 unbounded.

Required before launch:
1. `countVisionTokens(base64, mediaType)` — implement from Anthropic's published tile formula.
2. Hard per-request token ceiling enforced at the route level, before the API call. Return HTTP 413 with a clear message if exceeded.
3. Log estimated cost on every call for the first 500 requests (structured field, not freeform).
4. Shadow at 1% of `ImageOcclusionPage` traffic with real images before enabling the UI broadly.

## Reuse — do not re-architect

| What | Where |
|------|-------|
| Upload UI | `web/src/pages/ImageOcclusionPage/ImageOcclusionPage.tsx` |
| Anthropic SDK access | `src/services/ClaudeService.ts` |
| Outbound HTTP + SSRF guard | `src/services/observability/instrumentedAxios.ts` |
| `.apkg` writer | `src/usecases/imageOcclusion/CreateImageOcclusionDeckUseCase.ts` |
| Feature gate | `src/lib/ankify/access.ts` → `hasAnkifyAccess` |

## What the engineer must not build in v1

- A new prompt-engineering pipeline. Start with the simplest prompt that passes the feasibility test.
- A new upload route. Extend the existing image occlusion path.
- Any Notion, callout, or database extraction (those are #2502 / #2499).

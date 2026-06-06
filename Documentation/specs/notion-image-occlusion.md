# Spec: Image occlusion from a Notion page

Issue: #2499 (moonshot, q3-candidate, from-inbox)

## Problem

Image occlusion is one of the highest-effort card types to author — anyone studying anatomy, geography, or diagrams pays a real time cost. A user wants to author it inline in Notion: put a marker on an image, and 2anki turns it into an image-occlusion deck without leaving Notion. 2anki already has the masking engine and the `.apkg` writer (`CreateImageOcclusionDeckUseCase`, taking `OcclusionRect[]` per image). The gap is **detection**: turning a Notion page into the rectangle list the existing use case already consumes.

## Decision: callout-as-marker first, vision second (required by DoD)

The DoD asks for the callout-vs-vision decision in `Documentation/specs/`. **Ship the callout-as-marker path first.** Rationale:

- It is deterministic, free, and reuses the existing occlusion engine end-to-end — the only new code is a detector that maps Notion callout geometry to `OcclusionRect`.
- It honors the user's literal ask ("drop a callout on top of an image → card generated").
- Vision detection is higher quality but carries per-card LLM cost and latency, needs an opt-in, and depends on Notion exposing usable image+callout coordinates. Vision is a **fast-follow opt-in**, specced here but not built in v1.

**Hard feasibility caveat:** Notion's block model does not give a callout a pixel position *relative to an image*. Callouts and images are sibling blocks in a vertical stack — there is no "callout on top of image at (x,y,w,h)" in the API. The user's mental model (visual overlay) does not survive export. So v1 cannot read a bounding box from callout placement. The smallest honest v1 is: **a callout authored as a structured marker** — e.g. a callout containing the occlusion regions as text/percentages (`Hippocampus 12,40,18,10`), or one occlusion callout per region with a label, parsed into `OcclusionRect`. Validate this assumption with a real Notion export before any build (smallest spike below).

## Smallest validating spike (do this before committing to the build)

Export one Notion page with an image and a callout. Inspect the block JSON: confirm (a) the image block's URL is fetchable via the existing `embedImage` path, and (b) whether any callout field carries usable geometry. If geometry is absent (expected), confirm the structured-marker syntax is authorable and parseable. One afternoon; invalidates or confirms the whole detection approach.

## Proposal (v1 — callout-as-marker)

1. A new detector in the Notion parse path recognizes a designated occlusion callout (by emoji/icon or a leading keyword) sitting directly after an image block.
2. The detector parses the callout into `OcclusionRect[]` using a documented marker syntax (percentage coordinates + label per region), and downloads the image bytes via the existing `BlockHandler.embedImage` (never the raw signed Notion URL — it expires within the hour).
3. It feeds the image + rects into the existing `CreateImageOcclusionDeckUseCase`, producing the `.apkg`.
4. Gated to paying users in line with the existing image-occlusion surface.

## Scope (v1)

- New detector module under `src/services/NotionService/` mapping callout → `OcclusionRect[]`.
- Image bytes via existing `embedImage` (durable media, hashed filename).
- Wire detector output into `CreateImageOcclusionDeckUseCase` (unchanged engine).
- Documented marker syntax in the docs page (#2468 territory — link, don't duplicate).
- Tests: parse fixtures (valid marker, malformed marker, no marker → no occlusion card), and an end-to-end test from a Notion-block fixture to a non-empty rect list.

## Explicitly NOT in scope (defer + why)

- **Vision-model detection.** Specced as fast-follow opt-in. Deferred from v1: per-card Claude Vision cost + latency (2–30 s/image), needs a cost budget and opt-in `CardOption`, and should not block the deterministic path. When pursued: state expected latency, token/cost delta per image, and whether prompt caching applies (per LLM-change policy). Build only after v1 ships and demand is confirmed.
- **Pixel-accurate "callout overlaying image" detection.** Notion's API does not expose it (see caveat). Do not promise the visual-overlay UX until Notion's model supports it.
- **Authoring UI inside 2anki for placing boxes on a Notion image** — the existing `/image-occlusion` canvas tool already covers manual authoring; this issue is about the Notion-native path.
- Polygon/ellipse marker syntax — v1 is rectangles only (the engine supports more, but the marker grammar starts minimal).

## Touch points

- `src/services/NotionService/blocks/BlockCallout.tsx` and a new detector module (Notion block layer)
- `src/services/NotionService/` image-embed path (`embedImage`) — reused, not modified
- `src/usecases/imageOcclusion/CreateImageOcclusionDeckUseCase.ts` — consumed unchanged
- `web/src/pages/DocsPage/content/cards/image-occlusion.md` — document the marker syntax (coordinate with #2468)

## Risks / Rails

- **Feasibility (primary).** The visual-overlay mental model does not survive Notion export; v1 must use a structured marker, not pixel placement. The spike above is mandatory before build — if it fails, the feature reshapes entirely.
- **Notion integration surface.** Run `/security-review` — touches the Notion parse path and image fetch. Image bytes must route through `embedImage` (signed S3 URL expires ~1 h; raw URL in a card breaks). External (non-Notion-hosted) images stay as-is.
- **LLM cost (vision path only, deferred).** Any vision work must state latency, token/cost delta, and prompt-caching applicability before merge.
- **Moonshot scope.** This is a q3 big-bet, not a 1.5x change. Keep v1 to the deterministic callout path; resist scope creep into vision in the same PR.
- No payments/migration surface in v1 beyond reusing the existing paid gate.

## Acceptance criteria

- A single Notion page with an image + a structured occlusion callout produces a valid image-occlusion `.apkg` (the issue's DoD).
- The callout-vs-vision decision is documented here (done) with cost/latency notes for the deferred vision path.
- Malformed or absent markers degrade gracefully (no occlusion card, no crash, clear log).
- Image bytes are bundled as durable Anki media, never a raw signed Notion URL.
- The deterministic path adds zero LLM cost. `/check` green; `/security-review` clean.

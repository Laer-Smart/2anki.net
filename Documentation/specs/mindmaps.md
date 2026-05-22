# Spec: Mind maps

A new sidebar surface where a learner builds a tree-shaped mind map in the browser and downloads it as an Anki `.apkg` deck.

## Why

Self-directed learners — especially med students — capture knowledge visually before they drill it. Today they leave 2anki to draw the map (Brainstorms, XMind, Obsidian), convert to markdown by hand, and re-upload. That round-trip is the gap. Owning the capture surface keeps users inside 2anki for the whole loop and gives us a second on-ramp besides Notion and file upload.

## Persona and JTBD

Second-year med student studying anatomy. **Job:** "When I'm reviewing a system (e.g. the brachial plexus), I want to externalize the hierarchy visually first, then drill it with spaced repetition — because making cards before I understand the structure feels backwards."

## In scope (v1)

- New sidebar entry **Mind maps**, fifth in the first sidebar group (between *Photo to deck* and *Note types*).
- `/mindmaps` index: list of the user's saved maps + an empty state with one CTA (`New map`).
- Editor at `/mindmaps/:id`: React Flow canvas + 280px right-side inspector panel pinned to the right.
- Tree-only model. One root node (pre-populated with the map name, not deletable). Each node has a single parent.
- Keyboard model: **Tab** adds a child, **Enter** adds a sibling, **Backspace** deletes the selected node (confirm if it has children), **double-click** or **F2** edits inline.
- Autosave on edit. Last-write-wins; no realtime, no multi-tab merge.
- **Download deck** button always visible at the bottom of the right panel. Clicking opens a modal: editable deck name (default = map name), card count, card-type selector (Basic | Cloze; default Basic), `[Cancel]` and `[Download deck]`.
- v1 card rule: **each edge becomes one Basic card.** `front = parent node label`, `back = child node label`. Cloze variant: one card per root-to-leaf path with each intermediate node clozed out.
- Free tier: up to **3 saved mind maps** at a time, **50 nodes per map**. Auto-Sync / Patreon: unlimited maps and unlimited nodes. Gate reuses `hasAnkifyAccess` from `src/lib/ankify/access.ts` — no new SKU.

## Out of scope (do not build)

- Free-positioning canvas / arbitrary graph (only trees in v1).
- Collaboration, sharing, embedding, public links.
- AI: generating a map from a topic, generating cards from a map.
- Importing OPML / XMind / Obsidian / Brainstorms exports. (See *Alternatives considered* — this is the PM's preferred next step *after* v1 lands.)
- Mobile editor. The canvas needs a larger screen — show a `notification` banner explaining this at < 768px.
- Images on nodes, math (KaTeX/MathJax), rich text, drag-to-reparent, Apple Pencil.
- Bidirectional links between maps and existing Anki cards (the AnkiWeb add-on 905917130 shape).
- Rendering the map *as* a card (the AnkiWeb add-on 728482867 / markmap shape).

## UX summary

- **Sidebar label:** `Mind maps` (sentence case). Icon: nodes-and-edges glyph (Heroicons `share` or `circle-nodes`). No badge, no "new" tag.
- **Empty state copy:** H1 `Mind maps`, body `Build a map, then download it as an Anki deck.`, CTA `New map`.
- **Editor:** mouse-first, keyboard-assisted. Canvas fills the viewport minus the right panel. React Flow's `<Controls />` sits bottom-left.
- **Export modal:** count rendered with `tabular-nums`, no fanfare. Toast on success: `Deck downloaded — open it in Anki to start studying.`
- **Visual:** node = `sharedStyles.card` (existing token, same radius and shadow). Edge stroke = `var(--color-border)`. Selected outline = `var(--color-primary)`. No new design tokens.

Full copy strings and layout details are in the designer's notes — every string in this spec matches them.

## Free-tier limits

- **Free:** 3 saved mind maps at a time, 50 nodes per map. Counting unit is "currently saved" — deleting a map frees a slot. No lifetime ceiling, no per-month window.
- **Auto-Sync ($30/mo) / Patreon-lifetime:** unlimited maps, unlimited nodes. Detected via `hasAnkifyAccess(user, subscriptions, AUTO_SYNC_PRODUCT_ID)`. No new SKU and no separate "unlimited mindmaps" product.
- **Map limit enforcement:** server-side in `CreateMindmapUseCase`. If `!isUnlimited && currentCount >= 3`, throw `MindmapLimitError` — mirrors `MonthlyLimitError` in `src/usecases/users/CheckMonthlyCardLimitUseCase.ts`. Add the message string to `LIMIT_MESSAGES` in `src/lib/misc/isLimitError.ts` so the existing client error boundary catches it.
- **Node limit enforcement:** server-side in `UpdateMindmapUseCase` — validate `data.nodes.length` against the cap before saving. Client also enforces optimistically (Tab/Enter that would exceed shows a toast and is rejected) so users get instant feedback; the server check is the source of truth.
- **Access info ships with the list response.** `GET /mindmaps` returns `{ maps, access: { hasUnlimited, currentCount, freeMapLimit: 3, maxNodesPerMap: 50 } }`. The client uses these fields to render the inline banner, the modal, and the toast — no second roundtrip, no separate endpoint.
- **UX surfaces (exact strings):**
  - Inline banner on `/mindmaps` index when free and at-or-near cap (`notificationInfo`, hidden when paid): `Your monthly limit: 3 mind maps. Upgrade for unlimited.`
  - Modal triggered by `New map` click at cap (clone `LimitPage.tsx` structure, never disable the CTA):
    - Heading: `You've used all 3 maps this month`
    - Body: `Free accounts can have 3 mind maps at a time. Upgrade to Auto-Sync to create as many as you need.`
    - Primary CTA: `Upgrade` → `/pricing`
    - Secondary CTA: `Not now`
  - Toast on Tab/Enter at the node cap (`notificationWarning`, 4s self-dismiss): `50 nodes reached. Upgrade to add more.`
- **Paid users see nothing.** No "unlimited" badge, no banner, no toast. The result speaks.

## Technical approach

- **Library:** `@xyflow/react` v12 (MIT, ~280 KB gzipped). `dagre` for auto-layout. Both added under `web/`. Excalidraw is already a dep but is wrong shape for this — do not reuse it.
- **DB:** new `mindmaps` table, columns: `id uuid pk`, `user_id integer not null fk users(id) on delete cascade`, `title text not null default 'Untitled'`, `data jsonb not null` (`{nodes, edges}`), `created_at`, `updated_at`. One Knex migration, then `pnpm kanel`.
- **Server layers:**
  - `src/routes/MindmapRouter.ts`
  - `src/controllers/MindmapController.ts`
  - `src/usecases/mindmaps/{Create,Update,Delete,List,Export}MindmapUseCase.ts`
  - `src/usecases/mindmaps/mindmapToNotes.ts` — pure function, returns `Note[]`. The whole v1 mapping rule lives here.
  - `src/data_layer/MindmapRepository.ts`
- **Apkg generation:** reuse `Note` (`src/lib/parser/Note.ts`) → `Deck` (`src/lib/parser/Deck.ts`) → `CustomExporter` (`src/lib/parser/exporters/CustomExporter.ts`). No new apkg builder.
- **Web routes:** lazy-load `web/src/pages/MindmapsPage/` from `web/src/App.tsx`. Sidebar row added to `web/src/components/AppShell/Sidebar.tsx`. Import the React Flow stylesheet (`@xyflow/react/dist/style.css`) inside the page, not globally.
- **Tests (minimum):**
  - `src/usecases/mindmaps/mindmapToNotes.test.ts` — pure unit tests covering star, tree, empty, disconnected.
  - `src/usecases/mindmaps/CreateMindmapUseCase.test.ts` — free under cap (creates), free at cap (throws `MindmapLimitError`), paid at-or-above free cap (creates).
  - `src/usecases/mindmaps/UpdateMindmapUseCase.test.ts` — free user node-cap enforcement (rejects > 50), paid user bypass.
  - `src/data_layer/MindmapRepository.test.ts` — round-trip against the test DB, including `countByUserId`.
  - `src/routes/MindmapRouter.test.ts` — outside-in: create, list (returns `access` block), delete, export returns `application/octet-stream`.
  - `web/src/pages/MindmapsPage/useMindmap.test.ts` — Vitest + msw mock contract for CRUD + access-block rendering.

## Success metric

Of users who create a mind map in week 1 after launch, % who export to Anki AND open the deck in Anki within 7 days. Target: 40% within 30 days. Measured via the existing observability stack — tag the new export use case so it shows up in `/ops`.

## Risks

1. **Editor scope creep.** Canvas problems are bottomless. Free-positioning, multi-parent, collaboration, AI map-generation, and mobile editing all need to push to v2 — anyone proposing them in v1 has to justify it against the success metric.
2. **The mapping rule is the riskiest assumption.** A shallow star (root + 10 children) produces 10 context-free cards. If user testing shows that pattern dominates, switch v2's default to the cloze-per-path rule rather than offering it only as an option.
3. **Bundle size.** `@xyflow/react` + `dagre` adds ~410 KB gzipped to the lazy chunk. Acceptable because `MindmapsPage` is lazy-loaded; verify the main chunk doesn't grow.

## Follow-ups (v2 candidates)

- **OPML / Brainstorms / XMind import at `/upload`.** Users who already have a mind map in another tool shouldn't have to redraw it. Accept `.opml` and Brainstorms `.json` exports through the existing upload pipeline. Small scope; meets the same JTBD for users who arrive with a map.
- **Cloze-per-path card type as the default.** If v1's edge-as-Basic-card rule produces too many context-free cards, promote cloze-per-path from "optional toggle" to "default."
- **markmap-rendered card type.** Inspired by AnkiWeb add-on 728482867 — export the whole map as a single interactive card showing the full tree (markmap.js renders the back side). One card per deck rather than one card per edge.
- **In-Anki bidirectional linking (AnkiWeb add-on 905917130 shape).** Out of scope structurally — we don't ship Anki add-ons — but worth noting that some users want this and it isn't what we're building.

## Decision

Ship v1 as described above.

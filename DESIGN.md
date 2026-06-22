# Design: Swiss Panel
**Date:** 2026-06-13 · **Status:** confirmed
**Archetype:** Sage · **Register:** product
**DNA:** Swiss/International (base) + monospaced data voice borrowed from Terminal/Mono-Core · **Dominant axis:** layout discipline

Scope: this DNA governs the `/ankify` surface first (the sync control panel). It reuses the existing app token system in `web/src/styles/base.css` rather than introducing a new palette — see Color. As other surfaces adopt it, widen this file; until then, treat it as the Ankify design contract.

## Direction
A precise, trustworthy instrument panel for power users who run an ongoing Notion→Anki sync (lifetime / Auto-Sync subscribers, the serious med/law learner). It should read at a glance — what synced, where it landed, is it healthy — like a well-set status readout, not a marketing card grid. Sage gravity: data-led, muted, no decoration. The credibility this surface earns is retention.

## Scope on the page
The DNA governs the whole `/ankify` surface, not just the deck list: the workspace status bar, the deck list, **and the "Your reviews" stats block (summary counts, the review-streak heatmap, the per-deck breakdown chart).** The stats block is the most on-DNA part of the page — a heatmap + tabular figures *is* the instrument panel. It is restyled to match, never left in the old visual language; drift between list and stats is the failure mode this section exists to prevent.

## Signature move
**Every number is monospaced and tabular.** Two expressions of one move: (1) each deck row ends in a fixed, right-aligned readout — target deck path, last-sync age, backlog count — columns vertically aligned across rows like a terminal status table; (2) the "Your reviews" summary figures (streak, daily average, reviews this year) use the same `ui-monospace` + `font-variant-numeric: tabular-nums` treatment, rendered one size up as the hero (VOICE.md counts rule). Prose (deck titles, labels) stays sans; only *data* is mono. The review-streak heatmap is the page's data-viz centerpiece and reads as the cockpit's primary instrument. This is the one authored move, exempt from product restraint — it carries the identity by itself.

## Type
- Display: `--font-display` (Fraunces), marketing/pricing headings `--text-3xl`+ only; banned in all product chrome, data columns, tables, counts, and below `--text-3xl`.
- Body: `--font-sans`.
- Data voice: `ui-monospace, SFMono-Regular, Menlo, monospace` — data column + counts only.
- `--font-display` and `--font-mono` are now tokens in `web/src/styles/base.css` `:root` (alongside `--font-sans`); themes don't override fonts.
- Scale: existing token scale (`--text-xs` 12px · `--text-sm` 14px · `--text-base` 18px · `--text-lg` 20px · `--text-2xl` 24px). Deck title steps up to `--text-base`/medium so the name dominates its metadata (fixes the audit's flat-plateau finding).
- Leading: `--leading-normal` (1.5) prose · tight on the data column. Weights: 400 body, 500 deck titles, 600 headings.

## Color tokens
No new ramp. Source of truth = `web/src/styles/base.css` (`:root` + the 5 theme blocks: light, dark, gold, purple, pink). Accent = `--color-primary` (#3b82f6), used once per view. Status is the functional triad already defined: `--color-success` (running), `--color-warning` (starting), `--color-text-danger` (error). Tertiary text = the corrected `#838b99`-class value from PR #3341 (distinct from secondary).
Contrast: inherited from base.css (audited per theme in #3341 — tertiary clears ≥3:1 on every theme background; accent/primary text clears AA). This is now machine-enforced: `web/scripts/designTokens.ts` + its colocated test fail the suite if any audited text/background pair drops below its AA floor on any of the 5 themes, and ratchet against new orphaned color tokens. Add a pair to `CONTRAST_PAIRS` when a new on-screen text/bg combination ships.

## Space, shape, depth
- Spacing scale: existing `--space-*` (4/8/12/16/20/24/32px). Map ad-hoc rem in `AnkifyPage.module.css` onto it during implementation.
- Radius: rows are flat (no radius) — Swiss hierarchy from rule + alignment, not cards. Container chrome (status bar) keeps `--radius-lg`.
- Borders/shadows: hairline row rules at `--color-border` (not the near-invisible `--color-border-light`). Shadows hue-shifted via existing `--shadow-*`, never pure black. No drop shadows on data rows.

## Motion
- Timing: 100–150ms (`--transition-fast`) only — Swiss/near-instant. No standard/large reveals on this surface.
- Allowed: opacity/background state changes (hover, focus), the existing `workspaceBarPulse` for the starting dot.
- Never: entrance/scroll animation, y-translate reveals, bounce/elastic.
- prefers-reduced-motion: the starting-dot pulse is gated to `animation: none` under `(prefers-reduced-motion: reduce)` (PR #3343).

## Never (this project's kill list)
- No card-per-deck grid — rows + hairlines only (the cockpit is a table, not a card wall).
- No second accent hue — one blue, plus the functional status triad. The borrowed mono voice must NOT drag in a terminal-green theme.
- No mono for prose — data column only; titles/labels stay sans (mono long-form is illegal under the remix harmony check).
- No glassmorphism, no gradient-as-default, no bounce easing (ai-tells).
- No exposing internal/session URLs as status text (the VNC-URL noise removed in #3342 — don't reintroduce).

## Live Anki data & actions (AnkiConnect)

The cockpit gets its substance from AnkiConnect. The mono data column and the actions below are all backed by real API calls (verified against the foosoft/anki-connect plugin), routed through `AnkiConnectClient` with the existing polling/offline-skip handling. Every new *action* ships a usage event (Surface lifecycle). Read counts in the mono/tabular voice.

Data shown:
- **Per-deck backlog + new count** — `getDeckStats` (already fetched for the stats block), matched to each subscription by `target_deck` deck name. Column becomes `path · synced 2m · ▲7 · +3 new`.
- **Active Anki profile** — `getActiveProfile` in the header (kills "synced to the wrong profile" confusion).
- **Deck maturity** — `getEaseFactors` / `getIntervals` → avg interval / % mature per deck (health beyond due count).

Actions offered:
- **Open in Anki (per deck)** — `guiDeckOverview(name)` jumps Anki straight to that deck (row menu), better than the generic Open.
- **Sync to AnkiWeb now** — `sync` as a header button.
- **Shut down Anki** — `guiExitAnki` wired to the header Shut-down control.

Out of scope (keep this a sync panel, not an Anki clone): per-card scheduling (`suspend`/`setDueDate`/`forgetCards`), `deleteDecks`, full model/template editing. Per-deck .apkg export was cut — `exportPackage` writes the file into a root-only named Docker volume that the non-root server can't read back, so the download always 503'd. The full-collection-stats embed was cut — `getCollectionStatsHTML` returns legacy HTML that depends on jQuery and flot, neither present in the API output, so the charts can't render in the sandboxed iframe.

## Open questions
- Dark "Mission Control" (candidate C) is parked, not killed — if the dark theme proves the most-used on this surface, revisit a console-grade dark treatment as a theme-specific signature.
- Whether the mono data column survives narrow mobile widths or collapses to a stacked sub-line under the title — decide during the preview build.

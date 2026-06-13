# Design: Swiss Panel
**Date:** 2026-06-13 · **Status:** confirmed
**Archetype:** Sage · **Register:** product
**DNA:** Swiss/International (base) + monospaced data voice borrowed from Terminal/Mono-Core · **Dominant axis:** layout discipline

Scope: this DNA governs the `/ankify` surface first (the sync control panel). It reuses the existing app token system in `web/src/styles/base.css` rather than introducing a new palette — see Color. As other surfaces adopt it, widen this file; until then, treat it as the Ankify design contract.

## Direction
A precise, trustworthy instrument panel for power users who run an ongoing Notion→Anki sync (lifetime / Auto-Sync subscribers, the serious med/law learner). It should read at a glance — what synced, where it landed, is it healthy — like a well-set status readout, not a marketing card grid. Sage gravity: data-led, muted, no decoration. The credibility this surface earns is retention.

## Signature move
**The right-hand data column is monospaced and tabular.** Every deck row ends in a fixed, right-aligned readout — target deck path, last-sync age, backlog count — set in `ui-monospace` with `font-variant-numeric: tabular-nums`, columns vertically aligned across rows like a terminal status table. Prose (deck titles, labels) stays in the sans body face; only the *data* is mono. This is the one authored move and is exempt from product restraint — it carries the cockpit identity by itself.

## Type
- Display: existing `--font-sans` system stack (no display face — product restraint; hierarchy comes from scale + weight, Swiss discipline).
- Body: `--font-sans`.
- Data voice: `ui-monospace, SFMono-Regular, Menlo, monospace` — data column + counts only.
- Scale: existing token scale (`--text-xs` 12px · `--text-sm` 14px · `--text-base` 18px · `--text-lg` 20px · `--text-2xl` 24px). Deck title steps up to `--text-base`/medium so the name dominates its metadata (fixes the audit's flat-plateau finding).
- Leading: `--leading-normal` (1.5) prose · tight on the data column. Weights: 400 body, 500 deck titles, 600 headings.

## Color tokens
No new ramp. Source of truth = `web/src/styles/base.css` (`:root` + the 5 theme blocks: light, dark, gold, purple, pink). Accent = `--color-primary` (#3b82f6), used once per view. Status is the functional triad already defined: `--color-success` (running), `--color-warning` (starting), `--color-text-danger` (error). Tertiary text = the corrected `#838b99`-class value from PR #3341 (distinct from secondary).
Contrast: inherited from base.css (audited per theme in #3341 — tertiary clears ≥3:1 on every theme background; accent/primary text clears AA).

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

## Open questions
- Dark "Mission Control" (candidate C) is parked, not killed — if the dark theme proves the most-used on this surface, revisit a console-grade dark treatment as a theme-specific signature.
- Whether the mono data column survives narrow mobile widths or collapses to a stacked sub-line under the title — decide during the preview build.

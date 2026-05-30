# Spec: Ops upload-funnel dashboard tab

## Outcome

Al can open `/ops`, click an **Upload funnel** tab, pick a window (7d/14d/30d/60d/90d), and read the four upload-funnel stage counts plus the true upload-to-download rate as a rendered funnel — without curling JSON. Read-only, admin-only.

## Problem

PR #2926 shipped `GET /api/ops/upload-funnel` (behind `RequireOpsAccess`), returning distinct-identity counts per stage and the true upload-to-download rate. Today the only way to read it is `curl` against the endpoint with an ops cookie. The signal that tells us where uploads leak — how many starts reach a downloaded deck — is invisible in the dashboard Al actually looks at. The funnel is the single most load-bearing number for the 300K-user goal (we've measured ~25% of free conversions return 0 cards; the funnel makes that drop-off legible). It deserves a tab.

## Riskiest assumption + smallest test

**Riskiest assumption:** the four stage counts are *not* a strict subset chain — `conversion_failed` is a separate branch, and `deck_downloaded` can exceed `conversion_succeeded` or undercut it depending on how anonymous identities resolve across stages. A naive "stacked funnel where each bar is a fraction of the bar above" visual will render misleadingly (e.g. a downloaded bar wider than the succeeded bar) and lie to Al.

**Smallest test:** before designing the bar widths, pull one real window from prod via `curl /api/ops/upload-funnel?window=30d` (ops cookie) and eyeball whether `deck_downloaded <= conversion_succeeded <= upload_started` actually holds. If it doesn't, the visual must show four independent counts with the rate computed separately — not a nested-fraction funnel. The designer owns this decision; the data check is a 30-second curl, not a build.

## Scope

**In:**
- A new `/ops/upload-funnel` tab mirroring the existing OpsPage tab pattern (`PricingAbFunnelTab.tsx` + `usePricingAbFunnel.ts` + `pricingAbTypes.ts` is the reference triple).
- Fetches `GET /api/ops/upload-funnel?window=<w>` with `credentials: 'include'`.
- Window selector: 7d / 14d / 30d / 60d / 90d (default 30d), plus a Refresh button — same control row as the pricing-AB tab.
- Renders the 4 stage counts (`upload_started`, `conversion_succeeded`, `conversion_failed`, `deck_downloaded`) and the `upload_to_download_rate_pct` as a simple funnel visual (designer owns the exact form).
- Read-only. No mutation, no write controls.

**Out:**
- **No new server endpoint** — it exists (`/api/ops/upload-funnel`, `RequireOpsAccess`, served by `UploadFunnelService`). No server code changes at all.
- No new metrics, no new event types, no new repository methods.
- No public exposure — this lives only inside the admin-only `/ops` surface (`RequireOpsAccess`, 404 for everyone else). Nothing user-facing ships.
- No changelog entry — `/ops` is admin-only (Al only), so no real user notices this. State that explicitly in the implement PR body.
- No new dependency, no chart library — match the table/markup approach the existing ops tabs use.

## Response shape (verified against `src/services/ops/UploadFunnelService.ts` on main)

The web client must map this to an explicit typed shape (`uploadFunnelTypes.ts`) — do not render the raw JSON. Mirror `pricingAbTypes.ts`.

```ts
interface UploadFunnelStages {
  upload_started: number;
  conversion_succeeded: number;
  conversion_failed: number;
  deck_downloaded: number;
}

interface UploadFunnelResponse {
  stages: UploadFunnelStages | null;
  upload_to_download_rate_pct: number;
  since: string;
  as_of: string;
  error?: string;
}
```

Note `stages` is `null` on the error path (the service catches a repo failure and returns `stages: null` with a populated `error`). The tab must handle `stages === null` distinctly from `stages` with all-zero counts — see acceptance criteria.

## User story + acceptance criteria

**As Al**, I want the upload funnel rendered in `/ops` so I can see where uploads leak between start and download without leaving the dashboard.

Acceptance criteria:
1. Navigating to `/ops/upload-funnel` renders a tab whose label appears in the OpsLayout `TABS` nav (sentence-case label, e.g. "Upload funnel").
2. For a chosen window, the tab shows the 4 stage counts and the `upload_to_download_rate_pct`, sourced from `GET /api/ops/upload-funnel?window=<w>`.
3. Changing the window selector refetches and re-renders; the default window is 30d.
4. **Loading state:** while the first fetch is in flight, a real-sentence loading line shows (e.g. "Reading the funnel" — VOICE.md: no "Loading..." ellipsis). The Refresh button is disabled during a fetch.
5. **Empty/zero state:** when `stages` is present but `upload_started === 0`, the tab shows a defined zero state (e.g. "No uploads in this window") rather than a degenerate 0% funnel with empty bars. The rate is 0 in this case by the service's own guard — show it honestly, don't hide it.
6. **Error state:** when the response carries `error` (and `stages === null`), or the fetch fails, the error banner renders the message — same `alertDanger` banner the pricing-AB tab uses.
7. **Number formatting (VOICE.md):** counts use `font-variant-numeric: tabular-nums` (the `--tabular-nums` token / `styles.numeric` class) and the thin-space thousands separator (` `, not a comma) — e.g. `1 200`, not `1,200`. The rate renders to one decimal place with a `%` suffix (e.g. `42.7%`). Under 10 000 needs no separator.
8. The response is mapped to the explicit typed shape above before rendering — no raw-JSON dump, no untyped object reaching JSX.

## Implementation surface (verified against main — for the implementer, not binding)

- `web/src/pages/OpsPage/uploadFunnelTypes.ts` — new, mirrors `pricingAbTypes.ts`.
- `web/src/pages/OpsPage/useUploadFunnel.ts` — new, mirrors `usePricingAbFunnel.ts` (same `ALLOWED_WINDOWS`, `credentials: 'include'`, cancel-on-unmount).
- `web/src/pages/OpsPage/UploadFunnelTab.tsx` — new, mirrors `PricingAbFunnelTab.tsx`. **Note:** the existing `fmt` in `PricingAbFunnelTab` uses `toLocaleString('en-US')` (comma separator) — this tab must use the thin-space convention per VOICE.md, so do not copy that helper verbatim; the comma in the pricing tab is a pre-existing drift, not the pattern to follow.
- `web/src/pages/OpsPage/OpsLayout.tsx` — add one entry to the `TABS` array (`to: '/ops/upload-funnel'`, `label: 'Upload funnel'`, `match: (path) => path.startsWith('/ops/upload-funnel')`).
- `web/src/App.tsx` — add a `lazyWithRetry` import (mirroring the `PricingAbFunnelTab` lines) and a `<Route path="upload-funnel" element={<UploadFunnelTab />} />` under the ops route group.
- Colocated Vitest: `useUploadFunnel.test.ts` (fetch + window switch + error path) and `UploadFunnelTab.test.tsx` (zero state, error state, formatting). Mock `fetch` at the module boundary only.

## Process gates (this is net-new UI)

- **`/implement` requires a TRIO review** (pm + designer + engineer in parallel) before any code — this is net-new user-visible UI (admin-facing, but still a rendered surface). **The designer owns the funnel visual** and the empty/zero state form.
- **Browser-attestation pass required** at merge — the diff touches `web/src/`, so the implement PR body must carry the ticked `## Browser check` boxes (golden path on localhost:3000 + no console errors at 375px). Verify against a real `/ops/upload-funnel` render with an ops cookie.
- **Optional design-preview route:** if the trio disagrees on the funnel visual, the implement PR may ship a `/dev/ops-funnel-preview` route rendering candidate visuals side by side with injected props (loading / error / zero / populated states), gated on `import.meta.env.DEV` per the CLAUDE.md preview rule. Optional — only if the visual is non-obvious.

## Open questions

1. **Funnel visual form** — horizontal bars (each stage a row), a classic narrowing funnel, or a four-tile count grid + a single rate hero? Resolve in the trio; depends on the riskiest-assumption data check (is the chain monotonic?). Designer decides.
2. **Where does `conversion_failed` sit visually?** It's a branch off `upload_started`, not a step between succeeded and downloaded. Show it as a sibling (e.g. a muted "of which N failed" line) rather than a funnel step, to avoid implying it's part of the success chain. Designer confirms.
3. **Tab placement** — append after "Pricing A/B" (last), or group it near "Conversions" since both are funnel/conversion signals? Lean toward next to Conversions; confirm in trio.

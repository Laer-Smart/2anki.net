# Spec: Canonical landing-page URLs + sitemap completeness

**Status:** draft — awaiting `/implement`
**Type:** `fix:` (SEO indexing hygiene)
**Workstream:** SEO recovery, follow-on to PR #2793 (canonical-host redirect)

## Problem

Three landing pages exist at two URLs each, serving identical copy from two code paths:

| Bare path (standalone component) | `/convert/` path (ConvertLandingPage) |
| --- | --- |
| `/notion-to-anki` | `/convert/notion-to-anki` |
| `/pdf-to-anki` | `/convert/pdf-to-anki` |
| `/markdown-to-anki` | `/convert/markdown-to-anki` |

Each pair renders the same `LandingPage` component with near-identical copy, so Google sees duplicate content and splits link equity between the two URLs. Google Search Console shows the bare paths (`/pdf-to-anki`-style) as the ones it discovered and left in "Discovered – not indexed." Both members of every pair sit in `sitemap.xml`, and each self-references its own canonical — so the sitemap and the canonical tags actively tell Google **both** are originals.

Four `/convert/` pages have no bare twin (`csv-to-anki`, `html-to-anki`, `apkg-to-csv`, `notion-tables-to-anki`). There is **no** `/csv-to-anki` bare route — CSV lives only at `/convert/csv-to-anki`. The "two CSV pages" in the brief do not exist; do not create one.

The sitemap is also stale: it lists 20 URLs but is missing `/anki-from-medical-lecture-slides` from the standalone set audit and any future-proofing, and mixes both halves of the duplicate pairs.

## Recommendation (one path family: keep the bare paths)

**Canonicalize to the bare paths** (`/notion-to-anki`, `/pdf-to-anki`, `/markdown-to-anki`). They are the URLs Google already discovered, they are shorter, and they match the established standalone landing set (`/usmle-anki`, `/nursing-flashcards`, `/quizlet-to-anki`, `/anki-to-notion`). The three duplicated `/convert/` slugs 301 to their bare twin. The four `/convert/`-only pages stay exactly where they are — they have no twin and no equity to consolidate.

**Redirect mechanism: server-side 301, not a React `<Navigate>`.** A React route redirect returns HTTP 200 with the SPA shell, then changes the URL client-side — Googlebot reads the 200 and the JS history swap inconsistently, and the duplicate keeps its 200 status in Search Console. A real 301 is what consolidates equity and clears "Discovered – not indexed." The static SPA is served from Express (`src/server.ts`, `express.static(BUILD_DIR)`), and PR #2793 already established the host-redirect middleware pattern in `src/routes/middleware/`. Add a small Express redirect mounted **before** the static handler that 301s the three duplicated `/convert/<slug>` paths to `/<slug>`, path family hard-coded (no user input reaches the redirect target — avoid the open-redirect smell). Mount it after the webhook routers, alongside the existing canonical-host middleware.

**Self-referential canonicals:** the bare-path standalone pages already emit `<link rel="canonical" href="https://2anki.net/<slug>">` via `LandingPage.tsx` (runtime) and `prerenderLandingPages.ts` (prerender) — verify all three resolve to the bare path. No change expected; assert it in a test.

**Sitemap:** list only the canonical URL for every landing page — drop `/convert/notion-to-anki`, `/convert/pdf-to-anki`, `/convert/markdown-to-anki` (now 301s; a 301'd URL must not be in a sitemap). Keep the four `/convert/`-only pages. Confirm every standalone landing page (`/notion-to-anki`, `/pdf-to-anki`, `/markdown-to-anki`, `/quizlet-to-anki`, `/anki-to-notion`, `/usmle-anki`, `/nursing-flashcards`, `/anki-from-medical-lecture-slides`) plus `/notion-marketplace` and `/answers/fsrs-explained` is present and points at its canonical path. Bump `lastmod` on touched entries.

## Acceptance

- `curl -sI https://2anki.net/convert/pdf-to-anki` returns `301` with `Location: /pdf-to-anki` (same for notion, markdown).
- `sitemap.xml` contains zero `/convert/<slug>` entries that have a bare twin; every entry returns 200 (no 301/404 in the sitemap).
- Each bare landing page's rendered `<link rel="canonical">` equals its own URL.
- The four `/convert/`-only pages still load at 200 and keep their canonicals.

## What NOT to build

- No new URL variants, no new landing slugs, no `/csv-to-anki` bare route.
- Do not touch `docs.2anki.net` or `/documentation`.
- Do not React-route-redirect; the redirect must be a server 301.
- Do not redirect the four `/convert/`-only pages — they have no twin.
- No `robots.txt` Disallow on `/convert/*` (a Disallow would block Google from seeing the 301).
- No changelog entry — invisible plumbing; SEO hygiene, no user-facing behavior change.

## Shared files implementation will touch (for wave coordination)

- `web/public/sitemap.xml` — prune duplicate `/convert/` entries, bump `lastmod`.
- `web/scripts/prerenderLandingPages.ts` — verify bare-path canonicals; only touch if a canonical is wrong.
- `web/src/App.tsx` — only if route wiring changes; the redirect itself lives server-side, so ideally untouched.
- `src/server.ts` + a new `src/routes/middleware/redirectConvertDuplicates.ts` (+ colocated test) — the 301 middleware.

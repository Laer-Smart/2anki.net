# Spec: One starter catalog

Issue: #2333

## Problem

There are two parallel "official starter" catalogs:

- `src/services/officialTemplates.ts` → `getOfficialTemplates()` — 11 file-backed
  starters (Default Basic/Cloze/Input/IO, Only Notion Basic/Cloze, Raw Note,
  Abhiyan Basic/Cloze, Alex Deluxe Basic/Cloze). Served at
  `/api/templates/official`.
- `src/services/DefaultTemplatesService.ts` → `getDefaultTemplates()` — 8 inlined
  starters (Clean Basic, Modern Cloze, Vocabulary, Medical Term, Code Card,
  Minimal, Quote, Math & Science). Served at `/api/templates/defaults`.

They have different schemas (`OfficialStarter` vs `DefaultTemplate`), different id
conventions (`official-*` vs kebab-case), and zero overlap. The editor gallery
(`/templates/new`) reads only `getDefaultTemplates()`, so users never see Input,
Image Occlusion, Abhiyan, Alex Deluxe, or "Only Notion" starters. New starters get
filed into whichever catalog the author guesses, and the PR #2328
field-resolves-against-`flds` validator only guards the `officialTemplates` path —
the same bug class can ship undetected through `DefaultTemplatesService`.

## Proposal

Collapse onto **one** catalog with a unified schema and a single factory, keeping
both HTTP endpoints stable so no client breaks:

1. One `Starter` type covering both shapes — file-backed *or* string-inlined
   templates behind a single `flds` / `tmpls` / `css` interface.
2. One factory `getStarters()` backing a single list. Existing `id`s stay stable
   (`official-*` and the kebab-case ones) — tests and saved user selections rely
   on them.
3. A `surface` discriminator (`'editor' | 'conversion' | 'both'`) so the editor
   gallery filters the one list instead of reading a separate catalog. Internal
   conversion-only starters stay shippable without a second catalog.
4. `listDefaultTemplates` and `listOfficialTemplates` in `TemplatesController`
   become filtered views over `getStarters()` — `/api/templates/defaults` and
   `/api/templates/official` keep returning their current id sets so existing
   clients see no change.
5. The PR #2328 validator test runs against **every** starter in the unified list.

Riskiest assumption: the two schemas unify without breaking a direct consumer.
Callers today are only `TemplatesController` (both) plus the two service tests —
small blast radius. Confirm with a `grep` of both factory functions before the
merge and lock current id sets with a snapshot-of-ids assertion.

## Scope (in)

- One `Starter` type + one `getStarters()` factory + one backing list.
- `surface` flag; the gallery (`/api/templates/defaults`) filters on it.
- Both endpoints return the same id sets they do today (no client-visible change).
- The #2328 validator test covers every starter.
- Migrate the two existing service test files into one suite; assert every
  previously-registered id still resolves.

## Explicitly NOT in scope

- Adding new starters (Basic Reversed + Type-the-answer ship in #2332).
- Any editor UI rewrite — data layer only.
- Changing which starters appear in the gallery as a *product* decision — that is
  a follow-up once one catalog exists. v1 preserves today's surfaces exactly.

## Touch points

- `src/services/officialTemplates.ts` and
  `src/services/DefaultTemplatesService.ts` — merged into one module (or one
  re-exports the unified shape during the transition; end state is one source).
- `src/controllers/TemplatesController.ts` — both list methods read `getStarters()`
  filtered by `surface`.
- `src/services/officialTemplates.test.ts`,
  `src/services/DefaultTemplatesService.test.ts` — merged suite.
- No router or web change required for parity.

## Risks / Rails

- **No user-visible behaviour change in v1.** This is a `refactor:`. The endpoints
  must return identical id sets — assert with an id-snapshot test so a dropped
  starter fails CI rather than silently vanishing from a user's saved selection.
- No auth/payments/migration/integration surface.
- Generated `.apkg` must still open cleanly — keep the manual Anki-open check in
  the test plan, since `flds`/`tmpls`/`css` shape is what genanki consumes.

## Acceptance criteria

- One `Starter` type, one `getStarters()` factory, one backing list.
- `/api/templates/official` and `/api/templates/defaults` return byte-identical id
  sets to `main` (id-snapshot test green).
- The #2328 validator test passes for every starter in the unified list.
- Every previously-registered id still resolves; the merged test suite proves it.
- Manual: `/templates/new` still shows today's gallery starters; pick one, save,
  generate an `.apkg`, open in Anki without error.

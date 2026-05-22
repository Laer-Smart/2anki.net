# Field mapping for AI-converted and Photo-to-Deck flows

Status: draft spec. Companion to #2631 (Notion-database column mapping). One page.

## Problem

External review (May 2026) flagged "field mapping" as a HIGH-priority gap:

> A detailed field-mapping window is needed so the user can specify exactly which information should go into each card field, especially when multiple pieces of information need to be organized in a specific way on one card.

And, in the same review:

> Introduce advanced field mapping across all relevant functions.

Today the AI converter (PDF / Markdown / HTML / pasted notes via `ClaudeService`) and Photo-to-Deck both collapse a card to `{ front, back, tags }`. The user has no say in which extracted information lands in which field. A power user studying anatomy who wants `{ Term, Definition, Mnemonic, Image, Source }` cannot get there from the AI converter — they either accept the two-field shape, paste a freeform `userInstructions` and pray, or hand-edit every card in Anki after import.

The Notion-database flow is getting its own picker in #2631. The AI-converter flow — which is the highest-volume entry point in the product — has no equivalent. Without one, the rest of the field-mapping promise is half-shipped.

## Goal

Let the user, on the AI converter path, tell us which template they're targeting **and** what each field of that template should contain — before generation. The model writes directly into those named fields. The user gets a deck that's ready to study, not a deck they have to reshape.

Trace to mission: **less manual rework after generation** = simpler and faster. The cards arrive in the shape the user wanted on the first pass instead of needing a second editing pass in Anki.

## Non-goals

- **Notion database column mapping.** Covered by #2631. Different entry point, different data source (column names, not extracted spans), different UI surface.
- **Chat template control board.** Covered by #2635. Chat has its own multi-field model coming (`ChatCard.fields: Record<string,string>`); the two designs should rhyme but do not have to merge in v1.
- **Template authoring / `{{field}}` validation.** Tracked separately in #2329. We assume the target template already exists; we don't help the user *write* a template.
- **Generation tuning** — style, card count, heading-driven splits. Covered by #2616 / #2617 / #2618. Those tune *how cards are generated*; this spec is about *where the generated content lands*.
- **Photo-to-Deck v1.** In scope as a follow-on once the AI-converter path is proven (see Open questions). Not in v1 to keep the surface tight.
- **A new template editor.** Mapping reads existing template field lists; it does not let the user add fields.

## Proposed shape

**v1 entry point: AI converter only.** It's the most-used path, and #2635 already proves out the multi-field model on the chat side — we crib from that vocabulary so the two flows feel like the same product.

**UX surface: extend `CardOptionsForm`, no new modal.** The form already owns `template` and `userInstructions`; mapping naturally sits between them. When the user picks a template, a "Field mapping" panel reveals beneath it, listing the template's fields with a short instruction for each. Each row is a field name and a one-line description ("What goes here?"). Defaults are filled in for the well-known templates (`n2a-basic`, `n2a-cloze`, `n2a-mcq`, `n2a-io`) so a user who doesn't care still gets sensible behaviour.

Mapping shape, persisted alongside `template` + `userInstructions`:

```ts
type FieldMapping = {
  templateName: string;          // e.g. "n2a-basic"
  fields: Array<{
    name: string;                // matches the template's field name
    instruction: string;         // user-facing prompt fragment
  }>;
};
```

**ClaudeService change.** Widen the response schema from `{ front, back, tags }` to:

```ts
type ClaudeCard = {
  fields: Record<string, string>;  // keyed by template field name
  tags?: string[];
  cloze?: true;
};
```

The system prompt is parameterised by the active `FieldMapping`: it lists the field names + instructions and asks the model to emit exactly that JSON shape. `front` and `back` become the default mapping when no template is selected — backwards-compatible for every existing call site.

**Downstream rendering.** `genanki`-builder code that today reads `card.front` / `card.back` reads `card.fields[fieldName]` instead, falling back to legacy keys for callers that haven't migrated. Photo-to-Deck and other producers keep emitting `{ front, back }` until they're moved over.

**Defaults catalogue.** Ship a small JSON file (`web/src/components/CardOptionsForm/fieldMappingDefaults.json`) keyed by template name. A user who never opens the panel gets the same result they get today. A user who tweaks one row gets exactly what they asked for.

## Open questions

1. **How does `ClaudeService` learn the target schema?** Cleanest is a single `fieldMapping` argument on `convertNotesToCards` (the public entry) — the route layer builds it from the request body, falling back to the legacy `{ front, back, tags }` shape when absent. We need to confirm none of the existing call sites (Notion path, Photo-to-Deck, future Ankify auto-sync) rely on the literal `front`/`back` schema being hard-coded.
2. **Do we align on `ChatCard.fields: Record<string,string>` from #2635?** Recommended yes — same JSON shape, same model contract, two surfaces share the validator. Worth a short sync with whoever lands #2635 before the implementation PR opens; either spec going first sets the precedent.
3. **What happens when the model emits a field the template doesn't have, or omits one it does?** Two cases:
   - Extra field: drop with a warning logged via the existing observability hooks. Don't fail the conversion.
   - Missing field: leave the field blank in the resulting note. Anki shows an empty field, not a broken card. The user can decide if they want to regenerate or hand-fill.
4. **Photo-to-Deck rollout.** Vision input through Claude already returns the same schema. Once v1 ships on the AI converter, Photo-to-Deck is a thin follow-on: same `FieldMapping`, same widened response, plumb it through the photo upload route. Defer to a follow-up PR so this one stays reviewable.
5. **What about cloze?** Cloze templates have a single `{{Text}}` field plus optional `{{Extra}}`. The mapping for cloze defaults to `{ Text: "...", Extra: "..." }`; the user can leave Extra blank. No special-casing required.
6. **MCQ.** `n2a-mcq` has `{Question, A, B, C, D, Answer}`. The defaults catalogue should ship a sensible mapping; if the model can't fill all six it leaves the unused choices blank. Worth user-testing on a real MCQ-shaped PDF before flipping on by default.

## Out of scope reminders

- Do not duplicate #2631's database column picker UI — that lives on the Notion side.
- Do not introduce a new template editor — #2329 covers `{{field}}` validation and template authoring.
- Do not add this to the chat panel — #2635 owns that surface.
- Do not touch generation tuning controls — #2616 / #2617 / #2618 own those.

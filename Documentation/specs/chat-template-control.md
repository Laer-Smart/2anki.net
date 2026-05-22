# Chat template control

## Problem

The `/chat` surface generates flashcards as a fixed `{front, back}` shape (`ChatCard` at `web/src/components/ChatPanel/ChatPanel.tsx:10-13`). `CardPreview` saves them through `/api/chat/deck` as a default deck — the user has no say in which Anki template the output lands in. People studying anatomy want image-occlusion-style cards; language learners want cloze; question-bank users want basic-with-reverse. Today they generate cards in chat, download the deck, then re-map every field by hand inside Anki. That manual rework is the loudest signal from external review (May 2026): chat has "great…potential, especially if it becomes a central control interface…A control board would allow users to precisely map chat-generated content onto different card templates."

## Goal

**Simpler/faster/more beautiful:** let a user pick the Anki template once per conversation and have every subsequent assistant response emit cards in that template's field shape — no post-export re-mapping in Anki. One control, one round-trip, deck downloads ready to study.

## Non-goals

- **Visual redesign of `/chat`.** PR #2628 owns layout, asymmetric bubbles, empty-state chips, and CTA hierarchy. This spec adds one control inside whatever shell that PR lands.
- **Field-mapping UI in non-chat flows** (upload, Notion, paste). That is sibling spec A4. Both share an underlying "route content to template fields" problem, but the entry points (and therefore the controls) differ; see *Open questions* for the shared-component recommendation.
- **A new template editor.** Users pick from existing built-in templates (basic, basic-with-reverse, cloze, image-occlusion) plus their saved custom templates. Editing templates stays in the Templates page.
- **Per-card overrides.** One template per conversation, not per card. Switching templates mid-conversation starts a new generation cycle with the new shape.
- **Retro-fitting old conversations.** Existing conversations stay on `{front, back}`. The selector applies forward from the moment it is changed.
- The 13 deferred items in `Documentation/chat/roadmap.md` are unaffected.

## Proposed shape

**One opinionated pick: a template selector in the ChatPanel header**, immediately left of the message input area, rendered as a compact pill button ("Template: Basic ▾") that opens a sheet of the user's available templates. The active template persists per conversation in the DB (new `conversations.template_id` nullable column; null = default `{front, back}` behavior for back-compat). Changing it mid-conversation updates the conversation and applies to the next assistant turn — the existing message history is not re-emitted.

**Why the header pill, not a slash command:**

- A `/template <name>` command hides the active state. Users would have to scroll or re-type to know what they picked. A persistent header pill answers "what shape am I getting" at a glance.
- A slash command also fights the existing send box — chat input is for prompts, not commands. Linear-style ambient controls beat tutorial-style commands for a tool people use repeatedly.
- Server-side instruction injection (silent system prompt change) hides the decision entirely. Reviewer asked for a *control board* — make the control visible.

**Server contract:**

- `GET /api/chat/conversations/:id/template` → `{ templateId: number | null, fields: string[] }`.
- `PATCH /api/chat/conversations/:id/template` → body `{ templateId: number | null }`, returns the same shape.
- `/api/chat/messages` (existing streaming endpoint) takes the conversation's template into account when building the system prompt; the assistant is instructed to emit cards as a JSON array matching `fields[]`. The `ChatCard` interface widens from `{front, back}` to `{ fields: Record<string, string> }`. `CardPreview` renders whichever fields exist and `/api/chat/deck` writes the deck using the conversation's `template_id`.
- Templates the user does not own (or that have been deleted) fall back silently to default `{front, back}` and the pill shows "Template: Basic ▾" with a one-line toast on next send: "Selected template no longer available — using Basic. Pick another in the header."

**Shared components with A4 (field-mapping UI for uploads):**

- The picker sheet (list of templates with field-shape preview) should be its own component — `TemplatePickerSheet` — usable by both surfaces.
- The post-generation mapping step that A4 needs (drag a column into a field slot) is *not* shared. Chat skips that step because the model emits already-mapped fields; upload needs it because the source columns are pre-existing.
- **Recommendation:** ship this spec first (smaller surface, simpler contract), extract `TemplatePickerSheet` into `web/src/components/TemplatePicker/` when A4 lands. Do not block this PR on A4 coordination — the picker can live inline in ChatPanel until A4 needs it.

## Open questions

- **Default template per user.** Should a user be able to set a global default (Account page) so every new conversation starts on their preferred shape? Reasonable yes — defer to a follow-up if it pushes the surface area too far.
- **Image-occlusion in chat.** That template needs an image; chat is text-first today. Either gate image-occlusion behind "attach an image first" or hide it from the picker entirely until uploads land. Recommendation: hide.
- **Cloze deletion authoring.** When the active template is cloze, does the model emit `{{c1::…}}` markup directly, or does the server post-process? Direct emission is simpler; risk is malformed cloze syntax. Recommendation: direct emission with one server-side validator pass; on failure, retry once, then surface "Cloze syntax was malformed — try rephrasing your request" to the user.
- **Custom-template field count.** Custom templates can have 10+ fields; the assistant should not be asked to fill 10 fields from a one-line prompt. Cap at 4 fields in the prompt instructions; for templates with more, leave the rest empty and document it in the picker sheet ("Fills the first 4 fields — edit the rest in Anki").
- **Telemetry.** Track which templates get picked (template_id, anonymised count per day) to inform whether built-in templates need expanding. Coordinate with `Documentation/ops-observability/`.

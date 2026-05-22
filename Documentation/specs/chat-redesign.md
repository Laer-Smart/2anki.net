# Spec: full visual redesign of /chat

### Trio synthesis
- **PM** — target metric is **second-turn rate on `/chat`** (chat sessions with ≥2 user turns / sessions with ≥1 user turn). Aim for **+10pp over 14 days** post-merge vs the 14-day pre-merge baseline; save-as-deck rate must hold flat or improve. Scope: layout + composer + empty state + restyled streaming/loading. Out of scope: cancel, sidebar, per-message actions, prompt/model changes.
- **Designer** — *asymmetric* (not symmetric): full-column prose for assistant with no bubble and no "Claude" sender label; right-aligned pill (`border-radius: var(--radius-full)`) for user; 1.5rem turn gap; promote "Save as deck" → **"Download deck"** as a primary pill CTA; replace bouncing-mascot "Building cards" with a `--color-primary-light` pill labelled **"Making your cards"**; empty state heading **"What are you studying?"** + three starter chips ("Make cards from a topic", "Explain this concept", "Quiz me"); composer gets `radius-lg`, focus-ring (matching `searchBarGroup:focus-within` in `shared.module.css`), and a round send button.
- **Engineer** — **L** effort. Must extract `MessageBubble` / `StreamingBubble` / `ComposerArea` sub-components to keep Sonar cognitive complexity below the gate (`ChatPanel.tsx` is already 720 lines). Consolidate duplicated CSS between `ChatPanel.module.css` and `ChatPage.module.css`. Preserve `CardPreview` props (`{cards, onSave}`) and the `Message.cards` field. Add `aria-live="polite"` on message list. 47 existing tests, almost all keyed on `aria-label` — they survive a visual rewrite except for the one "Save as deck" → "Download deck" assertion. Worktree recommended.
- **Agreement** — ChatGPT/Claude as *pattern* not as copy; pill user / prose assistant; empty state with starter chips; PR #2613's streaming caret + "Thinking" mechanism stays, visuals restyled; CardPreview stays inline; save-as-deck functional contract is non-negotiable.
- **Conflict** — PM phrased the goal as "symmetric ChatGPT/Claude-style stacking"; designer corrected to asymmetric. ChatGPT/Claude themselves are asymmetric (assistant=prose, user=pill); designer wins. PM proposed avatars; designer rejected — asymmetry already communicates role; designer wins. "Download deck" rename collides with one test's `aria-label="Save as deck"`; update label + aria-label + test together.
- **Resulting plan** — full visual rewrite of `/chat` surface with sub-component extraction, CSS consolidation, new empty state with starter chips, promoted Download-deck CTA. All functional contracts preserved.

### Design anchors (Fresh / Approachable / Simple)
Adapted from Meta WhatsApp's 2024 refresh principles (Yaniv) and our VOICE.md register (Stripe/Linear, not Muji):
- **Fresh** — visual language that matches what users already see in ChatGPT/Claude. No invented conventions. Familiar = trustworthy here.
- **Approachable** — clear empty state with starter chips for users who don't yet know what to ask. Reduces blank-page paralysis.
- **Simple** — remove the "Claude" sender label (asymmetry already communicates role); one prominent CTA on the assistant card ("Download deck"); reduce the visual noise from the current layout.

---

**Outcome**: Lift second-turn rate on `/chat` sessions by **+10pp** over 14 days post-merge vs the 14-day pre-merge baseline. Save-as-deck rate must hold flat or improve.

**Goal alignment**: Chat is the simplest path from "I have a question about my notes" to "here are the cards." A credible-looking chat surface is table stakes for converting `/chat` visitors into repeat uploaders, which widens the funnel for users who can't or won't paste Notion exports — moving us toward 300K users.

**Riskiest assumption**: That second-turn rate is bottlenecked by *visual quality* of the surface — not by answer quality, latency, or the fact that the first turn already feels terminal once cards are produced.

**Smallest test**: Ship behind no flag. Compare second-turn rate and save-as-deck rate for the 14 days post-merge against the 14-day pre-merge baseline. If second-turn is flat or down, the assumption is wrong and the next iteration is about answer quality, not chrome.

### Scope (in)
- **Layout**: asymmetric — assistant as full-column prose (no bubble, no sender label), user as right-aligned pill (`border-radius: var(--radius-full)`, `var(--color-bg-secondary)`, padding `0.625rem 1rem`, `max-width: 72%` desktop / `88%` mobile).
- **Content column**: `messageListInner` max-width reduced from `800px` to `680px` for prose reading comfort.
- **Vertical rhythm**: `1.5rem` between turns (up from `0.75rem`); `1rem` between parts within a multi-part assistant turn (contentBefore / CardPreview / contentAfter).
- **Composer**: keep `composerCard` structure; `border-radius` → `var(--radius-lg)`; `box-shadow: var(--shadow-sm)` at rest; focus-within: `border-color: var(--color-primary)` + `box-shadow: 0 0 0 3px var(--color-focus-ring)`; send button becomes round (`border-radius: var(--radius-full)`); textarea `min-height` lowered to `1.5rem` (keep `field-sizing: content`, `max-height: 7rem`).
- **CardPreview**: `border-left: 3px solid var(--color-primary)` accent (matches `UpsellCard.card`). Save CTA promoted to primary pill, label changes from "Save as deck" → **"Download deck"**. Props contract unchanged.
- **Streaming / loading**: "Thinking" hint replaced with a pulsing pill (`--color-bg-secondary`, `border-radius: var(--radius-full)`, ~`120px × 0.75rem`, `thinkingPulse` opacity animation). Word "Thinking" becomes screen-reader-only `aria-label`. "Building cards" mascot replaced with a `--color-primary-light` pill labelled "Making your cards" (`var(--text-xs)`, `var(--color-primary)`, `var(--font-medium)`). Streaming caret from PR #2613 preserved.
- **Empty state** (when `messages.length === 0 && !isLoading`): centered in the message scroll area. Heading "What are you studying?" (`var(--text-xl)`, `font-semibold`, sentence case, no period). Sub-line "Ask a question, paste your notes, or attach a PDF — get flashcards back." (`var(--text-sm)`, `var(--color-text-secondary)`). Three chip buttons (`shared.module.css .chip`): "Make cards from a topic", "Explain this concept", "Quiz me". Click pre-fills the textarea and focuses it; no autosubmit.
- **Sub-component extraction**: `MessageBubble`, `StreamingBubble`, `ComposerArea` extracted from `ChatPanel.tsx` to clear the Sonar cognitive-complexity gate.
- **CSS consolidation**: chip / composer / textarea / send / paperclip / drop-overlay / input-area styles move from `ChatPage.module.css` into `ChatPanel.module.css`. `ChatPage.module.css` retains only layout (`.layout`, `.container`, `.emptyState`, `.starterChip`).
- **Accessibility**: `aria-live="polite"` on the message list container.
- **Mobile**: verify pill wraps gracefully at 375px; verify focus-ring + composer behavior on touch.

### Scope (out)
- Mid-stream cancel / stop button (follow-up; needs server-side abort).
- Multi-conversation sidebar redesign (separate spec).
- Per-message edit / regenerate / copy / thumbs.
- Avatars (asymmetry communicates role).
- Per-message timestamps.
- Prompt or model changes; any server, SSE, or API contract change.
- Modal or right-rail for deck download — CardPreview inline CTA is the only surface.
- Markdown / code-block restyle; syntax highlighting.
- Dark-mode-only restyle (existing tokens apply identically).

### User story
As a learner opening `/chat` for the first time, I want a credible chat surface with a clear starting point — so I know what to ask, see when the assistant is thinking, and can save the cards it produces without hunting for a button.

### Acceptance criteria
- [ ] User messages render as right-aligned pills with `border-radius: var(--radius-full)`.
- [ ] Assistant messages render as full-column prose with no bubble background and no sender label.
- [ ] Turn gap is `1.5rem`; intra-turn part gap is `1rem`.
- [ ] Content column max-width is `680px`.
- [ ] Composer has rounded corners, drop shadow at rest, focus-ring on focus-within, round send button.
- [ ] CardPreview has a 3px primary left-border; save CTA is a primary pill labelled "Download deck"; aria-label updated; corresponding test updated.
- [ ] "Thinking" renders as a pulsing pill with `aria-label="Thinking"`; "Building cards" renders as a "Making your cards" primary-light pill; streaming caret from PR #2613 preserved.
- [ ] Empty state renders when `messages.length === 0 && !isLoading`, with heading "What are you studying?", sub-line, and three starter chips that pre-fill + focus the textarea.
- [ ] `MessageBubble`, `StreamingBubble`, `ComposerArea` extracted as sub-components; `ChatPanel.tsx` cognitive complexity below the Sonar threshold.
- [ ] Chip / composer / send / paperclip CSS lives in `ChatPanel.module.css`; `ChatPage.module.css` retains only layout.
- [ ] Message list container has `aria-live="polite"`.
- [ ] All 47 existing tests pass (with one update for the "Save as deck" → "Download deck" aria-label rename).
- [ ] `prefers-reduced-motion: reduce` disables the streaming caret blink and the "Thinking" pill pulse (carries forward from PR #2613).
- [ ] Browser check passes: golden path on desktop, no console errors at 375px (per `.claude/rules/browser-attestation.md`).

### Open questions
- Persist starter-chip identity in `data-` attributes for analytics, so we can measure which prompt-chip drove the second turn? Out of scope unless the hook is trivial; flag for follow-up otherwise.
- The IIFE in JSX for the user-message collapse logic — lift into a `UserMessage` sub-component during the extraction pass, or keep as IIFE? Engineer's call at implementation time; lean toward sub-component for Sonar.

### Technical pre-flight

**Layers touched:** `web` only. No `routes`, `controllers`, `usecases`, `services`, `data_layer`, or `migrations`.

**Files in play:**
- `web/src/components/ChatPanel/ChatPanel.tsx` — wholesale rewrite + sub-component extraction.
- `web/src/components/ChatPanel/ChatPanel.module.css` — full restyle; absorbs styles from `ChatPage.module.css`.
- `web/src/components/ChatPanel/ChatPanel.test.tsx` — preserve aria-label-keyed selectors; one update for "Download deck".
- `web/src/components/ChatPanel/MessageBubble.tsx` (new) + `.module.css` + `.test.tsx`.
- `web/src/components/ChatPanel/StreamingBubble.tsx` (new) + `.module.css` + `.test.tsx`.
- `web/src/components/ChatPanel/ComposerArea.tsx` (new) + `.module.css` + `.test.tsx`.
- `web/src/pages/Chat/ChatPage.tsx` — empty state stays here (or moves into `ChatPanel`; engineer's call).
- `web/src/pages/Chat/ChatPage.module.css` — retain layout only.
- `web/src/pages/Chat/CardPreview.tsx` — rename label + aria-label.
- `web/src/pages/Chat/CardPreview.module.css` — primary-pill button restyle.
- `web/src/pages/Chat/CardPreview.test.tsx` — update one assertion ("Save as deck" → "Download deck").
- `web/src/pages/Chat/AssistantMarkdown.module.css` — adjust prose spacing if needed.

No shared files touched (`web/src/App.tsx`, `web/scripts/prerenderLandingPages.ts`, `web/public/sitemap.xml`). No parallel-PR overlap.

**Save-as-deck contract — preserved:**
- `CardPreview` props `{ cards: ChatCard[]; onSave: (deckName: string) => void }` — stable.
- `Message.cards?: ChatCard[]` — unchanged.
- `downloadDeck(cards, deckName)` posts `{ cards, deckName }` to `/api/chat/deck` — unchanged.
- `aria-label="Deck name"` on rename input — preserved.
- `aria-label="Save as deck"` → `aria-label="Download deck"` — coordinated with the label rename.

**SSE plumbing — preserved.** `streamingText` stays a flat string. `isLoading && streamingText.length > 0` continues to switch the streaming bubble. `visibleStreamingText` continues to strip the JSON fence.

**Sonar risk surface:** cognitive complexity in `ChatPanel.tsx` is already at the high end (720 lines, 100-line `sendMessage`, IIFE in JSX for user-message collapse). Sub-component extraction is **mandatory** for this PR to pass Sonar. Run `sonar-scanner` locally before flipping the PR ready (per `.claude/rules/sonar.md`).

**Testing:** Vitest (web). Existing 47 tests are keyed on `aria-label`, `role`, and `class*=…` selectors; most survive a visual rewrite. New tests cover the extracted sub-components and the starter-chip prefill behavior.

**Migration / data:** none.

**Changelog entry:** required. Single JSON file under `web/src/pages/WhatsNewPage/changelog/`. Suggested copy: `Chat — new layout, clearer empty state, and a one-tap "Download deck" CTA`.

**Effort: L.** Worktree recommended. 2–3 focused sessions for implementation.

**Priority: High.** Direct ask from Al after PR #2613 (`style:` polish) landed without moving the surface. Supersedes the polish-only scope.

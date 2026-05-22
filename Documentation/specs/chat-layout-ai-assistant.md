# Spec: Modern chat layout for the AI assistant

### Trio synthesis
- PM: A recent usability tester (paid Anki/Quizlet creator) said the assistant works but the surface "doesn't feel like a chat" — they want familiar conventions, not literal ChatGPT styling. Outcome to move: post-first-message return rate on `/chat` (proxy: chat sessions with ≥2 user turns / chat sessions with ≥1).
- Designer: Keep the asymmetric pattern (user → soft bubble, assistant → flush prose with a sender label and card preview). Don't introduce a second assistant bubble — the prose-as-page already reads cleaner than ChatGPT's gray block. The fixable gaps are streaming feedback, keyboard polish, and one persistent input affordance instead of the current implicit one.
- Engineer: All changes live in `web/src/components/ChatPanel/ChatPanel.tsx` and its module CSS. No server, no DB, no migration. Effort M; one caret-cursor primitive, one Esc handler, one streaming-indicator refactor, plus tests in the colocated `ChatPanel.test.tsx`.
- Agreement: The conventions to adopt are streaming-cursor visibility, Esc to dismiss focus, and a clearer "thinking" state. The conventions to *not* adopt are symmetric bubbles and the ChatGPT gray block.
- Conflict: Designer rejected the bubble-symmetry framing in the original request; PM accepted on the basis that the reporter described the *feel* of chat, not the literal styling. Resolved by reframing the goal as "the underlying conventions that make chat feel like chat," per VOICE.md register.
- Resulting plan: Three small, additive UI changes on the existing ChatPanel — caret cursor on streaming text, Esc-to-blur on the composer, and a labelled "Thinking" state that replaces the bare skeleton shimmer when no tokens have arrived yet. No bubble redesign. No symmetric layout.

---

**Outcome**: Lift the rate of chat sessions that reach ≥2 user turns by 5 percentage points (current baseline to be sampled from the `messages` table over the last 14 days at implementation time). Users who feel oriented in the conversation send a follow-up; users who don't, bounce.

**Goal alignment**: A more familiar chat surface lowers the cost of the second message, which is where the assistant earns its keep — the first response rarely lands a deck-ready set of cards on the nose. Better second-turn rate compounds into more decks generated from the assistant path, which moves us toward the 300K-user goal by widening the funnel for users who can't or won't paste Notion exports.

**Problem**: A paid usability tester (a professional Anki/Quizlet creator) liked the assistant but said the interface didn't feel like a chat. Translated to convention: streaming feedback is invisible until a token chunk lands; there is no caret/cursor cue that something is being typed; Esc doesn't dismiss focus from the textarea (a near-universal chat convention); and the bare shimmer skeleton before the first token reads as "loading something" rather than "the assistant is thinking." The persistent composer, send affordance, and Enter/Shift+Enter behaviours are already correct.

**Riskiest assumption**: That the missing conventions are what's blocking second-turn engagement. It is also possible the chat is fine and the bounce is content-driven (the first response wasn't useful), in which case visual polish moves nothing.

**Smallest test**: Ship the three changes behind no flag, measure the second-turn rate over a 14-day window, compare to the baseline. If the rate doesn't move at all, the cause is content, not chrome, and the next iteration goes into the prompt instead of the layout.

**Scope (in)**:
- Caret-style streaming cursor — a thin animated `|` appended to streaming assistant text while `streamingText` is non-empty and not yet flushed to a final message. Removed the instant a `done` SSE event arrives.
- "Thinking" state replaces the current bare shimmer skeleton when `isLoading === true` and `streamingText.length === 0`. Reads "Thinking" next to the existing "Claude" sender label, in the same muted weight as the label.
- `Esc` blurs the composer textarea. Does not clear the draft. Does not abort an in-flight request — that is out of scope.

**Scope (out)**:
- Symmetric/two-sided bubble redesign. The asymmetric assistant-as-prose pattern stays.
- Multi-conversation history sidebar redesign. (Sidebar already exists; not in scope.)
- Per-message edit, regenerate, copy, or rate buttons. Follow-ups.
- Mid-stream cancel/stop button. Follow-up; would also require a server-side abort signal.
- Markdown rendering changes, code-block styling, syntax highlighting.
- Mobile-specific composer redesign — the existing CSS already handles narrow viewports.

**User story**: As a learner working through a study question, I want the chat to give me the small affordances I get in every other chat tool — a sign that the assistant is thinking, a visible cursor while text is streaming in, and Esc to step away from the input — so the surface feels familiar and I keep going past the first response.

**Acceptance criteria**:
- [ ] While `isLoading === true` and no tokens have streamed yet, the loading row shows the "Claude" sender label followed by the word "Thinking" in muted weight, replacing the bare shimmer. Sentence case, no trailing period (per VOICE.md).
- [ ] While `streamingText.length > 0` and the `done` event has not yet arrived, the streaming assistant bubble renders a 1-character caret (`|`) at the end of the visible text, animated at 1.06s blink (CSS `@keyframes` opacity 1 ↔ 0). The caret is decorative (`aria-hidden="true"`).
- [ ] The caret is removed within one render frame of the `done` SSE event being dispatched. No double caret when both the streaming line and the final message momentarily co-exist.
- [ ] Pressing `Esc` while the composer textarea has focus blurs it. The textarea value is unchanged. The conversation list and rest of the page are not affected.
- [ ] Existing Enter / Shift+Enter behaviour is untouched and covered by the same test suite.
- [ ] No new dependency. All changes inside `ChatPanel.tsx` and `ChatPanel.module.css`.
- [ ] Vitest tests in `ChatPanel.test.tsx` cover: (a) "Thinking" appears when loading and no tokens yet, (b) caret appears during streaming and disappears on `done`, (c) Esc blurs the textarea.
- [ ] `prefers-reduced-motion: reduce` disables the caret blink animation; the caret is still rendered but static.

**Open questions for engineering**:
- The current "Building cards" indicator (with the Notion mascot) already gives a more specific signal once card JSON starts streaming. Confirm "Thinking" only shows when `streamingText.length === 0` — once any token has streamed, the caret takes over and "Thinking" disappears, even before the card-JSON marker.
- Is there value in showing the caret on user messages while they type? Designer's read: no — it's not a chat convention there and the existing textarea already has its own native caret.

**Leading indicator moved**: Second-turn rate on `/chat` sessions, target +5 pp over 14 days.

**Out of scope (next iteration)**:
- Per-message actions: copy, regenerate, rate.
- Multi-conversation history redesign (sidebar polish is a separate spec).
- Mid-stream cancel.
- An "assistant is offline / rate-limited globally" inline banner — currently surfaced as a panel above the composer; would benefit from chat-native treatment but isn't blocking this spec.

---

## Design notes

**Pattern call: keep asymmetric, do not adopt symmetric bubbles.** The current treatment — user message in a soft secondary-bg bubble (right-aligned), assistant response as flush prose with a small "Claude" sender label and an inline `CardPreview` for generated cards — is the right call for a tool whose assistant responses include rich card previews and markdown. Putting that inside a second gray bubble would compress the card preview and add visual weight without information. The reporter's "ChatGPT-style" language was about *feel*, not literal styling; the trio's translation per VOICE.md (Stripe/Linear register, not Muji) is: keep the restraint, fix the conventions that are actually missing.

**Streaming caret.** Append a thin `|` to the trailing edge of the streaming assistant text. CSS: `font-weight: 400; opacity: 1; animation: caretBlink 1.06s steps(2, start) infinite;`. `@keyframes caretBlink { 50% { opacity: 0; } }`. Inside a `@media (prefers-reduced-motion: reduce)` block, set `animation: none`. The caret is a span with `aria-hidden="true"` so screen readers don't announce it on every token.

**"Thinking" state.** Replace `<div className={styles.messageSkeleton} />` (used when `isLoading && streamingText.length === 0`) with:

```tsx
<span className={styles.messageSenderLabel}>Claude</span>
<span className={styles.thinkingHint}>Thinking</span>
```

`thinkingHint` styling: `font-size: var(--text-sm); color: var(--color-text-secondary); padding: 0.25rem 0;`. No trailing ellipsis (VOICE.md forbids `Loading…` style), no period. Sentence case. The "Thinking" word may pulse opacity 0.6 ↔ 1 over 1.4s — gentle, not distracting — and is disabled under `prefers-reduced-motion`.

**Esc behaviour.** Add to the textarea's `onKeyDown` handler: `if (e.key === 'Escape') { e.currentTarget.blur(); return; }`. Does not preventDefault on browsers that would otherwise close a parent dialog (the ConsentModal renders as a separate portal and handles its own Escape). No state change to `inputValue`. No abort.

**Copy strings (the only user-visible strings introduced):**
- "Thinking" — visible only between the user pressing send and the first streamed token. Sentence case, no period. Replaces the current bare shimmer.

That is the entire copy surface of this spec. The composer placeholder ("Ask a study question, paste notes, or attach a PDF…"), the "Building cards" indicator (with the mascot), and all error strings are untouched.

**What we are deliberately not doing visually:**
- No avatar for the user side. Adding one would imply we want a chat-app *identity* surface, which we don't — the user is the user.
- No timestamp per message. Timestamps belong in the conversation-list sidebar, not in the message log of an active session.
- No "Assistant is typing…" with three dots. "Thinking" is more accurate to a non-streaming LLM call and reads as a real sentence per VOICE.md punctuation rule.
- No background-color change to the streaming line. The caret carries the live state; a second visual treatment would compete.

---

## Technical pre-flight

**Layers touched:**
- `web` only. No `routes`, `controllers`, `usecases`, `services`, `data_layer`, or `migrations` touched.

**Files in play (one component + its colocated test + CSS):**
- `web/src/components/ChatPanel/ChatPanel.tsx` — wire the three behaviours.
- `web/src/components/ChatPanel/ChatPanel.module.css` — `thinkingHint`, `streamingCaret`, `@keyframes caretBlink`, `prefers-reduced-motion` overrides.
- `web/src/components/ChatPanel/ChatPanel.test.tsx` — three new tests.

No shared files (`web/src/App.tsx`, `web/scripts/prerenderLandingPages.ts`, `web/public/sitemap.xml`) are touched, so no parallel-PR coordination overhead.

**Cross-language coordination:** None. TypeScript only.

**Estimated effort: M.** Three small additive changes, all local to one component. The caret-removal-on-done timing is the only non-obvious bit (the `streamingText` state already clears in the `finally` block, but the visible streaming bubble depends on `streamingText.length > 0`, so the caret naturally disappears with the last token — confirm with the test).

**Security: none.** No new fetch, no new user input written to the DOM that wasn't already rendered. The caret span has no user content.

**Sonar risk surface:**
- Cognitive complexity in `ChatPanel.tsx` is already at the high end. Add the Esc handler as a flat branch in `handleKeyDown` (one extra `if`), not a nested ternary. Add "Thinking" / caret via two small JSX conditionals, not by inlining ternaries into the existing render block.
- Run `sonar-scanner` locally before flipping the PR ready (CLAUDE.md `.claude/rules/sonar.md`). Effort is small but `ChatPanel.tsx` is the kind of file Sonar likes to flag.

**Testing:**
- Vitest (web). Three new tests in `ChatPanel.test.tsx`. Mock the SSE response via `fetch` stub already used by the existing tests.
- Confirm `prefers-reduced-motion` does not break the test runner — JSDOM doesn't implement it, but we can assert the class is applied and trust the CSS media query at runtime.

**Migration / data: none.**

**Changelog entry:** Required (`style:` or `feat:` depending on commit prefix at implementation time). One JSON file in `web/src/pages/WhatsNewPage/changelog/` per the existing format. Suggested copy: `Chat feels more like chat — streaming cursor, "Thinking" state while the assistant is warming up, and Esc to step out of the input`.

**Priority: Low.** Ship only after the High and Medium specs from the same usability tester land. The conventions added here are polish; the fix for whichever functional issue ranks High is what moves the larger metric.

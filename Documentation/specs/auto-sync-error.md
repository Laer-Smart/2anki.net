## Spec: Diagnose and improve Auto Sync connect error

### Trio synthesis

- **PM**: A paid subscriber tried to turn on Auto Sync and hit a generic error with no path forward — that is exactly the surface where someone close to converting bails. Diagnose first, harden the copy second; either alone is half the fix.
- **Designer**: The Ankify product has three "connect-like" surfaces (Start Anki, Sign in to AnkiWeb, Subscribe a Notion page) and they share a generic `(error as Error).message` pattern. The user can't tell which step failed or what to do next. Replace each surface's catch-all with a "what happened + what to do" message keyed off the response status.
- **Engineer**: Five likely culprits — (1) `hasAnkifyAccess` returning false when `subscriptions.active` is stale, (2) Notion OAuth token missing/expired (`NotionNotConnectedError`, 409), (3) no active hosted Anki (`NoActiveAnkifyClientError`, 409), (4) AnkiConnect unreachable (503), (5) Docker daemon down on provision (503). The poll loop and the deferred webhook receiver are not in the synchronous path of "check the Auto Sync option" and can be ruled out for the first-touch error.
- **Agreement**: The error surface today is generic, the candidate causes are known and bounded, and every code path that throws on this flow already has a distinct error class. The work is mapping each class to a specific user-facing string and proving the gate is healthy for paid users.
- **Conflict**: Engineer wanted to scope the spec to "just improve the copy and ship." PM held the line that we cannot ship copy until we know which of the five causes the reporter hit — otherwise we risk writing the right string for the wrong error. Resolution: keep both halves (diagnostic first, then copy hardening), gated by the diagnostic finding.
- **Resulting plan**: Reproduce internally against each of the five candidate causes, identify which one the reporter hit, then ship distinct error strings for each — keyed off existing typed errors, no new error classes.

---

**Outcome**: Auto Sync first-touch error surfaces resolve with a specific reason and a next step in 100% of the five known failure modes (today: 0/5). Leading indicator: Auto Sync subscriber → first successful Notion subscription rate (currently the drop-off is invisible).

**Goal alignment**: Auto Sync is the $30/mo plan and the highest-intent surface on the product. A user who paid, made it to the connect step, and saw a generic error is a near-miss conversion. Closing that loop directly supports the 300K-user goal — the cost to reach a paid user is the highest, so churn at this step is the most expensive churn we have.

**Problem**: A recent usability tester with full subscriber access ran a hands-on review of the product and reported that checking the Auto Sync option produced an error. They flagged High priority — the exact text, surface, and repro were not captured. Today every Ankify error surface renders `(error as Error).message` from the response, which surfaces the server's internal phrasing ("No active Ankify client. Provision one before subscribing.", "Notion is not connected") to a user who has no model for what those terms mean and no link to the page that fixes them.

**Riskiest assumption**: That the error is on the user-visible Ankify connect path (Start Anki, Sign in to AnkiWeb, Subscribe page) and not somewhere upstream — e.g. the `RequireAnkifyAccess` middleware returning 403 because the user's `subscriptions.active` row hadn't refreshed after Stripe checkout. If it is the gate, the fix is a different shape entirely (sync-on-arrival, not error copy).

**Smallest test**: Inspect the reporter's user row + active subscriptions row in prod (post support reply, when we have a user ID and timestamp). Cross-reference against the `[ankify-polling]` and Ankify controller logs at that timestamp. The matching log line names the error class — that names the surface and rules out the gate in under 10 minutes.

**Scope (in)**:
- Reproduce each of the five candidate failure modes internally in dev. Document repro steps in a follow-up note attached to this spec.
- Replace `(error as Error).message` in three surfaces (`AnkifySetupPage` start/restart, `AnkifySetupPage` verify sign-in, `NotionSubscriptions` subscribe) with status-keyed strings that match VOICE.md (what happened + what to do).
- Route 401/403 responses on Ankify endpoints to a paywall-aware empty state ("Auto Sync isn't active on this account. <Link> Manage subscription") instead of a generic alert — the reporter is paid, so a stale 403 is the most common false-negative.
- Add a sync-on-arrival hook for users returning from a successful Stripe checkout, if the diagnostic shows stale-subscription as the cause. (Conditional: gated by the diagnostic finding — does not ship if cause is elsewhere.)

**Scope (out)**:
- Activating the deferred Notion webhook receiver. The webhook path is intentionally inactive per `Documentation/ankify/notion-webhooks-deferred.md` and is not in the first-touch error path.
- Rewriting `hasAnkifyAccess`. The gate logic itself is correct; the question is whether the inputs are fresh.
- Re-architecting the error class hierarchy. Each surface already throws a distinct typed error — the work is mapping them, not adding new ones.
- Multi-step onboarding redesign. That is `/spec-draft-pr` territory for a separate ticket.

**User story**: As an Auto Sync subscriber connecting Notion for the first time, I want the error message to tell me exactly which step failed and what to do next, so I can fix it in under a minute without emailing support.

**Acceptance criteria**:
- [ ] Diagnostic note (in `Documentation/ankify/` or in this PR body) names the cause the reporter hit, with a log line or DB row as evidence.
- [ ] `AnkifySetupPage` provision error renders one of: "Anki couldn't start — usually a temporary infra issue. Try again in a moment." / "Anki is taking longer than usual to start. Try again, or email support@2anki.net." — keyed on response status, not on `(error as Error).message`.
- [ ] `AnkifySetupPage` AnkiWeb verify error renders: "Can't reach Anki right now. Try again in a few seconds." / "We don't see you signed in to AnkiWeb yet. Open Anki, sign in, then try again." — keyed on `status === 'unreachable'` vs `status !== 'linked'` (the first half already exists; preserve it).
- [ ] `NotionSubscriptions` subscribe error maps 409 `NotionNotConnectedError` → "Notion isn't connected to 2anki. Connect Notion, then try again." with a link to `/notion`. Maps 409 `NoActiveAnkifyClientError` → "Set up your hosted Anki first." with a link to `/ankify/setup`. Maps 503 `AnkiConnectUnreachableError` → "Anki isn't responding right now. Try again in a moment." Maps 401/403 → "Auto Sync isn't active on this account. <Link> Manage subscription".
- [ ] No surface renders a raw `(error as Error).message` to the user. The fallback for an unmapped status is "Something broke on our end. Try again, or email support@2anki.net." (matches VOICE.md "no fake warmth").
- [ ] Tests at the component level (Vitest) cover each mapped status → expected string. Internal services run for real per `.claude/rules/testing.md`; mock only the `Backend` boundary.
- [ ] Changelog entry under `web/src/pages/WhatsNewPage/changelog/` follows the file shape rule. Sentence case, no trailing period, e.g. `Auto Sync connect errors name the specific step and what to do next`.

**Open questions** (engineering):
- Q1: For a paid subscriber returning from Stripe checkout, what is the worst-case lag before `subscriptions.active` is true? If it can be measurable in seconds, do we want a polling/refresh hook on `/ankify` arrival, or is a "Refresh" button enough? (PM leans toward auto-refresh; engineer to confirm cost.)
- Q2: The `NotionSubscriptions` paywall response is currently a generic 403 from `RequireAnkifyAccess`. Is it worth distinguishing "you don't have access at all" vs "your access just lapsed" in the JSON body for the UI to key off? Or do we treat 403 uniformly?
- Q3: Should the empty-state copy in `NotionSubscriptions.tsx` (line ~412, `subscribe.isError`) link to `/documentation/sync/how-it-works` for first-time users, in addition to the action link?

**Out of scope (next iteration)**:
- Activating Notion webhooks (deferred).
- Add a banner on `/ankify` when AnkiConnect last health-checked failed (separate observability spec).
- Auto-retry the failing subscribe call client-side. Manual retry is the safer first step.

---

### Design notes

Three surfaces, three error maps. None of the changes touch layout — the copy lives in existing alert blocks (`sharedStyles.alertDanger`, `formStyles.autoSyncPrompt`, `styles.signInAlert`).

**Surface 1 — `AnkifySetupPage` "Start Anki" failure (line ~259, `provision.error`).**

Today: `Couldn't start your Anki. <raw message> Try again — most starts work on the second go.`

Proposed:
- 503 (Docker unavailable / no ports): `Anki couldn't start — usually a temporary infra issue. Try again in a moment. If it keeps failing, email support@2anki.net.`
- Other / unknown: `Anki couldn't start. Try again, or email support@2anki.net.`

**Surface 2 — `AnkifySetupPage` "Sign in to AnkiWeb" verify failure (line ~366, `verifySignIn.isSuccess && verifyStatus !== 'linked'`).**

Today (good, keep): `unreachable → "Can't reach Anki right now. Try again in a few seconds."` and `not-linked → "We don't see you signed in to AnkiWeb yet. Open Anki, click Sync in the toolbar, enter your AnkiWeb email and password, then come back and try again."`

This surface is already on-voice. No change.

**Surface 3 — `NotionSubscriptions.tsx` subscribe failure (line ~412, `subscribe.isError`).**

Today: `<raw (error as Error).message>` — could be "Notion is not connected" (5 words, no link), "No active Ankify client. Provision one before subscribing." (engineering voice), "AnkiConnect is unreachable." (jargon).

Proposed (key off `status` carried on the error; add a `status` field to `Backend.subscribeAnkifyNotionPage`'s error if not already there):

| Status / class | String |
|---|---|
| 401 / 403 | `Auto Sync isn't active on this account.` + link `Manage subscription` → `/account` |
| 409 NotionNotConnectedError | `Notion isn't connected to 2anki.` + link `Connect Notion` → `/notion` |
| 409 NoActiveAnkifyClientError | `Your hosted Anki isn't set up yet.` + link `Set up Anki` → `/ankify/setup` |
| 503 AnkiConnectUnreachableError | `Anki isn't responding right now. Try again in a moment.` |
| default | `Something broke on our end. Try again, or email support@2anki.net.` |

Capitalization: sentence case, no trailing period on the action link label. Em dash reserved for adding specifics (the "Auto Sync isn't active on this account" line gets no em dash — the link does the work). Banned words check: no "oops", no exclamation marks, no "we hope".

The link is a real anchor styled as a link, not a button. The component is the existing `sharedStyles.helpDanger` block — no new component.

Verdict: no layout change. Copy and a small status-mapping helper.

---

### Technical pre-flight

**Layers touched**:
- `web/src/pages/AnkifyPage/components/NotionSubscriptions.tsx` — error mapping in the `subscribe.isError` block. Add a small pure helper `mapSubscribeError(error): { text: string; link?: { href: string; label: string } }`.
- `web/src/pages/AnkifyPage/AnkifySetupPage.tsx` — provision-error block (~line 259). Wrap the existing branch in a status check.
- `web/src/lib/backend/Backend.ts` — ensure the thrown error carries `status` (HTTP status code). If `Backend.subscribeAnkifyNotionPage` already propagates `status` (the way `refreshSubscription` does for 429), reuse the pattern; otherwise extend that pattern, not invent a new one.
- No changes in `routes/` / `controllers/` / `usecases/` / `services/` / `data_layer/`. The server already throws the right typed errors and the controller already maps them to the right HTTP status codes.
- New: `Documentation/ankify/auto-sync-error-repro.md` (or section in `FEATURE.md`) — short repro recipe for each of the five candidate failures. Lives in the same PR.

**Files likely in play**:
- `web/src/pages/AnkifyPage/components/NotionSubscriptions.tsx`
- `web/src/pages/AnkifyPage/AnkifySetupPage.tsx`
- `web/src/lib/backend/Backend.ts` (only if subscribe doesn't already preserve `status`)
- `web/src/pages/AnkifyPage/components/NotionSubscriptions.test.tsx` (extend) and a new test for the setup page error block
- `web/src/pages/WhatsNewPage/changelog/<date>-auto-sync-connect-errors-name-the-specific-step.json`

**Cross-language coordination**: None. Pure TypeScript on both ends.

**Effort**: **S** — small. The server-side error classes already exist with distinct types and status codes; the work is web-side copy mapping + tests. The diagnostic is a 10-minute investigation once we have the user ID. Cap risk: a "S" can become a "M" if the diagnostic shows a stale-subscription race that requires a sync-on-arrival hook — flag back to PM before expanding scope.

**Security/testing/migration concerns**:
- No new DB columns, no migrations.
- No new HTTP egress (all surfaces already exist), so no SSRF surface to worry about.
- No PII or secrets in the new strings.
- Test coverage: per `.claude/rules/testing.md`, mock the `Backend` boundary only; the component tests should not mock React Query internals.
- SonarCloud: the existing `(error as Error).message` cast becomes `(error as Error & { status?: number })` — declare the type once at the top of the helper so we don't sprinkle inline assertions (`.claude/rules/code-quality.md` — avoid `as` without justification).
- Browser attestation: PR will touch `web/src/`, so the PR body needs the Browser-check section per `.claude/rules/browser-attestation.md`. Localhost golden path: open `/ankify`, attempt to subscribe a page while signed out of Notion → expect the new copy + link.

**Risks**:
- If the reporter's error was actually a 401 from `RequireAnkifyAccess` (stale subscriptions cache), copy alone doesn't fix the bug — we ship a copy improvement that masks an underlying refresh issue. The diagnostic step exists precisely to rule this out.
- The Backend.ts change to surface `status` on the subscribe error could leak through to other components if not scoped. Add the status to the error in the call site, not the global `get`/`post` helper, so blast radius stays in `subscribeAnkifyNotionPage`.

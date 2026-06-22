# CLAUDE.md

Express/TypeScript server that converts Notion pages and uploaded files (HTML, markdown, xlsx, zip) into Anki `.apkg` decks. Frontend is the sibling workspace under `web/`.

## Goal

Mission: give people the simplest, fastest way to turn what they're studying into beautiful Anki flashcards. Drop something in, get a clean deck back.
Scale: grow 2anki.net past 300K users.
Revenue: grow MRR past $5K — ARPU and retention are the levers; user count follows. The system sat at its mathematical ceiling (adds ÷ churn) at $2.24 ARPU until the June 2026 reprice; never again let user-count work crowd out revenue work.
Allocation: every week ships at least one acquisition-facing change — landing pages, SEO, onboarding, or signup/first-conversion friction — and it ships **before** any new product surface starts that week. Acquisition is the only lane that creates users; starve it and the 300K goal stalls no matter how much else moves. History note: 2026 ran 6% acquisition work and 2023-25 ran 0% across 36 months — both starved the only lane that makes users.
Every PR is checked against all three — does it make the experience simpler/faster/more beautiful, does it move us toward scale, and does it (for user-facing changes) state which funnel or revenue metric it should move?

## Design Context
- **Register**: product
- **Surface(s)**: `/ankify` (sync control panel) — first adopter of the locked DNA; widen as other surfaces follow
- **Purpose**: let paid power users see at a glance that their Notion→Anki sync is healthy and manage where decks land
- **Audience**: lifetime / Auto-Sync subscribers — serious med/law learners running a live 5-min sync
- **Personality**: precise, trustworthy, technical
- **DNA**: Swiss Panel — Swiss/International layout + a monospaced tabular data voice; signature move = the right-hand mono data column. See DESIGN.md.
- **Color**: reuse `web/src/styles/base.css` tokens (5 themes), one blue accent + the status triad — no new ramp
- **Constraints**: React, WCAG AA, the 5-theme token system, product restraint (one signature move exempt)

### Business baseline (as of 2026-06-10 — weekly-retro updates this block)

MRR $1,710 · 763 paying subs · ARPU $2.24 · 18.9%/mo churn (79% lifecycle, not price) · 34 new paid/wk trailing · ~19,580 registered. Read live at `/api/ops/business/metrics` (ops-gated) and Stripe; funnel events at `/api/ops/metrics`.
Pricing v2 shipped 2026-06-10: $7.99/mo + $64/yr for new members, legacy $6/$60 lock-in until 21 Jun, annual default. Scheduled reads: v2 funnel week of 15 Jun (targets: ≥70 new paid/wk, page→checkout ≥10%, checkout→paid ≥50%); minimal-layout CTR guardrail 24 Jun.

## Tech stack

- Node 22.20.0 (`.nvmrc`), pnpm workspace, TypeScript ~6.0
- Express 5, Knex + Postgres (with `better-sqlite3` for local), multer for upload
- Jest + ts-jest, `*.test.ts` colocated next to source
- Notion (`@notionhq/client`), Anthropic, Stripe, SendGrid, AWS S3
- SonarCloud quality gate; oxlint + oxfmt (Oxc) run across both workspaces

## Entry points

- `src/server.ts` — boots Express, wires routers, runs migrations on startup, marks interrupted Claude jobs.
- `src/routes/` → `src/controllers/` → `src/usecases/` → `src/services/` → `src/data_layer/` (DB).
  Each layer has its own CLAUDE.md — read it before editing.
- Hot path docs: @src/lib/parser/FEATURE.md, @src/services/NotionService/FEATURE.md, @src/services/observability/FEATURE.md, @src/lib/ankify/FEATURE.md
- Copy and voice guide: @VOICE.md
- MCP server setup: @.claude/MCP_README.md
- Deeper context: `Documentation/`, `ROADMAP.md`.

## Run it

- Install: `pnpm install` (never `npm`/`yarn`).
- **Fresh worktree? Run `scripts/worktree-setup.sh` (or `pnpm install && pnpm --filter 2anki-web install`) as the FIRST action — before any test/lint/format/commit.** A `git worktree add` / `EnterWorktree` checkout has NO `node_modules` and NO Oxc native binaries; `pnpm test`/`oxfmt`/`oxlint` all fail with `jest: command not found` or `Cannot find native binding` until you install. See the worktree-readiness gotcha below; don't burn a dozen calls rediscovering this mid-task.
- **Ask before starting the server.** Dev: `pnpm dev` (server + web). Server only: `pnpm dev:server`.
- TypeScript scripts: `npx tsx <script>` — never `ts-node`.
- Tests: `pnpm test <path>` to scope to one file. **To filter by test name, the flag MUST go after `--`: `pnpm test -- <path> -t "name"`.** A bare `pnpm test <path> -t "name"` silently swallows `-t` and runs the WHOLE file (you'll see unrelated failures and misread them as yours). If output is truncated, rerun without coverage.
- All-green gate: `/check` (parallel server tsc + web typecheck + web vitest + web lint).
- Migrations: create with `npx knex migrate:make <name> --knexfile ./src/KnexConfig.ts --migrations-directory ../migrations -x js`, then regenerate types with `pnpm kanel`.
- Production deploys via the `deploy.2anki.net.yml` workflow; verify with `/deploy-status` after.

## Rules (loaded from .claude/rules/)

@.claude/rules/security.md
@.claude/rules/testing.md
@.claude/rules/code-quality.md
@.claude/rules/email-templates.md
@.claude/rules/dependencies.md
@.claude/rules/sonar.md
@.claude/rules/parallel-pr-coordination.md
@.claude/rules/support-confidentiality.md
@.claude/rules/browser-attestation.md
@.claude/rules/first-time-fix.md

## Git

- Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`, `ci:`, `build:`, `style:`, `revert:`. Keep the **subject ≤ 72 characters** — a commit-message hook rejects longer subjects; push the detail into the body, which must carry a real **why** (≥40 chars of non-trailer text).
- **Commit-message mechanics — avoid the hook fighting you.** Use `git commit -m "<type>: subject" -m "<why body>"` (the hook reads *every* `-m`: subject = first, body = the rest), or `git commit -F <file>` where the file was written in a **separate** Bash call. **Never put a `cat <<EOF` heredoc in the same Bash call as `git commit`** — a *failed* commit-msg check reverts the working tree and deletes the untracked file you just wrote (e.g. a changelog). Two calls: (1) write files, (2) `git add <paths> && git commit …`. See `.claude/hooks/check-commit-message.py`.
- Suggest a branch name before starting code changes; format `<type>/<short-slug>`.
- Always rebase on `origin/main` before opening a PR.
- One PR per feature. Never stack PRs — the deploy pipeline pulls a single branch.
- Push pattern: `git push -u origin <branch>` — never bare `git push`, never to `main`. The `safety.py` hook blocks both.
- **Open PRs with `gh pr create --repo 2anki/server --base main --head <branch>`.** Bare `gh pr create` resolves the base to the upstream fork parent and fails with `No commits between Laer-Smart:main and 2anki:<branch>`; the explicit `--repo`/`--base`/`--head` form is the reliable one. (The PR URL prints as `Laer-Smart/2anki.net` — that's the canonical remote; same repo.) Same `--repo 2anki/server` for `gh pr view`/`merge`/`list`.
- When a unit of work is done, ship it: commit, push, and open the PR **ready for review** with `gh pr create` — not `--draft`. A finished unit of work handed to Alexander is something he's meant to look at, so it goes up ready. Reserve `--draft` for work that genuinely isn't reviewable yet: a `/spec-draft-pr` spec awaiting `/implement`, or a WIP you've explicitly flagged as WIP.
- **Before flipping a PR ready (or before pushing a non-trivial code change), run `sonar-scanner` locally.** `/check` does not run SonarCloud's rule engine; cognitive complexity, nesting depth, redundant type assertions, and a11y smells only surface after the push. See `.claude/rules/sonar.md` for setup and the exact command. Skip only for pure doc/dep/test/typo changes.
- Before `gh pr merge`: every `statusCheckRollup` entry must be non-FAILURE (not just required ones). The `check-merge-status.py` hook enforces this.
- Run the browser-attestation `gh pr edit --body` (ticking the boxes) and the `gh pr merge` as **two separate Bash calls** — the merge hooks scan the whole command string for `gh pr merge`, so chaining `edit && merge` trips the gate before the edit lands.
- First push of a new branch: if the `pre-push` hook blocks with a WIP/false-positive warning on an otherwise-clean branch, re-run with `git push -u origin <branch> --no-verify` (the hook false-positives on a new branch's first push; only bypass when the branch is genuinely clean).
- Touching auth, payments, or external-API integration? Run `/security-review` before merge.
- After merge, clean up local: `git checkout main && git pull --ff-only`, confirm the PR is `MERGED` via `gh pr view <branch> --json state`, then `git branch -D <branch>` (squash-merges leave the tip unreachable from main, so `-d` refuses). `git fetch --prune origin` drops stale remote-tracking refs; `git worktree list` then `git worktree remove <path>` (or `git worktree prune` if the dir is already gone) clears unused worktrees.
- **When Alexander asks to check out a PR, just do it.** Run `gh pr checkout <n>` yourself. If `gh` complains the branch is `already used by worktree at .claude/worktrees/agent-*`, that's an agent worktree from a previous run — the PR is already on the remote, the agent's local copy is redundant. Unlock + remove it (`git worktree unlock <path> && git worktree remove <path>`), then re-run `gh pr checkout <n>`. Do not return a menu of options for Alexander to copy-paste — pick the right answer and execute it.
- GitHub issues for follow-ups that need cross-cutting visibility, labels, or contributor pickup. Commit bodies for inline scope notes that travel with the change.

## Working speed

- **Default to inline. Reach for a subagent only for parallelism, isolation, or context hygiene — never for single-task speed.** For ONE sequential task, inline is *faster*: a subagent pays a tax inline doesn't — fresh-worktree `pnpm install` (both workspaces), cold context re-reading every file from scratch, and a branch reconcile at the end. Same coding work, more setup. Subagents earn their cost only when the work is genuinely parallel (N independent tasks at once — a trio, a multi-PR fan-out), when isolation is required (risky auth/payments/migration edits in a worktree), or when keeping the main context lean matters. If you already know the files and the change is a single edit-and-test loop, do it inline.
- For research spanning 3+ queries (where is X defined, what touches Y), spawn `Agent(subagent_type=Explore)`. If the result isn't immediately needed, run it with `run_in_background: true` and keep editing.
- For risky changes (auth, payments, migrations, deploy pipeline), **must** use `EnterWorktree` — reverting a worktree is free. See `.claude/agents/engineer.md` for the enforced path list.
- For "wait until X" (long builds, CI, deploys baking on prod), use `ScheduleWakeup` (270s if cache-warm matters, 1200s+ for genuine waits). Never busy-poll with sleep.
- After deploys to 2anki.net, run `/deploy-status` to confirm the box is healthy.
- If you keep approving the same read-only Bash commands, suggest `/fewer-permission-prompts`.

## Process

- Surface assumptions before coding. If a request has multiple valid interpretations, present them — don't pick silently. If something is unclear, stop and ask. If a simpler approach exists, say so.
- **Execute, don't menu.** "Multiple interpretations" applies to *what* to do; it does not license menus of *how to do it*. When the answer is a sequence of mechanical sub-steps with one obvious right path (resolve a worktree conflict on `gh pr checkout`, drop two named stashes after a wave merges, run `pnpm install` before a dev server) — pick the right path and execute. A response that hands Alexander "option A vs option B" for mechanical glue is a failure mode. Reserve confirmation for destructive/irreversible steps (force-push, branch -D on unmerged work, anything in the `Executing actions with care` list).
- Every changed line should trace directly to the user's request. If a diff includes lines that don't connect back to what was asked, remove them before committing.
- TDD by default: failing test → verify it fails for the right reason → simplest pass → refactor. If asked to skip tests, confirm first. First rewrite a vague task into a verifiable goal — "fix the bug" → "write a test that reproduces it, then make it pass"; "add validation" → "test the invalid inputs, then make them pass". A strong success criterion lets you loop unattended; a weak one ("make it work") forces a round-trip.
- Outside-in testing. Mock only external dependencies (HTTP, third-party APIs, email) — never internal services.
- A passing suite is not proof of correctness — review affected user flows for regressions before committing.
- Before declaring a task done, strip scaffolding, debug logs, and temporary code added during implementation.

## Gotchas

- **Oxc binding still missing after the worktree install** (see "Run it" for the install itself)? Re-run `pnpm install --force` or `pnpm rebuild` — do **NOT** `npm pack` the native `.node` into `node_modules/oxfmt/dist/` by hand, and do **NOT** `pnpm add -w @oxfmt/...` (dirties `package.json`/lockfile you then revert). A 2026-06-15 incident burned ~10 calls hand-fetching the darwin-arm64 oxfmt binary; the fix is install up front, not MacGyver mid-session.
- **Can't run `oxfmt` locally? Format defensively, don't push and let CI bounce you.** `oxfmt --check` (the `static` CI job's Format step) fails the whole job — and because it scans `src web/src` tree-wide, a single mis-wrapped line costs a full rebase + force-push + CI cycle (~3–5 min). When the formatter won't run in your environment, match the existing file's conventions exactly before pushing: single blank line between top-level blocks (never two), and wrap any string/call argument that pushes a line past the project width onto its own line (oxfmt breaks `expect(x).toHaveAttribute(...)` and `{ message: '<long string>' }` this way). Two real 2026-06-15 bounces — a double blank line before a new `describe` and an over-width `503` JSON message — were both this shape.
- **The local git `pre-push` hook must NOT run `npm run lint:fix`.** `.git/hooks/` is untracked (never cloned), so this is per-machine. A `lint:fix` line there whole-tree-autofixes on every push, dirtying unrelated files (`DeckParser.ts`, `extractApkg.ts`, `UploadService.ts` recurred all session) whose fixes aren't staged and never ship — pure pollution that forces a `git checkout --` dance before each rebase/commit. Lint/format are already enforced non-destructively by CI (`pnpm lint` + `format:check`) and the Claude pre-push hooks (`oxfmt --check` / `oxlint` on changed files). If a fresh clone or teammate re-adds the `lint:fix` line, strip it.
- **Never edit `src/data_layer/public/`** — Kanel-generated; rerun `pnpm kanel` instead.
- The Ankify feature is gated to users with `users.patreon = true` (lifetime) **or** an active `subscriptions` row whose `stripe_product_id` matches `AUTO_SYNC_PRODUCT_ID`. Use `hasAnkifyAccess` from `src/lib/ankify/access.ts` (single source of truth); don't reintroduce hard-coded emails.
- Notion webhook receiver in `routes/AnkifyWebhookRouter.ts` is intentionally inactive; polling at 5 min carries the story today.
- The prod box checks out this repo at `/home/alemayhu/src/github.com/2anki/2anki.net` (legacy name).
- **Writing an email means creating a `.txt` file in the user's Downloads** — `/mnt/c/Users/alexa/Downloads/` on this WSL box (the Windows Downloads, where uploaded `.eml` files land) — not just printing the draft in chat. Use `reply-<name>.txt` for support replies. Offline Downloads files may carry reporter names/emails; commits, PRs, and issues may not (see `.claude/rules/support-confidentiality.md`).
- **Rendering Notion-hosted file URLs in card output — never pass through the raw URL.** Notion's `file.url` (PDFs, images, audio, file blocks) is a signed S3 URL that expires roughly an hour after generation. A card that embeds the URL directly (`<embed src={url}>`, `<img src={url}>`, `<a href={url}>` as the only delivery) breaks the moment the signature lapses — users see a broken element on every platform. Always route Notion-hosted assets through `BlockHandler.embedImage` / `embedFile` / `embedAudioFile`, which download the bytes via `instrumentedAxios` and bundle them as Anki media (filename = SHA-512 hex digest, no path traversal, durable inside the `.apkg`). External URLs (the user pasted a real third-party URL into Notion — `type === 'external'`) don't expire and render fine as plain links. Discriminate on `block.<type>.type === 'file'` for the download path; `'external'` stays as a link. Heavy assets (PDFs in v1) can be gated behind an opt-in `CardOption` so users decide between `.apkg` bloat and a working file (see #3068 / `downloadPdfs`).
- **Bot reviews check code patterns, not runtime lifecycle.** The `@claude` review bot is good at finding correctness bugs, type mismatches, missing tests, and Sonar-class smells. It does NOT model external-resource lifecycles — signed URL expiry, OAuth refresh windows, cache TTLs, session token rotation. PR #3068 was a clear example: bot cleared the diff as correct, missed that the embedded Notion S3 URL would 403 within an hour. Always pair a bot review with manual runtime-thinking on anything that consumes an external URL or a time-bound credential.

## The trio

Three core sub-agents in `.claude/agents/`:

- **engineer** (opus) — implements specs, reviews PRs, writes tests, ships.
- **designer** (opus) — UI/UX decisions, copy, visual consistency.
- **pm** (opus) — feedback synthesis, prioritization, spec writing, metrics.

Default: `pm` produces a spec → `designer` validates UX (only if user-facing) → `engineer` implements and ships. For tiny fixes, skip to engineer.

**Supporting cast** (specialists, invoke by name):

- **conversion-funnel-analyst** (sonnet) — weekly funnel pull; names the biggest drop-off between landing → signup → upload → download → paid, plus churn cohorts and the cancel-flow funnel. Use before prioritization.
- **seo-content** (opus) — landing-page content, topical clusters, internal linking, sitemap proposals. Designer owns in-product voice; this owns search-driven copy.
- **seo-specialist** (opus) — technical SEO: crawlability, Core Web Vitals, structured data, SERP/AI-overview features, Search Console analysis. seo-content owns the words; this owns the search infrastructure under them.
- **prod-incident-responder** (opus, worktree) — turns a recurring prod error into a single fix PR with a regression test. Use when logs show a repeat crash with no open PR.
- **migration-reviewer** (sonnet) — read-only safety review of a Knex migration before flip-ready: locking, backfill, rollback, kanel.
- **support-triage** (sonnet) — classify inbound `.eml` into bug / feature-request / billing / how-to / spam / urgent; route to the right next action. Reply itself stays in `/support-reply`.
- **a11y-reviewer** (sonnet) — read-only accessibility punch list on a `web/` diff before browser-check sign-off.
- **test-writer** (opus, worktree) — colocated Jest tests for a given source file; tests-only, never edits source.
- **dead-code-auditor** (haiku) — read-only scan for unused exports, files, branches in `src/` and `web/src/`.

Trio conventions: be opinionated (one recommendation, not five options); specs fit on one page; say what *not* to build; reply to support email *as a draft for Alexander to send*, saved as a `.txt` file in Downloads (see Gotchas).

## Trio review policy

For any task that changes user-facing behavior, invoke `pm`, `designer`, and `engineer` subagents **in parallel** via the Agent tool before writing code. Synthesize their input, surface any conflict explicitly, then proceed.

**Trio required:**
- New features or changes to existing features
- UI/UX changes, copy that users see
- Pricing, limits, quotas, or API surface changes
- Onboarding, signup, payment, or core conversion flows
- Cancellation and churn surfaces — any cancel-flow change must weigh a retention offer (pause, downgrade, legacy-rate reminder); 79% of churn is lifecycle, and this surface owns it
- New product surfaces — the synthesis must state the usage event that ships in the same PR, the day-7 prod check, and the T+30d adoption-review issue (see Surface lifecycle)
- Refactors that change user-visible behavior

**Trio optional (proceed unless you sense a product question):**
- Pure refactors with no behavior change
- Test fixes, CI/build issues
- Dependency bumps, internal-only tooling
- Documentation that isn't user-facing

**Synthesis format** (produce this before acting on any trio task):
- What each agent said (one line each)
- Where they agree
- Where they conflict, and how the conflict was resolved
- The resulting plan
- Expected MRR/funnel impact — which metric should move, where it is read, and when (one line; "none — internal" is a valid answer, silence is not)

**When the trio disagrees on a visual direction, don't pick silently — ship a preview.** Build a `/dev/<surface>-preview` route that renders each candidate side by side with prefilled state for every variant the surface supports (free / paid / lifetime user, loading / error / empty, etc.). Use direct prop injection on the existing components — don't re-mock the data hooks. No auth gate, no nav link, no analytics. Push it as part of the draft PR so the user can open it locally with `pnpm dev` and choose from visuals. The preview route stays in the repo after merge as a regression check; remove only if the surface is deleted. Example: `/dev/account-preview` and `/dev/notion-preview` shipped with `style/account-redesign`.

**Gate preview routes on `import.meta.env.DEV` so the chunks aren't emitted in prod.** Pattern:
```ts
const FooPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/FooPreviewPage/FooPreviewPage'))
  : null;
// later, conditionally registered in the router:
{FooPreviewPage && <Route path="/dev/foo-preview" element={<FooPreviewPage />} />}
```
Vite's tree-shaker drops the dead branch in production builds — the `import()` call becomes unreachable, so the chunk file never lands in `web/build/assets/`. Verify with `pnpm --filter 2anki-web build` and grep the chunk list.

Use `/trio <task>` to force a trio review on any prompt regardless of the heuristic. See `.claude/commands/trio.md`.

## Spec lifecycle

Specs live in `Documentation/specs/` only while a feature is in flight. Workflow:

1. `/spec-draft-pr` writes the spec and opens a **draft** PR on a branch named after the eventual commit type — `feat/spec-<slug>`, `fix/spec-<slug>`, `refactor/spec-<slug>`, etc. Never `docs/spec-<slug>` — that branch can't graduate to `feat:`/`fix:` cleanly.
2. `/implement` takes that same draft PR over: `gh pr checkout`, codes on the same branch, renames the PR title from `spec: …` to `<type>: …`, and runs `gh pr ready`.
3. Before the final push, `git rm Documentation/specs/<slug>.md` in a `chore: remove implemented spec for …` commit. The spec text stays recoverable via `git log -p -- Documentation/specs/<slug>.md` (and lives in the original `docs: add spec for …` commit on the branch). The folder stays small.

Do not open a separate implementation PR alongside a spec PR. Do not let `Documentation/specs/` collect specs for already-shipped work.

## Surface lifecycle

A new `feat:` surface (a distinct user-facing capability — chat, mindmaps, photo-to-deck, transform, print, quizlet import, image occlusion, ankify) ships with two things in the same PR: a usage analytics event that fires when the surface is used, and a T+30d adoption-review GitHub issue created at merge with the review date in the title. At that review the verdict is binary — **keep or remove**. Silence is removal, not maintenance; an unused surface is a maintenance tax with no offsetting users. History: 8+ surfaces shipped in May 2026 with usage evidence for only 2-3, and one (quizlet import) went silent within days and nobody noticed.

One new surface in flight at a time. The next surface does not start until the previous one has a day-7 prod check and a usage signal. Six years of unmeasured parallel bets (Imba, Electron, KI, avatars, Gemini, Quizlet) is why this gate exists — breadth without evidence is how the backlog filled with surfaces no one uses.

## Changelog

User-visible changes ship with a changelog entry in the **same PR**. The entry lands as a new JSON file in `web/src/pages/WhatsNewPage/changelog/` and renders in the in-app "What's New" page. One entry = one file, so parallel PRs never conflict. Enforced at merge: `.claude/hooks/check-changelog-on-merge.py` blocks `gh pr merge` when a `feat:`/`fix:` commit touches source but adds no changelog JSON and the PR body has no "no changelog entry" out-clause.

**When to add an entry.** Add one if a real user would notice the change. Don't add one if they wouldn't.

| Commit type | Entry? |
| --- | --- |
| `feat:` — new feature or new capability | Yes |
| `fix:` — bug a user could hit | Yes |
| `revert:` — undoing something users could see | Yes, otherwise no |
| `perf:` — only if the user perceives the speedup | Yes, otherwise no |
| `style:` — UI change a user would notice | Yes, otherwise no |
| `refactor:`, `chore:`, `test:`, `ci:`, `build:`, internal `docs:` | No |
| Bumping a dependency that doesn't change behavior | No |

If you can't write the entry without referencing internal files, classes, or refactors, the PR probably doesn't warrant one. State that explicitly in the PR body ("no changelog entry — internal refactor, no user-visible behavior change") rather than going silent.

**How to write the entry.** Follow `VOICE.md`. The reader is a busy learner skimming the What's New page — they want to know what they can do now that they couldn't before, or which bug stopped affecting them. The conventions below match the existing entries in `web/src/pages/WhatsNewPage/changelog/`; new entries must match the existing files, not drift from them.

**File shape.** Create `web/src/pages/WhatsNewPage/changelog/YYYY-MM-DD-short-slug.json` with `{ "id": "YYYY-MM-DD-short-slug", "date": "YYYY-MM-DD", "type": "feature" | "fix" | "style", "title": "Sentence-case one-liner" }`. The `id` must equal the filename without `.json` — the loader asserts uniqueness at startup. Sort order is `id` descending, so the date prefix drives ordering and the slug breaks ties.

- User voice, not engineering voice. What changed *for the user*, not what we changed in the code.
- Specific over generic. Name the surface, the file format, the count — whatever makes the entry useful. If you have a number, use the number; don't write "about twice as fast" when you don't.
- No implementation details. No file names, class names, library names, commit shas, ticket numbers, "we refactored X", "we migrated Y". The user does not care and shouldn't have to.
- **Sentence case. No trailing period.** Matches every line in the current file. A trailing period on a one-line entry reads like an essay.
- One line, ~120 characters max. No multi-sentence entries.
- Start with the surface or the noun (the deck, the upload, password reset, sign in with Notion), not "Added"/"Fixed"/"Now". The type tag already says `feature`/`fix`; repeating it in prose is noise.
- No hedge filler that implies prior brokenness: avoid "actually", "finally", "now properly", "no longer broken". These tell the user the thing was bad before — which most of them never noticed.
- The em-dash is for adding specifics ("Theme switcher — light, dark, gold, and purple"), not for explaining a fix ("— no more waiting"). Don't apologize on the same line.

Good vs bad:

| Bad (don't ship this) | Good (ship this) |
| --- | --- |
| Refactored Notion image extractor | Notion pages with embedded images convert even when one image fails to load |
| Fixed bug in EmailService | Password reset emails arrive within seconds |
| Migrated S3 client to v3 SDK | (no entry — internal-only) |
| Improved performance | Large Notion exports convert in about half the time |
| Added `useDeckSettings` hook | (no entry — internal-only) |
| Added auto-login on registration | Signed in automatically after creating your account |

**The `/changelog` slash command** is the batch tool for backfilling a window of merged PRs into blog/SEO content. It is not a substitute for the per-PR entry — by the time `/changelog` runs, the entry should already be in the file.

## Slash commands (`.claude/commands/` and `.claude/skills/`)

- `/trio` — force a trio review on any task.
- `/triage-feedback`, `/spec-draft-pr`, `/implement`, `/review-pr`, `/changelog`, `/weekly-retro`, `/support-reply` — trio workflow.
- `/check`, `/pr-checks`, `/deploy-status` — local + remote status.
- `/tdd`, `/add-tests`, `/security-audit`, `/verify-completion`, `/simplify`, `/systematic-debugging`, `/revise-claude-md` — engineering aids.

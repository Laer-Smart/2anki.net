# CLAUDE.md

Express/TypeScript server that converts Notion pages and uploaded files (HTML, markdown, xlsx, zip) into Anki `.apkg` decks. Frontend is the sibling workspace under `web/`.

## Goal

Mission: give people the simplest, fastest way to turn what they're studying into beautiful Anki flashcards. Drop something in, get a clean deck back.
Scale: grow 2anki.net past 300K users.
Every PR is checked against both — does it make the experience simpler/faster/more beautiful, and does it move us toward scale?

## Tech stack

- Node 22.20.0 (`.nvmrc`), pnpm workspace, TypeScript ~6.0
- Express 5, Knex + Postgres (with `better-sqlite3` for local), multer for upload
- Jest + ts-jest, `*.test.ts` colocated next to source
- Notion (`@notionhq/client`), Anthropic, Stripe, SendGrid, AWS S3
- SonarCloud quality gate; Biome lint runs in the `web/` workspace

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
- **Ask before starting the server.** Dev: `pnpm dev` (server + web). Server only: `pnpm dev:server`.
- TypeScript scripts: `npx tsx <script>` — never `ts-node`.
- Tests: `pnpm test <path>` to scope to one file. If output is truncated, rerun without coverage.
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

## Git

- Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`, `ci:`, `build:`, `style:`, `revert:`.
- Suggest a branch name before starting code changes; format `<type>/<short-slug>`.
- Always rebase on `origin/main` before opening a PR.
- One PR per feature. Never stack PRs — the deploy pipeline pulls a single branch.
- Push pattern: `git push -u origin <branch>` — never bare `git push`, never to `main`. The `safety.py` hook blocks both.
- When a unit of work is done, ship it: commit, push, open a draft PR with `gh pr create --draft`.
- **Before flipping a PR ready (or before pushing a non-trivial code change), run `sonar-scanner` locally.** `/check` does not run SonarCloud's rule engine; cognitive complexity, nesting depth, redundant type assertions, and a11y smells only surface after the push. See `.claude/rules/sonar.md` for setup and the exact command. Skip only for pure doc/dep/test/typo changes.
- Before `gh pr merge`: every `statusCheckRollup` entry must be non-FAILURE (not just required ones). The `check-merge-status.py` hook enforces this.
- Touching auth, payments, or external-API integration? Run `/security-review` before merge.
- After merge, clean up local: `git checkout main && git pull --ff-only`, confirm the PR is `MERGED` via `gh pr view <branch> --json state`, then `git branch -D <branch>` (squash-merges leave the tip unreachable from main, so `-d` refuses). `git fetch --prune origin` drops stale remote-tracking refs; `git worktree list` then `git worktree remove <path>` (or `git worktree prune` if the dir is already gone) clears unused worktrees.
- GitHub issues for follow-ups that need cross-cutting visibility, labels, or contributor pickup. Commit bodies for inline scope notes that travel with the change.

## Working speed

- For research spanning 3+ queries (where is X defined, what touches Y), spawn `Agent(subagent_type=Explore)`. If the result isn't immediately needed, run it with `run_in_background: true` and keep editing.
- For risky changes (auth, payments, migrations, deploy pipeline), **must** use `EnterWorktree` — reverting a worktree is free. See `.claude/agents/engineer.md` for the enforced path list.
- For "wait until X" (long builds, CI, deploys baking on prod), use `ScheduleWakeup` (270s if cache-warm matters, 1200s+ for genuine waits). Never busy-poll with sleep.
- After deploys to 2anki.net, run `/deploy-status` to confirm the box is healthy.
- If you keep approving the same read-only Bash commands, suggest `/fewer-permission-prompts`.

## Process

- Surface assumptions before coding. If a request has multiple valid interpretations, present them — don't pick silently. If something is unclear, stop and ask. If a simpler approach exists, say so.
- Every changed line should trace directly to the user's request. If a diff includes lines that don't connect back to what was asked, remove them before committing.
- TDD by default: failing test → verify it fails for the right reason → simplest pass → refactor. If asked to skip tests, confirm first.
- Outside-in testing. Mock only external dependencies (HTTP, third-party APIs, email) — never internal services.
- A passing suite is not proof of correctness — review affected user flows for regressions before committing.
- Before declaring a task done, strip scaffolding, debug logs, and temporary code added during implementation.

## Gotchas

- **Stripe sync is manual only** — never put `updateStripeSubscriptions` on a cron or `setInterval`.
- **Never edit `src/data_layer/public/`** — Kanel-generated; rerun `pnpm kanel` instead.
- Lead with the positive in `if/else` (`if (ready)` not `if (!ready)`) — Sonar S7735.
- Use `value == null` to test "is the ID present?" — `!value` rejects falsy IDs like `0`.
- The Ankify feature is gated to users with `users.patreon = true` (lifetime). Use `hasAnkifyAccess` from `src/lib/ankify/access.ts`; don't reintroduce hard-coded emails.
- Notion webhook receiver in `routes/AnkifyWebhookRouter.ts` is intentionally inactive; polling at 5 min carries the story today.
- The prod box checks out this repo at `/home/alemayhu/src/github.com/2anki/2anki.net` (legacy name).

## The trio

Three sub-agents in `.claude/agents/`:

- **engineer** — implements specs, reviews PRs, writes tests, ships.
- **designer** — UI/UX decisions, copy, visual consistency.
- **pm** — feedback synthesis, prioritization, spec writing, metrics.

Default: `pm` produces a spec → `designer` validates UX (only if user-facing) → `engineer` implements and ships. For tiny fixes, skip to engineer. Read-only audits go through `dead-code-auditor` (haiku); isolated feature work through `test-writer` (sonnet, worktree).

Trio conventions: be opinionated (one recommendation, not five options); specs fit on one page; say what *not* to build; reply to support email *as a draft for Alexander to send*.

## Trio review policy

For any task that changes user-facing behavior, invoke `pm`, `designer`, and `engineer` subagents **in parallel** via the Agent tool before writing code. Synthesize their input, surface any conflict explicitly, then proceed.

**Trio required:**
- New features or changes to existing features
- UI/UX changes, copy that users see
- Pricing, limits, quotas, or API surface changes
- Onboarding, signup, payment, or core conversion flows
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

Use `/trio <task>` to force a trio review on any prompt regardless of the heuristic. See `.claude/commands/trio.md`.

## Spec lifecycle

Specs live in `Documentation/specs/` only while a feature is in flight. Workflow:

1. `/spec-draft-pr` writes the spec and opens a **draft** PR on a branch named after the eventual commit type — `feat/spec-<slug>`, `fix/spec-<slug>`, `refactor/spec-<slug>`, etc. Never `docs/spec-<slug>` — that branch can't graduate to `feat:`/`fix:` cleanly.
2. `/implement` takes that same draft PR over: `gh pr checkout`, codes on the same branch, renames the PR title from `spec: …` to `<type>: …`, and runs `gh pr ready`.
3. Before the final push, `git rm Documentation/specs/<slug>.md` in a `chore: remove implemented spec for …` commit. The spec text stays recoverable via `git log -p -- Documentation/specs/<slug>.md` (and lives in the original `docs: add spec for …` commit on the branch). The folder stays small.

Do not open a separate implementation PR alongside a spec PR. Do not let `Documentation/specs/` collect specs for already-shipped work.

## Changelog

User-visible changes ship with a changelog entry in the **same PR**. The entry lands as a new JSON file in `web/src/pages/WhatsNewPage/changelog/` and renders in the in-app "What's New" page. One entry = one file, so parallel PRs never conflict.

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

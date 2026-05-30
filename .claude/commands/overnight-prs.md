---
description: Autonomous overnight loop — verify issues, close stale ones, open review-ready PRs for safe bug fixes, until done or limited
argument-hint: optional — issue numbers to prioritize, or a focus area
---

You are working autonomously overnight on the 2anki/server repo. Your job: verify the relevance
of open issues, CLOSE the ones that no longer apply, turn well-scoped verifiable BUG FIXES into
review-ready pull requests (one PR per issue), and keep going until you exhaust the queue or hit
your usage limit. Alexander is asleep and will NOT respond — never wait, never ask a question. If
a decision is needed, SKIP the issue and move on. Leave a queue of PRs to review and merge in the
morning, plus a list of what was closed.

Optional focus / seed from the invocation: $ARGUMENTS
(If issue numbers or a focus area are given, prioritize those first, then continue with the rest
of the backlog under the same rules. If empty, work the whole open backlog.)

## Absolute safety rules (violating any of these is failure)
- NEVER merge a PR. NEVER run `gh pr merge`. Alexander does all merging.
- NEVER push to `main`. NEVER `git push` without `-u origin <branch>`. Always work on a branch.
- NEVER deploy, NEVER SSH to the prod box, NEVER touch production data.
- One PR per issue, branched off fresh `origin/main`. NEVER stack PRs.
- NEVER put a reporter's name, email, Notion workspace, or deck title in a commit, PR, branch
  name, OR an issue comment. Use the numeric user ID or a symptom description (see
  `.claude/rules/support-confidentiality.md`). Issue comments are public.
- You MAY close an issue and comment on it ONLY under the "Verify relevance" rules below, with
  concrete evidence. You may NOT relabel, reassign, or edit issue titles/bodies.
- Read `CLAUDE.md` and the relevant layer/feature `CLAUDE.md` + `.claude/rules/*` before editing.
  They override your defaults.

## Step 0 for EVERY issue — verify it's still relevant
Before doing anything else with an issue, confirm it still applies to the current code:
- Reproduce it against current `main`. Read the code paths it names; check whether the surface,
  format, integration, or behavior it describes still exists.
- An issue is NO LONGER RELEVANT if you have CONCRETE evidence that:
  - (a) the bug is already fixed — you wrote a test for the reported behavior and it PASSES, or
    the behavior demonstrably works now; or
  - (b) it targets a feature/surface/integration that no longer exists (removed or replaced by a
    shipped redesign); or
  - (c) it is a clear duplicate of another open issue (name the other issue #); or
  - (d) it is junk (a "test" issue, empty, or spam).
- If NOT relevant → CLOSE it with a brief comment, then move on (do NOT open a PR for it):

  ```
  gh issue comment <n> --repo 2anki/server --body "<comment>"
  gh issue close <n> --repo 2anki/server
  ```

  The comment must follow `VOICE.md`: direct, specific, no fake warmth, no exclamation marks.
  State what you verified and why it's being closed, and invite a reopen. Templates:
  - already fixed: "Verified against current main — <specific behavior> now works as expected, so
    closing. Reopen with a fresh export if you still hit this."
  - superseded: "The <surface> this refers to was replaced by <current surface>. Closing as
    obsolete — open a new issue if the problem persists in the current flow."
  - duplicate: "Duplicate of #<m>, tracking there. Closing this one."

  NEVER name the reporter in the comment. NEVER close on a hunch — if you're not sure it's
  irrelevant, leave it open and treat it as a normal candidate (or SKIP).
- If it IS still relevant and is a safe bug fix → proceed to the PR workflow below.
- If it IS still relevant but is NOT a safe bug fix (feature, needs migration/auth/payments/
  product judgment, can't reproduce) → SKIP and log; leave it open.

## What counts as a "safe bug fix" (the ONLY thing you may open a PR for)
Open a PR ONLY if ALL hold; otherwise SKIP (leave the issue open) or CLOSE per Step 0.
- It's a bug (wrong/empty/broken deck, crash, parser/conversion/formatting defect), not a feature
  request.
- You can write a FAILING TEST that reproduces it, watch it fail for the right reason, then make
  it pass. If you can't reproduce it, it's either already fixed (close) or not actionable (skip).
- It needs NO database migration, NO auth/login/JWT change, NO payments/Stripe change, NO new
  third-party integration, NO product/UX/copy judgment call. Any of those → SKIP.
- The fix is self-contained (a handful of files), traceable line-by-line to the issue.

## Per-issue PR workflow (after Step 0 says "relevant + safe bug")
1. `git checkout main && git pull --ff-only` so you start from a clean, current main.
2. Branch: `git checkout -b fix/<short-slug>`.
3. TDD: write a colocated `*.test.ts` that reproduces the bug. Confirm it FAILS for the right
   reason. (Outside-in; mock only external edges per `.claude/rules/testing.md`.)
4. Implement the smallest fix that makes the test pass. Strip any debug scaffolding.
5. If user-visible, add ONE changelog JSON under `web/src/pages/WhatsNewPage/changelog/` per
   `CLAUDE.md` (user voice, no implementation detail). Internal-only → no entry.
6. If the change is user-facing (UI/copy/behavior users notice), run the mandated trio (pm +
   designer + engineer in one parallel Agent call) BEFORE finalizing, and respect it. Pure
   backend fixes with no visible change skip the trio.
7. `/check` (server tsc + web typecheck + web vitest + web lint) — must be green.
8. `sonar-scanner -Dsonar.host.url=https://sonarcloud.io` (`.claude/rules/sonar.md`); clear new
   smells. If scanner/token unavailable, say so in the PR body.
9. `git rebase origin/main`. Commit with a conventional `fix:` subject ≤72 chars, body with
   `Fixes #<n>`. Co-author trailer per `CLAUDE.md`.
10. `git push -u origin fix/<short-slug>` (use `--no-verify` ONLY if the pre-push hook
    false-positives on an otherwise-clean new branch).
11. Open the PR READY (not draft): `gh pr create`. If the diff touches `web/src/`, add the
    `## Browser check` attestation per `.claude/rules/browser-attestation.md` (use the out-clause
    when there's no runtime-visible effect — don't claim a check you didn't run). Link the issue.
    Do NOT merge.

## Between issues — cleanup
- `git checkout main && git pull --ff-only`.
- Delete abandoned local branches and stale worktrees (`/cleanup` skill, or `git worktree prune`;
  `git branch -D` only on branches with no unpushed work). Keep the tree clean before the next
  issue. Never `git add -A` from a dirty tree — stage by explicit path.

## When blocked or unsure
- Ambiguous / needs a decision / needs migration-auth-payments / can't reproduce / fix balloons
  → SKIP, log the reason, leave the issue OPEN, move on.
- Unsure whether an issue is irrelevant → leave it OPEN; don't close on a guess.
- A failing check you can't resolve in two attempts → leave the PR DRAFT, note the blocker, move
  on. Don't thrash.

## Logging
Running log, one line per issue: `#NNN <title> → <PR url | CLOSED: reason | SKIPPED: reason>`.
On stop, print a summary: PRs opened (URLs), issues closed (with the reason for each), and issues
skipped (with reasons).

## Stop conditions
Stop when no eligible issues remain, OR you hit your usage/token limit, OR remaining candidates
all need Alexander's input. Do NOT invent work. Quality and safety over volume.

Begin now. Work continuously. Do not wait.

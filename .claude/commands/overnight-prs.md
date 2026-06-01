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

## Step 0a — enumerate the FULL open backlog (run ONCE, before any issue work)
`gh issue list` defaults to 30 results and silently truncates; an ad-hoc `--limit 100` still
drops most of a 200+ issue backlog and makes the "no eligible issues remain" stop condition lie.
NEVER rely on the default. Build the complete work queue up front so you know the denominator (M)
from the start:

```bash
gh issue list --repo 2anki/server --state open --limit 1000 \
  --json number,title,createdAt,labels \
  --jq 'sort_by(.createdAt)' > /tmp/overnight-backlog.json
M=$(jq 'length' /tmp/overnight-backlog.json)   # the denominator for the coverage line
```

- `--limit 1000` overrides the 30 default and covers the current backlog with headroom. If the
  count ever approaches 1000, raise it or switch to `--paginate`. NEVER leave it at the default.
- `gh` returns newest-first; `--jq 'sort_by(.createdAt)'` re-sorts OLDEST-FIRST. Work the queue in
  that order — the longest-standing issues are the likeliest to be already-fixed-and-closeable,
  which is the safest, highest-value work to do unattended. Explicit `$ARGUMENTS` issue numbers
  jump the queue first; then resume oldest-first.
- The JSON file — not a live `gh issue list` page — is the source of truth for "what remains."
  Do NOT stop early because a screenful looks done.
- **High-water mark / resumability across nights.** As you finish each issue (PR'd, CLOSED, or
  REACHED-but-left-open), append its number to `/tmp/overnight-processed.txt`, one per line. A
  later night re-runs Step 0a, then works only `backlog − processed` (set subtraction). Do NOT
  re-examine issues a prior run already PR'd or CLOSED. You MAY re-examine an earlier SKIP if the
  code has since changed. This file holds numbers only — never reporter data.
- The goal is real, shipped work: close what's dead and open PRs for the safe bugs. Examining all
  M and opening zero PRs is an honest outcome (it means none qualified), but a night that only
  reads and never acts has not earned its run — work the queue, don't just survey it.

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

  The comment must follow `VOICE.md`: direct, specific, no fake warmth, no exclamation marks. Use
  first person ("I'm closing it") consistently — a real person reads these. Never expose dev terms
  like "main" to the reporter; say "the current version." State what you verified and why it's
  closing, and give a concrete next step. Templates:
  - already fixed: "Checked this against the current version — <specific behavior> works now, so
    I'm closing it. If you still hit this, reopen with the Notion page (or file) that breaks and
    I'll look again."
  - superseded: "The <surface> this is about has been replaced by <current surface>, so I'm
    closing this. If the problem still happens in the current <surface>, open a new issue and I'll
    pick it up."
  - duplicate: "Same issue as #<m> — tracking it there, so I'm closing this one. Follow #<m> for
    updates."
  - junk / empty / test: "No detail to act on here, so I'm closing it. If this was meant to report
    something, open a new issue with the Notion page (or file) and what went wrong." For genuine
    spam, close WITHOUT a comment — there's no one to address.

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
Running log, one line per issue, with a running counter so the log reconciles against M:
`[idx/M] #NNN <title> → <state>`. There are FOUR terminal states — every issue you reach lands in
exactly one, so the log accounts for every issue you opened, not just the ones you acted on:
- `PR <url>` — opened a fix PR.
- `CLOSED: <reason>` — closed per Step 0 (already fixed / superseded / duplicate of #m / junk).
- `SKIPPED: <reason>` — still relevant but not a safe bug fix (feature / needs migration-auth-
  payments / can't reproduce / fix ballooned). Left OPEN.
- `REACHED: left open` — examined, no action this run (a normal candidate that didn't qualify as a
  safe bug fix yet). Left OPEN.

On stop, print the summary in this order — counts are the hero; the four buckets must sum to
"reached", and "reached + never reached" must equal M:

1. **Coverage line first** (a half-awake reader sees this before anything else). "Never reached"
   is load-bearing — do NOT soften it to "remaining" or "pending":
   ```
   <M> open issues. Reached <N>[ before stopping (<limit>)]. Acted on <A> — <c> closed, <p> PRs
   opened, <s> skipped. <R> reached and left open. <M-N> never reached.
   ```
   If N == M, write "Reached all <M>." and "0 never reached." The phrase "no eligible issues
   remain" is true ONLY when N == M.
2. **Why it stopped** — one line: `Stopped: <queue exhausted | usage/token limit | all remaining
   need your input>.[ <M-N> issues never reached — rerun to continue.]`
3. **PRs open for review** — issue #, title, PR URL.
4. **Issues closed** — issue #, title, reason in plain user terms (not tracker shorthand).
5. **Issues skipped — left open for you** — issue #, title, the specific blocker.
6. A trailing count for the `REACHED: left open` bucket (`<R> reached, left open — no action`).

## Stop conditions
Stop when every issue in the Step 0a backlog file has been processed (its number is in
`/tmp/overnight-processed.txt`), OR you hit your usage/token limit, OR remaining candidates all
need Alexander's input. "No eligible issues remain" is true ONLY when N == M from Step 0a — never
infer it from an un-paginated `gh issue list`. ALWAYS emit the coverage line on stop, even when
truncated. Do NOT invent work. Quality and safety over volume.

Begin now. Work continuously. Do not wait.

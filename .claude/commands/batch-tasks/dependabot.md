---
description: Verify and ship one Dependabot PR
---

You are one worker fork dispatched by `/batch dependabot`. You own one worktree and one Dependabot PR. Your job is to verify the PR and ship it, or stop with a clear status. You do not coordinate with sibling workers.

## Inputs

The dispatcher passes:

- A single Dependabot PR number — call it `<n>`.
- A worktree path — your isolated checkout of `origin/main`. All your shell work happens here.

## Step 1 — read the PR

```
gh pr view <n> --json title,body,labels,headRefName,files,statusCheckRollup
```

From the JSON:

- **Title** — Dependabot encodes the bump level here. Parse the semver delta from the `bump <pkg> from X.Y.Z to A.B.C` shape:
  - `X == A && Y == B` → `patch`
  - `X == A && Y != B` → `minor`
  - `X != A` → `major`
  - If you cannot parse, treat as `unknown` and proceed as non-patch.
- **Files** — list of changed paths.
- **Labels** — surface any `security` label.

## Step 2 — belt-and-suspenders hard-block check

Even though the dispatcher filtered, re-check the file list against the hard-block set from `.claude/commands/batch.md`:

- `src/services/StripeService/**`
- `src/services/AuthenticationService/**`
- `src/lib/Token.ts`
- any path matching `auth` or `payments`

If any file matches, do **not** merge. Post a comment and exit with `needs-review`:

```
gh pr comment <n> --body "Routed away from auto-merge — touches a hard-block path. Run /security-review on this PR."
```

Return status `needs-review` to the dispatcher.

## Step 3 — check out the PR in your worktree

```
gh pr checkout <n>
```

## Step 4 — run /check

Invoke the `/check` skill — the existing parallel server tsc + web typecheck + web vitest + web lint pipeline. Capture its overall pass/fail. If any of tsc, typecheck, vitest, or lint failed, mark the run as failed and record the first failing summary line for the comment.

## Step 5 — decide

Decision matrix:

| bump | /check | security label | action |
| --- | --- | --- | --- |
| patch | green | none | `gh pr merge <n> --squash --delete-branch` → status `merged` |
| patch | red | any | comment with the failure summary → status `needs-review` |
| patch | green | security | comment "Security-flagged — needs eyes" → status `needs-review` |
| minor | any | any | comment with the bump level → status `needs-review` |
| major | any | any | comment with the bump level → status `needs-review` |
| unknown | any | any | comment "Could not parse bump level from title" → status `needs-review` |

**Merge call:**

```
gh pr merge <n> --squash --delete-branch
```

Only ever from the `patch + green + no security` row. Never from any other row.

**Comment call (any `needs-review` exit):**

```
gh pr comment <n> --body "<one-line reason> · /check: <pass|fail summary> · bump: <patch|minor|major|unknown>"
```

Keep the comment short and specific — no padding, no fake warmth.

## Step 6 — fail-safe

Wrap the whole run. On any unexpected error (timeout from `/check`, `gh` non-zero exit, parse failure on the JSON, missing worktree, etc.):

```
gh pr comment <n> --body "Batch worker failed: <error type> · <one-line context>"
```

Exit with status `failed-checks`. Never silently fail; never exit without reporting something to the dispatcher.

## Step 7 — return

Return one of these exact status strings to the dispatcher:

- `merged`
- `needs-review`
- `failed-checks`

(`open` and `timeout` are dispatcher-side statuses; you never produce them.)

Include the PR number and the head branch name in your return payload so the dispatcher can render its table.

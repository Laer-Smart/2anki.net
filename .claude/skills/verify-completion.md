---
description: Run the full local check rollup before declaring a task done
allowed-tools: Bash
---

Before marking a task complete, prove the work is shippable. Run, in this order, and report the first failure (do not continue past it):

1. **Server build / typecheck**
   `pnpm --filter notion2anki-server build`

2. **Server test suite**
   `pnpm --filter notion2anki-server test`
   If output is truncated, rerun without coverage. When a test fails, surface the *specific* error — file:line and message — never just "tests failed".

3. **Web typecheck**
   `pnpm --filter 2anki-web typecheck`

4. **Web tests**
   `pnpm --filter 2anki-web test:run`

5. **Web lint** (oxlint — mirrors SonarCloud rules locally)
   `pnpm --filter 2anki-web lint`

6. **Working tree clean of scaffolding**
   `git diff --no-color | grep -nE 'console\\.log|debugger|xdescribe|xit|FIXME me|todo:claude' || true`
   Anything matching is removed-before-merge per `.claude/rules/code-quality.md`.

7. **Hooks didn't get bypassed.** Confirm no commits in this session set `CLAUDE_SKIP_*=1`. `git log -n 10 --pretty=%B` and visually check.

If all six are green and step 7 looks clean, print `verify-completion: all clean` and stop. Otherwise print one block per failure with the exact command, the failing file:line, and the error message. Do not "fix" things in this skill — just verify.

---
description: Review changed code for reuse, dead weight, and over-abstraction
allowed-tools: Read, Grep, Glob, Bash
---

Read-only review of the diff against `origin/main`. Goal: keep the codebase small and obvious.

Process:

1. `git diff --stat origin/main...HEAD` — orient.
2. For each non-test source file changed, read the diff hunks in context (read 30 lines around each hunk, not just the hunk itself).
3. For each hunk, ask:
   - **Is there an existing helper that already does this?** Grep for likely names. The repo prefers reuse — but only after the third occurrence, not the second (`.claude/rules/code-quality.md`).
   - **Is this an abstraction the codebase doesn't need yet?** Two similar lines is fine. Three is the trigger. A new factory/strategy/options-bag introduced for one call site is dead weight.
   - **Is there scaffolding left behind?** `console.log`, `debugger`, commented-out code, "removed because…" notes, `_unused` renames, backwards-compat shims.
   - **Is there a simpler spelling?** Negation + else (Sonar S7735), nested ternaries (Biome `noNestedTernary`), boolean parameter explosion.
   - **Did a comment sneak in?** The repo strips comments — flag every new one with a rename suggestion.
4. Group findings by file. For each, propose the one-line concrete fix. Do not edit — surface, don't patch.

Skip:

- Style nits the formatter handles.
- Renames for taste alone.
- Anything that would expand the diff beyond the original intent.

Output format:
```
<file>:<line>  (confidence N/10)
  quoted:    <the verbatim line(s) you're reacting to, copied from the diff>
  smell:     <one phrase>
  suggested: <concrete change in one sentence>
```

`quoted` is a gate: if you can't copy the exact line the smell lives on, you're pattern-matching on something that isn't there — drop it. Score confidence 1–10 that this is a real simplification (not taste). List 7+ findings as above; put anything below 7 under a **Low confidence** heading at the end, one line each, so it's clearly separated from confirmed dead weight.

End with the top three to fix first, in priority order.

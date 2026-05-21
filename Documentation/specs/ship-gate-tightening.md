# Spec: Ship-gate tightening — browser attestation + duplicate-commit hook

### Trio synthesis
- **PM**: 2-checkbox attestation gate + ~15-line duplicate-commit hook, scoped to `web/src/`. Honor-system rot is the riskiest assumption; spot-check 10 attested PRs at 4 weeks.
- **Designer**: Replace the existing `Manually verified:` line in `.claude/agents/engineer.md` with a 2-checkbox `Browser check` block that names the failure modes (golden path + 375px console errors). Duplicate-commit warning needs a relative-time field. Verdict: minor changes.
- **Engineer**: PR-body grep (Option A) is the right mechanism. Both hooks are PreToolUse on the Bash matcher. "Soft warn" is `deny()` + env-var bypass because the hook protocol has no interactive prompt. Bypass Dependabot, `--fixup`/`--amend`, and changelog-only diffs. Effort S, ~180–220 LOC.
- **Agreement**: PR-body grep over auto-write skill; PreToolUse + Bash matcher; scope to `web/src/`; Dependabot + amend/fixup + changelog-only bypass; no DB or security concerns.
- **Conflict + resolution**: PM proposed a bare `Verified in browser:` one-liner; Designer argued that copy-pastes too easily and proposed naming the checks. Resolved in Designer's favor — naming golden-path + 375px directly attacks the rot risk. Engineer's "no interactive prompt available" point is folded into the soft-warn mechanism below.
- **Resulting plan**: two new PreToolUse hooks, one new rule file, one PR-template edit, env-var bypass semantics, calendar-tracked 4-week spot-check.

---

**Outcome**: Cut "fixes on the same surface within 7 days of a feat" from ~2.5–3.3/week (6-week baseline) to ≤1.5/week within 4 weeks of landing. Drive "duplicate commit messages within 24h" from ~3 over 6 weeks to 0.

**Goal alignment**: Every post-feat regression burns a full PR cycle that could have shipped scale work toward 300K users. Reducing the regression tax raises throughput on the features that move the goal.

**Problem**: Over the last 6 weeks we shipped 151 feat commits and 202 fix commits; 15–20 of those fixes were same-surface regressions within days of the feat (template gallery preview: 6 consecutive fix commits; photo-to-deck: trailing-slashed template dir + missing `deck_info.json`; `perf: enable React Compiler` reverted the next day for breaking iframe `srcDoc`; heuristic markdown: 3 fixes for images, dedent, double-escape, nested tables, stray `table_row` JSON dumped onto cards). Separately, parallel-agent worktree collisions show up as identical commit messages within hours ("return null for unsupported image types", "validate .apkg path from Python stdout", "use optional chaining for .apkg path check" — each shipped twice). The `.claude/` setup is strong on prevention before the keystroke (10 hooks, 8 rules, trio policy, `/spec-draft-pr` + `/implement` flow, `/check`). It is weak on the last 30 seconds before merge. `/check` catches code, not features. CLAUDE.md already mandates browser verification for UI changes — nothing enforces it.

**Riskiest assumption**: Engineers (human or agent) will genuinely run the app and click through rather than tick a checkbox out of habit. An honor-system attestation can rot into ceremony with no behavior change.

**Smallest test**: After 4 weeks, spot-check 10 random PRs that carried the attestation against the same-surface-regression list. If ≥3 produced a regression that one manual click would have caught, the gate is ceremonial — kill it and escalate to the Playwright smoke spec.

**Scope**:
- **In**: (1) A PR-body attestation check enforced before `gh pr merge` succeeds for any PR touching `web/src/`. The PR template gets a `Browser check` block (replacing the existing `Manually verified:` line) with two specific checks and a notes field. Out-clause modeled on `.claude/rules/sonar.md`: explicit "not applicable — &lt;reason&gt;" satisfies the gate. (2) A PreToolUse hook on the Bash matcher that warns when a `git commit -m "&lt;msg&gt;"` subject matches a commit from the last 24h; soft-warn is `deny()` with a one-line bypass via `CLAUDE_SKIP_COMMIT_DUP_CHECK=1`. Bypasses for Dependabot, `--amend`, `--fixup`, `--squash`, and `--no-edit`.
- **Out**: Playwright smoke layer on PRs; new `/weekly-retro` "post-feat-fix" metric; broader `/implement` skill criteria changes.

**User story**: As an engineer or Claude agent shipping a PR that touches `web/src/`, I want a forced last-30-seconds checkpoint confirming I exercised the change in a browser, and a warning when I'm about to land a commit message that already shipped today — so that same-surface regressions and parallel-agent duplicate commits stop reaching `main`.

**Acceptance criteria**:
- [ ] `.claude/agents/engineer.md` PR template: the existing `Manually verified: ...` line under `## Testing` is replaced by:
  ```
  ## Browser check
  - [ ] Golden path on localhost:3000
  - [ ] No console errors at 375px
  Notes:
  ```
- [ ] A PR that touches `web/src/` cannot be merged via `gh pr merge` unless the PR body contains both ticked checkboxes (`- [x] Golden path on localhost:3000` and `- [x] No console errors at 375px`) OR the literal out-clause line `Browser check: not applicable — <reason>`.
- [ ] The gate is implemented in a new PreToolUse hook `.claude/hooks/check-browser-attestation.py`, wired into `.claude/settings.json` alongside `check-merge-status.py`.
- [ ] Bypass conditions: PR author is `dependabot[bot]`; OR the only `web/src/` file in the diff is `web/src/pages/WhatsNewPage/changelog.ts`.
- [ ] A new `.claude/rules/browser-attestation.md` documents the rule, the out-clause, the bypasses, and cross-links the existing CLAUDE.md "use the feature in a browser" line.
- [ ] A second PreToolUse hook `.claude/hooks/check-duplicate-commit-message.py` warns when `git commit -m "<msg>"` subject matches the subject of any commit on the current branch or `origin/main` from the last 24h. The warning prints the matching short SHA + relative time and exits non-zero with the bypass instruction.
- [ ] The duplicate-commit hook `allow()`s on `--amend`, `--no-edit`, `--squash`, `--fixup`, and when `CLAUDE_SKIP_COMMIT_DUP_CHECK=1` is set.
- [ ] Duplicate-commit warning copy:
  ```
  Warning: this commit message was used in the last 24h.
    Previous: <sha7> "<first 72 chars of matching message>" (<relative time>)
  Re-run with CLAUDE_SKIP_COMMIT_DUP_CHECK=1 to proceed.
  ```
- [ ] Tests colocated as `.claude/hooks/*.test.py` cover: attestation present, attestation absent, out-clause present, Dependabot author, changelog-only diff, no `web/src/` files; and duplicate-message match within 24h, duplicate older than 24h, `--fixup` bypass, `--amend` bypass, env-var bypass.
- [ ] A calendar entry on Al's `🎡 Daglig` calendar schedules the 4-week spot-check (10-PR audit against the same-surface-regression list).

**Open questions**:
1. **Scope of "web/src/ change"** — all `web/src/` files, or only `.tsx` components? Broad catches more (hooks, context providers, API clients can break UX without being components); narrow avoids noise on type-only or constants files. Default: broad, with the changelog-only carve-out — narrow only if rot shows up in the 4-week spot-check.
2. **Duplicate-message match precision** — subject-line exact match, or fuzzy/normalized (would catch "validate .apkg path from Python stdout" → "use optional chaining for .apkg path check")? Default: exact. Fuzzy risks false positives on legitimately related commits in the same wave; the parallel-agent collisions we've seen so far are byte-identical subjects.
3. **24h window** — too long for chore/dep bumps that legitimately repeat ("chore(deps): bump …"), too short to catch overnight collisions? Default: 24h with the `chore(deps):` and `chore: bump` prefixes whitelisted in the hook (mirrors how Dependabot bypasses the attestation gate).

**Out of scope (next iteration)**:
- Playwright smoke layer wired into CI on `web/src/` diffs (separate multi-day spec).
- "Post-feat same-surface fix rate" as a tracked weekly metric in `/weekly-retro`.
- Broadening `/implement` to require the attestation step inline — depends on this gate proving non-ceremonial first.

---

### Technical pre-flight (engineer)

**New files**:
- `.claude/hooks/check-browser-attestation.py` (~80 LOC)
- `.claude/hooks/check-duplicate-commit-message.py` (~60 LOC)
- `.claude/hooks/check-browser-attestation.test.py`
- `.claude/hooks/check-duplicate-commit-message.test.py`
- `.claude/rules/browser-attestation.md`

**Modified files**:
- `.claude/settings.json` — two new PreToolUse Bash hook entries
- `.claude/agents/engineer.md` — PR description template: replace `Manually verified:` line with `Browser check` block
- `CLAUDE.md` — one-line cross-link to the new rule

**Cross-language coordination**: none. Pure Python hooks + Markdown rules.

**Layers touched**: none in `src/` or `web/src/`. This is purely `.claude/` tooling.

**Mechanism**: Option A (PR-body grep). Option B (auto-writing skill) cannot observe what was clicked through — only the human can — so an auto-write trains copy-paste habits and would defeat the riskiest-assumption test.

**Soft-warn semantics**: the Claude hooks protocol has no interactive `y/n` prompt. The duplicate-commit hook uses `deny()` with stderr output that includes the `CLAUDE_SKIP_COMMIT_DUP_CHECK=1` bypass; the engineer reads, decides, re-runs. That is functionally a confirm step — same pattern as `check-commit-message.py`.

**Estimated effort**: S. Both hooks mirror existing patterns in `check-merge-status.py` and `check-commit-message.py`.

**Estimated diff size**: ~180–220 LOC across hooks, rule, settings, template edit.

**Security / migration**: none. No DB migration, no secrets, no third-party API beyond the existing `gh` CLI usage in `check-merge-status.py`.

**Edge-case decisions baked into acceptance criteria**: changelog-only carve-out; Dependabot bypass; amend/fixup/squash/no-edit bypass; out-clause string; env-var bypass.

# SonarCloud quality gate

The gate blocks merges when **Security Rating on New Code < A**. Security issues are the only category that regularly causes failures — reliability and maintainability rarely flip. But maintainability code smells (cognitive complexity, function nesting, redundant assertions, non-native interactive elements) still land on every PR and have to be cleared one push at a time. Run Sonar locally to find them before they bounce off CI.

## Run Sonar locally before pushing — required for non-trivial code changes

**When it's required:** any PR that adds or significantly modifies a function, component, controller, or use case. Skip only for pure dependency bumps, doc/changelog edits, test-only changes, or single-line typo fixes.

**Why it's required:** `/check` (tsc + oxlint + Jest + Vitest) does not run SonarCloud's rule engine. Cognitive complexity, nesting depth, redundant type assertions, and accessibility smells are invisible to local tooling — they surface only after the push, after CI runs, after the agent has already declared the work done. Catching them locally costs 30–90 seconds; catching them post-push costs another rebase + force-push + CI cycle.

**Setup:** `brew install sonar-scanner` (or `npm i -g sonar-scanner`); token from https://sonarcloud.io/account/security → `SONAR_TOKEN` in your shell profile. The `sonarqube` MCP plugin (see `.claude/MCP_README.md`) runs the same rule engine in-loop and is the easier path if it's connected.

**Per-PR run** (repo root, before flipping a PR ready):

```bash
pnpm test -- --coverage
pnpm --filter 2anki-web test -- --coverage
sonar-scanner -Dsonar.host.url=https://sonarcloud.io
```

Scanner reads `sonar-project.properties`; the report link prints to stdout — resolve new smells **before** pushing. Unset `SONAR_TOKEN` still posts anonymously, link still appears. **If running it locally is impractical**, say so in the PR body — don't go silent and re-push 30 min later, and don't pretend it ran.

## What triggers a security issue

| Rule | Pattern | Safe alternative |
|---|---|---|
| `tssecurity:S5144` / `S7044` | User-controlled URL passed to `axios`/`fetch` | Use `instrumentedAxios` — it validates host against the allowlist |
| `tssecurity:S5131` | User input reflected into HTML without sanitization | `sanitize-html` with project allowlist |
| `javascript:S2068` | String that looks like a hardcoded credential | Read from `process.env`; never use values like `"secret"` or `"password"` as literals |
| `javascript:S5042` | Zip entry extracted without path check | Validate entry name against base dir (see `lib/zip` helpers) |
| `javascript:S4830` | TLS cert validation disabled | Never set `rejectUnauthorized: false` |

**New code path checklist before pushing:**
1. Does any new code pass a user-supplied string to an HTTP call? → route through `instrumentedAxios`.
2. Does any new code render user-supplied content in HTML? → sanitize first.
3. Does any new code extract a zip? → use existing `lib/zip` helpers.
4. Does any new code read a file path from user input? → assert path stays inside the base dir.

## File rename = entire file marked as "new code"

When a PR renames a file (extension change like `.ts → .tsx`, folder move, or anything that breaks Git's rename heuristic for Sonar's diff), Sonar treats every line of the renamed file as new code on the leak period. **Pre-existing patterns surface as new findings.** PR #3068 (Notion block render) had 4 "new" issues — all 4 on lines that existed unchanged before the rename: 3× `typescript:S6836` const-in-case (existing `image`/`audio`/`file` arms) + 1× `typescript:S4123` await-non-Promise (existing `paragraph` arm).

Don't reactively rewrite pre-existing patterns to satisfy the rename. Either:
1. **Mark as False Positive in the SonarCloud UI** with a one-line note "pre-existing pattern, surfaced by file rename in PR #NNNN."
2. **Fix the underlying pattern in a follow-up `refactor:` PR scoped to that fix** — never mix the refactor into the rename PR (the noise hides any genuinely new finding).

Confirm the issue is genuinely pre-existing by checking the line against the pre-rename file (`git show <pre-rename-sha>:<old-path>`). If it's pre-existing, the rename made it visible; the PR didn't introduce it.

## Handling false positives

`tssecurity` taint findings (S5144, S7044) **cannot** be suppressed via `sonar.issue.ignore.multicriteria` — the rule engine ignores multicriteria for taint flows. The only options are:

1. **Rearchitect** so the taint no longer reaches the sink (preferred — often the right call).
2. **Mark as False Positive in the SonarCloud UI** (Issues → the finding → Change Status → False Positive). Add a one-line note explaining why. Alexander must do this for tssecurity FPs; they are not auto-suppressed.

The existing FPs in `instrumentedAxios.ts` (S5144/S7044) are already marked in the UI. The URL passes through `validateAndResolveUrl()` → `isHostOnFixedAllowlist()` / `resolveHostnameSafely()` — Sonar's taint engine cannot follow that chain.

## Existing rule waivers (in `sonar-project.properties`)

| Key | Rule | Scope | Why |
|---|---|---|---|
| `mock1` | `javascript:S5122` (CORS) | `web/mock-server/**` | Mock server is intentionally permissive |
| `mock2` | `javascript:S5689` (method exposure) | `web/mock-server/**` | Same |
| `test1` | `javascript:S2068` (hardcoded credential) | `web/tests/**` | Playwright fixtures use placeholder credentials |
| `test2` | `javascript:S1481` (unused variable) | `web/tests/**` | Test helpers declare but don't always use locals |
| `gen1/gen2` | all rules | `web/src/generated/**`, `web/src/schemas/**` | Generated code — don't edit |
| (exclusions) | all rules | `src/data_layer/public/**` | Kanel-generated from Postgres schema; rerun `pnpm kanel` instead |

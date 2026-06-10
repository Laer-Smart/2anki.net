---
description: Parallel server tsc + web typecheck + web vitest + web lint
allowed-tools: Bash
---

Run all four checks in parallel via a single Bash call:

```bash
pnpm --filter notion2anki-server build & \
pnpm --filter 2anki-web typecheck & \
pnpm --filter 2anki-web test:run & \
pnpm --filter 2anki-web lint & \
wait
```

If any fails, print one line per failure with the file:line and the error message — nothing else. If all pass, say "all clean" and stop.

The web `lint` step runs oxlint with the rules that mirror SonarCloud findings (`typescript/prefer-optional-chain`, `no-nested-ternary`, `unicorn/no-negated-condition`, `no-unneeded-ternary`). Catching them locally avoids a CI round-trip after Sonar comments on a PR.

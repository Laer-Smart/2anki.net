# Code-quality rules

Patterns the SonarCloud quality gate, the project RULES.md, and review history have surfaced repeatedly.

| Requirement | Do instead | CWE |
| --- | --- | --- |
| Do not add comments to explain WHAT code does. | Rename the variable/function/file so the next reader doesn't need the comment. Comments are stripped before review. | — |
| Do not write `if (!ready) { … } else { … }`. | Lead with the positive: `if (ready) { … } else { … }` (Sonar S7735). Negation + else forces mental inversion. | — |
| Do not deduplicate code on the second occurrence. | Wait for the third. Premature abstraction is harder to undo than three honest copies. | — |
| Do not introduce `any`, `as any`, or `@ts-ignore` without a one-line justification on the same line. | Reach for a real type; if it is genuinely unknown, use `unknown` and narrow at the boundary. | CWE-704 |
| Do not edit anything under `src/data_layer/public/`. | Run `pnpm kanel` after migrations — those files regenerate. (Write/Edit to this path is blocked by `.claude/hooks/pre-write-secret-scan.py`.) | — |
| Do not leave `console.log`, `debugger`, or `xdescribe` in committed code. | Strip before pushing. The Stop hook nudges; review will block. | CWE-489 |
| Do not skip layers (controller → repository, route → service). | Route → controller → use case → service → data layer. Each layer's CLAUDE.md says what belongs there. | — |
| Do not put business logic in routes or controllers. | Controllers shape HTTP; use cases orchestrate; services hold reusable domain logic. | — |
| Do not import `knex` outside `src/data_layer/`. | Take a repository interface in the constructor; tests inject a fake. | — |
| Do not use chained nested ternaries. | Extract to a function with named branches; oxlint's `no-nested-ternary` will fail the web lint anyway. | — |
| Do not add a flag-on-flag option to a function (`opts.x`, `opts.skipX`, `opts.forceX`). | Two functions, or two call sites. Boolean parameter explosion is a code smell. | — |
| Do not catch an error only to rethrow the same error. | Drop the try/catch; let it propagate to `ErrorHandler`. | CWE-755 |
| Do not stack PRs (feature B branched off feature A's branch). | One PR per feature off `main`. The deploy pipeline ships a single branch. | — |
| Do not introduce backwards-compat shims, `_unused` renames, or "removed because…" comments for deleted code. | If the symbol is unused, delete it. The git history is the changelog. | — |
| Do not commit changes that fail `/check`. | Run server tsc + web typecheck + web vitest + web lint locally first. | — |
| Do not put `setInterval`/`setTimeout` for sync jobs at module top-level. | Schedule explicitly in `server.ts` startup or via a documented job runner. Stripe sync is **manual only**. | — |
| Do not gate a feature or runtime behavior behind a `process.env` flag (`*_ENABLED`, mode switches, behavior toggles, thresholds that change output) unless Alexander explicitly asked for that flag. Hidden flags silently change product behavior, rot undocumented, and default to the wrong thing — `CLAUDE_PARTIAL_SUCCESS_ENABLED` defaulted OFF and failed whole conversions for months while nobody knew it existed. | Make the correct behavior the unconditional default in code. If Alexander explicitly requests a flag: (1) the **unset default must be the safe/expected behavior** so a missing var never degrades the product, (2) test it with `=== 'true'` — never bare `if (process.env.X)`, which makes `X=false` truthy, (3) document it in `src/env.example` (and `web/.env.example`) with its default and what each state does. | — |
| Do not use `localStorage` to persist user data, preferences, history, conversion results, or anything that should survive a session or be consistent across devices — unless explicitly asked to, or you are touching existing code that already uses `localStorage` for that purpose. | Store in the database with a proper Knex migration (`npx knex migrate:make <name> --knexfile ./src/KnexConfig.ts --migrations-directory ../migrations -x js`) followed by `pnpm kanel`. `localStorage` is acceptable only for genuinely ephemeral UI state (collapsed panel, theme toggle) where the existing codebase already uses it. When in doubt, use the DB. | — |
| Do not send raw database rows, ORM objects, Knex query results, or untyped objects directly to the client via `res.json()`. | Map the result to an explicit typed response shape before sending. Internal structure leaking to the client is a coupling hazard and can expose schema details or sensitive fields. | CWE-209 |
| Do not ship a `fix:`/`feat:` changelog entry (or a PR titled as a fix) without a source change that actually implements it. A PR that adds only tests + a changelog claiming "X now works" is a false artifact — it tells users a bug was fixed when nothing changed. | If you investigated but could not land the fix, say so plainly in the PR body and **omit the changelog entry**. Tests that characterize a bug are fine as a `test:` PR, but must not assert the broken output as if it were correct, and must not carry a fix changelog. | — |

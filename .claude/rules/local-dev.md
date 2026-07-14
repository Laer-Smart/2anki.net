# Local dev environment (maintainer's machine)

Environment-specific facts for running the toolchain, migrations, and checks on Alexander's macOS box, and for working out of a `.claude/worktrees/` git worktree. These are machine notes, not product rules — read them when a local command behaves unexpectedly, not before every task.

## Toolchain PATH

- `~/.local/bin` is a **trimmed symlink subset** (node, npm, claude, bunx only). The FULL toolchain lives at `/Users/a/.nvm/versions/node/v22.20.0/bin/` — `pnpm`, `npx`, `corepack`, `tsc` all exist there. If `pnpm`/`npx` is "not found", `export PATH="/Users/a/.nvm/versions/node/v22.20.0/bin:$PATH"`.
- Repo-local tools also run directly via `./node_modules/.bin/{jest,tsc,oxlint,oxfmt,tsx}`.
- **kanel is not a package.json dependency** — invoke it with `pnpm dlx kanel -c ./.kanelrc.js`. The kanel-in-PR hard gate (see CLAUDE.md "Run it") IS passable on this box: apply the migration to local Postgres first, then run kanel against the live schema. Local dev DB is Postgres **`n`**, user **`a`**, no password (the `DATABASE_URL` in root `.env`); `.kanelrc.js` reads discrete `POSTGRES_*` and `.env`'s `POSTGRES_USER=postgres` is stale, so override inline: `POSTGRES_HOST=localhost POSTGRES_USER=a POSTGRES_DATABASE=n pnpm dlx kanel -c ./.kanelrc.js`.
- No `SONAR_TOKEN` on this box — note "Sonar not run locally; Automatic Analysis covers the push" in PR bodies rather than pretending it ran.
- Pre-existing local test failure: `src/lib/pdf/getPageCount.test.ts` (needs a `pdfinfo` binary on PATH) — not your change.
- When reading `oxfmt --check` output, read the WHOLE thing, not `tail -1` — the "issues found" line sits ABOVE the timing line, so a truncated read misses a real format failure and bounces CI.

## Working from a git worktree

- **First action in any fresh worktree:** `pnpm install && pnpm --filter 2anki-web install` (source-only checkout has no `node_modules`, no Oxc native bindings). See `parallel-pr-coordination.md` for the Oxc-binding recovery path.
- **Web checks (vitest/tsc/lint) fail in a worktree** because `web/node_modules` is absent. Symlink it (gitignored, non-destructive): `ln -sfn /Users/a/src/github.com/2anki/server/web/node_modules web/node_modules`. Server jest resolves via the walk-up and needs no symlink.
- **`knex migrate:make` fails in a worktree** (ts-node can't compile `KnexConfig.ts`, TS5011 rootDir). Hand-write the migration file — existing ones are plain JS (`exports.up/down`); pick a timestamp after the latest in `migrations/`. Run it via a tiny `tsx` script at the **worktree root** (not `/tmp` — relative imports break) that calls `knex(KnexConfig).migrate.latest()`.
- **No Python venv in worktrees.** `create_deck/venv` only exists in the main checkout, so full `.apkg` packaging (`getPackagesFromZip` / `PrepareDeck` → genanki) fails in a worktree with `PythonExitError`. End-to-end pipeline runs must happen in the main checkout, which sets `WORKSPACE_BASE` / `CREATE_DECK_DIR` in its `.env`.

## Main checkout is shared test infra — verify it's clean

The main checkout (`/Users/a/src/github.com/2anki/server`) is where full-pipeline runs work, but it is Alexander's live working tree. Before trusting ANY real-pipeline result from it, `git status` it and confirm it's clean and at the expected sha (and that the feature's new files exist). A dirty tree runs the WRONG code and gives false results — a "conversion still broken" reading once turned out to be the main checkout running with a source file deleted from its working tree; on clean code it converted fine. Treat the main checkout as read-only test infra; do experiments in a worktree. Restore with `git checkout HEAD -- .` (the `safety.py` hook blocks `git reset --hard` with uncommitted changes).

## Diagnosing local hook / deploy oddities

- **Pre-push `tsc` hook error referencing another branch's files** during a multi-worktree session is usually NOT a cross-worktree hook bug — it's real pollution. An agent leaked branch files into the main checkout and the hook's tsc saw the broken half-state. Run `git status` in the **main checkout** first; if polluted, verify each stray file matches the PR branch copy, then discard it. Only bypass with `CLAUDE_SKIP_TYPECHECK=1` after `npx tsc -p . --noEmit` passes in the tree being pushed.
- **A new `web/src/App.tsx` route needs a matching entry in `src/routes/knownRoutes.ts` in the same PR.** `DefaultRouter` serves the SPA shell with a 200 only for listed paths; an unregistered path renders fine via client-side navigation but returns **404 on direct load or refresh** — invisible in normal clicking and in vitest. Verify post-deploy with `curl -w "%{http_code}"` on the new URL.
- **`Graceful shutdown exceeded 25000ms — forcing exit` in prod logs is expected on every deploy** (an in-flight conversion holds the drain past the 25s window). Don't surface it in `/deploy-status` as a concern — only flag genuine faults (`uncaught exception`, native-binding failures, `EADDRINUSE`, crash loops).

## Harness mechanics

- A **non-zero Bash exit cancels every still-queued tool call after it** in the same turn (including spawned Agents). Run shippable git steps in their own message, and end multi-step bash scripts with a command that exits 0 (a final `git log`/`echo`) so a mid-script failure doesn't cascade-cancel the rest.

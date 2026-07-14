# Dependency rules

`pnpm` workspace (`pnpm-workspace.yaml`), Node `>=12` declared but CI runs on **22.20.0** (`.github/workflows/server.yml`) and `.nvmrc` is the source of truth. The web app is a sibling workspace under `web/`.

| Requirement | Do instead | CWE |
| --- | --- | --- |
| Do not run `npm install` or `yarn`. | `pnpm install` (or `pnpm --frozen-lockfile` in CI). Mixing managers corrupts the lockfile. | — |
| Do not edit `pnpm-lock.yaml` by hand. | Re-run `pnpm install` after changing `package.json`. | — |
| Do not bypass `pnpm.overrides`. | Pinned overrides exist for a reason: `path-to-regexp ≥ 8.4.0` (CVE), `picomatch ≥ 4.0.4`, `rollup ≥ 4.59.0`, `yaml ≥ 2.8.3`. Bumping them silently re-opens the issue. | CWE-1395, CWE-937 |
| Do not add a dep without checking transitive bloat. | `pnpm why <pkg>` first; if a small helper is enough, write it instead. | — |
| Do not `pnpm add` against the root for a web-only package. | `pnpm --filter 2anki-web add <pkg>` so it lands in the right workspace. | — |
| Do not introduce a new HTTP client. | Use `instrumentedAxios` from `services/observability/`. The SSRF guard, allowlist, and DNS pinning live there. | CWE-918 |
| Do not import `node-fetch` v2 in new code. | Native `fetch` (Node 22) or `instrumentedAxios`. The `@types/node-fetch` dep is legacy. | — |
| Do not pin Node version below `.nvmrc`. | Match the value in `.nvmrc` and `.github/workflows/server.yml`; bump both together. | — |
| Do not commit a dep that requires a build step beyond `onlyBuiltDependencies`. | Allowlisted: `better-sqlite3`. Anything else triggers a pnpm warning and a security review. | CWE-829 |
| Do not skip the lockfile in CI. | `--frozen-lockfile` is mandatory on CI; mismatch must fail the build, not be papered over. | CWE-829 |
| Do not import a Notion / Stripe / Anthropic / SendGrid SDK without using the project's wrapper. | NotionAPIWrapper, StripeController helpers, the Claude lib, EmailService — wrappers exist so the SSRF guard, retries, and observability instrument every call. | — |
| Do not build a capability the third-party platform already provides. Before speccing or building anything layered on Stripe / SendGrid / Notion / AWS / Anthropic — dunning/failed-payment emails, payment retries, card-update pages, expiring-card notices, bounce/complaint handling, subscription lifecycle emails, webhooks the platform auto-sends — **verify the platform does not already do it**: read its dashboard settings AND its docs, and put the evidence in the spec. An unverified "the platform doesn't do X" premise is a scope error, not a detail. (2026-07-14: a custom failed-payment dunning email was fully specced + an implementation started before anyone checked Stripe — Stripe Revenue Recovery already sends the card-fail email, runs Smart Retries, and sends expiring-card emails; the whole build was redundant and closed. The spec's "Stripe's retry emails are off for this account" was assumed, never verified.) | — |
| Do not add a runtime dep for a one-off devtime task. | Put it in `devDependencies` or write a script under `scripts/`. | — |
| Do not silence `dependabot` PRs by closing them. | Triage: merge if green, comment with the reason if held. The dependabot workflows expect closure via merge or label. | — |
| Do not assume a dep bump is CommonJS-safe. An ESM-only transitive package makes the CJS jest suite throw `Unexpected token 'export'` / `Cannot use import statement outside a module` and reddens every suite that imports it (often transitively). | Stub the top-level offending package via `moduleNameMapper` in `jest.config.js` to keep the whole ESM subtree out of the module graph — `transformIgnorePatterns` whitelisting is whack-a-mole (it only moves the failure to the next ESM leaf). Only valid when no test exercises the real package. Reproduce with a clean `pnpm install`; stale `node_modules` hides it. | — |

## Update rhythm

- Dependabot PRs land daily; the `dependabot-auto-merge.yml` workflow handles the safe ones.
- Major bumps need a manual look — read the changelog, run `/check`, sanity-test the conversion path.
- Drop unused deps quarterly with `/dead-code-auditor` (sub-agent) or `pnpm dlx depcheck`.

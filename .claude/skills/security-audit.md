---
description: Read-only audit of changed files (or a path) against .claude/rules/security.md
argument-hint: <optional path; defaults to git diff vs origin/main>
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

Audit the requested surface against the rule table in `.claude/rules/security.md`. Read-only — no edits, no installs, no network requests beyond `gh`/`git`.

Scope:

- If `$ARGUMENTS` is a path or glob, audit those files.
- Otherwise, audit `git diff origin/main...HEAD --name-only` filtered to `*.ts` / `*.tsx` under `src/` and `web/src/`.

For each file, walk the security rule table. For every match, report:

```
<path>:<line>  [CWE-xxx]  (confidence N/10)  <one-line finding>
  evidence:    <the verbatim line, copied from the file — not paraphrased>
  suggested:   <concrete fix in one sentence>
```

The `evidence` line is a gate, not decoration: it must be the actual line as it appears in the file. If you can't quote the exact code, you're guessing — drop the finding. Score confidence 1–10 that the quoted line is genuinely the rule violation. List findings of 7+ as above; collect anything below 7 under a separate **Low confidence** heading at the end (one line each, no fix) so the reader can weigh them without mistaking them for confirmed issues.

Pay particular attention to these stack-specific risks:

1. **SSRF on outbound HTTP** (CWE-918) — any `axios.get/post/...` that isn't `instrumentedAxios` is a finding. Check `services/observability/FEATURE.md` for the wrapper contract.
2. **SQL via knex.raw** (CWE-89) — flag any `knex.raw(\`...${x}\`)`; bindings are required.
3. **Falsy-ID rejection** (CWE-754) — `!id`, `!user`, `if (value)` for "is the ID present?" checks; should be `value == null`.
4. **Secrets in logs** (CWE-532) — `console.log` / `console.error` with `password`, `token`, `cookie`, `secret`, or full request bodies.
5. **Path traversal** (CWE-22) — multer-uploaded `originalname` reaching `path.join` / `fs.writeFile` without `getSafeFilename`. Zip extraction without `..` checks.
6. **Webhook signature** (CWE-345) — Stripe/Notion webhook handlers that parse JSON before verifying HMAC, or skip verification.
7. **Auth in controllers** (CWE-862) — auth checks that should live in `routes/middleware/`.
8. **Hardcoded secrets** (CWE-798) — anything matching the patterns in `.claude/hooks/pre-write-secret-scan.py`.

End with a summary: count of findings by CWE, and the top three to fix first. Do not propose code changes — surface, don't patch. The user invokes `/implement` afterwards if a fix is wanted.

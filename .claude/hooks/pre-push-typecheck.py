#!/usr/bin/env python3
"""
PreToolUse hook: run the relevant typecheck/lint before `git push` to a
feature branch, scoped to the workspace that actually changed.

Goal: stop pushing red branches that then fail GH Actions and chew CI minutes.
- Server `.ts` changed  → server `tsc --noEmit`.
- Web `.ts`/`.tsx` changed → web typecheck + web Biome lint (the lint rules
  mirror the SonarCloud findings that otherwise only surface post-push).
Web vitest is intentionally left to `/check` and CI — it's the slow one and
would make every push wait.

Skips pushes to main/master (safety.py blocks those anyway). Skips a workspace
when nothing in it changed since the last push.

Bypass: CLAUDE_SKIP_TYPECHECK=1 git push ...
        CLAUDE_SKIP_SAFETY=1     git push ...   (also honored)
"""
import json
import os
import re
import subprocess
import sys

SERVER_TIMEOUT_SECONDS = 120
WEB_TYPECHECK_TIMEOUT_SECONDS = 120
WEB_LINT_TIMEOUT_SECONDS = 60


def allow():
    print(json.dumps({"continue": True}))
    sys.exit(0)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


GIT_PUSH = re.compile(r"\bgit\s+push\b")
PROTECTED_BRANCH = re.compile(r"\b(main|master)\b")


def is_git_push(cmd):
    return bool(GIT_PUSH.search(cmd))


def push_targets_protected(cmd):
    after = GIT_PUSH.split(cmd, 1)[1]
    after = re.split(r"[;&|]", after, 1)[0]
    return bool(PROTECTED_BRANCH.search(after))


def changed_ts_files():
    """.ts/.tsx paths that differ from origin/main or are uncommitted.
    Empty means there is nothing for tsc/lint to say."""
    try:
        committed = subprocess.run(
            ["git", "diff", "--name-only", "origin/main...HEAD"],
            capture_output=True, text=True, timeout=10,
        ).stdout
        working = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except Exception:
        return None  # signal "couldn't tell" — caller errs toward running checks
    files = (committed + "\n" + working).splitlines()
    return [f for f in files if f.endswith((".ts", ".tsx"))]


def run_check(label, cmd, cwd, timeout):
    """True = passed, None = couldn't run (fail open), str = error output."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        sys.stderr.write(
            f"[pre-push-typecheck] {label} exceeded {timeout}s; allowing push.\n"
        )
        return None
    except FileNotFoundError:
        sys.stderr.write("[pre-push-typecheck] pnpm not on PATH; allowing push.\n")
        return None
    if result.returncode == 0:
        return True
    return result.stdout or result.stderr or "(no output)"


def deny_for(label, output):
    head = "\n".join(output.splitlines()[:30])
    deny(
        f"Refusing `git push` — {label} failed. First errors:\n\n"
        f"{head}\n\n"
        "Fix them, or bypass with CLAUDE_SKIP_TYPECHECK=1 if pushing a WIP branch."
    )


def main():
    if os.environ.get("CLAUDE_SKIP_TYPECHECK") or os.environ.get("CLAUDE_SKIP_SAFETY"):
        allow()

    try:
        data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        allow()

    if data.get("tool_name") != "Bash":
        allow()

    cmd = data.get("tool_input", {}).get("command", "")
    if not is_git_push(cmd):
        allow()

    if push_targets_protected(cmd):
        allow()  # safety.py owns this case

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    ts_files = changed_ts_files()
    if ts_files is not None and not ts_files:
        allow()

    # ts_files is None → "couldn't tell"; run both to be safe.
    server_changed = ts_files is None or any(not f.startswith("web/") for f in ts_files)
    web_changed = ts_files is None or any(f.startswith("web/") for f in ts_files)

    if server_changed:
        sys.stderr.write("[pre-push-typecheck] running server tsc --noEmit...\n")
        result = run_check(
            "server tsc --noEmit",
            ["pnpm", "exec", "tsc", "--noEmit", "-p", "."],
            project_dir, SERVER_TIMEOUT_SECONDS,
        )
        if isinstance(result, str):
            deny_for("server tsc --noEmit", result)

    if web_changed:
        sys.stderr.write("[pre-push-typecheck] running web typecheck...\n")
        result = run_check(
            "web typecheck",
            ["pnpm", "--filter", "2anki-web", "typecheck"],
            project_dir, WEB_TYPECHECK_TIMEOUT_SECONDS,
        )
        if isinstance(result, str):
            deny_for("web typecheck", result)

        sys.stderr.write("[pre-push-typecheck] running web lint (Biome)...\n")
        result = run_check(
            "web lint (Biome)",
            ["pnpm", "--filter", "2anki-web", "lint"],
            project_dir, WEB_LINT_TIMEOUT_SECONDS,
        )
        if isinstance(result, str):
            deny_for("web lint (Biome)", result)

    allow()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import importlib.util
import json
import os
import sys
import unittest
from unittest.mock import patch

HOOKS_DIR = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "pre_push_typecheck",
    os.path.join(HOOKS_DIR, "pre-push-typecheck.py"),
)
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


def run_hook(command, tool_name="Bash", env=None, ts_files=None, check_results=None):
    """ts_files: list of changed .ts/.tsx paths (or None = couldn't tell).
    check_results: dict label -> True | str(error). Missing label defaults True."""
    check_results = check_results or {}
    stdin_data = json.dumps({"tool_name": tool_name, "tool_input": {"command": command}})
    captured = {"checks": []}

    def fake_allow():
        captured["result"] = "allow"
        sys.exit(0)

    def fake_deny(reason):
        captured["result"] = "deny"
        captured["reason"] = reason
        sys.exit(0)

    def fake_changed_ts_files():
        return ts_files

    def fake_run_check(label, cmd, cwd, timeout):
        captured["checks"].append(label)
        return check_results.get(label, True)

    with patch.object(hook, "allow", side_effect=fake_allow), \
         patch.object(hook, "deny", side_effect=fake_deny), \
         patch.object(hook, "changed_ts_files", side_effect=fake_changed_ts_files), \
         patch.object(hook, "run_check", side_effect=fake_run_check), \
         patch("sys.stdin") as mock_stdin, \
         patch.dict(os.environ, env or {}, clear=False):
        mock_stdin.read.return_value = stdin_data
        try:
            hook.main()
        except SystemExit:
            pass

    return captured


class TestPassThrough(unittest.TestCase):
    def test_non_bash_tool_allows(self):
        result = run_hook("git push", tool_name="Write")
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], [])

    def test_non_push_command_allows(self):
        result = run_hook("git status")
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], [])

    def test_push_to_main_allows_without_checks(self):
        result = run_hook("git push origin main", ts_files=["src/server.ts"])
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], [])

    def test_env_bypass_allows(self):
        result = run_hook(
            "git push -u origin feat/x",
            env={"CLAUDE_SKIP_TYPECHECK": "1"},
            ts_files=["web/src/App.tsx"],
        )
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], [])

    def test_no_ts_changes_allows_without_checks(self):
        result = run_hook("git push -u origin docs/x", ts_files=[])
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], [])


class TestServerScope(unittest.TestCase):
    def test_server_change_runs_only_server_check(self):
        result = run_hook("git push -u origin fix/x", ts_files=["src/usecases/Convert.ts"])
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], ["server tsc --noEmit"])

    def test_server_tsc_failure_denies(self):
        result = run_hook(
            "git push -u origin fix/x",
            ts_files=["src/usecases/Convert.ts"],
            check_results={"server tsc --noEmit": "Convert.ts:12 error TS2322"},
        )
        self.assertEqual(result["result"], "deny")
        self.assertIn("server tsc --noEmit", result["reason"])
        self.assertIn("TS2322", result["reason"])
        self.assertIn("CLAUDE_SKIP_TYPECHECK=1", result["reason"])


class TestWebScope(unittest.TestCase):
    def test_web_change_runs_web_checks_not_server(self):
        result = run_hook("git push -u origin feat/x", ts_files=["web/src/App.tsx"])
        self.assertEqual(result["result"], "allow")
        self.assertEqual(result["checks"], ["web typecheck", "web lint (Biome)"])

    def test_web_typecheck_failure_denies_before_lint(self):
        result = run_hook(
            "git push -u origin feat/x",
            ts_files=["web/src/App.tsx"],
            check_results={"web typecheck": "App.tsx:3 error TS2304"},
        )
        self.assertEqual(result["result"], "deny")
        self.assertIn("web typecheck", result["reason"])
        self.assertEqual(result["checks"], ["web typecheck"])

    def test_web_lint_failure_denies(self):
        result = run_hook(
            "git push -u origin feat/x",
            ts_files=["web/src/App.tsx"],
            check_results={"web lint (Biome)": "App.tsx:9 noNestedTernary"},
        )
        self.assertEqual(result["result"], "deny")
        self.assertIn("web lint (Biome)", result["reason"])
        self.assertIn("noNestedTernary", result["reason"])
        self.assertEqual(result["checks"], ["web typecheck", "web lint (Biome)"])


class TestBothScopes(unittest.TestCase):
    def test_both_changed_runs_all_three(self):
        result = run_hook(
            "git push -u origin feat/x",
            ts_files=["src/server.ts", "web/src/App.tsx"],
        )
        self.assertEqual(result["result"], "allow")
        self.assertEqual(
            result["checks"],
            ["server tsc --noEmit", "web typecheck", "web lint (Biome)"],
        )

    def test_unknown_diff_runs_all_three(self):
        result = run_hook("git push -u origin feat/x", ts_files=None)
        self.assertEqual(result["result"], "allow")
        self.assertEqual(
            result["checks"],
            ["server tsc --noEmit", "web typecheck", "web lint (Biome)"],
        )


if __name__ == "__main__":
    unittest.main()

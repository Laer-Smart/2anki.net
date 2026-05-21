#!/usr/bin/env python3
import importlib.util
import json
import os
import sys
import unittest
from unittest.mock import patch, MagicMock

HOOKS_DIR = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "check_browser_attestation",
    os.path.join(HOOKS_DIR, "check-browser-attestation.py"),
)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def make_input(command, tool_name="Bash"):
    return json.dumps({"tool_name": tool_name, "tool_input": {"command": command}})


def run_hook(command, tool_name="Bash", env=None, subprocess_side_effect=None, subprocess_result=None):
    env_patch = env or {}
    stdin_data = make_input(command, tool_name)
    captured = {}

    def fake_allow():
        captured["result"] = "allow"
        sys.exit(0)

    def fake_deny(reason):
        captured["result"] = "deny"
        captured["reason"] = reason
        sys.exit(0)

    if subprocess_side_effect is not None:
        run_patcher = patch("subprocess.run", side_effect=subprocess_side_effect)
    elif subprocess_result is not None:
        run_patcher = patch("subprocess.run", return_value=MagicMock(
            returncode=subprocess_result.get("returncode", 0),
            stdout=subprocess_result.get("stdout", ""),
            stderr=subprocess_result.get("stderr", ""),
        ))
    else:
        run_patcher = None

    with patch.object(hook, "allow", side_effect=fake_allow), \
         patch.object(hook, "deny", side_effect=fake_deny), \
         patch("sys.stdin") as mock_stdin, \
         patch.dict(os.environ, env_patch, clear=False):
        mock_stdin.read.return_value = stdin_data
        if run_patcher is not None:
            with run_patcher:
                try:
                    hook.main()
                except SystemExit:
                    pass
        else:
            try:
                hook.main()
            except SystemExit:
                pass

    return captured


def make_pr_json(author_login, body, files):
    return json.dumps({
        "author": {"login": author_login},
        "body": body,
        "files": [{"path": f} for f in files],
    })


class TestNonMergeCommand(unittest.TestCase):
    def test_non_gh_command_allows(self):
        result = run_hook("git status")
        self.assertEqual(result["result"], "allow")

    def test_gh_pr_view_allows(self):
        result = run_hook("gh pr view 42")
        self.assertEqual(result["result"], "allow")

    def test_non_bash_tool_allows(self):
        result = run_hook("gh pr merge 42", tool_name="Write")
        self.assertEqual(result["result"], "allow")


class TestDependabotBypass(unittest.TestCase):
    def test_dependabot_author_always_allows(self):
        stdout = make_pr_json("dependabot[bot]", "No browser check", ["web/src/App.tsx"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")


class TestNoWebSrcFiles(unittest.TestCase):
    def test_no_web_src_files_allows(self):
        stdout = make_pr_json("alex", "No browser check", ["src/server.ts", "README.md"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")


class TestChangelogOnlyBypass(unittest.TestCase):
    def test_only_changelog_file_allows(self):
        stdout = make_pr_json("alex", "No browser check", ["web/src/pages/WhatsNewPage/changelog.ts"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")

    def test_changelog_plus_other_web_src_requires_attestation(self):
        body = "- [x] Golden path on localhost:3000\n- [x] No console errors at 375px"
        stdout = make_pr_json(
            "alex",
            body,
            ["web/src/pages/WhatsNewPage/changelog.ts", "web/src/components/Foo.tsx"],
        )
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")


class TestAttestationPresent(unittest.TestCase):
    def test_both_checkboxes_ticked_allows(self):
        body = (
            "## Browser check\n"
            "- [x] Golden path on localhost:3000\n"
            "- [x] No console errors at 375px\n"
            "Notes:\n"
        )
        stdout = make_pr_json("alex", body, ["web/src/App.tsx"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")

    def test_out_clause_allows(self):
        body = "Browser check: not applicable — internal-only, no UI change\n"
        stdout = make_pr_json("alex", body, ["web/src/utils/helpers.ts"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "allow")


class TestAttestationAbsent(unittest.TestCase):
    def test_no_browser_check_section_denies(self):
        body = "## What\nSome feature.\n\n## Testing\n- Unit tests added: yes\n"
        stdout = make_pr_json("alex", body, ["web/src/App.tsx"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "deny")

    def test_one_ticked_one_unticked_denies(self):
        body = "- [x] Golden path on localhost:3000\n- [ ] No console errors at 375px\n"
        stdout = make_pr_json("alex", body, ["web/src/App.tsx"])
        result = run_hook("gh pr merge 42", subprocess_result={"returncode": 0, "stdout": stdout})
        self.assertEqual(result["result"], "deny")


class TestToolingErrors(unittest.TestCase):
    def test_gh_not_found_allows(self):
        result = run_hook(
            "gh pr merge 42",
            subprocess_side_effect=FileNotFoundError("gh not found"),
        )
        self.assertEqual(result["result"], "allow")

    def test_gh_nonzero_exit_allows(self):
        result = run_hook(
            "gh pr merge 42",
            subprocess_result={"returncode": 1, "stdout": "", "stderr": "not found"},
        )
        self.assertEqual(result["result"], "allow")

    def test_gh_timeout_allows(self):
        import subprocess
        result = run_hook(
            "gh pr merge 42",
            subprocess_side_effect=subprocess.TimeoutExpired("gh", 15),
        )
        self.assertEqual(result["result"], "allow")


if __name__ == "__main__":
    unittest.main()

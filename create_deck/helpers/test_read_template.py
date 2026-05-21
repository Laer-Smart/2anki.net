"""
Test that read_template resolves the file path correctly whether or not
template_dir has a trailing separator.

Regression guard for the path-concatenation bug where a missing trailing
separator produced paths like '/abs/pathtemplatesfile.html' instead of
'/abs/path/templates/file.html'.
"""
import os
import tempfile

import pytest

from .read_template import read_template


@pytest.fixture()
def template_dir_with_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        sample_path = os.path.join(tmpdir, "card_front.html")
        with open(sample_path, "w", encoding="utf-8") as f:
            f.write("hello {{Front}}")
        yield tmpdir


def test_read_template_with_trailing_separator(template_dir_with_file):
    result = read_template(template_dir_with_file + os.sep, "card_front.html", None, None)
    assert result == "hello {{Front}}"


def test_read_template_without_trailing_separator(template_dir_with_file):
    result = read_template(template_dir_with_file, "card_front.html", None, None)
    assert result == "hello {{Front}}"


def test_read_template_replacement(template_dir_with_file):
    result = read_template(template_dir_with_file, "card_front.html", "{{Front}}", "Question")
    assert result == "hello Question"

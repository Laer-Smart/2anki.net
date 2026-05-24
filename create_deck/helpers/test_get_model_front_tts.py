"""
Tests for front-field TTS injection on non-MCQ models.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parents[2]
CREATE_DECK_DIR = str(REPO_ROOT / "create_deck")
if CREATE_DECK_DIR not in sys.path:
    sys.path.insert(0, CREATE_DECK_DIR)

# pylint: disable=wrong-import-position
from helpers.get_model import get_model, _apply_front_tts
from helpers.get_model_id import get_model_id


def _basic_descriptor():
    return ("basic", get_model_id("n2a-basic"), "n2a-basic", "", None, None)


def _cloze_descriptor():
    return ("cloze", get_model_id("n2a-cloze"), "n2a-cloze", "", None, None)


def _input_descriptor():
    return ("input", get_model_id("n2a-input"), "n2a-input", "", None, None)


def _mcq_descriptor():
    return ("mcq", get_model_id("n2a-mcq"), "n2a-mcq", "", None, None)


class TestApplyFrontTts:
    def test_basic_injects_front_field(self):
        assert _apply_front_tts("X", "basic", "ja") == "{{tts ja:Front}}\nX"

    def test_input_injects_front_field(self):
        assert _apply_front_tts("X", "input", "ko") == "{{tts ko:Front}}\nX"

    def test_cloze_injects_text_field(self):
        assert _apply_front_tts("X", "cloze", "zh") == "{{tts zh:Text}}\nX"

    def test_empty_lang_is_a_no_op(self):
        assert _apply_front_tts("X", "basic", "") == "X"

    def test_unknown_model_type_is_a_no_op(self):
        assert _apply_front_tts("X", "io", "ja") == "X"


class TestGetModelFrontLangIntegration:
    def test_basic_prepends_tts_when_lang_set(self):
        model = get_model(_basic_descriptor(), front_lang="ja")
        assert "{{tts ja:Front}}" in model.templates[0]["qfmt"]

    def test_basic_unchanged_when_lang_empty(self):
        baseline = get_model(_basic_descriptor()).templates[0]["qfmt"]
        with_empty = get_model(_basic_descriptor(), front_lang="").templates[0]["qfmt"]
        assert baseline == with_empty
        assert "{{tts" not in with_empty

    def test_cloze_prepends_tts_with_text_field(self):
        model = get_model(_cloze_descriptor(), front_lang="ja")
        assert "{{tts ja:Text}}" in model.templates[0]["qfmt"]

    def test_input_prepends_tts_with_front_field(self):
        model = get_model(_input_descriptor(), front_lang="ja")
        assert "{{tts ja:Front}}" in model.templates[0]["qfmt"]

    def test_mcq_ignores_front_lang(self):
        """front_lang must not silently override MCQ behaviour — MCQ uses its own settings."""
        mcq_settings = {
            "mcqTtsQuestion": "en_US",
            "mcqTtsCorrectAnswer": "",
            "mcqTtsExtra": "",
        }
        model = get_model(_mcq_descriptor(), mcq_settings=mcq_settings, front_lang="ja")
        qfmt = model.templates[0]["qfmt"]
        assert "{{tts en_US:Question}}" in qfmt
        assert "{{tts ja:" not in qfmt

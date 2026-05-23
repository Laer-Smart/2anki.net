"""
Tests for MCQ settings injection in get_model.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parents[2]
CREATE_DECK_DIR = str(REPO_ROOT / "create_deck")
if CREATE_DECK_DIR not in sys.path:
    sys.path.insert(0, CREATE_DECK_DIR)

# pylint: disable=wrong-import-position
from helpers.get_model import get_model, _apply_mcq_settings
from helpers.get_model_id import get_model_id
from helpers.get_template import get_template


def _base_descriptor(model_id=None):
    mid = model_id or get_model_id("n2a-mcq")
    return ("mcq", mid, "n2a-mcq", "", None, None)


class TestApplyMcqSettings:
    """Apply-MCQ-settings substitution behaviour."""

    def test_show_choices_auto_sets_true(self):
        template = get_template("n2a-mcq.json")
        qfmt, _afmt = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "auto", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "const AUTO_SHOW_CHOICES = true;" in qfmt

    def test_show_choices_button_sets_false(self):
        template = get_template("n2a-mcq.json")
        qfmt, _ = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "const AUTO_SHOW_CHOICES = false;" in qfmt

    def test_shuffle_disabled_replaces_shuffle_call(self):
        template = get_template("n2a-mcq.json")
        qfmt, _ = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": False, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "/* shuffle disabled */" in qfmt
        assert "shuffleArray(data.position);" not in qfmt

    def test_shuffle_enabled_keeps_shuffle_call(self):
        template = get_template("n2a-mcq.json")
        qfmt, _ = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "shuffleArray(data.position);" in qfmt

    def test_tts_question_prepended_to_front(self):
        template = get_template("n2a-mcq.json")
        qfmt, _ = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "en_US", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "{{tts en_US:Question}}" in qfmt

    def test_tts_correct_answer_prepended_to_back(self):
        template = get_template("n2a-mcq.json")
        _, afmt = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "es_ES", "mcqTtsExtra": ""},
        )
        assert "{{tts es_ES:Correct Answer}}" in afmt

    def test_tts_extra_prepended_to_back(self):
        template = get_template("n2a-mcq.json")
        _, afmt = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": "fr_FR"},
        )
        assert "{{tts fr_FR:Extra}}" in afmt

    def test_empty_tts_lang_produces_no_tts_tag(self):
        template = get_template("n2a-mcq.json")
        qfmt, afmt = _apply_mcq_settings(
            template["front"],
            template["back"],
            {"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert "{{tts" not in qfmt
        assert "{{tts" not in afmt

    def test_back_contains_correct_row_background_color(self):
        template = get_template("n2a-mcq.json")
        assert "#c7f1dc" in template["styling"]

    def test_back_contains_incorrect_row_indicator_in_back(self):
        template = get_template("n2a-mcq.json")
        assert "FalseSVG" in template["back"]

    def test_back_contains_correct_row_indicator_in_back(self):
        template = get_template("n2a-mcq.json")
        assert "TrueSVG" in template["back"]


class TestGetModelMcqIntegration:
    """End-to-end behaviour of get_model when the mcq descriptor is passed."""

    def test_happy_path_all_settings(self):
        settings = {
            "mcqShowChoices": "auto",
            "mcqShuffle": False,
            "mcqTtsQuestion": "en_US",
            "mcqTtsCorrectAnswer": "en_US",
            "mcqTtsExtra": "",
        }
        model = get_model(_base_descriptor(), mcq_settings=settings)
        template = model.templates[0]
        assert "const AUTO_SHOW_CHOICES = true;" in template["qfmt"]
        assert "/* shuffle disabled */" in template["qfmt"]
        assert "{{tts en_US:Question}}" in template["qfmt"]
        assert "{{tts en_US:Correct Answer}}" in template["afmt"]

    def test_default_empty_settings_uses_template_defaults(self):
        settings = {
            "mcqShowChoices": "button",
            "mcqShuffle": True,
            "mcqTtsQuestion": "",
            "mcqTtsCorrectAnswer": "",
            "mcqTtsExtra": "",
        }
        model = get_model(_base_descriptor(), mcq_settings=settings)
        template = model.templates[0]
        assert "const AUTO_SHOW_CHOICES = false;" in template["qfmt"]
        assert "shuffleArray(data.position);" in template["qfmt"]
        assert "{{tts" not in template["qfmt"]
        assert "{{tts" not in template["afmt"]

    def test_no_mcq_settings_leaves_template_unchanged(self):
        model_no_settings = get_model(_base_descriptor())
        model_with_defaults = get_model(
            _base_descriptor(),
            mcq_settings={"mcqShowChoices": "button", "mcqShuffle": True, "mcqTtsQuestion": "", "mcqTtsCorrectAnswer": "", "mcqTtsExtra": ""},
        )
        assert model_no_settings.templates[0]["qfmt"] == model_with_defaults.templates[0]["qfmt"]

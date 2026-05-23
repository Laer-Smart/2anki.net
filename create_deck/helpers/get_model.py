"""
Retrieve the correct genanki model
"""
from genanki import Model

from .get_template import get_template

MODEL_INFO = {
    "cloze": {
        "file_name": "n2a-cloze.json",
        "model_type": Model.CLOZE
    },
    "basic": {
        "file_name": "n2a-basic.json",
        "model_type": Model.FRONT_BACK
    },
    "input": {
        "file_name": "n2a-input.json",
        "model_type": Model.FRONT_BACK
    },
    "io": {
        "file_name": "n2a-io.json",
        "model_type": Model.CLOZE
    },
    "mcq": {
        "file_name": "n2a-mcq.json",
        "model_type": Model.FRONT_BACK
    }
}

_TTS_FIELD_MAP = {
    "mcq-tts-question": "Question",
    "mcq-tts-correct-answer": "Correct Answer",
    "mcq-tts-extra": "Extra",
}


def _apply_mcq_settings(qfmt, afmt, mcq_settings):
    """
    Inject user-chosen MCQ TTS settings into the front and back templates.

    TTS tags — Anki's {{tts lang:Field}} is parsed at template-compile time, not at
    card render, so we cannot use field substitution; we must embed the lang code
    directly into the template string at build time.

    Shuffle and show-choices are now controlled by the in-card drawer at review time.
    The AUTO_SHOW_CHOICES and shuffleArray anchor strings remain in the template verbatim.
    """
    tts_lines_front = []
    tts_lines_back = []
    tts_key_to_setting = {
        "mcq-tts-question": "mcqTtsQuestion",
        "mcq-tts-correct-answer": "mcqTtsCorrectAnswer",
        "mcq-tts-extra": "mcqTtsExtra",
    }
    for tts_key, setting_key in tts_key_to_setting.items():
        lang = mcq_settings.get(setting_key, "") or ""
        if lang:
            field = _TTS_FIELD_MAP[tts_key]
            tts_tag = f"{{{{tts {lang}:{field}}}}}"
            if field == "Question":
                tts_lines_front.append(tts_tag)
            tts_lines_back.append(tts_tag)

    if tts_lines_front:
        qfmt = "\n".join(tts_lines_front) + "\n" + qfmt
    if tts_lines_back:
        afmt = "\n".join(tts_lines_back) + "\n" + afmt

    return qfmt, afmt


def get_model(descriptor, mcq_settings=None):
    """
    load the correct model based on type
    :param descriptor:
    :param mcq_settings: optional dict of MCQ user settings (only used for mcq model type)
    :return:
    """
    model_type, model_id, name, css, qfmt, afmt = descriptor
    model_info = MODEL_INFO[model_type]
    template_file = get_template(model_info.get("file_name"))

    if qfmt is None:
        qfmt = template_file.get('front')
    if afmt is None:
        afmt = template_file.get('back')

    if not css:
        css = template_file.get('styling') or ''

    if model_type == "mcq" and mcq_settings:
        qfmt, afmt = _apply_mcq_settings(qfmt, afmt, mcq_settings)

    return Model(
        model_id, name,
        fields=template_file.get("fields"),
        templates=[
            {
                "name": name,
                "qfmt": qfmt,
                "afmt": afmt,
            },
        ],
        css=css,
        model_type=model_info.get("model_type"),
    )

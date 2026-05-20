import json
import os
import sys
import tempfile
import zipfile
from pathlib import Path

import importlib.util as _ilu

_spec = _ilu.spec_from_file_location(
    "create_deck_script",
    Path(__file__).parents[1] / "create_deck.py",
)
_mod = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_one_deck = _mod.build_one_deck

REPO_ROOT = Path(__file__).parents[2]
TEMPLATE_DIR = str(REPO_ROOT / "src" / "templates") + os.sep


def _deck_info_basic(deck_name: str, front: str, back: str) -> list:
    return [
        {
            "id": abs(hash(deck_name)) % (10**10),
            "name": deck_name,
            "cards": [
                {
                    "name": front,
                    "back": back,
                    "number": 0,
                    "tags": [],
                    "media": [],
                    "cloze": False,
                    "enableInput": False,
                }
            ],
            "settings": {},
        }
    ]


def _deck_info_with_notion_id(deck_name: str, front: str, back: str, notion_id: str) -> list:
    return [
        {
            "id": abs(hash(deck_name)) % (10**10),
            "name": deck_name,
            "cards": [
                {
                    "name": front,
                    "back": back,
                    "number": 0,
                    "tags": [],
                    "media": [],
                    "cloze": False,
                    "enableInput": False,
                    "notionId": notion_id,
                }
            ],
            "settings": {},
        }
    ]


def _read_guids_from_apkg(apkg_path: str) -> list:
    guids = []
    with zipfile.ZipFile(apkg_path) as zf:
        db_name = "collection.anki21" if "collection.anki21" in zf.namelist() else "collection.anki2"
        db_bytes = zf.read(db_name)

    import sqlite3
    import io
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA journal_mode=WAL")
    raw = db_bytes
    conn.close()

    with tempfile.NamedTemporaryFile(suffix=".anki2", delete=False) as tmp:
        tmp.write(db_bytes)
        tmp_path = tmp.name
    try:
        conn = sqlite3.connect(tmp_path)
        rows = conn.execute("SELECT guid FROM notes ORDER BY guid").fetchall()
        guids = [row[0] for row in rows]
        conn.close()
    finally:
        os.unlink(tmp_path)
    return guids


def _build_and_get_guids(deck_info: list, tmpdir: str, suffix: str) -> list:
    data_file = os.path.join(tmpdir, f"deck_info_{suffix}.json")
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(deck_info, f)
    original_cwd = os.getcwd()
    try:
        os.chdir(tmpdir)
        apkg_path = build_one_deck(data_file, TEMPLATE_DIR)
    finally:
        os.chdir(original_cwd)
    assert apkg_path is not None
    return _read_guids_from_apkg(apkg_path)


class TestStableGuids:
    def test_two_runs_of_same_input_produce_identical_guids(self):
        deck_info = _deck_info_basic("My Deck", "What is H2O?", "Water")
        with tempfile.TemporaryDirectory() as tmpdir:
            guids_first = _build_and_get_guids(deck_info, tmpdir, "first")
            guids_second = _build_and_get_guids(deck_info, tmpdir, "second")
        assert guids_first == guids_second

    def test_editing_back_field_keeps_guid_stable(self):
        front = "What is the capital of France?"
        with tempfile.TemporaryDirectory() as tmpdir:
            deck_info_v1 = _deck_info_basic("History", front, "Paris")
            deck_info_v2 = _deck_info_basic("History", front, "Paris — city of lights")
            guids_v1 = _build_and_get_guids(deck_info_v1, tmpdir, "v1")
            guids_v2 = _build_and_get_guids(deck_info_v2, tmpdir, "v2")
        assert guids_v1 == guids_v2

    def test_notion_id_card_guid_derived_from_notion_id_only(self):
        notion_id = "abc123-notion-block-id"
        with tempfile.TemporaryDirectory() as tmpdir:
            deck_info_v1 = _deck_info_with_notion_id("Science", "Original front", "back", notion_id)
            deck_info_v2 = _deck_info_with_notion_id("Science", "Renamed front", "different back", notion_id)
            guids_v1 = _build_and_get_guids(deck_info_v1, tmpdir, "v1")
            guids_v2 = _build_and_get_guids(deck_info_v2, tmpdir, "v2")
        assert guids_v1 == guids_v2

    def test_different_front_fields_produce_different_guids(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            deck_info_a = _deck_info_basic("My Deck", "Front A", "back")
            deck_info_b = _deck_info_basic("My Deck", "Front B", "back")
            guids_a = _build_and_get_guids(deck_info_a, tmpdir, "a")
            guids_b = _build_and_get_guids(deck_info_b, tmpdir, "b")
        assert guids_a != guids_b

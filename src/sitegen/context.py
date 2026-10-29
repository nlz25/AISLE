"""Shared build paths, immutable study data and safe HTML helpers."""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
DIST = ROOT / "dist"
DATA = json.loads((ROOT / "data/results.json").read_text())
MODELS = DATA["models"]


def esc(value):
    return html.escape(str(value), quote=True)


def root(path):
    return path

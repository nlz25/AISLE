"""Build the English static site into dist/ (Python 3.12+, standard library)."""

import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from sitegen.context import DIST, PUBLIC
from sitegen.components.layout import shell
from sitegen.pages.home import home
from sitegen.pages.leaderboard import leaderboard
from sitegen.pages.tasks import tasks


def main():
    sources = sorted((ROOT / "src").rglob("*.css")) + sorted(
        (ROOT / "src").rglob("*.js")
    ) + sorted((PUBLIC / "assets/vendor").glob("*.js")) + [
        PUBLIC / "assets/globe/night-tiles/manifest.json"
    ]
    version = hashlib.sha256(b"".join(p.read_bytes() for p in sources)).hexdigest()[:12]
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)
    css = DIST / "assets/css"
    js = DIST / "assets/js"
    css.mkdir(parents=True)
    js.mkdir(parents=True)
    (css / "site.css").write_text(
        "\n".join(
            (ROOT / "src/styles" / p).read_text() for p in ["base.css", "theme.css"]
        )
    )
    shutil.copy2(ROOT / "src/styles/portal.css", css / "portal.css")
    for source in (ROOT / "src/scripts").glob("*.js"):
        (js / source.name).write_text(
            source.read_text().replace("__ASSET_VERSION__", version)
        )
    description = "AISLE evaluates scientific decisions through experimental feedback. Explore benchmark results, experimental tasks and scoring."
    for filename, title, render in [
        ("index.html", "AI Scientists' Last Exam", home),
        ("leaderboard.html", "Experimental results", leaderboard),
        ("tasks.html", "Tasks", tasks),
    ]:
        (DIST / filename).write_text(
            shell(filename, title, description, render(), version)
        )
    (DIST / "build.json").write_text(
        json.dumps({"asset_version": version, "pages": 3}) + "\n"
    )
    print(f"Built 3 English pages into {DIST}; assets {version}.")


if __name__ == "__main__":
    main()

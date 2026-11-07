"""Build the English static site into dist/ (Python 3.12+, standard library)."""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from sitegen.context import DIST, PUBLIC
from sitegen.components.layout import shell
from sitegen.components.hand import HAND_ATLAS
from sitegen.pages.home import home
from sitegen.pages.leaderboard import leaderboard
from sitegen.pages.tasks import tasks
from sitegen.pages.contribute import contribute, contributor, contribute_admin, workspace_moved

DESCRIPTION = "AISLE evaluates scientific decisions through experimental feedback. Explore benchmark results, experimental tasks and scoring."
WORKSPACE_OUTPUT = ROOT / "services/contribute/.wrangler/workspace"


def workspace_origin():
    value = os.environ.get("CONTRIBUTE_WORKSPACE_ORIGIN", "").strip()
    if value and not re.fullmatch(r"https://aisle-contribute\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.workers\.dev", value):
        raise ValueError("CONTRIBUTE_WORKSPACE_ORIGIN must be the HTTPS workers.dev origin of aisle-contribute")
    return value


def asset_version():
    sources = sorted((ROOT / "src").rglob("*.css")) + sorted(
        (ROOT / "src").rglob("*.js")
    ) + sorted((PUBLIC / "assets/vendor").glob("*.js")) + [
        PUBLIC / "assets/globe/night-tiles/manifest.json",
        PUBLIC / "assets/globe/earth-land-mask.webp",
        PUBLIC / "assets/hand-rig" / HAND_ATLAS,
    ] + sorted(
        (PUBLIC / "assets/globe/base").glob("*.webp")
    )
    return hashlib.sha256(b"".join(p.read_bytes() for p in sources)).hexdigest()[:12]


def write_site_assets(target, version, *, workspace_only=False):
    css = target / "assets/css"
    js = target / "assets/js"
    css.mkdir(parents=True)
    js.mkdir(parents=True)
    (css / "site.css").write_text(
        "\n".join(
            (ROOT / "src/styles" / p).read_text(encoding="utf-8") for p in ["base.css", "theme.css"]
        ),
        encoding="utf-8",
    )
    shutil.copy2(ROOT / "src/styles/contribute.css", css / "contribute.css")
    if workspace_only:
        scripts = [ROOT / "src/scripts" / name for name in ("navigation.js", "contribute.js")]
    else:
        shutil.copy2(ROOT / "src/styles/portal.css", css / "portal.css")
        shutil.copy2(ROOT / "src/styles/network.css", css / "network.css")
        scripts = (ROOT / "src/scripts").glob("*.js")
    for source in scripts:
        (js / source.name).write_text(
            source.read_text(encoding="utf-8-sig").replace("__ASSET_VERSION__", version),
            encoding="utf-8",
        )


def build_worker_assets(origin, version):
    if not origin:
        raise ValueError("Set CONTRIBUTE_WORKSPACE_ORIGIN before building Worker assets")
    if not WORKSPACE_OUTPUT.resolve().is_relative_to(ROOT):
        raise ValueError("Worker assets must be built inside the repository")
    if WORKSPACE_OUTPUT.exists():
        shutil.rmtree(WORKSPACE_OUTPUT)
    write_site_assets(WORKSPACE_OUTPUT, version, workspace_only=True)
    for path in (
        "favicon.png", "apple-touch-icon.png", "assets/brand/aisle-logo-white.svg",
        "assets/fonts/source-serif-4-latin-variable.woff2", "assets/fonts/dancing-script.woff2",
        "assets/fonts/sourceserif4-OFL.txt", "assets/fonts/OFL-DancingScript.txt",
    ):
        target = WORKSPACE_OUTPUT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PUBLIC / path, target)
    site_prefix = "https://aisle.science/"
    for filename, title, content in (
        ("contributor.html", "Contributor workspace", contributor(site_prefix)),
        ("contribute-admin.html", "Contribution review", contribute_admin()),
    ):
        (WORKSPACE_OUTPUT / filename).write_text(
            shell(filename, title, DESCRIPTION, content, version, site_prefix=site_prefix, origin=origin),
            encoding="utf-8",
        )
    print(f"Built two contribution workspace pages into {WORKSPACE_OUTPUT}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker-assets", action="store_true", help="Build the standalone contribution workspace")
    options = parser.parse_args()
    origin = workspace_origin()
    version = asset_version()
    if options.worker_assets:
        build_worker_assets(origin, version)
        return

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)
    write_site_assets(DIST, version)
    workspace_prefix = origin + "/" if origin else ""
    pages = [
        ("index.html", "AI Scientists' Last Exam", home),
        ("leaderboard.html", "Experimental results", leaderboard),
        ("tasks.html", "Tasks", tasks),
        ("contribute.html", "Contribute an experiment", lambda: contribute(workspace_prefix)),
        ("contributor.html", "Contributor workspace", contributor),
        ("contribute-admin.html", "Contribution review", contribute_admin),
    ]
    for filename, title, render in pages:
        if origin and filename in {"contributor.html", "contribute-admin.html"}:
            content = workspace_moved(workspace_prefix + filename)
        else:
            content = render()
        (DIST / filename).write_text(
            shell(filename, title, DESCRIPTION, content, version), encoding="utf-8"
        )
    (DIST / "build.json").write_text(
        json.dumps({"asset_version": version, "pages": len(pages)}) + "\n"
    )
    print(f"Built {len(pages)} English pages into {DIST}; assets {version}.")


if __name__ == "__main__":
    main()

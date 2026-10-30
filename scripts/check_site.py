"""Check static links, interactive bindings and scientific score invariants."""

import json
import gzip
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "dist"
errors = []


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.refs, self.controls, self.profiles = (
            path,
            set(),
            [],
            [],
            [],
        )
        self.html_lang = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, values):
        a = dict(values)
        if tag == "html":
            self.html_lang = a.get("lang")
        if "id" in a:
            if a["id"] in self.ids:
                errors.append(f"{self.path}: duplicate id {a['id']}")
            self.ids.add(a["id"])
        for key in [
            "href",
            "src",
            "poster",
            "data-src",
            "data-texture",
            "data-texture-hd",
            "data-night-tiles",
            "data-detail",
            "data-clouds",
            "data-night",
        ]:
            if a.get(key):
                self.refs.append(a[key])
        for key in ["aria-controls", "data-sort-board", "data-status"]:
            if a.get(key):
                self.controls.append(a[key])
        if a.get("data-profile"):
            self.profiles.append((a["data-profile"], a["data-cohort"]))
        if tag == "img" and "alt" not in a:
            errors.append(f"{self.path}: image missing alt")


pages = {p.resolve(): Page(p) for p in list(ROOT.glob("*.html"))}
tracked = set(
    subprocess.check_output(["git", "ls-files"], cwd=REPO, text=True).splitlines()
)
data = json.loads((REPO / "data/results.json").read_text())
models = {m["id"]: m for m in data["models"]}

for path, page in pages.items():
    if page.html_lang not in {"en"}:
        errors.append(f"{path}: invalid language")
    for ref in page.refs:
        u = urlsplit(ref)
        if u.scheme or u.netloc:
            continue
        target = (path.parent / unquote(u.path)).resolve() if u.path else path
        if target.is_dir():
            target /= "index.html"
        relative = (
            str(target.relative_to(ROOT))
            if target.is_relative_to(ROOT)
            else str(target)
        )
        if not target.exists() and relative not in tracked:
            errors.append(f"{path.name}: missing resource {ref}")
        if (
            u.fragment
            and target in pages
            and unquote(u.fragment) not in pages[target].ids
        ):
            errors.append(f"{path.name}: missing anchor {ref}")
        if ".csv" in ref.lower():
            errors.append(f"{path.name}: CSV link is outside requested scope")
    for control in page.controls:
        if control not in page.ids:
            errors.append(f"{path.name}: missing interactive target {control}")
    for model_id, cohort in page.profiles:
        if model_id not in models or models[model_id].get(cohort) is None:
            errors.append(f"{path.name}: invalid model profile {model_id}/{cohort}")
    if path.name == "leaderboard.html" and len(set(page.profiles)) != 12:
        errors.append(f"{path}: expected 7 shared + 5 full interactive rows")

if len(models) != 7:
    errors.append("Shared cohort must have seven models")
if sum(m["full"] is not None for m in models.values()) != 5:
    errors.append("Full cohort must have five models")
for m in models.values():
    for key in ["optimization", "safety", "robustness", "multimodal", "shared", "full"]:
        if m[key] is not None and not 0 <= m[key] <= 100:
            errors.append(f"Invalid score: {m['id']}/{key}")
    if (m["multimodal"] is None) != (m["full"] is None):
        errors.append(f"Coverage mismatch: {m['id']}")
    for cohort, keys in [
        ("shared", ["optimization", "safety", "robustness"]),
        ("full", ["optimization", "safety", "robustness", "multimodal"]),
    ]:
        if m[cohort] is None:
            continue
        expected = sum(m[k] for k in keys) / len(keys)
        if abs(m[cohort] - expected) > 0.011:
            errors.append(f"Aggregate/rounding mismatch: {m['id']}/{cohort}")

network = json.loads((REPO / "data/network.json").read_text())
institutions = {item["id"]: item for item in network["institutions"]}
countries = {country["id"]: country for country in network["countries"]}
if len(institutions) != len(network["institutions"]):
    errors.append("Duplicate network institution id")
if len(countries) != len(network["countries"]):
    errors.append("Duplicate network country id")
members = []
for country in countries.values():
    if not (-60 <= country["lat"] <= 85 and -180 <= country["lon"] <= 180):
        errors.append(f"Invalid map coordinates: {country['id']}")
    for institution_id in country["institutions"]:
        members.append(institution_id)
        if (
            institution_id not in institutions
            or institutions[institution_id]["country"] != country["id"]
        ):
            errors.append(
                f"Network membership mismatch: {institution_id}/{country['id']}"
            )
if sorted(members) != sorted(institutions):
    errors.append("Each institution must occur in exactly one country group")
for item in institutions.values():
    assets = ["institutions/" + item["logo"]]
    if item.get("video"):
        assets += [
            "experiments/" + item["video"] + suffix for suffix in [".mp4", ".webp"]
        ]
        for field in ["topic", "description", "duration"]:
            if not item.get(field):
                errors.append(f"Missing film metadata: {item['id']}/{field}")
    for asset in assets:
        if not (ROOT / "assets" / asset).is_file():
            errors.append(f"Missing network asset: {asset}")

for path in [
    *ROOT.glob("*.html"),
    *(ROOT / "assets/js").glob("*.js"),
    REPO / "data/network.json",
]:
    source = path.read_text()
    if re.search(r"(app\.notion\.com|/Users/|gh[op]_[A-Za-z0-9]{20})", source):
        errors.append(f"{path}: internal source detail in public page")

# Validate the new deployment boundary and references in compiled CSS / modules.
if len(pages) != 3 or (ROOT / "zh").exists():
    errors.append("Expected exactly three English pages")
for path in [*(ROOT / "assets/css").glob("*.css"), *(ROOT / "assets/js").glob("*.js")]:
    content = path.read_text()
    refs = (
        re.findall(r"url\(([^)]+)\)", content)
        if path.suffix == ".css"
        else re.findall(r"(?:import\s*\(?\s*)['\"]([^'\"]+)['\"]", content)
    )
    for ref in refs:
        ref = ref.strip("'\" ")
        if ref.startswith("data:") or urlsplit(ref).scheme:
            continue
        if not (path.parent / urlsplit(ref).path).is_file():
            errors.append(f"{path}: missing asset {ref}")
for name in ["src", "scripts", "data", "design", ".github"]:
    if (ROOT / name).exists():
        errors.append(f"Source directory leaked into deployment: {name}")
for path in ROOT.glob("*.html"):
    if 'hreflang="zh' in path.read_text() or re.search(
        r"[\u4e00-\u9fff]", path.read_text()
    ):
        errors.append(f"Chinese content remains in {path.name}")
# Keep the entrance art and globe textures within a documented transfer budget.
portal_bytes = sum(p.stat().st_size for p in (ROOT / "assets/portal").glob("*.webp"))
if portal_bytes > 1_000_000:
    errors.append(f"Portal media exceeds 1 MB: {portal_bytes}")
# Globe.gl is optional and loaded after the entrance artwork. Keep its local
# dependency bundle bounded; ordinary Python builds never need npm or a CDN.
vendor = ROOT / "assets/vendor/globe.gl.js"
if not vendor.is_file() or not (vendor.parent / "globe.LICENSES.txt").is_file():
    errors.append("Missing local Globe.gl bundle or dependency licenses")
elif len(gzip.compress(vendor.read_bytes(), compresslevel=6)) > 600_000:
    errors.append("Globe.gl bundle exceeds 600 KB gzip")
hd_bytes = sum(p.stat().st_size for p in (ROOT / "assets/globe").glob("*.webp"))
if hd_bytes > 2_000_000:
    errors.append(f"Optional desktop Earth media exceeds 2 MB: {hd_bytes}")
tile_root = ROOT / "assets/globe/night-tiles"
try:
    manifest = json.loads((tile_root / "manifest.json").read_text())
    if manifest["tileSize"] != 512 or manifest["gutter"] != 8 or not re.fullmatch(r"[a-f0-9]{12}", manifest["version"]):
        errors.append("Invalid night tile pyramid configuration")
    base_bytes = (tile_root / "base.webp").stat().st_size
    if base_bytes != manifest["base"]["bytes"] or base_bytes > 40_000:
        errors.append("Global night base exceeds its 40 KB budget or manifest size")
    if [level["level"] for level in manifest["levels"]] != [1, 2, 3]:
        errors.append("Night tile pyramid must contain 2K, 4K and 8K levels")
    for level in manifest["levels"]:
        columns, rows = 2 ** (level["level"] + 1), 2 ** level["level"]
        paths = [tile_root / manifest["version"] / str(level["level"]) / str(x) / f"{y}.webp" for x in range(columns) for y in range(rows)]
        if (columns, rows) != (level["columns"], level["rows"]) or sum(p.stat().st_size for p in paths) != level["bytes"]:
            errors.append(f"Incomplete night tile level {level['level']}")
    if sum(level["bytes"] for level in manifest["levels"]) > 4_000_000:
        errors.append("Complete night tile pyramid exceeds 4 MB")
except (OSError, ValueError, KeyError, TypeError):
    errors.append("Missing or corrupt night tile pyramid")
if errors:
    raise SystemExit("\n".join(errors))
print(
    f"PASS: {len(pages)} pages; links, bindings, cohort scores, {len(countries)} map locations and {len(institutions)} institution/media records."
)

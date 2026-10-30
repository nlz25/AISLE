"""Regenerate delivery assets from preserved originals. Optional authoring tool.

Install requirements-dev.txt first; ordinary builds need only Python 3.12.
This converts formats/resolutions without generating or replacing the artwork.
"""

from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/originals/assets"
TARGET = ROOT / "public/assets"


def main():
    before = after = 0
    for source in sorted(SOURCE.rglob("*")):
        if source.suffix not in {".png", ".jpg", ".ttf"}:
            continue
        target = TARGET / source.relative_to(SOURCE)
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix == ".ttf":
            target = target.with_suffix(".woff2")
            font = TTFont(source)
            font.flavor = "woff2"
            font.save(target)
        else:
            target = target.with_suffix(".webp")
            image = Image.open(source)
            if source.parent.name in {"brand", "logos"}:
                image.thumbnail((128, 128))
            elif source.parent.name == "institutions":
                image.thumbnail((384, 192))
            elif source.name == "earth-clouds.jpg":
                image = image.convert("L")
                image.thumbnail((1024, 512))
            quality = 95 if source.name == "robot-hand.png" else 86
            image.save(target, "WEBP", quality=quality, method=6)
        before += source.stat().st_size
        after += target.stat().st_size
    image = Image.open(ROOT / "design/originals/favicon.png")
    icon = image.copy()
    icon.thumbnail((64, 64))
    icon.save(ROOT / "public/favicon.png", optimize=True)
    image.thumbnail((180, 180))
    image.save(ROOT / "public/apple-touch-icon.png", optimize=True)
    print(f"Asset bytes: {before:,} → {after:,}")


if __name__ == "__main__":
    main()

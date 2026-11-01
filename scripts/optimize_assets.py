"""Regenerate delivery assets from preserved originals. Optional authoring tool.

Install requirements-dev.txt first; ordinary builds need only Python 3.12.
This converts formats/resolutions without generating or replacing the artwork.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/originals/assets"
TARGET = ROOT / "public/assets"


def build_land_mask(source, target):
    """Keep coast coverage independent of colour imagery and HD loading."""
    with Image.open(source) as detail:
        # The packed source's green channel is land=white / ocean=black.
        # Threshold JPEG noise before reducing it to antialiased coast coverage.
        land = detail.getchannel("G").point(lambda value: 255 if value >= 128 else 0)
        land = land.resize((1024, 512), Image.Resampling.LANCZOS)
        # Sixteen coverage levels retain a soft coast without storing faint
        # resampling noise across the otherwise uniform land and ocean.
        land = land.point(lambda value: round(value / 17) * 17)
        land.save(target, "WEBP", lossless=True, method=6)


def build_earth_base_maps(source_dir, target_dir):
    """Use the HD imagery's own colour, terrain and clouds from first paint."""
    target_dir.mkdir(parents=True, exist_ok=True)
    total = 0
    for source_name, target_name, size in [
        ("earth-surface-hd.jpg", "earth-surface.webp", (2048, 1024)),
        ("earth-detail-hd.jpg", "earth-detail.webp", (1024, 512)),
    ]:
        with Image.open(source_dir / source_name) as original:
            image = original.convert("RGB").resize(size, Image.Resampling.LANCZOS)
            target = target_dir / target_name
            image.save(target, "WEBP", quality=86, method=6)
            total += target.stat().st_size
    return total


def main():
    before = after = 0
    for source in sorted(SOURCE.rglob("*")):
        if source.suffix not in {".png", ".jpg", ".ttf"}:
            continue
        target = TARGET / source.relative_to(SOURCE)
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix == ".ttf":
            from fontTools.ttLib import TTFont

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
            elif source.parent.name == "globe":
                image.thumbnail((4096, 2048))
            quality = 95 if source.name == "robot-hand.png" else 90 if source.name == "earth-night-hd.jpg" else 86
            image.save(target, "WEBP", quality=quality, method=6)
            if source.name == "earth-detail-hd.jpg":
                mask_target = target.with_name("earth-land-mask.webp")
                build_land_mask(source, mask_target)
                after += mask_target.stat().st_size
        before += source.stat().st_size
        after += target.stat().st_size
    image = Image.open(ROOT / "design/originals/favicon.png")
    icon = image.copy()
    icon.thumbnail((64, 64))
    icon.save(ROOT / "public/favicon.png", optimize=True)
    image.thumbnail((180, 180))
    image.save(ROOT / "public/apple-touch-icon.png", optimize=True)
    after += build_earth_base_maps(SOURCE / "globe", TARGET / "globe/base")
    print(f"Asset bytes: {before:,} → {after:,}")


if __name__ == "__main__":
    main()

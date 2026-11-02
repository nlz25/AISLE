"""Regenerate delivery assets from preserved originals. Optional authoring tool.

Install requirements-dev.txt first; ordinary builds need only Python 3.12.
This converts formats/resolutions without generating or replacing the artwork.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/originals/assets"
TARGET = ROOT / "public/assets"
GENERATED = ROOT / "design/generated"

# Only current delivery assets and the map's authoring input are regenerated.
# Archived originals must not silently become published files again.
IMAGE_ASSETS = {
    "portal/robot-hand.png": (None, 95),
    "globe/earth-surface-hd.jpg": ((4096, 2048), 86),
    "globe/earth-detail-hd.jpg": ((4096, 2048), 86),
    "globe/earth-night-hd.jpg": ((4096, 2048), 90),
    **{
        f"logos/{name}.png": ((128, 128), 86)
        for name in ["Claude", "DeepSeek", "GLM", "GPT", "Gemini", "Kimi", "Qwen"]
    },
    **{
        f"institutions/{name}.png": ((384, 192), 86)
        for name in ["BEARS", "EPFL", "GreenDynamics", "NTU", "SZU", "UCBerkeley", "UNSW", "UofT"]
    },
    **{
        f"experiments/{name}.jpg": (None, 86)
        for name in ["bears", "suzhou", "unsw"]
    },
}
FONT_ASSETS = [f"dm-sans-{weight}.ttf" for weight in [400, 500, 600, 700]]


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
    for relative, (size, quality) in IMAGE_ASSETS.items():
        source = SOURCE / relative
        # The research map uses this intermediate; the browser uses night tiles.
        output = GENERATED if relative == "globe/earth-night-hd.jpg" else TARGET
        target = (output / relative).with_suffix(".webp")
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            if size:
                image.thumbnail(size)
            image.save(target, "WEBP", quality=quality, method=6)
        before += source.stat().st_size
        after += target.stat().st_size

    from fontTools.ttLib import TTFont

    for name in FONT_ASSETS:
        source = SOURCE / "fonts" / name
        target = (TARGET / "fonts" / name).with_suffix(".woff2")
        target.parent.mkdir(parents=True, exist_ok=True)
        with TTFont(source) as font:
            font.flavor = "woff2"
            font.save(target)
        before += source.stat().st_size
        after += target.stat().st_size

    mask_target = TARGET / "globe/earth-land-mask.webp"
    build_land_mask(SOURCE / "globe/earth-detail-hd.jpg", mask_target)
    after += mask_target.stat().st_size
    image = Image.open(ROOT / "design/originals/favicon.png")
    icon = image.copy()
    icon.thumbnail((64, 64))
    icon.save(ROOT / "public/favicon.png", optimize=True)
    image.thumbnail((180, 180))
    image.save(ROOT / "public/apple-touch-icon.png", optimize=True)
    after += build_earth_base_maps(SOURCE / "globe", TARGET / "globe/base")
    print(f"Regenerated asset bytes (delivery and authoring): {before:,} → {after:,}")


if __name__ == "__main__":
    main()

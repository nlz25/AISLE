"""Build a small global night map and a local, immutable WebP tile pyramid.

Optional authoring step; ordinary site builds copy these generated assets.
Tiles have real neighbouring-pixel gutters for seamless filtered sampling.
"""

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/originals/globe/earth-night-8k.jpg"
TARGET = ROOT / "public/assets/globe/night-tiles"
TILE = 512
GUTTER = 8
QUALITY = 92


def padded_tile(image, x, y):
    left, top = x * TILE - GUTTER, y * TILE - GUTTER
    width, height = image.size
    tile = Image.new("RGB", (TILE + 2 * GUTTER,) * 2)
    # Wrap longitude at the antimeridian, and extend the polar edge rows.
    for shift in (-width, 0, width):
        x0, x1 = max(left, shift), min(left + tile.width, shift + width)
        y0, y1 = max(top, 0), min(top + tile.height, height)
        if x0 >= x1 or y0 >= y1:
            continue
        part = image.crop((x0 - shift, y0, x1 - shift, y1))
        tile.paste(part, (x0 - left, y0 - top))
    if top < 0:
        edge = tile.crop((0, -top, tile.width, -top + 1))
        tile.paste(edge.resize((tile.width, -top)), (0, 0))
    if top + tile.height > height:
        row = height - top - 1
        edge = tile.crop((0, row, tile.width, row + 1))
        tile.paste(edge.resize((tile.width, tile.height - row - 1)), (0, row + 1))
    return tile


def main():
    original = Image.open(SOURCE).convert("RGB")
    if original.size != (8192, 4096):
        raise ValueError("Expected the original 8192 x 4096 night map")
    recipe = f"tile-v1/{TILE}/{GUTTER}/{QUALITY}".encode()
    version = hashlib.sha256(SOURCE.read_bytes() + recipe).hexdigest()[:12]
    if TARGET.exists():
        shutil.rmtree(TARGET)
    TARGET.mkdir(parents=True)
    base = original.resize((1024, 512), Image.Resampling.LANCZOS)
    base.save(TARGET / "base.webp", "WEBP", quality=88, method=6)
    levels = []
    for level in range(1, 4):
        width = 1024 * 2**level
        image = original if width == original.width else original.resize((width, width // 2), Image.Resampling.LANCZOS)
        columns, rows = image.width // TILE, image.height // TILE
        byte_count = 0
        for x in range(columns):
            folder = TARGET / version / str(level) / str(x)
            folder.mkdir(parents=True)
            for y in range(rows):
                path = folder / f"{y}.webp"
                padded_tile(image, x, y).save(path, "WEBP", quality=QUALITY, method=6)
                byte_count += path.stat().st_size
        levels.append({"level": level, "columns": columns, "rows": rows, "bytes": byte_count})
        print(f"Night level {level}: {columns * rows} tiles / {byte_count:,} bytes", flush=True)
    manifest = {
        "version": version, "tileSize": TILE, "gutter": GUTTER,
        "base": {"width": 1024, "height": 512, "bytes": (TARGET / "base.webp").stat().st_size},
        "levels": levels,
    }
    (TARGET / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    print(f"Base night: {manifest['base']['bytes']:,} bytes; source stays outside deployment.")


if __name__ == "__main__":
    main()

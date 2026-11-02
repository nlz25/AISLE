"""Render a matte relief map from the existing Earth imagery and land geometry.

Optional authoring tool (Pillow); ordinary site builds use the checked-in SVG.
Embedded WebP keeps each SVG self-contained when rendered through an img.
"""

import base64
import io
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "design/originals/map/land.geojson").read_text())
paths = []
for feature in data["features"]:
    geom = feature["geometry"]
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        if max(p[1] for p in poly[0]) < -60:
            continue
        path = ""
        for ring in poly:
            points = [
                ((lon + 180) / 360 * 1200, (85 - lat) / 145 * 560)
                for lon, lat, *_ in ring
            ]
            path += "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in points) + "Z"
        paths.append(path)
shape = "".join(f'<path d="{p}"/>' for p in paths)

# Match the markers' 85°N–60°S equirectangular projection exactly. The packed
# detail image stores elevation in red; its clouds never enter this rendering.
size = (2400, 1120)
surface = Image.open(ROOT / "public/assets/globe/earth-surface-hd.webp").convert("L")
elevation = Image.open(ROOT / "public/assets/globe/earth-detail-hd.webp").getchannel("R")

def project(image):
    width, height = image.size
    return image.crop((0, round(height * 5 / 180), width, round(height * 150 / 180))).resize(size, Image.Resampling.LANCZOS)

surface, elevation = project(surface), project(elevation)
# Light from the upper right reveals actual mountain ranges. Subtle surface
# variation supplies small details, without a repeating decorative pattern.
slope = ImageChops.subtract(
    ImageChops.offset(elevation, -1, -1),
    ImageChops.offset(elevation, 1, 1),
    scale=.45,
    offset=128,
)
detail = ImageChops.subtract(surface, surface.filter(ImageFilter.GaussianBlur(2)), offset=128)
shade = ImageChops.add(slope, detail, scale=1.45, offset=-48)
terrain = ImageOps.colorize(shade, black="#0a1118", mid="#293640", white="#77868e", midpoint=128)

def embedded_webp(image):
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=86, method=6)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


encoded = embedded_webp(terrain)
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid meet"><defs>
<linearGradient id="light" x1="0" y1="1" x2=".8" y2="0"><stop stop-color="#060b10" stop-opacity=".5"/><stop offset=".65" stop-color="#0b1117" stop-opacity=".05"/><stop offset="1" stop-color="#9cabb8" stop-opacity=".12"/></linearGradient>
<clipPath id="land-clip">{shape}</clipPath>
</defs><g clip-path="url(#land-clip)">
<image width="1200" height="560" preserveAspectRatio="xMidYMid meet" href="data:image/webp;base64,{encoded}"/>
<rect width="1200" height="560" fill="url(#light)"/>
</g><g fill="none" stroke="#8c9ba6" stroke-opacity=".28" stroke-width=".55" stroke-linejoin="round">{shape}</g>
</svg>"""
(ROOT / "public/assets/map/world.svg").write_text(svg)
print("Built world map:", len(svg), "bytes")

# City lights are a separate transparent layer, so the terrain's dark colour
# treatment cannot dim them. Retain the source geography and remove its faint
# background before adding a tight warm bloom around the actual light pixels.
night = project(Image.open(ROOT / "design/generated/globe/earth-night-hd.webp").convert("L"))
# Suppress faint scattered lights while retaining the main city clusters.
levels = night.point(lambda value: min(255, round(306 * (max(0, value - 26) / 229) ** .72)))

def light_layer(colour, alpha):
    layer = Image.new("RGBA", size, colour)
    layer.putalpha(alpha)
    return layer

outer = light_layer("#ffb862", levels.filter(ImageFilter.GaussianBlur(9)).point(lambda value: round(value * .6)))
near = light_layer("#ffcc80", levels.filter(ImageFilter.GaussianBlur(1.6)).point(lambda value: round(value * .75)))
cores = light_layer("#fff1ce", levels)
illumination = Image.alpha_composite(Image.alpha_composite(outer, near), cores)
# Limit imperceptible alpha variation to keep the transparent asset compact.
illumination.putalpha(illumination.getchannel("A").point(lambda value: min(255, round(value / 4) * 4)))
light_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid meet">
<defs><clipPath id="land-clip">{shape}</clipPath></defs>
<image width="1200" height="560" preserveAspectRatio="xMidYMid meet" clip-path="url(#land-clip)" href="data:image/webp;base64,{embedded_webp(illumination)}"/>
</svg>'''
(ROOT / "public/assets/map/world-lights.svg").write_text(light_svg)
print("Built city-light overlay:", len(light_svg), "bytes")

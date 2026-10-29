"""Render a border-free world silhouette from Natural Earth's public-domain land data."""

import json
from pathlib import Path

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
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 560" preserveAspectRatio="none"><defs>
<linearGradient id="land" x2="0.2" y2="1"><stop stop-color="#35455f"/><stop offset=".55" stop-color="#263750"/><stop offset="1" stop-color="#182237"/></linearGradient>
<pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".8" fill="#8196b4" opacity=".65"/></pattern>
<clipPath id="land-clip">{shape}</clipPath>
</defs><g fill="url(#land)" stroke="#8ca7cc" stroke-opacity=".23" stroke-width=".5">{shape}</g>
<rect width="1200" height="560" fill="url(#dots)" clip-path="url(#land-clip)"/>
</svg>"""
(ROOT / "public/assets/map/world.svg").write_text(svg)
print("Built world map:", len(svg), "bytes")

"""Server-rendered, keyboard-accessible research map and experiment films."""

import html, json, hashlib
from pathlib import Path
from ..context import ROOT, PUBLIC


def network_hero():
    data = json.loads((ROOT / "data/network.json").read_text())

    def asset(path):
        return ("") + "assets/" + path

    def esc(s):
        return html.escape(str(s), quote=True)

    pins = []
    countries = []
    for c in data["countries"]:
        label = c["en"]
        n = len(c["institutions"])
        x = (c["lon"] + 180) / 360 * 100
        y = (85 - c["lat"]) / 145 * 100
        active = c["id"] == "cn"
        count_label = "institution" if n == 1 else "institutions"
        pins.append(
            f'<button class="map-pin pin-{c["id"]}" style="--x:{x:.3f}%;--y:{y:.3f}%" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector" aria-label="{esc(label)} · {n} {count_label}"><span class="pin-core"></span><span class="pin-label">{esc(label)}</span></button>'
        )
        countries.append(
            f'<button class="country-option" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector">{esc(label)}<span>{n:02}</span></button>'
        )
    first = data["institutions"][0]
    # Paths share coordinates with the country pins; curves are visual network links.
    points = {
        c["id"]: ((c["lon"] + 180) / 360 * 1200, (85 - c["lat"]) / 145 * 560)
        for c in data["countries"]
    }
    arcs = []
    for index, (start, end, lift) in enumerate(
        [
            ("us", "ca", -65),
            ("ca", "ch", -95),
            ("ch", "cn", -110),
            ("cn", "sg", 20),
            ("sg", "au", -75),
        ]
    ):
        x1, y1 = points[start]
        x2, y2 = points[end]
        d = f"M{x1:.2f} {y1:.2f} Q{(x1 + x2) / 2:.2f} {min(y1, y2) + lift:.2f} {x2:.2f} {y2:.2f}"
        arcs.append(
            f'<path class="network-route" id="network-route-{index}" data-route-from="{start}" data-route-to="{end}" d="{d}"/>'
        )
    routes = "".join(arcs)
    map_version = hashlib.sha256(
        (PUBLIC / "assets/map/world.svg").read_bytes()
    ).hexdigest()[:10]
    payload = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<section class="network-hero" id="network" aria-labelledby="network-title">
      <div class="network-aurora" aria-hidden="true"></div><div class="network-grain" aria-hidden="true"></div>
      <div class="network-view-head wrap"><div><h2 id="network-title" tabindex="-1">Global research network</h2></div><a class="network-return" href="#entrance">← Back to entrance</a></div>
      <div class="network-shell wrap">
        <div class="network-stage">
          <div class="world-map" aria-hidden="true"><div class="map-glow"></div><img loading="lazy" decoding="async" src="{asset("map/world.svg")}?v={map_version}" alt="" width="1200" height="560"><svg class="network-arcs" viewBox="0 0 1200 560" preserveAspectRatio="none">{routes}<g class="network-flow-particles"></g></svg><div class="map-equator"></div></div>
          <div class="map-markers">{"".join(pins)}</div>
          <aside id="network-inspector" class="network-inspector" aria-label="Selected institution">
            <div class="inspector-topline"><span id="network-location">Suzhou, China</span></div>
            <div class="institution-options" role="group" aria-label="Choose an institution"></div>
            <div class="inspector-identity"><span class="inspector-logo"><img loading="lazy" decoding="async" id="network-logo" src="{asset("institutions/" + first["logo"])}" alt="{esc(first["name"])}" width="54" height="40"></span><div><h2 id="network-institution">{esc(first["short"])}</h2><p id="network-full-name" hidden></p></div></div>
            <div id="network-film"><button type="button" class="film-preview" aria-label="Watch Suzhou National Laboratory experiment film"><img loading="lazy" decoding="async" id="network-poster" src="{asset("experiments/suzhou.webp")}" alt="Colour-matching experiment at Suzhou National Laboratory" width="960" height="516"><span class="film-play" aria-hidden="true">▶</span><span class="film-duration">00:19</span></button><p id="network-topic">{first["topic"]}</p></div>
            <p class="network-selection sr-only" role="status" aria-live="polite"></p>
          </aside>
        </div>
        <div class="network-country-nav" role="group" aria-label="Browse research locations">{"".join(countries)}</div>
      </div>
      <dialog class="experiment-dialog" aria-labelledby="experiment-title"><div class="experiment-dialog-head"><div><p id="experiment-location"></p><h2 id="experiment-title"></h2></div><button type="button" class="experiment-close" aria-label="Close video">×</button></div><video id="experiment-video" controls playsinline preload="none"></video><p id="experiment-description"></p><p id="experiment-error" role="status" hidden>The video could not load. Please try again.</p></dialog>
      <script id="network-data" type="application/json">{payload}</script>
      <noscript><p class="wrap network-noscript">Enable JavaScript to explore institutions and play experiment films.</p></noscript>
    </section>'''

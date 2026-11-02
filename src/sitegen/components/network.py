"""Server-rendered, keyboard-accessible research map and experiment films."""

import hashlib
import json

from ..context import ROOT, PUBLIC, esc


def network_hero():
    data = json.loads((ROOT / "data/network.json").read_text())

    first = next(
        (item for item in data["institutions"] if item["country"] == "asia" and item.get("video")),
        data["institutions"][0],
    )
    initial_country = next(c for c in data["countries"] if c["id"] == first["country"])
    initial_x = (initial_country["lon"] + 180) / 360 * 100
    initial_y = (85 - initial_country["lat"]) / 145 * 100
    pins = []
    countries = []
    for c in data["countries"]:
        label = c["en"]
        n = sum(bool(item.get("video")) for item in data["institutions"] if item["id"] in c["institutions"])
        x = (c["lon"] + 180) / 360 * 100
        y = (85 - c["lat"]) / 145 * 100
        active = c["id"] == first["country"]
        count_label = "research film" if n == 1 else "research films"
        availability = f"{n} {count_label}" if n else "Video coming soon"
        badge = f'<span class="country-count">{n:02}</span>' if n else ""
        pins.append(
            f'<button class="map-pin pin-{c["id"]}" style="--x:{x:.3f}%;--y:{y:.3f}%" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector" aria-label="{esc(label)} · {availability}"><span class="pin-core"></span><span class="pin-label">{esc(label)}</span></button>'
        )
        countries.append(
            f'<button class="country-option" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector"><span class="country-name">{esc(label)}</span>{badge}</button>'
        )
    map_version = hashlib.sha256(
        b"".join((PUBLIC / "assets/map" / name).read_bytes() for name in ["world.svg", "world-lights.svg"])
    ).hexdigest()[:10]
    payload = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    return f'''<section class="network-hero" id="network" aria-labelledby="network-title">
      <div class="network-atmosphere" aria-hidden="true"></div>
      <div class="network-shell wrap">
        <div class="section-head network-heading"><h2 id="network-title" tabindex="-1">Global Research Network</h2></div>
        <div class="network-country-nav" role="group" aria-label="Browse research locations">{"".join(countries)}</div>
        <div class="network-stage">
          <div class="network-map-plane" data-active-country="{first['country']}" style="--selection-x:{initial_x:.3f}%;--selection-y:{initial_y:.3f}%"><div class="world-map" aria-hidden="true"><img class="map-terrain" loading="lazy" decoding="async" src="assets/map/world.svg?v={map_version}" alt="" width="1200" height="560"><img class="map-illumination" loading="lazy" decoding="async" src="assets/map/world-lights.svg?v={map_version}" alt="" width="1200" height="560"><svg class="network-arcs" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid meet"><g class="network-flow-particles"></g></svg></div><svg class="network-card-link" aria-hidden="true"><path/></svg><div class="map-markers">{"".join(pins)}</div>
          <aside id="network-inspector" class="network-inspector" aria-label="Research films">
            <div class="research-options" role="group" aria-label="Choose a research direction" hidden></div>
            <div id="network-pending" class="film-pending" hidden><h3 id="network-pending-location"></h3><p>Video coming soon</p></div>
            <div id="network-film"><button type="button" class="film-preview" aria-label="Watch experiment film: {esc(first['topic'])}"><img loading="lazy" decoding="async" id="network-poster" src="assets/experiments/{first['video']}.webp" alt="{esc(first['topic'])}" width="960" height="516"><span class="film-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg></span><span class="film-duration">{esc(first['duration'])}</span></button><div class="film-caption"><div><h3 id="network-topic">{esc(first['topic'])}</h3><p id="network-description">{esc(first['description'])}</p></div><button type="button" class="film-open" aria-label="Watch experiment film: {esc(first['topic'])}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button></div></div>
          </aside><p class="network-selection sr-only" role="status" aria-live="polite"></p></div>
        </div>
      </div>
      <dialog class="experiment-dialog" aria-labelledby="experiment-title"><div class="experiment-dialog-head"><h2 id="experiment-title"></h2><button type="button" class="experiment-close" aria-label="Close video">×</button></div><video id="experiment-video" controls playsinline preload="none"></video><p id="experiment-description"></p><p id="experiment-error" role="status" hidden>The video could not load. Please try again.</p></dialog>
      <script id="network-data" type="application/json">{payload}</script>
      <noscript><p class="wrap network-noscript">Enable JavaScript to explore research directions and play experiment films.</p></noscript>
    </section>'''

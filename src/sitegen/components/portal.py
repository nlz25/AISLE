"""Progressively enhanced entrance; all research content stays server-rendered."""

import json
import os

from ..context import ROOT, esc
from .quotation import experiment_quotation
from .hand import articulated_hand


def entrance():
    endpoint = os.environ.get(
        "AISLE_COUNTER_ENDPOINT",
        json.loads((ROOT / "data/counter.json").read_text())["endpoint"],
    )
    return f"""<section class="portal" id="entrance" aria-labelledby="portal-title">
      <div class="portal-atmosphere" aria-hidden="true"></div>
      <div class="portal-stars" aria-hidden="true"></div>
      <div class="portal-grain network-grain" aria-hidden="true"></div>
      <div class="portal-heading wrap">
        <h1 id="portal-title">AI Scientists' <span class="portal-title-ending">Last Exam</span></h1>
        {experiment_quotation()}
      </div>
        <div class="portal-globe" data-texture="assets/globe/base/earth-surface.webp" data-texture-hd="assets/globe/earth-surface-hd.webp" data-detail-base="assets/globe/base/earth-detail.webp" data-land-mask="assets/globe/earth-land-mask.webp" data-night="assets/globe/night-tiles/base.webp" data-night-tiles="assets/globe/night-tiles/manifest.json" data-detail="assets/globe/earth-detail-hd.webp">
          <div class="portal-globe-fallback" aria-hidden="true"></div>
          <noscript><style>.portal-hand-art{{animation:none}}</style><picture class="portal-globe-static" aria-hidden="true"><source media="(max-width:500px)" srcset="assets/globe/earth-poster-mobile.webp"><img src="assets/globe/earth-poster.webp" alt="" width="1440" height="821"></picture></noscript>
          <div class="portal-globe-view"></div>
        </div>
      <div class="portal-scene">
        <div class="portal-limb-glow" aria-hidden="true"></div>
        <div class="portal-globe-sun" aria-hidden="true"></div>
        <div class="portal-lens-flare" aria-hidden="true"><span class="portal-lens-ghosts"></span></div>
        <div class="portal-arm" aria-hidden="true"><div class="portal-hand">{articulated_hand()}</div></div>
        <a class="portal-enter" href="#network" aria-label="Touch the Earth to enter the global research network">
          <span class="portal-enter-bloom" aria-hidden="true"></span>
          <span class="portal-enter-label" aria-hidden="true">Touch to enter</span>
          <span class="portal-tagline">Nature as the Verifier<span class="portal-count" data-endpoint="{esc(endpoint)}" role="status" aria-label="Loading total portal clicks" title="Loading total portal clicks"{" hidden" if not endpoint else ""}>···</span></span>
        </a>
      </div>
    </section>"""

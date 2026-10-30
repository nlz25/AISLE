"""Progressively enhanced entrance; all research content stays server-rendered."""

from .quotation import experiment_quotation


def entrance():
    return f"""<section class="portal" id="entrance" aria-labelledby="portal-title">
      <div class="portal-atmosphere" aria-hidden="true"></div>
      <div class="portal-stars" aria-hidden="true"></div>
      <div class="portal-grain network-grain" aria-hidden="true"></div>
      <div class="portal-heading wrap">
        <h1 id="portal-title">AI Scientists<span class="portal-apostrophe">'</span> <span class="portal-title-ending">Last Exam</span></h1>
        {experiment_quotation()}
      </div>
        <div class="portal-globe" data-texture="assets/portal/earth-surface.webp" data-texture-hd="assets/globe/earth-surface-hd.webp" data-clouds="assets/portal/earth-clouds.webp" data-night="assets/globe/night-tiles/base.webp" data-night-tiles="assets/globe/night-tiles/manifest.json" data-detail="assets/globe/earth-detail-hd.webp">
          <div class="portal-globe-fallback" aria-hidden="true"></div>
          <div class="portal-globe-view"></div>
          <div class="portal-globe-sun" aria-hidden="true"></div>
        </div>
      <div class="portal-scene">
        <div class="portal-arm" aria-hidden="true"><img src="assets/portal/robot-hand.webp" width="1672" height="941" alt="" fetchpriority="high" decoding="async"></div>
        <div class="portal-contact" aria-hidden="true"></div>
        <div class="portal-touch" aria-hidden="true"></div>
        <a class="portal-enter" href="#network" aria-label="Explore the global research network">
          <span class="portal-enter-halo" aria-hidden="true"></span>
          <span class="portal-enter-ring" aria-hidden="true"></span>
          <span class="portal-enter-ring portal-enter-ring-inner" aria-hidden="true"></span>
          <span class="portal-enter-core" aria-hidden="true"><span class="portal-nucleus"></span></span>
          <span class="portal-tagline">Nature as the Verifier</span>
        </a>
      </div>
    </section>"""

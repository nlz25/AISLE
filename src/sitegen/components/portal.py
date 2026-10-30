"""Progressively enhanced entrance; all research content stays server-rendered."""

from .quotation import experiment_quotation


def entrance():
    return f"""<section class="portal" id="entrance" aria-labelledby="portal-title">
      <div class="portal-atmosphere" aria-hidden="true"></div>
      <div class="portal-stars" aria-hidden="true"></div>
      <div class="portal-grain network-grain" aria-hidden="true"></div>
      <div class="portal-heading wrap">
        <p class="portal-tagline">Nature as the Verifier</p>
        <h1 id="portal-title">AI Scientists<span class="portal-apostrophe">'</span> <span class="portal-title-ending">Last Exam</span></h1>
        {experiment_quotation()}
      </div>
        <div class="portal-globe" data-texture="assets/portal/earth-surface.webp" data-clouds="assets/portal/earth-clouds.webp" data-night="assets/portal/earth-night.webp">
          <div class="portal-globe-fallback" aria-hidden="true"></div>
          <canvas hidden class="portal-globe-canvas" width="640" height="640" tabindex="0" role="img" aria-label="Interactive Earth. Drag or use arrow keys to rotate. Press Space to pause or resume rotation."></canvas>
        </div>
      <div class="portal-scene">
        <div class="portal-arm" aria-hidden="true"><img src="assets/portal/robot-earth.webp" width="1672" height="941" alt="" fetchpriority="high" decoding="async"></div>
        <div class="portal-contact" aria-hidden="true"></div>
        <div class="portal-touch" aria-hidden="true"></div>
        <a class="portal-enter" href="#network" aria-label="Explore the global research network">
          <span class="portal-enter-halo" aria-hidden="true"></span>
          <span class="portal-enter-ring" aria-hidden="true"></span>
          <span class="portal-enter-ring portal-enter-ring-inner" aria-hidden="true"></span>
          <span class="portal-enter-core" aria-hidden="true"><span class="portal-nucleus"></span></span>
        </a>
      </div>
    </section>"""

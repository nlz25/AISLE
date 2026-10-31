# AISLE entrance artwork

The entrance is a conceptual illustration, not footage or a photograph of participating laboratories. Institution logos, experiment footage, scores and locations are unchanged.

- Original scene mode: built-in `image_gen`, transparent background.
- Original scene: `design/originals/assets/portal/robot-earth.png` (1672 × 941, RGBA; original generated alpha preserved), retained as an archive. Its `robot-earth.webp` delivery copy has no runtime references.
- Replacement hand: `design/originals/assets/portal/robot-hand.png` (1672 × 941, RGBA), an unchanged copy of the user-supplied `design/explorations/resources.png`. No image generation, background removal or repainting was used for this replacement.
- The original generated image is retained separately. No API/CLI generation or raster repainting was used.
- HTML supplies all text and the entrance link. CSS supplies light, grain and interaction. The supplied hand's source fingertip at pixel (1578, 294) anchors to the shared atmospheric contact. Its width follows that point so the forearm reaches the left viewport edge at full extension; the supplied image retains its 2° rotation.

The entrance is a light at the point where the mechanical hand meets Earth.
There is no outlined doorway or inset map. A soft, cool atmospheric veil and
warm contact glow intensify as the pointer approaches from anywhere in the
window. A smooth distance curve simultaneously advances the hand from its
resting gap until the fingertip coincides with the light. Moving away gently
retracts the hand. The hand's resting gap scales with the viewport, approximately
98 pixels at 1440 pixels wide and 31 pixels at 390 pixels wide.

`portal-scene.js` supplies the shared geometry and contact-light strength. The
Earth surface and atmosphere shaders use that same strength to brighten
scattering around the contact. Blue scattering extends across the curved limb,
while warm contact light stays on a thin rim. Both use the remaining colour
headroom, preserving bright terrain texture
instead of adding a white wash. Atmospheric density has a fixed exponential
falloff; pointer approach changes local intensity rather than global thickness. CSS lights follow the same point and
horizon angle. The pointer response eases through requestAnimationFrame only
while changing; it stops once settled and while the entrance or tab is hidden.
The bounded Earth render loop is unchanged. “Touch to enter” stays hidden on
mouse-driven visits until proximity exceeds 0.55, then fades to full opacity
at contact. Touch and script-free visits keep a visible cue.

Keyboard focus brings the hand to the light. Touch activation completes the
contact with one tap. Reduced motion holds the hand at contact and changes the
light immediately; navigation also enters immediately. Activation releases a
soft bloom and crossfades into the research network without a clipped aperture.
Browsers without View Transitions use a short fade. The link retains its
`#network` destination without JavaScript, and Back restores entrance focus.

## Interactive Earth

The live Earth uses Globe.gl / Three.js with separate surface, cloud and atmosphere layers and locally hosted imagery. A longer-lens camera preserves the close orbital crop without magnifying a tiny surface patch. During normal loading, neither a placeholder globe nor a poster is shown: the entire renderer host stays hidden until camera sizing and cropping are applied synchronously and a complete frame has been drawn. This prevents the library's default centred blue sphere and old Earth artwork from flashing during refresh.

Dragging and arrow keys orbit the globe. Space toggles automatic rotation. Animation stops when the entrance or tab is hidden. Initial reduced-motion or data-saving preferences, unavailable graphics, initialization failures and WebGL context loss use responsive posters of the current scene; the same posters appear without JavaScript. Context restoration draws a complete frame before revealing the live globe again.

Source: [NASA Earth Observatory — The Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/). Imagery credit: NASA Goddard Space Flight Center; Reto Stöckli and Robert Simmon. These historical textures are illustrative, not live satellite/weather information or an institutional affiliation.

- `design/originals/assets/portal/earth-surface.jpg`: original 2048 × 1024 [surface texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_2048.jpg).
- `design/originals/assets/portal/earth-clouds.jpg`: original 2048 × 1024 [cloud texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg).
- No new generated artwork was used for this revision. The shader, atmospheric rim, lighting and proximity response are native website rendering. Static posters are transparent browser captures of Earth at 1440 × 821 and 390 × 773. The CSS sunrise remains separate so it always follows the contact point; it is never baked into the poster. Fallback geometry accounts for each poster's centered cover crop.

The close orbital composition places the sphere centre outside the bottom-right of the viewport. The renderer draws only the viewport. The atmosphere mesh extends to 1.06 times Earth's radius. Exponential density decays almost to transparency before a final smooth tail at 1.04–1.06 radii; bounded optical depth avoids exposing the mesh silhouette as a cutoff. Blue rim scattering and a localized warm sunrise complete the horizon. The sunrise direction is stored relative to the camera so its warmth follows the screen-anchored CSS sun during rotation. These effects retain the existing three scene draw calls. Very low ambient light keeps the night side dark, while a separate cloud layer and rough ocean reflections preserve depth. The stock-video preview supplied as a visual reference is not a website asset.

- `design/originals/assets/portal/earth-night.jpg`: original 2048 × 1024 [NASA night-light texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_lights_2048.jpg).

The optional desktop maps in `design/originals/assets/globe/` are all 4096 × 2048:

- `earth-surface-hd.jpg`: [day surface](https://threejs.org/examples/textures/planets/earth_day_4096.jpg).
- `earth-night-hd.jpg`: [night surface and city lights](https://threejs.org/examples/textures/planets/earth_night_4096.jpg).
- `earth-detail-hd.jpg`: [packed height, roughness and cloud channels](https://threejs.org/examples/textures/planets/earth_bump_roughness_clouds_4096.jpg).

These textures are distributed with the official Three.js Earth example.
The [example](https://threejs.org/examples/webgpu_tsl_earth.html) credits
[Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), whose
texture collection is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Delivery conversion to WebP is the only modification. The homepage footer links
to `public/assets/globe/credits.txt` for public attribution and source details.
Mobile and slow 2G visits keep the existing NASA surface. These maps are
illustrative historical imagery, not live observations.

The night map now uses a 1024 x 512 global base and local WebP tiles at 2K,
4K and 8K source resolutions. The original [Solar System Scope 8K night map](https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg)
is preserved at `design/originals/globe/earth-night-8k.jpg`, under the same
CC BY 4.0 license. `scripts/build_night_tiles.py` resizes and tiles that original,
with eight-pixel gutters that wrap at the antimeridian and extend at the poles.
It does not reposition, simplify or synthesize city lights. The homepage footer
credits the imagery. Existing 4K night assets are retained as earlier delivery
sources; the live renderer requests the small base and view-dependent tiles.

## Generation prompt

```text
Use case: stylized-concept.
Asset type: a premium 3D-rendered full-screen website entrance illustration for AI Scientists' Last Exam, on a genuinely transparent background. Wide 16:9 landscape, ideally 2048 by 1152. This is one cohesive cinematic composition with two isolated subjects and no typography.

Primary request: on the LEFT a sophisticated articulated robotic forearm with an anthropomorphic five-finger dexterous hand reaches towards the RIGHT; on the RIGHT a luminous, recognizably terrestrial globe floats in space. The hand's index finger points horizontally toward Earth, with the other three fingers naturally curled and a mechanically plausible thumb. Show the actual wrist and articulated forearm, not only an isolated hand. No human skin, no human body. The physical objects must look like beautiful finished industrial design, not wireframe outlines.

Composition: keep the TOP 25 percent mostly empty transparent space for a large HTML heading. The robot emerges from the lower left edge and occupies x=0–46 percent, y=35–96 percent. Its single extended index fingertip ends near x=44 percent, y=59 percent, pointing right. Earth is completely contained in the right side, centered near x=78 percent, y=62 percent, with diameter about 49 percent of image height. The Earth and all atmospheric glow should fit inside x=59–99 percent, y=31–94 percent. Leave a clear open gap around x=50 percent, y=60 percent for a real interactive ENTER control to be added in code. Keep the two objects separate across the vertical middle of the image; no physical crossing through the gap. The hand must unmistakably point at the Earth.

Materials and lighting: titanium and pearl-white ceramic robot plates, deep graphite joints, precision mechanical tendons, realistic finger segments and machined surfaces. Strong cool icy-blue rim lights, gentle cyan reflected illumination, and a thin amber accent at the fingertip. Three-dimensional shading, convincing weight and polished highlights, not flat line art. Earth has deep midnight-blue oceans, recognizable continents with East Asia and Australia facing camera, subtle clouds and golden city lights, a vivid thin pale-blue atmosphere and a warm sunrise rim. Restrained luminous orbital arcs close to the planet, physically plausible depth and darkness. Rich, high-end cinematic scientific-future aesthetic suitable for a blue-charcoal #10131a webpage. Retain detailed dark areas and let luminous highlights decay naturally.

Constraints: transparent alpha background including between fingers and around objects; no black rectangle, no floor, no stars filling the canvas, no UI, no text, no letters, no numbers, no logos, no watermark. Do not depict or claim a real participating laboratory's equipment. No extra fingers, no humanoid robot head or torso, no cartoon, no sci-fi weapon, no black hole.
```

## Entrance and map behavior

The root homepage opens on the entrance. ENTER navigates to `#network`; direct section links and browser Back/Forward remain usable. Without JavaScript the entrance link scrolls to the already-rendered map. Reduced-motion preferences disable travel and transition effects.

The moving lights on map connections are decorative representations of the research network, not live data transfers or measured experimental activity. Their endpoints use the same coordinates as the country markers. They stop when the map is offscreen or the browser tab is hidden.

## Delivery assets

The browser uses optimized WebP copies in `public/assets/portal/`. Originals above are preserved outside the deployment output. `scripts/optimize_assets.py` regenerates these copies. The replacement hand retains its full 1672 × 941 resolution and transparency, using WebP quality 95 to preserve mechanical detail. Typography and the interactive core remain HTML/CSS.

The fallback posters in `public/assets/globe/` are transparent browser captures of the current renderer and CSS sunrise: `earth-poster.webp` is 1440 × 821 (60,704 bytes), and `earth-poster-mobile.webp` is 390 × 773 (19,460 bytes). CSS selects the mobile capture at widths up to 500 pixels; a responsive picture provides the same choice without JavaScript. These are captured renderings, not generated artwork, and are absent during normal WebGL loading.

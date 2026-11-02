# AISLE entrance artwork

The entrance is a conceptual illustration, not footage or a photograph of participating laboratories. Institution logos, experiment footage, scores and locations are unchanged.

- Original scene mode: built-in `image_gen`, transparent background.
- Original scene: `design/originals/assets/portal/robot-earth.png` (1672 × 941, RGBA; original generated alpha preserved), retained as an archive. Its `robot-earth.webp` delivery copy has no runtime references.
- Replacement hand: `design/originals/assets/portal/robot-hand.png` (1672 × 941, RGBA), an unchanged copy of the user-supplied `design/explorations/resources.png`. No image generation, background removal or repainting was used for this replacement.
- The original generated image is retained separately. No API/CLI generation or raster repainting was used.
- HTML supplies all text and the entrance link. CSS supplies light, grain and interaction. The supplied hand's source fingertip at pixel (1578, 294) anchors to the shared atmospheric contact. Its width follows that point so the forearm reaches the left viewport edge at full extension, where the supplied image retains its 2° rotation.

## Articulated hand prototype

The current enhanced entrance uses eight rigid views of one complete painting,
`design/originals/hand-rig/hand-v4.png` (1672 × 941, RGBA), generated with the
built-in `image_gen` tool. Revision 3 used the supplied assembled hand as its
edit target; revision 4 changes only illumination using the entrance as context.
Its prompt and provenance are preserved in
`design/originals/hand-rig/generation-v4.txt`. Light satin-silver titanium links
couple the neighbouring finger segments; their small pivot pins sit between
the existing shell ends. The original ceramic panels, pointing gesture and
blue wrist accents are retained. The base light is now cool and subdued, with
softer ceramic highlights and a blue environmental rim. Earlier `parts-v1.png`, `parts-v2.png` and `hand-v3.png`
iterations remain archived. The supplied hand above is unchanged and remains
the script-free and failed-image fallback.

The eight views are the forearm, palm, three index phalanges, thumb, middle
finger and grouped ring/little fingers. They all sample
`public/assets/hand-rig/hand-v4.webp` (186,018 bytes). SVG clips isolate the
moving areas; a complement mask removes those areas from the palm, with an
overlap at the wrist. The index root's outer bearing stays on the palm while
the outgoing finger shell moves over it. At contact all views reconstruct the
same coherent painting, including the connections on both sides of a joint.
The complete upper cap of the middle index joint follows the middle phalanx;
its tiny bright top edge is no longer left in the palm mask when bending.
The curled fingers use small secondary rotations because their occluded
surfaces are fixed in the painting. The eight sibling SVG files expose each
view and reference the same image in their directory.
`scripts/build_hand_assets.py` converts only the delivery format and exports
native SVG masks and viewports; it does not repaint or remove backgrounds.

A native SVG filter adds the contact reflection to the existing hand. A radial
light field controls a screened amber tint, and a final `atop` composite keeps
the original alpha exactly. There is no second copy of the hand: duplicating
its translucent edge would increase coverage and darken a bright sunrise
behind the fingertip even with screen blending. The field's strength follows
the actual scene-light strength separately from pose progress, including under
reduced motion. The old whole-hand drop shadow is removed; folded finger
shadows remain part of the authored image. This is image-based lighting without
a 3D hand mesh, a second render loop or a full-screen pass.

`src/sitegen/components/hand.py` preserves the original 1672 × 941 coordinate
frame and fingertip at (1578, 294). The contact pose follows the original PNG's
index joint centres at (1070, 335), (1286, 276) and (1440, 294): the proximal
segment rises about 15.28°, the middle turns back about 21.94° and the distal
segment levels out. The three joints therefore retain the original gentle
bend when the animation's rotation offsets reach zero. `portal-hand.js`
drives seven joint rotations from the existing proximity progress: the wrist
aligns first, the three index joints extend in sequence, and the other finger
groups move subtly later. There is no independent render loop or physics
engine. Reduced motion fixes the joints at contact. The offline authoring
preview at `design/hand-rig-preview.html` provides a manual pose slider, an
original-PNG comparison button and links to the separate parts.

This is a fixed-view, two-dimensional rig. The ring and little fingers still
move together; the thumb and other curled fingers rotate as whole pieces.
Their baked lighting and occlusion do not support arbitrary three-dimensional
rotation or a fully opened hand.

## Entrance interaction

The entrance is a light at the point where the mechanical hand meets Earth.
There is no outlined doorway or inset map. A soft, cool atmospheric veil and
warm contact glow intensify as the pointer approaches from anywhere in the
window. A smooth distance curve simultaneously advances and turns the hand from
its relaxed pose until the fingertip coincides with the light. A separate hand
layer pivots around the forearm at 12% / 68% of the artwork, turning through 6°
(5° on mobile) so the fingertip follows a shallow arc. Moving away gently
reverses the same motion. Horizontal retraction scales with the viewport,
approximately 115 pixels at 1440 pixels wide and 35 pixels at 390 pixels wide,
in addition to the offset from rotation. Translation and rotation share one
smoothed progress value, with no overshoot or extra settling phase.

`portal-scene.js` supplies the shared geometry and contact-light strength. CSS
uses the projected Earth radius and horizon angle to hide the lower part of a
shallow sunrise behind the curved planet. A warm pool follows the limb, with a
small raised light cap and a soft atmospheric tail. Proximity gradually
broadens and brightens the pool.
A short horizontal lens streak and a compact source bloom appear as proximity
increases. The live view uses the official Three.js `Lensflare` addon with a
128 × 128 procedural Gaussian source and the example's aperture-ghost texture.
The source sits four projected pixels above the limb, within the sunrise cap.
The broad tinted diffraction disc is retained only as an archived asset.
The addon positions ghosts along the optical axis and uses a small depth probe.
`scripts/globe-vendor/build.mjs` applies a guarded patch to its element material:
RGB remains additive while destination alpha is preserved. Adding optical light
therefore cannot turn the transparent canvas into an opaque dark footprint over
the CSS background. The aperture bitmap is converted to additive alpha in
memory. Static visits and texture failures use a compact CSS radial source and
the same aperture mask; Earth rendering remains independent of texture loading.
The optical sprites share the existing bounded loop and are disabled at rest.
The Earth surface shader adds a matching warm rim and a reflection restricted by
the dedicated land/ocean mask. The lighting is deliberately illustrative:
terrain stays readable, a subdued warm dusk blends into cooler night, and water
has a soft reflection near the sunrise. The broader off-source reflection is
reduced instead of being flattened into a grey sea-shaped highlight. The same
mask and material rules apply before and after HD loading. Ambient intensity is
0.025, and the albedo-modulated dusk fill uses a 0.14 angular width and 0.45
gain. Reduced night-side scattering keeps the dark hemisphere distinct while
preserving a smooth terminator and the existing city emission. Terrain elevation
does not perturb water normals; colour headroom preserves surface detail.
The atmosphere warms locally next to the surface while retaining its blue outer
scattering and exponential density falloff. The light is composited over the
fingertip where they meet. Posters use the same curved CSS light mask, including
after resize. The scene container must not create a stacking context between
the screened CSS lights and the Earth canvas: flattening those lights against
transparency would make their final source-over composite cover the bright
limb. The arm and lights have individual stacking levels instead. The pointer
response eases through requestAnimationFrame only
while changing; it stops once settled and while the entrance or tab is hidden.
The bounded Earth render loop is unchanged. “Touch to enter” stays hidden on
mouse-driven visits until proximity exceeds 0.55, then fades to full opacity
at contact. Narrow layouts and coarse-pointer devices show a translucent
circular target around the shared final fingertip and horizon light position.
The circle is the clickable entrance; “Touch to enter” remains a separate,
visible caption below it, followed by the tagline and counter. The outline
and faint tint use the existing target without another blur or animation loop.

Single-finger taps and drags anywhere in the entrance guide the same proximity
response. The last touch position remains after release, so a tap's pose can
settle visibly without hover. Passive touch listeners preserve scrolling and
continue to follow native pans; the globe's existing controls remain available.
Multi-touch, cancellation, leaving the entrance and hiding the tab clear the
touch pose. A drag exceeding 12 CSS pixels cannot activate the entrance through
a synthesized click. No additional animation loop or repeating hint is added.
Script-free visits retain the same entry link and visible cue.

Keyboard focus brings the hand to the light. Touch activation completes the
contact with one tap. Reduced motion holds the hand at contact and changes the
light immediately; navigation also enters immediately. Activation releases a
soft bloom and crossfades into the research network without a clipped aperture.
Browsers without View Transitions use a short fade. The link retains its
`#network` destination without JavaScript, and Back restores entrance focus.

## Interactive Earth

The live Earth uses Globe.gl / Three.js with separate surface, cloud and atmosphere layers and locally hosted imagery. The initial surface and packed terrain/cloud maps in `public/assets/globe/base/` are downsampled from the same Solar System Scope originals as the optional 4K maps. Terrain bump and the packed blue-channel cloud interpretation are enabled from the first visible frame. HD loading replaces texture resolution without changing the shader feature set, cloud interpretation or colour source. Globe.gl's initial clearing of the custom bump map is corrected before drawing. A longer-lens camera preserves the close orbital crop without magnifying a tiny surface patch. During normal loading, neither a placeholder globe nor a poster is shown: the entire renderer host stays hidden until camera sizing and cropping are applied synchronously and a complete frame has been drawn. This prevents the library's default centred blue sphere and old Earth artwork from flashing during refresh.

Dragging and arrow keys orbit the globe. Space toggles automatic rotation. Animation stops when the entrance or tab is hidden. Initial reduced-motion or data-saving preferences, unavailable graphics, initialization failures and WebGL context loss use responsive posters of the current scene; the same posters appear without JavaScript. Context restoration draws a complete frame before revealing the live globe again.

Preserved earlier standard imagery: [NASA Earth Observatory — The Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/). Imagery credit: NASA Goddard Space Flight Center; Reto Stöckli and Robert Simmon. The current surface and cloud maps use the Solar System Scope sources listed below at both initial and HD resolution. These historical textures are illustrative, not live satellite/weather information or an institutional affiliation.

- `design/originals/assets/portal/earth-surface.jpg`: original 2048 × 1024 [surface texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_2048.jpg).
- `design/originals/assets/portal/earth-clouds.jpg`: original 2048 × 1024 [cloud texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg).
- No new generated artwork was used for this revision. The shader, atmospheric rim, lighting and proximity response are native website rendering. Static posters are transparent browser captures of Earth at 1440 × 821 and 390 × 773. The CSS sunrise remains separate so it always follows the contact point; it is never baked into the poster. Fallback geometry accounts for each poster's centered cover crop.

The close orbital composition places the sphere centre outside the bottom-right of the viewport. The renderer draws only the viewport. The atmosphere mesh extends to 1.06 times Earth's radius. Exponential density decays almost to transparency before a final smooth tail at 1.04–1.06 radii; bounded optical depth avoids exposing the mesh silhouette as a cutoff. Blue rim scattering and a localized warm sunrise complete the horizon. The sunrise direction is stored relative to the camera so its warmth follows the screen-anchored CSS sun during rotation. Earth retains three scene draws at rest; the active optical flare brings the total to ten. Very low ambient light keeps the night side dark, while a separate cloud layer and rough ocean reflections preserve depth. The stock-video preview supplied as a visual reference is not a website asset.

The active optical bitmap is an unchanged copy of `lensflare3.png` (4,822 bytes)
from the Three.js r183 example, credited to ro.me. `lensflare0.png` (78,758 bytes)
remains archived but has no runtime references. Source URLs and credit are in
`public/assets/globe/credits.txt`; the Three.js MIT license is included in
`public/assets/vendor/globe.LICENSES.txt`. The smooth source bloom is generated
numerically in `globe-flare.js`, without an external image request.

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
Mobile and slow 2G visits keep the smaller maps from the same source. These maps are
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

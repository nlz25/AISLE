# AISLE entrance artwork

The entrance is a conceptual illustration, not footage or a photograph of participating laboratories. Institution logos, experiment footage, scores and locations are unchanged.

- Mode: built-in `image_gen`, transparent background.
- Asset: `assets/portal/robot-earth.png` (1672 × 941, RGBA; original generated alpha preserved).
- The original generated image is retained separately. No API/CLI generation or raster repainting was used.
- HTML supplies all text and the ENTER link. CSS supplies light, grain and slow motion. The generated illustration supplies the robot, clipped in layout without modifying the original raster. Its Earth remains the static fallback.

## Interactive Earth

The live Earth is a WebGL sphere with locally hosted NASA Blue Marble surface, cloud and historical night-light maps. It rotates geographically around its axis; the continents are not a flat image rotated in CSS. Dragging and arrow keys rotate the sphere. Space toggles automatic rotation. Animation stops when the entrance or tab is hidden, and system reduced-motion settings disable automatic movement. Unsupported graphics or failed texture loads retain the static Earth.

Source: [NASA Earth Observatory — The Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/). Imagery credit: NASA Goddard Space Flight Center; Reto Stöckli and Robert Simmon. These historical textures are illustrative, not live satellite/weather information or an institutional affiliation.

- `assets/portal/earth-surface.jpg`: original 2048 × 1024 [surface texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_2048.jpg).
- `assets/portal/earth-clouds.jpg`: original 2048 × 1024 [cloud texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg).
- No new generated imagery or bitmap editing was used for this revision. The shader, atmospheric rim, lighting, pointer interaction and luminous ENTER control are native website rendering.

The close orbital composition places the sphere centre outside the bottom-right of the viewport. The renderer draws only the visible area, with a thin atmospheric rim and a backlit sunrise; pointer and keyboard rotation remain available. The stock-video preview supplied as a visual reference is not a website asset.

- `assets/portal/earth-night.jpg`: original 2048 × 1024 [NASA night-light texture](https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_lights_2048.jpg).

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

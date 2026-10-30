# Architecture and performance

## Build boundary

The Python entry point `scripts/build_site.py` imports independent page renderers from `src/sitegen/pages/`. Shared layout and UI live under `components/`; score and network metadata remain in `data/`. The generator uses only the Python standard library.

`public/` contains delivery-ready static assets. The build copies these into a clean `dist/`, combines the base/theme CSS, copies the entrance CSS and browser modules, and renders three English pages. A content-derived version updates stylesheet and module URLs, including dynamic imports. `dist/build.json` records that version.

GitHub Actions validates each pull request. A successful build on `main` uploads only `dist/` to Pages. Source, originals, local tools and documentation are excluded. The earlier root-level generated pages and `/zh/` pages have been removed.

## Browser lifecycle

- `navigation.js`: mobile menu and page visibility state on every page.
- `main.js`: chooses the appropriate enhancements and defers expensive work.
- `portal.js`: hash-driven entrance/network navigation, focus and Back/Forward.
- `globe.js`: optional Globe.gl Earth with separate surface, clouds and atmosphere. Initialization follows artwork paint and an idle opportunity. Reduced-motion and data-saving visits retain the static scene. A later change to reduced motion stops automatic rotation while preserving manual controls.
- `research.js`: tabs, model details, score ordering/tooltips and study statistics. Loaded when the research view is entered, or on the leaderboard page.
- `network.js`: country/institution selection, on-demand film player and decorative map paths. Loaded only on entry to the research network.

The research section starts hidden; lazy images are not requested during entrance display. A noscript style exposes the server-rendered research content when JavaScript is disabled. Videos keep `preload="none"` and receive their source only after a visitor opens the player.

## Performance choices

- WebP delivery copies preserve the supplied/generated artwork; originals stay in `design/originals/`.
- Locally served WOFF2 replaces TTF. The header logo and favicon are sized for their rendered uses.
- The first complete Earth uses a 198 KB 2K surface, a 148 KB 1K cloud map and a 24.6 KB 1K global night map (370,892 bytes total). The detailed hand and static fallback remain 226 KB and 257 KB respectively. Desktop visits on fast connections can load the existing 4K surface and packed cloud/terrain maps after three visible seconds. These optional requests are aborted when the entrance or tab is hidden. Narrow screens and slower connections keep the small surface/cloud maps.
- Night imagery is generated as a 2K/4K/8K WebP pyramid from the original 8K map. Each 512-pixel tile includes an eight-pixel neighbouring-image gutter. The 1K global base stays visible at all times. Only visible night-side regions request higher detail, selected by projected texel density at most five times per second. Desktop fast connections can reach 8K detail; mobile and 3G visits stop at 4K, while 2G uses the base alone.
- At most two tile requests run concurrently. Manual dragging pauses new requests and aborts outdated work; releasing the pointer selects the new view. A 16-slot GPU atlas uses least-recently-used eviction outside the desired set. Parent/base imagery remains visible while children load and fade in over 450 ms (immediate under reduced motion). Cached files use content-addressed paths, and source imagery is never deployed. The complete pyramid is about 2.03 MB, but each visit requests only selected tiles.
- Tile imagery is sampled in the existing Earth material, keeping three scene draw calls. An indirection texture and explicit sampling derivatives avoid sampling jumps at tile boundaries; mipmaps, gutters and anisotropic filtering preserve motion stability. Atlas allocation is bounded at 2112 x 2112 pixels plus mipmaps (about 22.7 MiB for RGBA8), independent of how many regions a visitor has seen. A small global base and page table add roughly 2.7 MiB. Unsupported graphics, failed requests and eviction fall back through available parents to the global base.
- Globe.gl 2.46.2 and Three.js 0.183.2 are pinned in `scripts/globe-vendor/package-lock.json`, with a single shared Three.js instance. The self-contained local ES module is approximately 1.84 MB uncompressed / 526 KB gzip (level 6). It is fetched only with the optional globe module, never from a runtime CDN. Ordinary builds do not run npm. `npm ci --ignore-scripts` then `npm run build` in that directory reproduces the bundle and dependency licenses. The build's content hash includes the vendor module.
- Earth rendering has a 4.5-million-pixel budget, with DPR capped at 2 on desktop and 1.5 on narrow screens. Automatic rotation is capped at 20 fps, with a 30 fps ceiling during dragging. Globe.gl's own animation loops are paused; the site submits surface, cloud and atmosphere draws through one visibility-aware loop. There are three scene draws per frame instead of the former one-pass shader. This and the higher resolution increase GPU work; changing libraries is not a performance improvement by itself.
- The scene uses a standard PBR surface with height and roughness maps, night-side emission, a separate cloud shell and a thin sun-dependent atmosphere shell. A small material extension adds atmospheric light at the limb. The initial view faces East Asia and the Pacific, with the sun behind the planet and very low ambient illumination. The atmospheric shading follows the approach in the official Three.js Earth example rather than Globe.gl's default broad halo.
- Zoom, pan, automatic damping and hover picking are disabled. Manual rotation remains available while automatic rotation is paused. The site uses no geographic data layers, postprocessing passes or shadow maps for this entrance.
- The Earth and map stop rendering outside their view and when the document is hidden. CSS animation also pauses in background tabs.
- Large entrance light gradients are static. The small interactive core retains restrained animation; mobile drops the full-screen grain layer.

These are asset and rendering-budget measurements, not a claim about visitor loading time on a particular network. Validate on the intended devices before changing these budgets.

## Checks

`make check` builds all pages, checks local resources and fragment links, ARIA control targets, study-score aggregation, cohort coverage, institution/media records, English-only output, CSS/module references and the deployment boundary. It also checks JavaScript syntax. The checker validates all 168 night tiles against the manifest, the 40 KB global-night-base budget, the 4 MB complete-pyramid budget, the existing 1 MB portal-media / 2 MB optional surface-detail budgets, and the 600 KB gzip dependency-bundle budget.

Regenerate the pyramid with `python scripts/build_night_tiles.py` after installing
`requirements-dev.txt`. The preserved source is
`design/originals/globe/earth-night-8k.jpg`. The recipe hashes source bytes,
tile size, gutter and quality into immutable tile paths. The site build includes
the manifest in its asset version, so regenerated imagery invalidates browser
module and manifest caches. No authoring dependency or image processing runs
in the visitor's browser.

Browser QA covers entry/back navigation, globe controls, institution selection, video playback, cohort/category changes, model detail expansion, mobile menus and narrow-screen overflow. Honor reduced motion and retain static fallbacks for unavailable WebGL.

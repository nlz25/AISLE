# Architecture and performance

## Build boundary

The Python entry point `scripts/build_site.py` imports independent page renderers from `src/sitegen/pages/`. Shared layout and UI live under `components/`; score and network metadata remain in `data/`. The generator uses only the Python standard library.

`public/` contains delivery-ready static assets. The build copies these into a clean `dist/`, combines the base/theme CSS, copies the entrance CSS and browser modules, and renders three English pages. A content-derived version updates stylesheet and module URLs, including dynamic imports. `dist/build.json` records that version.

GitHub Actions validates each pull request. A successful build on `main` uploads only `dist/` to Pages. Source, originals, local tools and documentation are excluded. The earlier root-level generated pages and `/zh/` pages have been removed.

## Browser lifecycle

- `navigation.js`: mobile menu and page visibility state on every page.
- `main.js`: chooses the appropriate enhancements and defers expensive work.
- `portal.js`: hash-driven entrance/network navigation, focus and Back/Forward.
- `globe.js`: optional, locally textured WebGL Earth. Initialization follows artwork paint and an idle opportunity. Reduced-motion and data-saving visits retain the static scene.
- `research.js`: tabs, model details, score ordering/tooltips and study statistics. Loaded when the research view is entered, or on the leaderboard page.
- `network.js`: country/institution selection, on-demand film player and decorative map paths. Loaded only on entry to the research network.

The research section starts hidden; lazy images are not requested during entrance display. A noscript style exposes the server-rendered research content when JavaScript is disabled. Videos keep `preload="none"` and receive their source only after a visitor opens the player.

## Performance choices

- WebP delivery copies preserve the supplied/generated artwork; originals stay in `design/originals/`.
- Locally served WOFF2 replaces TTF. The header logo and favicon are sized for their rendered uses.
- The five entrance textures/art assets total approximately 940 KB. The separate high-resolution mechanical hand is approximately 226 KB, down from its 1.05 MB PNG; the original 257 KB scene remains the static Earth fallback.
- Default Earth rendering is capped at 1280 × 900, DPR 1.25 and 20 frames per second; pointer interaction is coalesced and uses a 30 fps animation ceiling.
- The Earth and map stop rendering outside their view and when the document is hidden. CSS animation also pauses in background tabs.
- Large entrance light gradients are static. The small interactive core retains restrained animation; mobile drops the full-screen grain layer.

These are asset and rendering-budget measurements, not a claim about visitor loading time on a particular network. Validate on the intended devices before changing these budgets.

## Checks

`make check` builds all pages, checks local resources and fragment links, ARIA control targets, study-score aggregation, cohort coverage, institution/media records, English-only output, CSS/module references and the deployment boundary. It also checks JavaScript syntax. `scripts/check_site.py` enforces a 1 MB entrance-media budget, including the separate detailed hand and the static Earth fallback.

Browser QA covers entry/back navigation, globe controls, institution selection, video playback, cohort/category changes, model detail expansion, mobile menus and narrow-screen overflow. Honor reduced motion and retain static fallbacks for unavailable WebGL.

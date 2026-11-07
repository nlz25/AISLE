# AISLE — AI Scientists' Last Exam

[aisle.science](https://aisle.science/) presents the experimental evaluation of AI scientists. The site is English only, with an interactive research network, experimental films, fixed-cohort leaderboards and task protocols.

## Develop

Requires Python **3.12+**. Node 22+ is used for JavaScript syntax checks. The website has no client framework; its optional entrance globe uses a locally bundled Globe.gl / Three.js runtime.

```sh
make check     # build, validate links/data/media, check JavaScript
make serve     # serve dist/ at http://127.0.0.1:4173
```

If your default Python is older, use `make check PYTHON=/path/to/python3.12` (and the same for `make serve`).

`make serve` connects the optional entrance counter to a separate local Worker. See [Portal click counter](docs/counter.md) for startup instructions. Local preview clicks do not affect the production total.

The checked-in globe bundle needs no npm install for ordinary builds or deployment.
To regenerate it after changing dependencies:

```sh
cd scripts/globe-vendor
npm ci --ignore-scripts
npm run build
```

Commit the lockfile, generated `public/assets/vendor/globe.gl.js` and dependency
licenses together. See [architecture and performance](docs/architecture.md) for
the entrance's loading and rendering budgets.

## Project structure

```text
src/
  sitegen/
    pages/          # home, leaderboard, tasks and Contribute workspaces
    components/     # layout, portal, map, result tables, institutions
    context.py      # build paths, study data and HTML escaping
  styles/           # base components, dark theme, entrance, research network
  scripts/          # navigation, view loading, portal, globe, research, map
public/             # files copied into the deployed website
  assets/           # optimized artwork, fonts, logos, map, films
  CNAME             # aisle.science
  favicon.png
  apple-touch-icon.png
data/               # study scores and research-network metadata
scripts/            # build, validation and optional asset tools
services/           # Cloudflare Workers for the counter and Contribute API
design/             # originals, authoring previews/intermediates and archives
docs/               # architecture, content and media provenance
.github/workflows/  # validation and GitHub Pages deployment
dist/               # generated output; ignored by Git
```

Edit `src/`, `public/` and `data/`. Never edit `dist/`. Every build starts from a clean output directory; only that output is deployed. Original media and design experiments are excluded from publication.

Keep only current browser assets in `public/`. Optional asset tools use explicit
recipes in `scripts/optimize_assets.py`; archived originals are not regenerated
into the website. Map intermediates and standalone hand-part SVG previews live
in `design/generated/`. See [editing content](docs/content-guide.md) for regeneration.

## Publication

Push to `main` to run `.github/workflows/pages.yml`: build → validate → upload `dist/` → deploy to GitHub Pages. Pull requests run the same checks without publishing. Pages is configured to use GitHub Actions; the custom domain remains `aisle.science`.

## Documentation

- [Architecture and performance](docs/architecture.md)
- [Editing content](docs/content-guide.md)
- [Score provenance](docs/data-provenance.md)
- [Research films](docs/network-media.md)
- [Entrance artwork](docs/portal-art.md)
- [Portal click counter](docs/counter.md)
- [Contribute service and deployment](docs/contribute.md)
- [Roadmap](docs/roadmap.md)

Scores describe an evaluated research cohort, not a live ranking of current models. The research network's four regions and supplied films do not describe coverage of the scored benchmark. Original logos and laboratory footage retain their respective owners' rights.

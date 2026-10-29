# AISLE — AI Scientists' Last Exam

[aisle.science](https://aisle.science/) presents the experimental evaluation of AI scientists. The site is English only, with an interactive research network, experimental films, fixed-cohort leaderboards and task protocols.

## Develop

Requires Python **3.12+**. Node 22+ is used only for JavaScript syntax checks. The website has no client framework or third-party JavaScript runtime.

```sh
make check     # build, validate links/data/media, check JavaScript
make serve     # serve dist/ at http://127.0.0.1:4173
```

If your default Python is older, use `make check PYTHON=/path/to/python3.12` (and the same for `make serve`).

## Project structure

```text
src/
  sitegen/
    pages/          # home, leaderboard and tasks
    components/     # layout, portal, map, result tables, institutions
    context.py      # build paths, study data and HTML escaping
  styles/           # base components, dark theme, entrance
  scripts/          # navigation, view loading, portal, globe, research, map
public/             # files copied into the deployed website
  assets/           # optimized artwork, fonts, logos, map, films
  CNAME             # aisle.science
  favicon.png
  apple-touch-icon.png
data/               # study scores and research-network metadata
scripts/            # build, validation and optional asset tools
design/             # original artwork, map source and archived demo files
docs/               # architecture, content and media provenance
.github/workflows/  # validation and GitHub Pages deployment
dist/               # generated output; ignored by Git
```

Edit `src/`, `public/` and `data/`. Never edit `dist/`. Every build starts from a clean output directory; only that output is deployed. Original media and design experiments are excluded from publication.

## Publication

Push to `main` to run `.github/workflows/pages.yml`: build → validate → upload `dist/` → deploy to GitHub Pages. Pull requests run the same checks without publishing. Pages is configured to use GitHub Actions; the custom domain remains `aisle.science`.

## Documentation

- [Architecture and performance](docs/architecture.md)
- [Editing content](docs/content-guide.md)
- [Score provenance](docs/data-provenance.md)
- [Research films](docs/network-media.md)
- [Entrance artwork](docs/portal-art.md)
- [Roadmap](docs/roadmap.md)

Scores describe an evaluated research cohort, not a live ranking of current models. The research network's six countries and ten institutions do not describe coverage of the scored benchmark. Original logos and laboratory footage retain their respective owners' rights.

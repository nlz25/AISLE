# AISLE — AI Scientists’ Last Exam

A research website for experimental evaluation of AI scientists, presenting **AISLE** results and evaluated tasks.

**Website:** https://aisle.science/
**中文:** https://aisle.science/zh/

The first release contains a research homepage, separate shared/full-coverage results, inline model details with category scores, task protocols, an interactive world map with institution profiles and experiment films, and academic/industry institution strips. English and Chinese pages share the same source and data.

## Local development

No application packages or build service are required. Use Python 3.9+ to regenerate static pages:

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check assets/site.js
node --check assets/network.js
python3 -m http.server 4173
```

Open http://localhost:4173/. GitHub Pages serves the committed files from the root of `main`.

## Content

- [Three-stage roadmap](docs/roadmap.md)
- [Content and update guide](docs/content-guide.md)
- [Result provenance and interpretation](docs/data-provenance.md)
- [Editable results](data/results.json)

The website snapshot describes an evaluated research cohort, not a live ranking of current models. Only evaluated tasks are featured in the MVP. This website repository is separate from the experimental evaluation package and its eventual data/code release.

The original `demo.mp4` and `framework.png` are retained from the previous demonstration page. Copyright and permissions for research media remain with their respective owners; this repository does not grant a blanket license to third-party media.

The navigation uses Home, Leaderboard and Tasks. The homepage opens with a dark world map in AItonomy’s blue-charcoal palette (`#10131a`). Select a country and institution to view its identity and available experiment film; the ranked model rows follow the map and study statistics. Existing category scores and evaluated cohorts are unchanged. English and Chinese pages remain available at their direct URLs without a language toggle.

The map is generated from Natural Earth’s public-domain land polygons, without political borders. [Network and film metadata](data/network.json) is independent of the evaluated model/experiment data. The current map contains ten academic institutions in six countries; four institutions have supplied films. These counts describe the presented research network, not the coverage of the scored benchmark.

Original logos and laboratory footage are retained. Optimized H.264 viewing copies and frame-extracted posters live in `assets/experiments/`; video is fetched only when a visitor opens the player. See [media provenance and update instructions](docs/network-media.md).

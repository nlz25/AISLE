# AISLE — AI Scientists’ Last Exam

A research website for experimental evaluation of AI scientists, presenting **AISLE** results and evaluated tasks.

**Website:** https://nlz25.github.io/AISLE/
**中文:** https://nlz25.github.io/AISLE/zh/

The first release contains a research homepage, separate shared/full-coverage results, inline model details with category scores, task protocols, and academic/industry institution strips. English and Chinese pages share the same source and data.

## Local development

No application packages or build service are required. Use Python 3.9+ to regenerate static pages:

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check assets/site.js
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

The MVP navigation uses Home, Leaderboard and Tasks, with CN / EN language controls. The homepage places the ranked model rows with logos and category contribution bars immediately after the introduction. The background uses ALE’s `#f7f5f2`. Logos in `assets/logos/` are user-supplied originals. Category tabs show task context beside category rankings; no release dates are inferred.

Laboratory video files and their poster are retained for a future resource presentation. The MVP currently has no video entry point, player or video preview in social metadata.

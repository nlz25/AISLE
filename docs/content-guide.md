# Updating AISLE

## Where to edit

- `data/results.json`: first-stage category and aggregate scores, scope and snapshot date.
- `scripts/build_site.py`: English/Chinese copy, task specifications and scientific direction states.
- `assets/style.css`: shared visual system and responsive layouts.
- `assets/site.js`: mobile navigation, accessible tabs, sorting and on-demand video.
- `assets/lab-demo.mp4`: lighter viewing copy of the original `demo.mp4`.
- `assets/lab-poster.jpg`: a frame from the original laboratory recording; the homepage viewport displays the laboratory region without replacing equipment.
- `framework.png`: the original framework already present in the repository.

Run `python3 scripts/build_site.py` after changing data or page copy. The generated HTML files are committed so GitHub Pages needs no build dependencies. Results are explored through the clickable leaderboard and model detail panel; the website has no CSV download interface.

## Before adding a task

Fill in: scientific goal; allowed actions and variable ranges; observations; physical/simulated/measured-data environment; budget; stopping rules; success thresholds; repeats; scoring version; evidence links; current readiness.

Do not add a development direction to an established leaderboard until the evaluation coverage and scoring rules support it.

## Before updating results

Record the evaluation configuration and date when known. Keep `snapshotDate` separate from the dates on which experiments were conducted. Do not infer missing API parameters from provider defaults. Keep unmeasured entries as `null` (shown as N/A), not zero.

The shared index averages three categories. The full index includes multimodal scores and only models with complete coverage. Preserve original aggregate values computed before display rounding; do not recompute published numbers from rounded cells without checking the source.

## Assets and public releases

Use original equipment photographs and recordings. Label conceptual illustrations. Keep captions tied to actual sites and tasks. Public paper, code, dataset and citation links should be added only when they are available. Internal planning pages, local paths, unpublished reference answers and credentials do not belong in the public site.

## Release checks

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
node --check assets/site.js
python3 -m http.server 4173
```

Preview the site in desktop and mobile browsers. Check the two language versions, mobile navigation, keyboard tabs, cohort switching, category ordering, model detail panels, N/A states and video playback. Pages are hosted from `main` at `https://nlz25.github.io/AISLE/`.

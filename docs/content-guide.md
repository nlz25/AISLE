# Updating AISLE

## Where to edit

- `data/results.json`: first-stage category and aggregate scores, scope and snapshot date.
- `scripts/build_site.py`: English/Chinese copy, task specifications and chart rendering.
- `assets/style.css`: shared visual system and responsive layouts.
- `assets/site.js`: mobile navigation, accessible tabs, sorting and model details.
- `assets/lab-demo.mp4`: lighter viewing copy of the original `demo.mp4`.
- `assets/lab-poster.jpg`: a frame from the original laboratory recording, retained for future use.
- `framework.png`: the original framework already present in the repository.

Run `python3 scripts/build_site.py` after changing data or page copy. The generated HTML files are committed so GitHub Pages needs no build dependencies. Results are explored through the clickable leaderboard and inline score details; the website has no CSV download interface.

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

Preview the site in desktop and mobile browsers. Check the two language versions, mobile navigation, keyboard tabs, cohort switching, category ordering, model detail panels, and N/A states. Pages are hosted from `main` at `https://nlz25.github.io/AISLE/`.

## MVP structure

Home → introductory hero → Leaderboard → Tasks → contribution links. `tasks.html` contains task protocols and scoring, replacing the standalone Methodology page. Preserve model logos from `assets/logos/`. The x-axis is categorical; no release dates or harness settings are inferred.

Laboratory footage is temporarily removed from the website UI, including its entry button, player and social preview. Preserve the original assets until the resource presentation is decided.

Keep homepage copy factual and concise: benchmark purpose, evaluated coverage, named tasks and results. Model details expand within the leaderboard, without an overlay, scroll lock or automatic page jump.

## Institutions and score filters

`data/institutions.json` defines the two homepage groups (Academic Institutions and Industry), bilingual display names and logo filenames. Original supplied PNGs are kept in `assets/institutions/`. The combined logo strip and PowerPoint file are not published; each institution uses its individual asset. BEARS is confirmed as a separate institution, distinct from UC Berkeley.

Leaderboard header buttons switch between the existing aggregate and individual category scores, reordering the same cohort. Ties share a rank; missing results remain N/A and sort last. Category views use the category score itself on a 0–100 scale, while Overall retains equal-weight contributions. These are category aggregates, not new per-experiment or environment-specific scores.

The homepage hero has a plain cream background with no background animation or pause control. The centered title and early leaderboard remain.

Institution logos use a continuous horizontal strip with edge fades and pause-on-hover. The duplicated academic list is hidden from assistive technology. With only one industry member, GreenDynamics moves gently side to side without duplicating companies. Reduced-motion preferences stop both animations and leave the academic strip manually scrollable.

Public-facing branding is AISLE throughout. Repository and GitHub Issues links remain hidden until the project repository is ready. Language controls use CN / EN. Both institution groups remain single horizontal rows on every viewport, without a visible pause button.

The header uses the full project name. Footer snapshot text is hidden. Leaderboard rows and category segments show non-modal hover/focus previews; touch/click still opens inline details. Aggregate segments distinguish category scores from their weighted contribution. Homepage statistics count once to the unchanged final values over 1.1 seconds, with static accessible values and a reduced-motion fallback.

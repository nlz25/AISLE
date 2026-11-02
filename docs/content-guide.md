# Editing the AISLE website

## Source of truth

| Content | Edit |
| --- | --- |
| Homepage sections | `src/sitegen/pages/home.py` |
| Leaderboard page | `src/sitegen/pages/leaderboard.py` |
| Task protocols/scoring | `src/sitegen/pages/tasks.py` |
| Shared header/footer/metadata | `src/sitegen/components/layout.py` |
| Entrance markup | `src/sitegen/components/portal.py` |
| Results/chart markup | `src/sitegen/components/results.py` |
| Study scores and model names | `data/results.json` |
| Countries, institutions, film metadata | `data/network.json` |
| Institution credits | `data/institutions.json` |
| Base components and dark theme | `src/styles/base.css`, `src/styles/theme.css` |
| Entrance presentation | `src/styles/portal.css` |
| Browser interactions | `src/scripts/` |

The site is English only. Keep the original study scores and task claims intact. Seven models share three categories; five have full coverage. Unmeasured results stay N/A. The network's institution counts are independent of benchmark coverage.

## Typography

Use **DM Sans** for all headings, body copy, navigation, controls and data. Use its
local 400, 500, 600 and 700 weights. Section headings share
`--section-heading-size` in `src/styles/base.css`.

Reserve **Source Serif 4** for the entrance quotation, attribution and
"Nature as the Verifier" tagline. The locally hosted Latin variable font supports
weights 200–900 and optical sizes 8–60, so the quotation's bold emphasis uses a
real font weight. Both families use the SIL Open Font License; licenses are
included in `public/assets/fonts/`.

Source Serif 4 comes from [Adobe's open-source family](https://github.com/adobe-fonts/source-serif),
delivered as the [Google Fonts v15 Latin WOFF2](https://fonts.gstatic.com/s/sourceserif4/v15/vEFI2_tTDB4M7-auWDN0ahZJW1gb8tc.woff2).
Its license is copied from [Google Fonts](https://github.com/google/fonts/blob/main/ofl/sourceserif4/OFL.txt).
The site serves this file locally; visitors do not request fonts from Google.

## Workflow

1. Edit source files or data, then run `make check` with Python 3.12+.
2. Run `make serve` and inspect the changed pages at desktop and mobile widths.
3. For score changes, check cohort/category ordering and model detail panels.
4. For network changes, check locations, institution identity and film playback.
5. Commit the source changes and push to `main`. The Pages workflow builds and deploys `dist/`.

Do not commit generated `dist/` files. Add delivery assets to `public/assets/`, originals to `design/originals/`, and record their provenance. Optional regeneration of the current image/font delivery copies uses `python scripts/optimize_assets.py` after installing `requirements-dev.txt`.

The entrance title remains a single line with a straight apostrophe. Branding stays at the left edge and navigation at the right. Category colors in `src/sitegen/components/results.py` and `src/scripts/research.js` must agree; bar lengths must always represent the underlying scores.

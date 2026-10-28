# Research network and experiment media

The map uses the original institution logos already approved for the site. Country groups identify participating institutions, not locations at which every leaderboard result was measured. The benchmark statistics and scores remain sourced from `data/results.json`.

## Supplied footage

| Institution | Supplied file | Website copy | Subject indicated by the supplied material |
| --- | --- | --- | --- |
| Suzhou National Laboratory | SZLAB素材.mp4 | `assets/experiments/suzhou.mp4` | Colour matching |
| BEARS | Bears素材.mp4 | `assets/experiments/bears.mp4` | Colour matching and resin transfer |
| Central South University | CSU素材.mp4 | `assets/experiments/csu.mp4` | Copper-alloy heat treatment |
| UNSW Sydney | UNSW素材.mp4 | `assets/experiments/unsw.mp4` | Coloured photovoltaics |

The source package’s named institution folders establish these associations. H.264/AAC copies preserve the supplied sequences and are optimized for web playback at up to 960 px width and 24 fps. The posters are frames from the corresponding recordings (15 seconds for BEARS; 2 seconds for the others), not generated equipment images. Original recordings are not modified.

The four viewing copies total approximately 6.7 MB. The initial page only requests the map and selected poster; videos use `preload="none"` and receive a source after an explicit visitor click. Closing or pressing Escape pauses and unloads the video and restores focus to its opener.

## Updating a location

1. Update the existing institution strip in `data/institutions.json` if needed.
2. Add the institution to `data/network.json`, including its city/country, original logo filename and bilingual names.
3. Add the institution ID to exactly one country group. Country pins use a representative institution location; multiple institutions in the same country are selected within the card.
4. Add optional `video`, `topic`, `topicZh`, `description`, `descriptionZh` and `duration` fields only when corresponding supplied media exists. Store the matching `.mp4` and `.jpg` in `assets/experiments/`.
5. Build and validate with the commands in the README.

GreenDynamics remains in the Industry strip. Its map location is not inferred from its name; add it to the appropriate country group once that location is confirmed.

The world silhouette is derived from Natural Earth land polygons, using the projection documented in `assets/map/README.md`. Decorative connection arcs indicate a visual research network, not measured traffic, infrastructure or a claim about a specific pair of institutions. The displayed network counts are derived from the metadata.

# Research network and experiment media

The map shows research directions and supplied experiment films, without institution names or logos. Only locations with film content are shown; Asia-Pacific is the display label for the former China entry. Map locations are not claims about where every leaderboard result was measured. The benchmark statistics and scores remain sourced from `data/results.json`.

## Supplied footage

| Institution | Supplied file | Website copy | Subject indicated by the supplied material |
| --- | --- | --- | --- |
| Suzhou National Laboratory | SZLAB素材.mp4 | `public/assets/experiments/suzhou.mp4` | Colour matching |
| BEARS | Bears素材.mp4 | `public/assets/experiments/bears.mp4` | Colour matching and resin transfer |
| UNSW Sydney | UNSW素材.mp4 | `public/assets/experiments/unsw.mp4` | Coloured photovoltaics |

The source package’s named institution folders establish these associations. H.264/AAC copies preserve the supplied sequences and are optimized for web playback at up to 960 px width and 24 fps. The posters are frames from the corresponding recordings (15 seconds for BEARS; 2 seconds for the others), not generated equipment images. Original recordings are not modified.

The three viewing copies are loaded on demand. The initial page only requests the map and selected poster; videos use `preload="none"` and receive a source after an explicit visitor click. Closing or pressing Escape pauses and unloads the video and restores focus to its opener.

## Updating a location

1. Update the existing institution strip in `data/institutions.json` if needed.
2. Add the research record to `data/network.json`, including its location and media metadata. Institution branding stays in the separate institution strip.
3. Add the research record ID to exactly one location group. Pins use representative coordinates; multiple films are selected by research direction within the card.
4. Include `video`, `topic`, `description` and `duration` only when corresponding supplied media exists; do not publish empty map entries. Store the matching `.mp4` and `.webp` in `public/assets/experiments/`.
5. Build and validate with the commands in the README.

GreenDynamics remains in the Industry strip. Its map location is not inferred from its name; add it to the appropriate country group once that location is confirmed.

The world silhouette is derived from Natural Earth land polygons, using the projection documented in `design/originals/map/README.md`. Decorative connection arcs indicate a visual research network, not measured traffic, infrastructure or a claim about a specific pair of institutions. The displayed network counts are derived from the metadata.

The Suzhou Laboratory logo in the institution strip uses the supplied `SZLAB-V1.png` without image modification. Removed institutions and footage are no longer included in the public asset directory.

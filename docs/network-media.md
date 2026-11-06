# Research network and experiment media

The map shows research directions and supplied experiment films, without institution names or logos. North America includes the University of Toronto CdS-MPA quantum-dot film; Europe remains selectable with a video-pending card. Asia contains the Suzhou colour-matching and Central South University copper-alloy heat-treatment films, Singapore has its own pin and BEARS film, and Oceania contains the Australian film. The Asia regional pin is placed near Shenzhen at 22.54°N, 114.06°E, with its label above and to the right. Singapore uses a smaller circle (70% visual scale) while retaining its 44px click target and accessible name; its map text label is hidden. The other pins retain their original representative coordinates. Regional pins do not indicate a specific laboratory address. Map locations are not claims about where every leaderboard result was measured. The benchmark statistics and scores remain sourced from `data/results.json`.

## Supplied footage

Asia is selected initially. The map retains its full available width. Cards float near the selected pin while avoiding pins and labels; Asia and Oceania prefer positions toward the right edge when space permits. Selecting a location scrolls an offscreen card into view. Placement updates when the region, film direction or viewport changes. Clicking the map background clears the selection and hides the card and connector; selecting a regional pin or navigation button opens it again. On narrow screens the section reserves room for the card while preserving the map's aspect ratio. The section heading remains available to screen readers; the visible heading and return-to-entrance link are omitted.

| Institution | Supplied file | Website copy | Subject indicated by the supplied material |
| --- | --- | --- | --- |
| University of Toronto | CdS-MPA quantum dots.mov | `public/assets/experiments/uoft-cds-mpa.mp4` | CdS-MPA quantum dots |
| Suzhou National Laboratory | SZLAB素材.mp4 | `public/assets/experiments/suzhou.mp4` | Colour matching |
| BEARS | Bears素材.mp4 | `public/assets/experiments/bears.mp4` | Colour matching and resin transfer |
| Central South University | CSU素材.mp4 | `public/assets/experiments/csu.mp4` | Copper-alloy heat treatment |
| UNSW Sydney | UNSW素材.mp4 | `public/assets/experiments/unsw.mp4` | Coloured photovoltaics |

The source package’s named institution folders establish these associations. H.264/AAC copies preserve the supplied sequences and are optimized for web playback at up to 960 px width and 24 fps. The posters are frames from the corresponding recordings (15 seconds for BEARS; 2 seconds for the others), not generated equipment images. Original recordings are not modified.

The five viewing copies are loaded on demand. The initial page only requests the map and selected poster; videos use `preload="none"` and receive a source after an explicit visitor click. Closing or pressing Escape pauses and unloads the video and restores focus to its opener.

## Updating a location

1. Update the existing institution strip in `data/institutions.json` if needed.
2. Add the research record to `data/network.json`, including its location and media metadata. Institution branding stays in the separate institution strip.
3. Add the research record ID to exactly one location group. Pins use representative coordinates; multiple films are selected by research direction within the card.
4. Include `video`, `topic`, `description` and `duration` only when corresponding supplied media exists; leave the location’s `institutions` list empty when its video is pending. Store the matching `.mp4` and `.webp` in `public/assets/experiments/`.
5. Build and validate with the commands in the README.

GreenDynamics remains in the Industry strip. Its map location is not inferred from its name; add it to the appropriate country group once that location is confirmed.

The map combines Natural Earth land polygons with a graphite relief rendering of the existing Earth surface, elevation and historical night imagery, using the projection and attribution documented in `design/originals/map/README.md`. The warm city lights are geographic texture and do not represent research coverage. Decorative meteors travel between randomly selected peer regions, with either direction equally likely. Every 320–820 ms, one or two staggered transfers can launch without waiting for earlier transfers to finish. There are at most four active transfers with the current four regions, with an overall limit of five as regions are added; the same pair is never drawn twice simultaneously. A faint connection arc accompanies each moving head and fading tail, then disappears with the transfer; idle pairs have no connections. These animations do not represent measured traffic, infrastructure or a claim about a specific pair of institutions. The displayed network counts are derived from the metadata.

Suzhou National Laboratory and Shenzhen University are omitted from the institution strip. The supplied Suzhou experiment film remains available under Asia.

Central South University’s original heat-treatment film and poster are restored under Asia. Its institution-strip entry and logo remain omitted. Research media records do not require a logo.

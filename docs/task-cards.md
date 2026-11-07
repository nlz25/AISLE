# Task catalogue

The Tasks page embeds the catalogue in `public/task-cards/`. It contains seven task detail pages, workflow maps with video chapters, and the supplementary interactive scenes used by Tasks 02–04. Card/list browsing, search, and deep links work in the embedded and standalone catalogue.

The interface is imported from the [published AISLE Tasks page](https://yangsen-hub-dot.github.io/AISLE/tasks.html), source commit `ddc2e305e2a49bbff712457a348cb482213e5346`. Asset provenance is recorded in `public/task-cards/SOURCE.json`. The seven workflow videos are unchanged. The removed Task01 poster and the catalogue's lower-left Protocols link remain removed; optional cover previews no longer block catalogue startup.

The host repository keeps its existing navigation, homepage, leaderboard, and scientific protocol text, including the Dry/Wet score definitions. Existing protocol anchors remain available from the task details. Proposed tasks retain their proposed status.

## Edit and preview

Edit catalogue content in `public/task-cards/app.js`, chapter definitions in `public/task-cards/assets/task-graphs.js`, and page styling in the adjacent CSS files. The Tasks wrapper lives in `src/sitegen/pages/tasks.py`. Its iframe sizing and anchor handling are in the Tasks branch of `src/scripts/main.js`; shell styles are limited to `.tasks-page`.

Build with `python -X utf8 scripts/build_site.py`, then serve `dist/` over HTTP. Video chapter seeking requires a static server with byte-range support, for example:

```sh
npx --yes http-server@14.1.1 dist -a 127.0.0.1 -p 4173 -c-1
```

Visit http://127.0.0.1:4173/tasks.html. No deployment configuration is changed by this import. Preserve the font and icon licenses and `public/task-cards/assets/LICENSE-three.txt` when redistributing the assets; the latter covers the bundled and inline Three.js runtimes.

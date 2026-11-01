# Portal click counter

The counter records accepted clicks on the entrance circle, not unique visitors or page views. Loading or refreshing a page only reads the total. It starts at zero when first deployed; development data never reaches production.

## Structure

- `services/counter/worker.js`: a Cloudflare Worker with one SQLite-backed Durable Object (`portal`). GET `/count` reads the total; POST `/count` accepts a UUID v4 request ID and atomically increments it. A repeated request ID is ignored for 24 hours, allowing safe retries without deduplicating separate clicks.
- `data/counter.json`: public API URL. An empty endpoint disables the client. This is public configuration, not a credential.
- `src/scripts/counter.js`: nonblocking reads, click recording, one retry, monotonic display, and a reduced-motion-aware number transition.
- `src/sitegen/components/portal.py` and `src/styles/portal.css`: the readout above the entrance circle, with an accessible status and no secondary label.

The service stores only the total and short-lived random request IDs, not visitor IDs, IP addresses, or cookies. Worker application logging is disabled. Cloudflare still processes network requests under its service policies.

## Development and checks

```sh
cd services/counter
npm ci
npm test
npm run dev -- --var ALLOWED_ORIGINS:http://127.0.0.1:4173
```

For a local preview only, use `http://127.0.0.1:8787/count` as the endpoint, then rebuild the site. Restore the production URL before committing. Local persistence is inside ignored `.wrangler/` directories. Tests use a separate temporary database and remove it afterward.

Tests cover concurrent requests, retry deduplication, persistence across runtime restarts, CORS and invalid input, delayed reads, and offline behavior. Miniflare 4 is pinned for its stable test API; its `sharp` and `undici` dependencies are pinned to patched versions. Wrangler uses its own current runtime.

## Deployment

The frontend deploys through GitHub Pages. The counter service deploys separately:

```sh
cd services/counter
npm run deploy
```

Authenticate with the official Wrangler OAuth flow on the operator's computer. Never put OAuth credentials or API tokens in this repository or the frontend. Keep the Worker name, Durable Object class, migration history and instance name unchanged to preserve the total. There is deliberately no public reset or decrement endpoint.

The initial endpoint is `https://aisle-counter.aisle-counter.workers.dev/count`. Only the AISLE origins may write from browsers. This is a lightweight public engagement metric: Origin checks are not bot authentication, and scripts can inflate it. It must not be described as verified human visitors.

`workers.dev` can be unreachable on some networks, including the direct network used during setup. The readout stays hidden if its initial read fails; clicks cannot be recorded while the endpoint is unavailable. Navigation continues normally. A future custom API domain may improve reachability, but needs domain/DNS configuration and should be tested in the intended regions. No website DNS changes are part of this setup.

The deployment uses free-plan-compatible SQLite Durable Objects. Provider quotas still apply. The client reads once on entry/return (throttled), with no recurring polling or WebSocket.

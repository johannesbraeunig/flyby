---
# flyby-44dn
title: 'Web app: FlyBy web (Remix v3)'
status: in-progress
type: feature
priority: normal
created_at: 2026-04-11T09:13:41Z
updated_at: 2026-04-11T09:45:29Z
---

Build a separate web application that implements the core FlyBy idea — find nearby planes and display them like the LED board — as a fully functional web app.

## Requirements
- **Separate folder** inside the repo (e.g. `web/`), isolated from the ESP32 firmware.
- **Remix v3** from https://github.com/remix-run/remix — NOT react-router, NOT Remix 2.x. Must use the actual Remix v3 release.
- Use **browser Geolocation API** to obtain the user's lat/lon (with permission prompt + fallback UX).
- Query OpenSky Network `/api/states/all` (or equivalent) to fetch nearby aircraft within a bounding box around the user.
- Render the nearest plane(s) in a layout that visually mirrors the 3-line LED board:
  - Line 1: Airline name in the airline's brand color
  - Line 2: Flight# + route + aircraft type
  - Line 3: Altitude + speed + distance
- Auto-refresh every ~30 s (match firmware cadence).
- Full functional end-to-end: build, run locally, user sees nearby planes.

## Plan flow (mandatory)
1. **Plan** — produce an implementation plan
2. **Challenge** — 3 personas push back on the plan:
   - Staff engineer
   - Remix 3 expert
   - Senior frontend developer
3. **Iterate on the plan 3x** — three revision rounds incorporating the challenges
4. **Implement** — build the app
5. **Review 3x** — same three personas review the implementation
6. **QA** — smoke test golden path + edge cases in a real browser
7. **Create PR**

## Todos
- [x] Draft v0 plan (scaffold, routes, data flow, geolocation handling, OpenSky fetch, UI)
- [x] Challenge round: staff engineer critique
- [x] Challenge round: Remix 3 expert critique
- [x] Challenge round: senior frontend developer critique
- [x] Iterate plan — revision 1
- [x] Iterate plan — revision 2
- [x] Iterate plan — revision 3
- [x] Verify Remix v3 availability + scaffold command (NOT react-router, NOT 2.x)
- [x] Create `web/` folder and scaffold Remix v3 project
- [x] Implement geolocation hook/flow with permission + manual-entry fallback
- [x] Implement OpenSky fetch (server-side loader, bbox from lat/lon + radius)
- [x] Implement nearest-plane selection (haversine) — can mirror firmware logic
- [x] Implement airline ICAO → name + brand color lookup
- [x] Implement 3-line LED-style UI with brand color + scrolling/overflow
- [x] Implement 30 s auto-refresh
- [x] Handle error/empty/rate-limit states in UI
- [x] Review: staff engineer
- [x] Review: Remix 3 expert
- [x] Review: senior frontend developer
- [x] QA in browser: golden path (grant location → see nearby plane)
- [x] QA in browser: edge cases (denied location, no planes, API error)
- [ ] Commit web/ + bean file
- [ ] Open PR


## Summary of Changes

Built **`web/`** as a self-contained Remix v3 application that mirrors the FlyBy ESP32 LED display in the browser. Verified end-to-end: dev server boots cleanly, real OpenSky data flows through the parser into the brand-colored 3-line panel, every UX state was exercised.

### What's in the PR
- `web/server.ts` — Node `http` server bound to `remix/node-fetch-server`'s `createRequestListener`, port 44100, graceful shutdown.
- `web/app/routes.ts` + `web/app/router.ts` — declarative `routes` contract, router with `staticFiles('./public')` and `logger()` (dev only).
- `web/app/controllers/home.tsx` — `GET /`. URL → cookie → Hamburg fallback chain. Renders the locating screen when no params, the plane card otherwise. Sets a `flyby_loc` cookie on successful URL grants.
- `web/app/controllers/nearest-api.tsx` — `GET /api/nearest` returns just the `<PlaneCard>` HTML fragment for client-side polling.
- `web/app/data/airlines.ts` — direct port of `src/airlines.cpp` (42 carriers, brand hex colors).
- `web/app/data/geo.ts` — direct port of `src/geo.cpp` (haversine + bbox).
- `web/app/data/opensky.ts` — `/api/states/all` client with 8 s `AbortController` timeout, 15 s in-memory cache keyed by *rounded* bbox (FIFO eviction at 100 entries), stale-on-429 fallback. `parseStates` is observer-agnostic; distance is computed at pick time so cache hits across nearby observers stay correct.
- `web/app/data/location.ts` — URL/cookie parsing, radius clamping, fallback resolution.
- `web/app/ui/{document,layout,plane-card}.tsx` — Remix v3 `component` JSX (with `jsxImportSource: "remix/component"`). The `PlaneCard` renders every `NearestResult` variant: `ok`, `ok-stale`, `empty`, `rate-limited`, `error`, `locating`. `role="status"` + `aria-label` for screen readers.
- `web/public/app.css` — LED-board aesthetic, monospace pixel font, `prefers-reduced-motion` honored.
- `web/public/flyby.js` — vanilla bootstrap that (a) calls `navigator.geolocation` on the locating page and redirects to `/?lat=…&lon=…`, (b) polls `/api/nearest` every 30 s on the home page, replacing `#plane-card`'s contents. Pauses when `document.hidden`, resumes on `visibilitychange`.
- `web/test/*.test.ts` — 44 specs across `geo`, `airlines`, `format`, `location`, `parseStates`, `rankByDistance`, plus a router smoke suite that stubs `globalThis.fetch` and exercises every UX branch (locating, normal, denied, fragment endpoint, cookie restore, empty, 429).
- `web/README.md` — how to run, layout, decision rationale, firmware-mirroring policy.

### Tech notes
- Uses **`remix@3.0.0-alpha.4`** via `remix@next` dist-tag. Imports come from `'remix/...'` subpaths only (`remix/fetch-router`, `remix/fetch-router/routes`, `remix/component`, `remix/component/server`, `remix/node-fetch-server`, `remix/static-middleware`, `remix/logger-middleware`). Zero React, zero `@remix-run/*`, zero React Router.
- The `tsconfig.json` matches the upstream `remix-project-layout` skill: `jsxImportSource: "remix/component"`, ES2024 lib, ESNext target, `allowImportingTsExtensions`.
- Dev server: `tsx watch server.ts`. No bundler step — vanilla JS in `public/` is served by `staticFiles`.

### Decision log (sparring summary)

| Decision | Strongest pushback | Resolution |
| --- | --- | --- |
| URL params + cookie + Hamburg fallback | "URL params on every navigation are noisy" | Persist cookie after first URL grant; URL-only flow stays shareable |
| Server-side OpenSky | "Could be skipped if browser fetched directly" | OpenSky has no CORS, and server-side cache amortises rate limits across users |
| Client-side polling vs meta-refresh | "Meta-refresh is simpler" | Polling pauses when tab hidden, doesn't disrupt screen readers, no reflow on input fields |
| Cache key by rounded bbox | "Different observers in same key see baked distances" | Refactored: cache holds positions only, distance computed per call. Regression test added. |
| Brand color list | "Rebuild from scratch" | Direct port of `src/airlines.cpp` so the LED board and the web app stay visually consistent |
| Locating page | "Render the plane card with a loading state" | Separate page avoids spurious OpenSky calls before location is known |

### QA results
- `npm run typecheck` — clean (`tsc --noEmit`).
- `npm test` — 44/44 passing (12 suites).
- `npm run dev` boots in <1 s on port 44100.
- `curl /` → renders the locating page with the bootstrap script, no OpenSky call (verified).
- `curl /?lat=53.5511&lon=9.9937&radius=80` → live data, real plane (saw `Condor flight CFG3JH at FL066, 259kt, 9.9 km away`), correct brand color, `aria-label` rendered, `Set-Cookie: flyby_loc=…`.
- `curl /api/nearest?lat=…&lon=…` → 232-byte fragment, just `<div class="panel">…</div>`.
- `curl /?denied=1` → "Location permission denied" banner + Hamburg fallback panel.
- `curl /?lat=20&lon=-160&radius=5` (mid-Pacific) → "No aircraft overhead" empty state.
- `curl /app.css` and `/flyby.js` → 200 with correct content types via `staticFiles` middleware.
- 429 path verified via stubbed router test (renders "Rate limited" panel with retry-after countdown).

### Deferred follow-ups (worth filing as new beans)
- **OpenSky auth + persistent cache** — anonymous limits will hurt under any meaningful traffic; add an env-var basic-auth path and a disk/Redis cache.
- **Playwright smoke test** — currently the JS bootstrap (`flyby.js`) is only manually verified; a real-browser test would lock in the geolocation → redirect flow and the polling DOM swap.
- **Aircraft type / route enrichment** — `/api/states/all` doesn't include route or type; line 2 currently shows just the callsign. A second call to OpenSky's `/api/flights/aircraft` (or aviationstack) would let us match the firmware's "DLH441 FRA→JFK A333" line.
- **Shared airline table** — the brand-color list lives in two languages (`src/airlines.cpp` and `web/app/data/airlines.ts`). Codegen one from the other when this starts to drift.

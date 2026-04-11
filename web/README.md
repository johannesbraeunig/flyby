# FlyBy web

The browser sibling of the FlyBy ESP32 LED display. Open the page, grant
location, and see the nearest aircraft overhead in the same 3-line layout
the firmware draws on the HUB75 panel.

Built with **Remix v3** (`remix@next`, currently `3.0.0-alpha.4`). Not React,
not React Router, not Remix 2.x — Remix v3 is a collection of web-standards
primitives (`fetch-router`, `route-pattern`, `component`, `node-fetch-server`,
…) and that's what this app uses.

## Run it

```sh
cd web
pnpm install
pnpm dev
```

Then open <http://localhost:44100>.

The first visit prompts for browser geolocation. If you allow it, the page
redirects to `/?lat=…&lon=…` and the server starts asking OpenSky Network
for nearby aircraft. If you deny it, the page falls back to **Hamburg
(53.5511, 9.9937)** — the same default the firmware uses.

The plane card refreshes every 30 s via a small client-side poll against
`/api/nearest` (no full page reload, no meta refresh). Polling pauses when
the tab is hidden and resumes on focus.

## Scripts

| Command            | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | `tsx watch server.ts` on port 44100, with logger middleware |
| `pnpm start`       | Same, no watch; defaults to `PORT=3000` for container runtimes |
| `pnpm test`        | `node:test` via `tsx --test` — pure logic + router      |
| `pnpm typecheck`   | `tsc --noEmit`                                          |

## Layout

```
web/
├── server.ts                    # Node http server + remix/node-fetch-server
├── app/
│   ├── routes.ts                # Route contract (remix/fetch-router/routes)
│   ├── router.ts                # Router + middleware wiring
│   ├── controllers/
│   │   ├── home.tsx             # GET /          — locating + plane card
│   │   └── nearest-api.tsx      # GET /api/nearest — fragment for polling
│   ├── data/
│   │   ├── airlines.ts          # ICAO → name + brand color (port of src/airlines.cpp)
│   │   ├── geo.ts               # haversine + bbox (port of src/geo.cpp)
│   │   ├── location.ts          # URL → cookie → Hamburg fallback chain
│   │   └── opensky.ts           # /api/states/all client + 15s in-memory cache
│   ├── ui/
│   │   ├── document.tsx         # <html> shell
│   │   ├── layout.tsx           # Page chrome
│   │   └── plane-card.tsx       # 3-line LED-style panel
│   └── utils/
│       ├── format.ts            # FL / kt / km formatters
│       └── render.tsx           # renderToStream wrapper
├── public/
│   ├── app.css                  # LED-board styling
│   └── flyby.js                 # Geolocation bootstrap + 30s poll
└── test/                        # node:test specs
```

The layout follows the upstream `skills/remix-project-layout` SKILL.

## Data flow

1. Request comes in to `home` controller.
2. `resolveLocation` reads `?lat&lon&radius`, then a `flyby_loc` cookie,
   then falls back to Hamburg.
3. If we have no usable coordinates, the controller renders the **locating
   page** — no OpenSky call. The bundled `flyby.js` then prompts for
   geolocation and redirects.
4. Otherwise the controller calls `getNearestAircraft(lat, lon, radius)`,
   which:
    - Builds a bbox via `bboxFor` (mirrors firmware exactly).
    - Checks an in-memory cache keyed by *rounded* bbox (15 s TTL).
    - On miss, fetches OpenSky `/api/states/all` with an 8 s timeout.
    - Parses the positional-array response, drops on-ground / no-position
      rows, sorts by haversine distance.
5. The `<PlaneCard>` component renders the result. On 429 it serves the
   last cached row with a "rate limited" banner; on total failure it
   shows an explicit error state.
6. Client-side `flyby.js` polls `/api/nearest` (which returns the same
   `<PlaneCard>` markup as a fragment) every 30 s and replaces
   `#plane-card`'s contents.

## Why these decisions

| Question | Decision | Why |
| --- | --- | --- |
| Geolocation transport | URL query params (with cookie persistence) | Shareable links, server-only data fetching, no JS-only state |
| Refresh strategy | Client-side `setInterval` polling a fragment endpoint | No accessibility-hostile meta refresh; pauses when tab hidden |
| OpenSky access | Server-side only, with rounded-bbox cache | OpenSky CORS is unfriendly; cache also amortises rate limits |
| Rate-limit handling | Stale-on-429 from in-memory cache | A slightly old plane is more useful than an error page |
| Airline brand colors | Direct port of `src/airlines.cpp` | The firmware and the web app must agree visually |
| Auto-refresh cadence | 30 s | Matches firmware loop |
| UI framework | None — Remix v3 `component` only | The user asked for Remix 3, not React |
| Client bundler | None | Vanilla JS in `public/flyby.js` is enough; no JSX islands needed |

## Relationship to the firmware

The web app and the firmware (`/src/`) share **no code at runtime** — they
live in different languages and toolchains — but the algorithms are
mirrored line-for-line:

- `app/data/geo.ts` ↔ `src/geo.cpp`
- `app/data/airlines.ts` ↔ `src/airlines.cpp`
- `app/data/opensky.ts` (parseStates) ↔ `src/adsb_parse.cpp`

When the firmware table changes (e.g. new airline brand colors), update the
TS sibling in the same PR.

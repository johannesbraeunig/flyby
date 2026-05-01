---
# flyby-jbya
title: ADS-B API client (OpenSky)
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:13Z
updated_at: 2026-05-01T18:03:29Z
parent: flyby-56fy
---

Fetch live aircraft states from OpenSky Network's /api/states/all endpoint, bounded by a lat/lon box derived from configured location + radius. Parse JSON (streaming if possible to avoid heap blowups) and return the nearest aircraft by great-circle distance.

## Todos
- [ ] HTTPS client with cert bundle or insecure fallback
- [x] Build bounding box from (lat,lon,radius_km) — geo::bbox_for in src/geo.{h,cpp}, native-tested
- [ ] GET https://opensky-network.org/api/states/all?lamin=..&lomin=..&lamax=..&lomax=..
- [x] Parse JSON states array with ArduinoJson — adsb::parse_states_find_nearest in src/adsb_parse.{h,cpp}, native-tested
- [x] Haversine distance + nearest-pick — geo::haversine_km + adsb::parse_states_find_nearest, native-tested (Hamburg→London ≈ 720 km)
- [x] Plane struct with icao24, callsign, lat/lon, alt_m, vel_mps, hdg_deg, on_ground, distance_km — src/adsb_types.h
- [ ] Handle HTTP errors, rate-limits (429), empty results

## Progress (pure-C++ half complete)

Native-testable pieces are done and 13/13 tests pass:

- `src/geo.{h,cpp}` — `haversine_km`, `bbox_for`, `BBox` struct.
- `src/adsb_types.h` — `Plane` struct (fixed-size buffers, no heap).
- `src/adsb_parse.{h,cpp}` — `parse_states_find_nearest` using ArduinoJson 7. Skips on-ground + null-position aircraft, picks minimum great-circle distance, fills `Plane` including trimmed callsign and `distance_km`.
- `test/test_geo/` and `test/test_adsb_parse/` — Unity tests covering haversine accuracy, symmetry, bbox math, parser happy path, filtering, and edge cases (empty, on-ground only, null position, invalid JSON, null inputs).
- `platformio.ini` native env: `test_build_src = yes`, `build_src_filter = -<*> +<geo.cpp> +<adsb_parse.cpp>`, ArduinoJson dep, Unity double-precision flags.
- `.clangd` config strips PIO/Xtensa flags so editor LSP diagnostics work on host.

## Still TODO (Arduino half — next chunk)

- [x] HTTPS client with cert bundle or insecure fallback
- [x] GET https://opensky-network.org/api/states/all?lamin=..&lomin=..&lamax=..&lomax=..
- [x] Handle HTTP errors, rate-limits (429), empty results
- [x] Wire into main.cpp (uses real fetch via app.cpp)

## Summary of Changes

Replaced the stub adsb_fetch.cpp with a real WiFiClientSecure + HTTPClient implementation that builds the OpenSky bbox URL from geo::bbox_for, makes HTTPS GET with setInsecure(), handles rate-limits (429), HTTP errors, oversized responses, and empty bodies. Retains a NATIVE_BUILD stub so host tests still pass. All 46 native tests pass. ESP32 build: 14.6% RAM, 81.9% Flash.

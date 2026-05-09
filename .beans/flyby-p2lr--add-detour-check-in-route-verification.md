---
# flyby-p2lr
title: Add detour check in route verification
status: completed
type: bug
priority: normal
created_at: 2026-05-09T14:15:47Z
updated_at: 2026-05-09T14:18:20Z
---

route_lookup shows wrong routes (e.g. FRA→MUC for a Condor E190 actually descending into Hamburg). Cause: verify_route only inspects the first waypoint of OpenSky's track, and the long-track escape hatch lets stale historical adsbdb mappings slip through.

## Tasks

- [x] Change verify_route signature to take adsb::Plane const* (need current lat/lon, not just icao24)
- [x] Add geometric detour check at top of verify_route: reject if origin→plane + plane→destination significantly exceeds origin→destination
- [x] Add kMaxDetourKm constant (~200 km — generous for descent vectoring/holding)
- [x] Update call site in enrich()
- [x] Build, run native tests, flash (30 tests pass, uploaded)


## Summary of Changes

Added a geometric detour check at the top of `verify_route` in `src/route_lookup.cpp`. Compares great-circle origin→destination against origin→current-position + current-position→destination. If the detour exceeds 200 km, the route is rejected as wrong. This catches the failure mode where adsbdb returns a stale historical mapping (e.g. callsign CFG3FJ → FRA-MUC) for a flight that is actually flying a different rotation today (descent into Hamburg, ~700 km off-route).

The existing track-based verification stays as a secondary check. The detour check runs first because it is cheaper (no API call) and directly uses the plane current position, which the track check ignored.

Logs `Detour check: route=Xkm leg=Ykm detour=Zkm` per first-time-seen callsign so we can see the math in serial output.

## Files Changed

- `src/route_lookup.cpp` — added kMaxDetourKm constant, detour check, changed verify_route signature to take `const adsb::Plane*` (so it has lat/lon), updated call site.

---
# flyby-r86u
title: Validate adsbdb destination geometrically; show callsign on incomplete routes
status: completed
type: bug
created_at: 2026-05-09T15:00:23Z
updated_at: 2026-05-09T15:00:23Z
---

AFR31UA on approach to HAM displayed as CDG>BCN because adsbdb's stale historical mapping was CDG-BCN and origin matched OpenSky's departure (LFPG). My origin-only check left destination unvalidated.

Add a geometric detour check on adsbdb's destination when OpenSky has no arrival to compare against. If origin->plane->dest is more than 200 km longer than origin->dest direct, drop the destination. layout falls back to showing the callsign instead of a partial 'CDG>?'.

Also added a bit of breathing room in the route display: '%s > %s' when the total fits in the 64-px panel (10 chars), compact '%s>%s' when it doesn't.

## Tasks

- [x] Have fetch_adsbdb also return origin/destination lat/lon (parse from response)
- [x] Add geometric detour check helper in route_lookup.cpp using geo::haversine_km
- [x] Apply destination-only detour check when OpenSky arrival is missing
- [x] Update layout.cpp: require BOTH origin and destination for route display, fall back to callsign on either-empty
- [x] Update layout.cpp: use ' > ' separator when fits, compact '>' otherwise
- [x] Update test_layout assertion to new format
- [x] Build, test (36 pass), flash

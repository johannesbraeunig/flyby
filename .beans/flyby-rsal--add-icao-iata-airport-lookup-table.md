---
# flyby-rsal
title: Add ICAO->IATA airport lookup table
status: completed
type: feature
priority: normal
created_at: 2026-05-09T14:49:11Z
updated_at: 2026-05-09T15:00:23Z
---

Show readable IATA codes (HAM, FRA, MUC) instead of ICAO (EDDH, EDDF, EDDM) when adsbdb verification fails or returns nothing. Hardcode a small table of common airports — DACH region, major European hubs, holiday destinations, intercontinental hubs.

## Tasks

- [x] Create src/airports.h with icao_to_iata(icao) -> const char*
- [x] Create src/airports.cpp with curated table (~190 entries: DACH, Europe, holiday, intercont)
- [x] Wire airports::icao_to_iata into route_lookup.cpp fallback path; preserve ICAO when not in table
- [x] Add native unit tests in test/test_airports (6 tests)
- [x] Update platformio.ini native build_src_filter to include airports.cpp
- [x] Build, test (36 pass), flash

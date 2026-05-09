---
# flyby-rmdd
title: Switch route lookup to OpenSky flights endpoint
status: completed
type: feature
priority: normal
created_at: 2026-05-09T14:29:56Z
updated_at: 2026-05-09T14:33:46Z
---

Replace adsbdb callsign-based route lookup with OpenSky GET /api/flights/aircraft?icao24=...&begin=...&end=...

adsbdb returns the most-common historical route per callsign, which is wrong whenever an aircraft is on a different rotation than usual (very common for Hamburg-area landings). OpenSky flights endpoint keys on ICAO24 (unique per airframe) and returns the actual flights that aircraft has flown recently, with estDepartureAirport/estArrivalAirport in ICAO. Ground truth, not statistical guessing.

## Tasks

- [x] Expose adsb::opensky_token(id, secret) in adsb_fetch.h so route_lookup can reuse OAuth
- [x] Add NTP sync (configTime) after WiFi connects in app.cpp — flights endpoint needs UNIX time for begin/end
- [x] Rewrite route_lookup.cpp: drop adsbdb + track-verify + detour check; query OpenSky /flights/aircraft for icao24 in last 24h, pick most recent flight, fill origin/destination with ICAO codes
- [x] Extend route_lookup::enrich signature to take client_id/secret; update app.cpp call site
- [x] layout.cpp: change route format to %s>%s so 4-char ICAO codes fit (4+1+4 = 9 chars × 6px = 54px ≤ 64px panel)
- [x] Handle in-progress flights: if estArrivalAirport is null, display departure>? instead of empty
- [x] Build, test, flash

---
# flyby-pjm3
title: Add adsbdb destination fallback for in-progress flights
status: completed
type: feature
priority: normal
created_at: 2026-05-09T14:37:31Z
updated_at: 2026-05-09T14:43:04Z
---

OpenSky /flights/aircraft only records estArrivalAirport once the plane lands. Mid-cruise flights show "LPPT>?" instead of a destination. User wants a destination shown.

Strategy: keep OpenSky as the primary source (ground truth), fall back to adsbdb's callsign-to-route mapping ONLY for the field(s) OpenSky leaves empty. Read the ICAO code from adsbdb so the display stays ICAO-consistent.

Caveat: adsbdb returns the most-common historical route per callsign — sometimes wrong for off-rotation flights. Better than empty, worse than ground truth. Acceptable trade-off.

## Tasks

- [x] Re-add adsbdb fetch in route_lookup.cpp; capture both IATA and ICAO from adsbdb response
- [x] In enrich(), query both OpenSky and adsbdb; pick adsbdb IATA if its origin ICAO matches OpenSky departure (or no OpenSky data); else fall back to OpenSky ICAO
- [x] Always query adsbdb so we have IATA codes when verified — preferred for readability over OpenSky's ICAO
- [x] Build, test (30 pass), flash

## Summary

Verified-adsbdb-with-OpenSky strategy: query both, prefer adsbdb's IATA codes only if its origin ICAO matches OpenSky's departure (or OpenSky has no data). Otherwise fall back to OpenSky's ICAO codes.

Net effect:
- Today's-rotation flights with adsbdb data: shows IATA (FRA, MUC, HAM) — readable.
- Off-rotation or stale-adsbdb flights: shows OpenSky ICAO (EDDF, EDDH, etc.) — accurate but harder to read.
- adsbdb 404 + OpenSky has data: ICAO fallback.
- Neither has data: empty (?>?).
- In-progress flights: adsbdb fills the destination side that OpenSky leaves null.

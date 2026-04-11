---
# flyby-jbya
title: ADS-B API client (OpenSky)
status: todo
type: task
created_at: 2026-04-11T08:28:13Z
updated_at: 2026-04-11T08:28:13Z
parent: flyby-56fy
---

Fetch live aircraft states from OpenSky Network's /api/states/all endpoint, bounded by a lat/lon box derived from configured location + radius. Parse JSON (streaming if possible to avoid heap blowups) and return the nearest aircraft by great-circle distance.

## Todos
- [ ] HTTPS client with cert bundle or insecure fallback
- [ ] Build bounding box from (lat,lon,radius_km)
- [ ] GET https://opensky-network.org/api/states/all?lamin=..&lomin=..&lamax=..&lomax=..
- [ ] Stream-parse JSON "states" array with ArduinoJson filter
- [ ] Compute haversine distance; pick minimum
- [ ] Return struct { icao24, callsign, lat, lon, alt_m, vel_mps, heading, on_ground }
- [ ] Handle HTTP errors, rate-limits (429), empty results

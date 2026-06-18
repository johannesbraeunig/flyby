---
# flyby-vlqf
title: 'Wire screen pages with live flight data'
status: done
type: feature
priority: normal
created_at: 2026-04-17T10:00:00Z
updated_at: 2026-04-17T10:00:00Z
---

Wire all 6 screen pages (`/screens/*`) with real OpenSky data instead of hardcoded mock values.

## TODO
- [x] Read all relevant source files
- [x] Create implementation plan
- [x] Add `getAllNearbyAircraft` to opensky.ts
- [x] Update screens controller with data fetching
- [x] Wire landing screen with live stats
- [x] Wire board screen with live aircraft list
- [x] Wire radar screen with live blip positions
- [x] Wire overhead screen with nearest aircraft details
- [x] Wire detail screen with flight enrichment
- [x] Wire empty screen to show when no aircraft
- [x] Add tests for new controller logic
- [x] Run typecheck and tests
- [x] Create PR

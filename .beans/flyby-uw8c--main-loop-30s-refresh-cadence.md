---
# flyby-uw8c
title: Main loop + 30s refresh cadence
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:28Z
updated_at: 2026-04-11T09:38:52Z
parent: flyby-56fy
---

Wire everything together in main.cpp: boot -> load config -> connect WiFi (portal on failure) -> init display -> loop(fetch every 30s, render every frame for smooth scrolling). Watchdog-friendly, non-blocking.

## Todos
- [x] State machine: BOOT, CONNECTING, RUNNING, ERROR_WIFI (CONFIG state deferred to flyby-66mb captive portal)
- [x] Non-blocking 30 s fetch tick via millis() — kFetchIntervalMs in app.cpp, first fetch fires immediately on entering RUNNING
- [x] Fetch decoupled from render — render runs every kRenderIntervalMs (~30 FPS) regardless of fetch cadence
- [x] Error banner — status_frame helper renders red ERROR/no WiFi or no panel; Wokwi serial confirms transitions
- [x] Serial logging at every state transition + every fetch (callsign, alt, vel, distance)

## Summary of Changes

### Files
- `src/app.{h,cpp}` — owns the state machine (BOOT → CONNECTING → RUNNING / ERROR_WIFI), the 30 s ADS-B tick, the ~30 FPS render tick, and the per-state ticks. Calls `display::init`, `WiFi.begin`, `adsb::fetch_nearest`, `airlines::lookup`, `layout::compose`/`compose_idle`, `render::draw_frame`. Uses build flags `WIFI_SSID`/`WIFI_PASS` (Wokwi-GUEST defaults baked into the wokwi env).
- `src/adsb_fetch.{h,cpp}` — `adsb::fetch_nearest(obs_lat, obs_lon, radius_km, *out)` interface plus a STUB that returns a hardcoded Lufthansa over Hamburg. The Arduino half of flyby-jbya replaces adsb_fetch.cpp with a real WiFiClientSecure + HTTPClient implementation behind the same interface — no app.cpp changes needed.
- `src/main.cpp` — slimmed down to `app::setup()` / `app::loop()` delegation.

### Verified end-to-end in Wokwi
```
FlyBy boot
display ready
WiFi connecting to Wokwi-GUEST
WiFi connected
IP: 10.13.37.2
nearest: DLH441 11000m 250m/s 0.4km
```
`wokwi-cli --expect-text "nearest: DLH441" --timeout 30000` → TEST PASSED.

### Memory
- pio run -e wokwi → SUCCESS (RAM 13.3%, Flash 56.9%; the WiFi stack accounts for ~22 KB RAM and ~460 KB flash bump from the previous bean).
- pio test -e native → 46/46 still PASS (this bean adds no native-testable code; everything new is Arduino-side glue).

### Carry-over
- adsb_fetch.cpp is a stub. When flyby-jbya Arduino half lands, swap its body for a real OpenSky HTTPS fetch using geo::bbox_for + adsb::parse_states_find_nearest.
- WiFi setup is bare-minimum WiFi.begin with build-flag SSID/pass. flyby-66mb wraps this with WiFiManager + captive portal + NVS-persisted lat/lon/radius.

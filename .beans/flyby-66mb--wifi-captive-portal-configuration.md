---
# flyby-66mb
title: WiFi captive portal configuration
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:02Z
updated_at: 2026-05-01T18:03:40Z
parent: flyby-56fy
---

Use WiFiManager to configure SSID, password, latitude, longitude, and search radius on first boot. Persist config to NVS/Preferences so it survives reboots. Expose a way to reset config (e.g. hold BOOT button at startup).

## Todos
- [x] Integrate WiFiManager with captive portal
- [x] Add custom WiFiManagerParameter fields: lat, lon, radius_km
- [x] Persist parameters via Preferences (NVS)
- [x] Load persisted parameters on boot
- [x] Trigger config portal on WiFi failure or on-demand reset (BOOT button held at startup)
- [x] Show connection status on LED matrix during setup

## Summary of Changes

New config.h/config.cpp module with load/save/erase via Preferences (NVS) and run_portal() using WiFiManager with custom lat/lon/radius fields and 5-min timeout. app.cpp updated to load config on boot, check GPIO 0 (BOOT button) for forced portal reset, and show Setup AP status on LED matrix during portal.

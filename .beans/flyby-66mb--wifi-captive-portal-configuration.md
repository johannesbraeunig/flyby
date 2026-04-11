---
# flyby-66mb
title: WiFi captive portal configuration
status: todo
type: task
created_at: 2026-04-11T08:28:02Z
updated_at: 2026-04-11T08:28:02Z
parent: flyby-56fy
---

Use WiFiManager to configure SSID, password, latitude, longitude, and search radius on first boot. Persist config to NVS/Preferences so it survives reboots. Expose a way to reset config (e.g. hold BOOT button at startup).

## Todos
- [ ] Integrate WiFiManager with captive portal
- [ ] Add custom WiFiManagerParameter fields: lat, lon, radius_km
- [ ] Persist parameters via Preferences (NVS)
- [ ] Load persisted parameters on boot
- [ ] Trigger config portal on WiFi failure or on-demand reset
- [ ] Show connection status on LED matrix during setup

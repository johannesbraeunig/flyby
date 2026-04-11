---
# flyby-uw8c
title: Main loop + 30s refresh cadence
status: todo
type: task
created_at: 2026-04-11T08:28:28Z
updated_at: 2026-04-11T08:28:28Z
parent: flyby-56fy
---

Wire everything together in main.cpp: boot -> load config -> connect WiFi (portal on failure) -> init display -> loop(fetch every 30s, render every frame for smooth scrolling). Watchdog-friendly, non-blocking.

## Todos
- [ ] State machine: BOOT, CONFIG, CONNECTING, RUNNING, ERROR
- [ ] Non-blocking 30s fetch tick via millis()
- [ ] Decouple fetch from render (render at ~30fps for scroll)
- [ ] Error banners on display for transient failures
- [ ] Serial logging for debugging

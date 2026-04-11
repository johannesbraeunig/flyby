---
# flyby-vga8
title: Display rendering + scrolling
status: todo
type: task
created_at: 2026-04-11T08:28:24Z
updated_at: 2026-04-11T08:28:24Z
parent: flyby-56fy
---

Render the 3-line layout on the 64x32 panel with scrolling for overflow. OpenSky doesn't give origin/destination airports directly — for MVP show what is available (callsign, altitude, speed, distance) and leave route lookup as a later enhancement.

## Todos
- [ ] Line 1: airline name in brand color, scroll if > panel width
- [ ] Line 2: flight# + route (if known) + aircraft type (if known)
- [ ] Line 3: "FL350 480kt 4.2km" style compact stats (metric + aviation units)
- [ ] Non-blocking scroll via millis() ticks in loop()
- [ ] Show "No planes nearby" idle state
- [ ] Tiny font selection (5x7 or smaller)

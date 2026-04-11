---
# flyby-vga8
title: Display rendering + scrolling
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:24Z
updated_at: 2026-04-11T09:31:49Z
parent: flyby-56fy
---

Render the 3-line layout on the 64x32 panel with scrolling for overflow. OpenSky doesn't give origin/destination airports directly — for MVP show what is available (callsign, altitude, speed, distance) and leave route lookup as a later enhancement.

## Todos
- [x] Line 1: airline name in brand color (or ICAO prefix in white when unknown), scroll flag set if > panel width
- [~] Line 2: flight# only — route + aircraft type deferred (OpenSky doesn't return them; needs a callsign→route source)
- [x] Line 3: "FL361 486kt 4.2km" via format_stats_line (FL from m, kt from m/s, km with adaptive precision)
- [x] Non-blocking ping-pong scroll via layout::scroll_x_offset(text_w, panel_w, elapsed_ms, speed) — pure function, called by render::draw_frame each tick
- [x] Show "No planes nearby" idle state — layout::compose_idle (FlyBy + no planes, blank line 3)
- [x] Default Adafruit GFX 5x7 font (6x8 cell with kerning) — kCharWidth/kCharHeight/kLineNY constants in layout.h

## Summary of Changes

### Files
- `src/layout.{h,cpp}` — pure C++. Frame/Line structs, compose() and compose_idle(), per-field formatters (format_flight_level, format_speed_kt, format_distance_km, format_stats_line), text_width_px helper, and the scroll_x_offset ping-pong marquee.
- `src/render.{h,cpp}` — Arduino glue. render::draw_frame iterates the three lines, applies scroll for overflowing lines and centers non-overflowing ones, calls display::clear/drawText/flush.
- `test/test_layout/test_layout.cpp` — 24 tests covering every formatter (typical + zero + NaN + negative), full stats line, compose with known/unknown airline, idle frame, scroll math (no overflow, t=0, mid-left, full-left, returning, period loop, zero/negative speed), and text_width_px.
- `platformio.ini`: layout.cpp added to native build_src_filter.

### Verified
- `pio test -e native` → 46/46 PASS in <3s (geo + adsb_parse + airlines + layout)
- `pio run -e wokwi` → SUCCESS (RAM 6.6%, Flash 21.9%)

### Visual verification
As with flyby-dieo, this can't be visually confirmed in Wokwi (`wokwi-hub75-matrix` is a non-functional placeholder — see docs/development.md). The logic is exhaustively unit-tested on the host; the actual rendering call paths are thin and exercised by the wokwi build linker. Visual confirmation lands when real hardware arrives.

### Carry-over
- Line 2 route + aircraft type need a callsign→route data source (OpenSky `/api/states/all` doesn't return origin/destination). Candidates: hexdb.io, OpenSky's separate flight history API, or an onboard mini DB. Worth a follow-up bean.
- main.cpp does not yet call render::draw_frame — that wiring belongs to flyby-uw8c (main loop / 30s tick) which composes a fetch tick + render tick. The render code compiles into the wokwi binary regardless and is ready to be wired.

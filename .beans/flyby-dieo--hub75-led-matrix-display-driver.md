---
# flyby-dieo
title: HUB75 LED matrix display driver
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:07Z
updated_at: 2026-04-11T09:08:21Z
parent: flyby-56fy
---

Initialize ESP32-HUB75-MatrixPanel-DMA for a 64x32 P4 panel with 1/32 scan. Define pin mapping for ESP32-WROOM-32. Provide a small drawing API (clear, drawLine(row), scroll).

## Todos
- [x] Define HUB75 pin mapping (R1 G1 B1 R2 G2 B2, A-E, CLK LAT OE)
- [x] Initialize MatrixPanel_I2S_DMA with 64x32 config
- [~] Wrapper for drawing 3 text lines at known y-offsets — deferred to flyby-vga8 (display rendering bean owns the layout API)
- [x] RGB color helper / brightness setting
- [x] Smoke test: draw "FlyBy" on boot (visual verification deferred to real hardware)

## Summary of Changes

HUB75 driver code is **complete**. Visual verification is **deferred to real hardware** because the Wokwi `wokwi-hub75-matrix` part is a non-functional placeholder (registry marks it `documented: false`, no GitHub diagram.json files use it, screenshot API has no framebuffer, `fillScreen` at full brightness with E→GND wiring produces nothing). See docs/development.md for the full investigation.

### Files
- `src/display.h` — public facade: `init()`, `clear()`, `fillSolid()`, `rgb()`, `drawText()`, `flush()`, `kWidth=64`, `kHeight=32`.
- `src/display.cpp` — `MatrixPanel_I2S_DMA` setup with our pin map (kR1..kCLK), brightness 90/255, single 64x32 panel.
- `src/main.cpp` — calls `display::init()`, draws FlyBy centered in cyan if init succeeds.

### Verified
- `pio run -e wokwi` → SUCCESS (RAM 6.6%, Flash 21.8%)
- `wokwi-cli --expect-text "display ready"` → TEST PASSED — `panel->begin()` returns true in Wokwi

### Pin name gotcha
Arduino's `binary.h` `#define`s `B0..B11111111` as binary literal macros. Plain `constexpr int B1` collides at compile time. All pin constants are k-prefixed.

### Carry-over to flyby-vga8 (display rendering)
The 3-line layout API (line1/line2/line3 wrappers, scrolling) is owned by the rendering bean, not the driver. This bean exposes the primitives (`drawText`, `fillSolid`, `rgb`) that vga8 will compose into the layout.

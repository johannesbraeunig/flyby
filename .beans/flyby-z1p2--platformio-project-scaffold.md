---
# flyby-z1p2
title: PlatformIO project scaffold
status: completed
type: task
priority: high
created_at: 2026-04-11T08:27:58Z
updated_at: 2026-04-11T08:56:02Z
parent: flyby-56fy
---

Set up PlatformIO project for ESP32 Arduino framework with three envs: real hardware, Wokwi simulator, and host-side native unit tests. The user has no hardware yet — Wokwi + native are the dev path until hardware arrives.

## Todos
- [x] Install PlatformIO (brew install platformio)
- [x] Create platformio.ini with three envs:
    - [x] [env:esp32dev] — real hardware target
    - [x] [env:wokwi] — same build, used by Wokwi VS Code extension
    - [x] [env:native] — host-side unit tests (no Arduino runtime)
- [x] Declare deps: ESP32-HUB75-MatrixPanel-DMA (+ Adafruit GFX/BusIO), ArduinoJson, WiFiManager
- [x] Set monitor_speed = 115200
- [x] Create src/main.cpp skeleton (setup/loop)
- [x] Create src/ layout (Arduino-free logic vs Arduino glue) — include/ deferred until first shared header
- [x] Create test/test_native/ for host unit tests + first sanity test
- [x] Create wokwi.toml + diagram.json for the Wokwi simulator
- [x] Add .gitignore for .pio/, .vscode/, .wokwi/
- [x] Remove stray package.json (this is not a Node project)
- [x] Document Wokwi VS Code extension install in README + docs/development.md

## Summary of Changes

PlatformIO project scaffolded with three envs (`esp32dev`, `wokwi`, `native`). All three verified green:

- `pio test -e native` → 1/1 PASS (Unity sanity test)
- `pio run -e esp32dev` → SUCCESS (RAM 6.6%, Flash 20.4%)
- `pio run -e wokwi` → SUCCESS, produces firmware.{bin,elf}
- `wokwi-cli --expect-text "FlyBy boot"` → TEST PASSED — full boot + serial heartbeat in the simulator
- VS Code Wokwi extension confirmed working end-to-end on the user's machine

Files: platformio.ini, src/main.cpp, test/test_native/test_sanity.cpp, wokwi.toml, diagram.json, .gitignore, README.md, docs/hardware.md, docs/architecture.md, docs/development.md.

## Notes for follow-on beans

- Real `wokwi-esp32-devkit-v1` part doesn't expose GPIO 16/17 — pin map (in docs/hardware.md) routes HUB75 D/CLK via GPIO 21/22 so a single map works on both Wokwi and real hardware.
- HUB75 lib registry name is `mrfaptastic/...` not `mrcodetastic/...` (GitHub repo was renamed but PIO registry still has the old namespace). Adafruit GFX + BusIO must be declared as explicit deps — PlatformIO does not auto-resolve them transitively.
- `wokwi-cli` (installed at `~/.wokwi/bin/wokwi-cli`) is the fastest debugging loop for any future `diagram.json` change.

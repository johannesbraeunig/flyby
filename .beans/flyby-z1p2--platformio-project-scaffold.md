---
# flyby-z1p2
title: PlatformIO project scaffold
status: in-progress
type: task
priority: high
created_at: 2026-04-11T08:27:58Z
updated_at: 2026-04-11T08:35:51Z
parent: flyby-56fy
---

Set up PlatformIO project for ESP32 Arduino framework with three envs: real hardware, Wokwi simulator, and host-side native unit tests. The user has no hardware yet — Wokwi + native are the dev path until hardware arrives.

## Todos
- [x] Install PlatformIO (brew install platformio)
- [ ] Create platformio.ini with three envs:
    - [ ] [env:esp32dev] — real hardware target
    - [ ] [env:wokwi] — same build, used by Wokwi VS Code extension
    - [ ] [env:native] — host-side unit tests (no Arduino runtime)
- [ ] Declare deps: ESP32-HUB75-MatrixPanel-DMA, ArduinoJson, WiFiManager
- [ ] Set monitor_speed = 115200
- [ ] Create src/main.cpp skeleton (setup/loop)
- [ ] Create include/ and src/ directory layout (Arduino-free logic vs Arduino glue)
- [ ] Create test/test_native/ for host unit tests + first sanity test
- [ ] Create wokwi.toml + diagram.json for the Wokwi simulator
- [ ] Add .gitignore for .pio/, .vscode/, .wokwi/
- [ ] Remove stray package.json (this is not a Node project)
- [ ] Document Wokwi VS Code extension install in README

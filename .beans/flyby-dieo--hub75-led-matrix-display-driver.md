---
# flyby-dieo
title: HUB75 LED matrix display driver
status: todo
type: task
created_at: 2026-04-11T08:28:07Z
updated_at: 2026-04-11T08:28:07Z
parent: flyby-56fy
---

Initialize ESP32-HUB75-MatrixPanel-DMA for a 64x32 P4 panel with 1/32 scan. Define pin mapping for ESP32-WROOM-32. Provide a small drawing API (clear, drawLine(row), scroll).

## Todos
- [ ] Define HUB75 pin mapping (R1 G1 B1 R2 G2 B2, A-E, CLK LAT OE)
- [ ] Initialize MatrixPanel_I2S_DMA with 64x32 config
- [ ] Wrapper for drawing 3 text lines at known y-offsets
- [ ] RGB color helper / brightness setting
- [ ] Smoke test: draw "FlyBy" on boot

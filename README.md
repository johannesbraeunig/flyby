# FlyBy

A DIY real-time flight tracker display built with an **ESP32** and a **64×32 RGB LED matrix panel** (HUB75). It shows the nearest aircraft overhead — airline name (in brand color), flight number, route, altitude, speed, and distance — refreshing every 30 seconds.

Inspired by [nearestplane.com](https://nearestplane.com), but fully DIY for ~30€.

## Features

- Nearest-aircraft lookup via ADS-B API (OpenSky Network)
- 3-line layout on a 64×32 P4 HUB75 panel
- Airline → brand color lookup for line 1
- Scrolling text for overflow
- 30 s refresh cadence
- WiFi captive portal for first-time setup (SSID, password, lat/lon, radius)
- Configurable search radius, persisted to NVS

## Hardware

| Part | Notes |
|---|---|
| ESP32-WROOM-32 DevKit (USB-C) | Any common dev board works |
| P4 64×32 HUB75 RGB LED Matrix | 256×128 mm, SMD2121, 1/32 scan |
| 5 V 4 A power supply | Feed the panel directly, **not** through the ESP32 |
| F-F dupont jumper wires | To wire the panel's HUB75 header to the ESP32 |

See [docs/hardware.md](docs/hardware.md) for the full wiring diagram and pin map.

## Software stack

- **PlatformIO** (Arduino framework for ESP32)
- [`ESP32-HUB75-MatrixPanel-DMA`](https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA) — panel driver
- [`ArduinoJson`](https://arduinojson.org/) — streaming JSON parser
- [`WiFiManager`](https://github.com/tzapu/WiFiManager) — captive-portal setup

See [docs/architecture.md](docs/architecture.md) for the runtime design and [docs/development.md](docs/development.md) for the dev workflow (Wokwi simulator, CLI debugging, gotchas).

## Getting started

### Install PlatformIO

```bash
brew install platformio        # macOS (recommended)
# or: pipx install platformio
```

### Build envs

The project ships with three PlatformIO envs so you can develop without hardware:

| Env | Purpose | Command |
|---|---|---|
| `esp32dev` | Real hardware target | `pio run -e esp32dev` |
| `wokwi` | Same firmware, run in the [Wokwi](https://wokwi.com) simulator | `pio run -e wokwi` |
| `native` | Host-side unit tests (no Arduino runtime) | `pio test -e native` |

### Run in the Wokwi simulator (no hardware needed)

1. Install the **Wokwi for VS Code** extension (`wokwi.wokwi-vscode`).
2. Activate your Wokwi license: `Ctrl+Shift+P` → `Wokwi: Request a new License`.
3. Build the firmware: `pio run -e wokwi`.
4. Open `diagram.json` and click **Start Simulation** in the Wokwi panel — or `Ctrl+Shift+P` → `Wokwi: Start Simulator`.
5. The simulator picks up `wokwi.toml`, which points at `.pio/build/wokwi/firmware.{bin,elf}`.

The Wokwi env builds with `-DFLYBY_WOKWI=1` and pre-fills WiFi creds for the magic `Wokwi-GUEST` network so the simulator connects to the real internet automatically.

### Flash real hardware (when it arrives)

```bash
pio run -e esp32dev -t upload && pio device monitor
```

On first boot the device exposes a WiFi AP called `FlyBy-Setup`. Connect to it, and the captive portal will prompt for WiFi credentials, your latitude/longitude, and search radius (km).

Default test location is **Hamburg, Germany**.

### Run host-side unit tests

```bash
pio test -e native
```

Pure-C++ logic (haversine, bbox, layout, airline lookup) gets unit-tested on your laptop without ever touching the ESP32 toolchain — fast iteration loop while the firmware build is the slow path.

## Display layout

```
+----------------------------------------+
| Lufthansa                    <- line 1 | airline name, brand RGB
| DLH441 FRA->JFK A333         <- line 2 | flight # + route + type
| FL380  465kt  3.1 km         <- line 3 | altitude + speed + distance
+----------------------------------------+
```

Lines that exceed the 64 px width scroll horizontally.

## Project tracking

Work is tracked with [beans](https://github.com/beansdev/beans). The top-level epic is `flyby-56fy`.

```bash
beans list --ready        # what's ready to pick up next
beans show flyby-56fy     # the epic
```

## License

TBD.

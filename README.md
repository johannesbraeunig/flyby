# FlyBy

A DIY real-time flight tracker built with an **ESP32** and a **64x32 RGB LED matrix panel**. Shows the nearest aircraft overhead — airline name in brand color, route, distance, and compass direction — refreshing every 30 seconds.

Total cost: ~30 EUR.

## What it looks like

```
     Condor           <- airline name (brand color)
   FRA>JFK            <- route (IATA when adsbdb verified, ICAO fallback)
    12km NO           <- distance + compass direction
```

## Hardware

| Qty | Part | Notes |
|-----|------|-------|
| 1 | ESP32-WROOM-32 DevKit (USB-C) | 38-pin variant recommended |
| 1 | P4 64x32 HUB75 RGB LED Matrix Panel | 256x128 mm, SMD2121, 1/32 scan |
| 1 | 5V 4A power supply (USB output) | For the panel — do NOT power it through the ESP32 |
| ~16 | F-F dupont jumper wires | Or use an ESP32 screw terminal adapter board |
| 1 | USB-C cable | For flashing the ESP32 |

## Wiring

### HUB75 panel to ESP32

Connect the panel's **DATA_IN** header (not DATA_OUT) to the ESP32. Pin 1 on the header is marked with an arrow or dot.

```
Pin 1  (R1)  *  o  Pin 2  (G1)
Pin 3  (B1)  o  o  Pin 4  (GND)
Pin 5  (R2)  o  o  Pin 6  (G2)
Pin 7  (B2)  o  o  Pin 8  (GND)
Pin 9  (A)   o  o  Pin 10 (B)
Pin 11 (C)   o  o  Pin 12 (D)
Pin 13 (CLK) o  o  Pin 14 (LAT)
Pin 15 (OE)  o  o  Pin 16 (E)
```

| HUB75 Pin | ESP32 GPIO |
|-----------|-----------|
| R1 | 25 |
| G1 | 26 |
| B1 | 27 |
| R2 | 14 |
| G2 | 12 |
| B2 | 13 |
| A | 23 |
| B | 19 |
| C | 5 |
| D | 21 |
| E | 18 |
| LAT | 4 |
| OE | 15 |
| CLK | 22 |
| GND (pin 4, 8) | GND |

### Power

- **Panel**: Connect the 5V power supply to the panel's VCC/GND connector (white plug in the center of the PCB).
- **ESP32**: Power via USB-C (from your computer for flashing, or from the same 5V power supply for standalone operation).
- **Common ground**: Connect the power supply GND to the ESP32 GND — this is essential for the HUB75 data lines to work.

> **Never power the panel from the ESP32's 5V pin.** A 64x32 panel at full white draws 2-3A, well beyond what USB can deliver.

### Standalone operation

Once flashed, the ESP32 stores WiFi credentials and location in non-volatile storage. You can disconnect it from your computer and power it with any USB-C power source. It will boot, connect to WiFi, and start tracking flights automatically.

## Software stack

- **PlatformIO** (Arduino framework for ESP32)
- [ESP32-HUB75-MatrixPanel-DMA](https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA) — panel driver
- [ArduinoJson](https://arduinojson.org/) — JSON parser
- [WiFiManager](https://github.com/tzapu/WiFiManager) — captive portal for first-time setup

### Data sources

| Data | Source | Auth |
|------|--------|------|
| Live aircraft positions | [OpenSky `/states/all`](https://opensky-network.org/api/states/all) | OAuth2 client credentials (optional, raises rate limits) |
| Flight routes — ground-truth (ICAO) | [OpenSky `/flights/aircraft`](https://opensky-network.org/api/flights/aircraft) — keyed by ICAO24, returns the aircraft's actual recent flights | OAuth2 (same credentials) |
| Flight routes — IATA + early destination | [adsbdb.com](https://api.adsbdb.com/v0/callsign/) — keyed by callsign. Used when its origin ICAO matches OpenSky's departure (verified for today's rotation), giving readable IATA codes and a destination guess for in-flight planes. | None (free) |
| Aircraft type codes | [OpenSky Metadata API](https://opensky-network.org/api/metadata/aircraft/icao/) | None (free) |

## Getting started

### 1. Install PlatformIO

```bash
brew install platformio        # macOS
# or: pipx install platformio
```

### 2. Flash the firmware

```bash
pio run -e esp32dev -t upload
```

### 3. Configure via captive portal

On first boot, the ESP32 creates a WiFi network called **FlyBy-Setup**. Connect to it from your phone and enter:

- Your home WiFi SSID and password
- Your latitude and longitude (right-click your location in Google Maps to copy)
- Search radius in km (default: 50)

The ESP32 saves this config and uses it on every subsequent boot.

### 4. Reset configuration

Hold the **BOOT** button while pressing **EN** (reset) to erase saved config and re-enter the captive portal.

## Display

Three lines, all centered, using the built-in 5x7 Adafruit GFX font:

| Line | Content | Color |
|------|---------|-------|
| 1 | Airline name (or callsign if unknown) | Airline brand color |
| 2 | Route: ICAO origin>destination (e.g. `EDDF>EDDH`), or callsign as fallback | White |
| 3 | Distance + compass direction | Green (<5km), Yellow (<20km), Blue (>=20km) |

The compass direction uses German abbreviations: N, NO, O, SO, S, SW, W, NW.

## Development

### Build environments

| Env | Purpose | Command |
|-----|---------|---------|
| `esp32dev` | Real hardware | `pio run -e esp32dev` |
| `wokwi` | Wokwi simulator | `pio run -e wokwi` |
| `native` | Host-side unit tests | `pio test -e native` |

### Run unit tests

```bash
pio test -e native
```

Pure C++ logic (haversine, bounding box, layout formatting, airline lookup, ADS-B parsing) is tested on your laptop without the ESP32 toolchain.

### Serial logs

While the ESP32 is connected over USB, stream serial output (115200 baud) and tee it to a file for later inspection:

```bash
pio device monitor -e esp32dev | tee ~/flyby.log
```

Useful lines to watch for: `heap: free=… maxAlloc=…` (per-fetch heap stats), `ADS-B GET …`, `Flight: <ICAO>-><ICAO>`, error frames like `ADS-B: HTTP 401`. `Ctrl-C` (or `Ctrl-T` then `q`) to quit.

### Wokwi simulator

1. Install the **Wokwi for VS Code** extension.
2. Activate your Wokwi license.
3. Build: `pio run -e wokwi`
4. Open `diagram.json` and click **Start Simulation**.

The Wokwi env connects to the `Wokwi-GUEST` network automatically.

### Source layout

```
src/
  main.cpp           Entrypoint (delegates to app.h)
  app.cpp/h          State machine: BOOT > CONNECTING > RUNNING
  display.cpp/h      HUB75 panel driver wrapper
  render.cpp/h       Draws frames to the display
  layout.cpp/h       Composes 3-line frames from plane data
  adsb_fetch.cpp/h   HTTPS client for OpenSky API
  adsb_parse.cpp/h   JSON parser for OpenSky state vectors
  adsb_types.h       Plane struct (shared between parser and renderer)
  route_lookup.cpp/h Route enrichment via OpenSky /flights/aircraft
  aircraft_type.cpp/h Aircraft type lookup via OpenSky metadata
  airlines.cpp/h     ICAO airline code > name + brand color table
  geo.cpp/h          Haversine distance, bounding box, bearing
  config.cpp/h       WiFi captive portal + NVS persistence
```

## Troubleshooting

- **Ghosting / wrong colors**: Check that R1/G1/B1 and R2/G2/B2 are not swapped.
- **Dim top or bottom half**: The E address line (GPIO 18) is not connected. 1/32 scan panels need all 5 address lines.
- **Flickering pixels**: Reduce brightness in `display.cpp` or use shorter jumper wires.
- **"no planes" but aircraft are nearby**: Check WiFi connection. The ESP32 needs internet access to query the OpenSky API. Try resetting with the EN button.
- **ESP32 brownouts / resets**: Never share 5V between panel and ESP32 via thin jumpers. Use separate power paths.

## Project tracking

Work is tracked with [beans](https://github.com/beansdev/beans). The top-level epic is `flyby-56fy`.

```bash
beans list --ready        # what's ready to pick up next
beans show flyby-56fy     # the epic
```

## License

[MIT](LICENSE)

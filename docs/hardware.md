# Hardware

## Bill of materials

| Qty | Part | Notes |
|---|---|---|
| 1 | ESP32-WROOM-32 DevKit (USB-C) | 38-pin variant recommended |
| 1 | P4 64×32 HUB75 RGB LED Matrix Panel | 256×128 mm, SMD2121, 1/32 scan |
| 1 | 5 V 4 A DC power supply | Barrel or screw terminal — feeds the panel |
| ~16 | F-F dupont jumper wires | To wire the HUB75 socket to the ESP32 |
| 1 | USB-C cable | For flashing + powering the ESP32 |

Budget: roughly 30 € total.

## HUB75 pinout

A 64×32 1/32-scan panel uses a standard HUB75(E) 16-pin IDC header:

```
R1  G1        R2  G2
B1  GND       B2  GND
A   B         C   D
CLK LAT       OE  GND
E   (or GND on some panels)
```

The 5 address lines (A–E) are needed because 1/32 scan addresses 32 rows.

## Suggested ESP32 pin map

This maps cleanly to common ESP32-WROOM-32 boards and avoids the strapping pins as much as possible. Adjust in `platformio.ini` / display config if your board differs.

| HUB75 | ESP32 GPIO |
|---|---|
| R1  | 25 |
| G1  | 26 |
| B1  | 27 |
| R2  | 14 |
| G2  | 12 |
| B2  | 13 |
| A   | 23 |
| B   | 19 |
| C   | 5  |
| D   | 17 |
| E   | 18 |
| LAT | 4  |
| OE  | 15 |
| CLK | 16 |
| GND | GND (multiple) |

> GPIO 2 is a strapping pin — avoid it for HUB75. GPIO 0 is BOOT and also a strapping pin. GPIO 6–11 are reserved for flash.

## Power

**Do not power the panel from the ESP32's 5 V pin.** A 64×32 panel at full white can pull 2–3 A — well beyond what USB can deliver.

- Power the **panel** directly from the 5 V 4 A PSU (screw terminals on the panel).
- Power the **ESP32** via its USB-C port.
- Tie **GND of the PSU to GND of the ESP32** — this is essential; the HUB75 data lines are TTL and need a common reference.

## First-boot smoke test

With nothing but power + USB connected, flashing the firmware should light up the panel with the word `FlyBy` — see `flyby-dieo` (HUB75 LED matrix display driver).

## Known gotchas

- **Ghosting / wrong colors**: double-check R1/G1/B1 and R2/G2/B2 are not swapped, and that the E line is connected for 1/32 scan panels.
- **Dim top half, bright bottom half** (or vice versa): E address line missing or on the wrong pin.
- **Flicker**: brightness too high for the PSU, or long/thin jumper wires adding resistance on 5 V. Use short, thick wires for VCC/GND.
- **ESP32 brownouts**: never share 5 V between panel and ESP32 via thin jumpers.

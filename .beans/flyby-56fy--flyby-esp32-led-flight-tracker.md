---
# flyby-56fy
title: FlyBy — ESP32 LED flight tracker
status: in-progress
type: epic
priority: high
created_at: 2026-04-11T08:27:50Z
updated_at: 2026-04-11T08:27:50Z
---

Build a DIY real-time flight tracker on an ESP32 + 64x32 HUB75 RGB LED matrix that shows the nearest aircraft overhead.

## Hardware
- ESP32-WROOM-32 DevKit (USB-C)
- P4 64x32 HUB75 RGB LED Matrix Panel (256x128mm, SMD2121, 1/32 scan)
- 5V 4A power supply
- F-F dupont jumper wires

## Software stack
- PlatformIO (Arduino framework, ESP32)
- ESP32-HUB75-MatrixPanel-DMA
- ArduinoJSON
- WiFiManager (captive portal)

## Features
- WiFi captive portal for SSID/pass/lat/lon/radius on first boot
- ADS-B API client (OpenSky Network primary, optional ADS-B Exchange fallback)
- Nearest-plane selection by great-circle distance
- Airline ICAO -> name + brand RGB lookup
- 3-line display with scrolling for overflow
- 30s refresh cadence
- Configurable search radius

## Display layout
- Line 1: Airline name (brand color)
- Line 2: Flight# route (e.g. BA117 LHR->JFK) + aircraft type
- Line 3: Altitude + speed + distance

Default test location: Hamburg, Germany.

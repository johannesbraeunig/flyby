# Architecture

## Runtime overview

FlyBy is a single-threaded Arduino-style app running on an ESP32. The `loop()` drives a small state machine; a non-blocking timer triggers ADS-B fetches, and rendering runs every frame so scrolling stays smooth while network I/O happens in the background.

```
 ┌────────┐   ┌──────────┐   ┌────────────┐   ┌─────────┐   ┌───────┐
 │  BOOT  ├──►│  CONFIG  ├──►│ CONNECTING ├──►│ RUNNING │◄─►│ ERROR │
 └────────┘   └──────────┘   └────────────┘   └─────────┘   └───────┘
      │            ▲                                ▲
      │            │                                │
      │     (no WiFi creds /                 (fetch fails,
      │      portal requested)                retry w/ backoff)
      ▼
   NVS load
```

- **BOOT** — init serial, display, load persisted config from NVS.
- **CONFIG** — launch WiFiManager captive portal (`FlyBy-Setup`). User enters SSID / pass / lat / lon / radius.
- **CONNECTING** — try WiFi; show progress on the panel. Falls back to CONFIG on timeout.
- **RUNNING** — fetch every 30 s, render every frame.
- **ERROR** — transient failures display a banner and auto-retry.

## Module layout

```
src/
  main.cpp            // state machine + loop
  config.{h,cpp}      // NVS-backed settings (ssid, pass, lat, lon, radius)
  wifi_setup.{h,cpp}  // WiFiManager glue + custom fields
  adsb.{h,cpp}        // OpenSky client + haversine + nearest-plane
  display.{h,cpp}     // HUB75 init + 3-line drawing + scroll
  airlines.h          // PROGMEM ICAO → {name, brand RGB} table
```

## Data flow

```
 WiFiManager ──► Config (NVS)
                    │
                    ▼
              ADSB::fetchNearest(lat, lon, radius)
                    │  HTTPS GET opensky /api/states/all?bbox
                    │  streaming JSON parse (ArduinoJson filter)
                    │  haversine → pick min
                    ▼
              Plane { icao24, callsign, lat, lon, alt, vel, hdg }
                    │
                    ▼
         Airlines::lookup(callsign) → {name, color}
                    │
                    ▼
            Display::render(plane, airline)
              ├─ line 1: airline name in brand color (scroll if > 64 px)
              ├─ line 2: flight# + route + type
              └─ line 3: alt + speed + distance
```

## ADS-B source

Primary: **OpenSky Network** — free, anonymous access to `/api/states/all`. Query a lat/lon bounding box derived from `(lat, lon, radius_km)` so the response stays small.

Rate limits (anonymous): ~10 requests/minute — well within our 30 s cadence.

> OpenSky's `states/all` response does **not** include origin/destination airports. For MVP, line 2 shows flight number only; airport route lookup (e.g. via a secondary API or onboard callsign → route DB) is deferred.

## Memory considerations

The ESP32-WROOM-32 has ~320 KB of usable SRAM, and the HUB75 DMA buffer for a 64×32 panel at ~24-bit color eats a meaningful chunk. Guidelines:

- **Stream-parse JSON** with an `ArduinoJson` filter — never load the full `states/all` response into RAM.
- Keep the airline table in **PROGMEM** (`const PROGMEM`).
- Prefer `F("…")` for string literals in `Serial.print` / display draws.
- Avoid `String` concatenation hotspots — use fixed `char[]` buffers.

## Power budget

- Panel: up to ~3 A at full white. Render at lower brightness (`setBrightness8(80-120/255)`) for sane current draw.
- ESP32 at ~150 mA average (WiFi TX peaks higher).
- PSU: 5 V / 4 A gives headroom for both (panel on PSU terminals, ESP32 on USB).

## Refresh cadence

- **Fetch**: every 30 s, non-blocking (`millis()` tick).
- **Render**: every loop iteration — target ~30 FPS for smooth scroll.
- The fetch kicks off at the start of a 30 s window; between fetches, the last-known plane data is rendered continuously.

---
# flyby-hxkt
title: Airline ICAO lookup + brand colors
status: completed
type: task
priority: normal
created_at: 2026-04-11T08:28:18Z
updated_at: 2026-04-11T09:22:06Z
parent: flyby-56fy
---

Static lookup table mapping ICAO airline codes (first 3 letters of callsign) to {airline name, brand RGB color}. Stored in PROGMEM to save RAM. Covers ~50 common carriers for Hamburg airspace (LH, BA, AF, KL, FR, EZY, U2, EW, DL, UA, AA, EK, QR, TK, etc.).

## Todos
- [x] Create airlines.h with Entry struct (no PROGMEM needed — ESP32 puts const data in flash automatically)
- [x] Include 42 common airlines (Hamburg/EU + intercontinental) with name + brand RGB
- [x] airlines::lookup(callsign) returns const Entry* (nullptr if unknown)
- [~] Fallback for unknown airlines: show raw ICAO in white — deferred to flyby-vga8 (rendering owns the fallback display logic)

## Summary of Changes

42-entry static airline lookup table with brand colors, native-tested.

### Files
- `src/airlines.h` — `Entry { icao[4], name, r, g, b }`, `lookup(callsign)`, `table()`, `table_size()`.
- `src/airlines.cpp` — alphabetically-sorted const table covering DLH, BAW, AFR, KLM, RYR, EZY, EWG, DAL, UAL, AAL, UAE, QTR, THY, SWR, AUA, TAP, IBE, VLG, WZZ, FIN, SAS, NAX, LOT, AFL, SVA, ETD, CPA, SIA, ANA, JAL, KAL, AIC, ACA, ICE, BEL, SXS, TUI, CFG, PGT, BCS, GEC, ROT. Linear scan (table is small, lookups happen at most once per 30 s refresh).
- `test/test_airlines/test_airlines.cpp` — 9 tests covering known carrier, case insensitivity, unknown, short callsign, null input, callsign-without-flight-number, plus table-integrity tests (no duplicate ICAOs, all uppercase, all names non-empty).

### Verified
- `pio test -e native` → 22/22 PASS (geo + adsb_parse + airlines)
- `pio run -e wokwi` → SUCCESS

### Design notes
- No PROGMEM macros: ESP32 unified memory means `const` is enough; the table goes to flash automatically. This is what makes the same source compile clean on the host.
- Brand colors are pragmatic approximations chosen for LED-matrix readability, not exact Pantone matches. Easy to refine later.
- The unknown-airline fallback (raw ICAO in white) is rendering policy, so it lives in flyby-vga8 alongside the rest of the layout.

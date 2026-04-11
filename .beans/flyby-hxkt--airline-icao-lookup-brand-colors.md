---
# flyby-hxkt
title: Airline ICAO lookup + brand colors
status: todo
type: task
created_at: 2026-04-11T08:28:18Z
updated_at: 2026-04-11T08:28:18Z
parent: flyby-56fy
---

Static lookup table mapping ICAO airline codes (first 3 letters of callsign) to {airline name, brand RGB color}. Stored in PROGMEM to save RAM. Covers ~50 common carriers for Hamburg airspace (LH, BA, AF, KL, FR, EZY, U2, EW, DL, UA, AA, EK, QR, TK, etc.).

## Todos
- [ ] Create airlines.h with PROGMEM struct array
- [ ] Include 40-60 common airlines with name + brand RGB
- [ ] lookupAirline(const char* callsign) -> {name, color, found}
- [ ] Fallback for unknown airlines: show raw ICAO in white

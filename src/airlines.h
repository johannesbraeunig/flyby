// FlyBy airlines — ICAO airline code → display name + brand color.
//
// Pure C++, Arduino-free, host-testable. The table is `const` so on
// ESP32 it lives in flash (Xtensa unified memory — no PROGMEM dance
// needed for read-only data on this platform).

#pragma once

#include <stddef.h>
#include <stdint.h>

namespace airlines {

// One row in the lookup table.
struct Entry {
  char icao[4];     // 3 ASCII uppercase chars + null
  const char* name; // human-readable airline name
  uint8_t r;        // brand color, 8-bit per channel
  uint8_t g;
  uint8_t b;
};

// Look up an airline from a callsign (e.g. "DLH441" → Lufthansa).
// Uses the first three characters of the callsign as the ICAO code,
// case-insensitive. Returns nullptr if no entry matches.
const Entry* lookup(const char* callsign);

// Table accessors. Useful for tests and for any UI that wants to
// iterate (e.g. a "supported airlines" diagnostic screen).
const Entry* table();
size_t table_size();

}  // namespace airlines

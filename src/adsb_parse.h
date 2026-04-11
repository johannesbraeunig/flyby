// FlyBy ADS-B — parse OpenSky /api/states/all JSON, pick the nearest
// airborne aircraft to a given observer position.
//
// Pure C++ + ArduinoJson (header-only, cross-platform). Arduino-free.

#pragma once

#include <stddef.h>

#include "adsb_types.h"

namespace adsb {

// Parse an OpenSky /api/states/all JSON response and write the nearest
// airborne aircraft to *out.
//
// - Skips aircraft with on_ground = true.
// - Skips aircraft with null latitude or longitude.
// - "Nearest" is great-circle distance from (obs_lat, obs_lon).
// - On success returns true and *out is fully populated (including
//   distance_km).
// - Returns false if the JSON is invalid, the "states" array is missing
//   or empty, or no airborne aircraft survive filtering.
//
// json must be null-terminated. json_len is a hint to ArduinoJson and
// may be 0, in which case strlen(json) is used.
bool parse_states_find_nearest(const char* json,
                                size_t json_len,
                                double obs_lat,
                                double obs_lon,
                                Plane* out);

}  // namespace adsb

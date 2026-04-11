// FlyBy ADS-B — types shared between the parser, the HTTP client, and main.
//
// Pure C++, Arduino-free, host-testable.

#pragma once

#include <math.h>

namespace adsb {

// One aircraft as we care about it. Sized to live on the stack.
//
// Strings use fixed buffers (no String, no heap) so the parser can write
// directly into a stack-allocated Plane and the rendering layer can read
// without further allocation.
struct Plane {
  char icao24[7];     // 6 hex chars + null
  char callsign[9];   // up to 8 chars + null, trimmed of trailing spaces
  double lat;
  double lon;
  float  alt_m;       // barometric altitude in meters; NaN if unknown
  float  vel_mps;     // ground speed in m/s; NaN if unknown
  float  hdg_deg;     // true track in degrees; NaN if unknown
  bool   on_ground;
  float  distance_km; // populated by parser when given an observer position
};

inline void plane_clear(Plane* p) {
  p->icao24[0] = 0;
  p->callsign[0] = 0;
  p->lat = 0;
  p->lon = 0;
  p->alt_m = NAN;
  p->vel_mps = NAN;
  p->hdg_deg = NAN;
  p->on_ground = false;
  p->distance_km = NAN;
}

}  // namespace adsb

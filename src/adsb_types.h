#pragma once

#include <math.h>

namespace adsb {

struct Plane {
  char icao24[7];
  char callsign[9];
  double lat;
  double lon;
  float  alt_m;
  float  vel_mps;
  float  hdg_deg;
  float  vrate_mps;     // vertical rate in m/s; positive = climbing
  bool   on_ground;
  float  distance_km;
  float  bearing_deg;
  char   origin[5];
  char   destination[5];
  char   aircraft_type[5]; // ICAO type code (e.g. "B748", "A20N")
};

inline void plane_clear(Plane* p) {
  p->icao24[0] = 0;
  p->callsign[0] = 0;
  p->lat = 0;
  p->lon = 0;
  p->alt_m = NAN;
  p->vel_mps = NAN;
  p->hdg_deg = NAN;
  p->vrate_mps = NAN;
  p->on_ground = false;
  p->distance_km = NAN;
  p->bearing_deg = NAN;
  p->origin[0] = 0;
  p->destination[0] = 0;
  p->aircraft_type[0] = 0;
}

}  // namespace adsb

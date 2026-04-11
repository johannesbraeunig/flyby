// FlyBy ADS-B fetch — STUB implementation.
//
// Returns a hardcoded Lufthansa flight overhead so the rest of the
// pipeline (state machine, render, layout, airline lookup) can run
// end-to-end before flyby-jbya's Arduino HTTPS half lands.
//
// When the real fetch arrives, this file gets replaced (same header)
// with a WiFiClientSecure + HTTPClient implementation that builds the
// OpenSky bbox URL via geo::bbox_for and parses the response with
// adsb::parse_states_find_nearest.

#include "adsb_fetch.h"

#include <string.h>

namespace adsb {

bool fetch_nearest(double /*obs_lat*/,
                   double /*obs_lon*/,
                   double /*radius_km*/,
                   Plane* out) {
  if (!out) return false;
  plane_clear(out);
  // Hardcoded sample: DLH441, ~over Hamburg, FL361, 250 m/s, 0.4 km away.
  strncpy(out->icao24,  "abc123",  sizeof(out->icao24)  - 1);
  strncpy(out->callsign, "DLH441", sizeof(out->callsign) - 1);
  out->lat = 53.5511;
  out->lon = 9.9937;
  out->alt_m       = 11000.0f;
  out->vel_mps     = 250.0f;
  out->hdg_deg     = 90.0f;
  out->on_ground   = false;
  out->distance_km = 0.4f;
  return true;
}

}  // namespace adsb

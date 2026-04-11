// FlyBy ADS-B fetch — interface for retrieving the nearest aircraft.
//
// This is the seam between the layout/render code (which only knows
// about adsb::Plane) and the network layer. The Arduino half of
// flyby-jbya replaces this implementation with a real OpenSky HTTPS
// fetch; until then, a stub returns a hardcoded sample so the rest
// of the pipeline runs end-to-end.

#pragma once

#include "adsb_types.h"

namespace adsb {

// Fetch the nearest airborne aircraft to (obs_lat, obs_lon) within
// `radius_km`. Returns true if a plane was found and *out is populated.
// Returns false on no result, network error, or stub failure.
bool fetch_nearest(double obs_lat,
                   double obs_lon,
                   double radius_km,
                   Plane* out);

}  // namespace adsb

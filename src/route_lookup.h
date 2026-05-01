#pragma once

#include "adsb_types.h"

namespace route_lookup {

// Query adsbdb.com for the route of a given callsign and populate
// plane->origin and plane->destination with IATA codes.
// Non-blocking-safe: call once per fetch cycle, not per frame.
// On failure or unknown callsign, origin/destination remain empty.
void enrich(adsb::Plane* plane);

}  // namespace route_lookup

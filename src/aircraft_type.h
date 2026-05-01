#pragma once

#include "adsb_types.h"

namespace aircraft_type {

// Query OpenSky metadata API for the aircraft type by ICAO24 hex.
// Populates plane->aircraft_type with the ICAO type code (e.g. "B748").
// Caches results by icao24. Non-blocking-safe: call once per fetch cycle.
void enrich(adsb::Plane* plane);

}  // namespace aircraft_type

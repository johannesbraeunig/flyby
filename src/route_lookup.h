#pragma once

#include "adsb_types.h"

namespace route_lookup {

// Query OpenSky's /flights/aircraft for the most recent flight of this
// aircraft (keyed by icao24) and populate plane->origin/destination with
// ICAO airport codes. OAuth credentials are reused via adsb::opensky_token.
//
// Non-blocking-safe: call once per fetch cycle, not per frame.
// On failure, missing data, or pre-NTP-sync, origin/destination stay empty.
void enrich(adsb::Plane* plane,
            const char* client_id,
            const char* client_secret);

}  // namespace route_lookup

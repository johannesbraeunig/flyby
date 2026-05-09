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

enum class FetchStatus {
  Ok,             // *out populated with nearest plane
  NoPlane,        // 200 OK but no plane found in bbox
  NetworkError,   // connect/HTTP/TLS failure or non-200/401/429 response
  AuthError,      // 401 still failing after token refresh
  RateLimited,    // 429
};

// Fetch the nearest airborne aircraft to (obs_lat, obs_lon) within
// `radius_km`. On Ok, *out is populated.
//
// If client_id and client_secret are non-empty, OAuth2 client credentials
// are used for authenticated access (higher rate limits). Otherwise
// falls back to anonymous access.
FetchStatus fetch_nearest(double obs_lat,
                          double obs_lon,
                          double radius_km,
                          const char* client_id,
                          const char* client_secret,
                          Plane* out);

// Returns a cached OAuth bearer token for OpenSky, refreshing if needed.
// Returns nullptr if credentials are empty or refresh is in cooldown.
// The returned pointer is valid until the next call.
// Allows other modules (route_lookup) to authenticate against OpenSky
// without duplicating the OAuth client-credentials flow.
const char* opensky_token(const char* client_id, const char* client_secret);

}  // namespace adsb

#include "adsb_parse.h"

#include <ArduinoJson.h>
#include <math.h>
#include <string.h>

#include <limits>

#include "geo.h"

namespace adsb {
namespace {

// Trim trailing ASCII spaces in-place. OpenSky callsigns are space-padded
// to 8 chars (e.g. "DLH441  ").
void rtrim_spaces(char* s) {
  if (!s) return;
  size_t n = strlen(s);
  while (n > 0 && s[n - 1] == ' ') {
    s[--n] = 0;
  }
}

// Safe copy into a fixed-size buffer, always null-terminated.
void copy_into(char* dst, size_t dst_size, const char* src) {
  if (dst_size == 0) return;
  if (!src) {
    dst[0] = 0;
    return;
  }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) {
    dst[i] = src[i];
  }
  dst[i] = 0;
}

// OpenSky state vector indices (per /api/states/all docs):
//   0  icao24       (string)
//   1  callsign     (string|null)
//   2  origin_country
//   3  time_position
//   4  last_contact
//   5  longitude    (number|null)
//   6  latitude     (number|null)
//   7  baro_altitude (number|null, meters)
//   8  on_ground    (bool)
//   9  velocity     (number|null, m/s)
//  10  true_track   (number|null, deg)
//  11  vertical_rate
//  12  sensors
//  13  geo_altitude
//  14  squawk
//  15  spi
//  16  position_source
constexpr int kIdxIcao24    = 0;
constexpr int kIdxCallsign  = 1;
constexpr int kIdxLon       = 5;
constexpr int kIdxLat       = 6;
constexpr int kIdxBaroAlt   = 7;
constexpr int kIdxOnGround  = 8;
constexpr int kIdxVelocity  = 9;
constexpr int kIdxTrueTrack = 10;
constexpr int kIdxVertRate  = 11;
constexpr size_t kMinStateLen = 12;

}  // namespace

bool parse_states_find_nearest(const char* json,
                                size_t json_len,
                                double obs_lat,
                                double obs_lon,
                                Plane* out) {
  if (!json || !out) return false;
  if (json_len == 0) json_len = strlen(json);
  if (json_len == 0) return false;

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, json, json_len);
  if (err) return false;

  JsonArray states = doc["states"].as<JsonArray>();
  if (states.isNull() || states.size() == 0) return false;

  double best_dist = std::numeric_limits<double>::infinity();
  bool found = false;
  Plane best;
  plane_clear(&best);

  for (JsonArray state : states) {
    if (state.size() < kMinStateLen) continue;
    if (state[kIdxOnGround].as<bool>()) continue;
    if (state[kIdxLat].isNull() || state[kIdxLon].isNull()) continue;

    const double lat = state[kIdxLat].as<double>();
    const double lon = state[kIdxLon].as<double>();
    const double dist = geo::haversine_km(obs_lat, obs_lon, lat, lon);
    if (dist >= best_dist) continue;

    best_dist = dist;

    copy_into(best.icao24, sizeof(best.icao24),
              state[kIdxIcao24].as<const char*>());

    copy_into(best.callsign, sizeof(best.callsign),
              state[kIdxCallsign].as<const char*>());
    rtrim_spaces(best.callsign);

    best.lat = lat;
    best.lon = lon;
    best.alt_m = state[kIdxBaroAlt].isNull()
                     ? NAN
                     : state[kIdxBaroAlt].as<float>();
    best.vel_mps = state[kIdxVelocity].isNull()
                       ? NAN
                       : state[kIdxVelocity].as<float>();
    best.hdg_deg = state[kIdxTrueTrack].isNull()
                       ? NAN
                       : state[kIdxTrueTrack].as<float>();
    best.on_ground = false;
    best.vrate_mps = state[kIdxVertRate].isNull()
                         ? NAN
                         : state[kIdxVertRate].as<float>();
    best.distance_km = static_cast<float>(dist);
    best.bearing_deg = static_cast<float>(geo::bearing_deg(obs_lat, obs_lon, lat, lon));
    found = true;
  }

  if (found) *out = best;
  return found;
}

}  // namespace adsb

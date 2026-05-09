#include "route_lookup.h"

#ifdef NATIVE_BUILD

namespace route_lookup {
void enrich(adsb::Plane*, const char*, const char*) {}
}  // namespace route_lookup

#else

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <string.h>
#include <time.h>

#include "adsb_fetch.h"

namespace route_lookup {
namespace {

constexpr size_t   kMaxBodyBytes = 8 * 1024;
constexpr uint32_t kCacheTtlMs   = 5UL * 60 * 1000;       // 5 min
constexpr long     kLookbackSec  = 24L * 3600;            // 24 h
constexpr time_t   kMinValidUnix = 1700000000;            // 2023-11

struct RouteCache {
  char     icao24[7];          // key (lowercase hex, 6 chars + null)
  uint32_t cached_at_ms;
  bool     populated;          // true once we have queried at least once
  char     origin[5];          // ICAO 4-char + null (may be empty)
  char     destination[5];
};

RouteCache cache = {};

void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) { dst[0] = 0; return; }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

// Query OpenSky /api/flights/aircraft for the most recent flight of `icao24`.
// Returns true if at least one of origin/destination was populated in `out`.
bool fetch_recent_flight(const char* icao24,
                         const char* client_id,
                         const char* client_secret,
                         RouteCache* out) {
  time_t now = time(nullptr);
  if (now < kMinValidUnix) {
    Serial.println(F("Flight: NTP not synced yet, skipping"));
    return false;
  }
  long begin = static_cast<long>(now) - kLookbackSec;
  long end   = static_cast<long>(now);

  char url[224];
  snprintf(url, sizeof(url),
           "https://opensky-network.org/api/flights/aircraft"
           "?icao24=%s&begin=%ld&end=%ld",
           icao24, begin, end);
  Serial.print(F("Flight GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println(F("Flight: http.begin failed"));
    return false;
  }
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  http.addHeader("Accept", "application/json");

  const char* token = adsb::opensky_token(client_id, client_secret);
  if (token) {
    String auth = String("Bearer ") + token;
    http.addHeader("Authorization", auth);
  }

  int code = http.GET();
  if (code != 200) {
    Serial.printf("Flight: HTTP %d\n", code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();
  if (body.length() == 0 || body.length() > kMaxBodyBytes) {
    Serial.printf("Flight: bad body length %u\n", body.length());
    return false;
  }

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    Serial.println(F("Flight: JSON parse failed"));
    return false;
  }

  JsonArray flights = doc.as<JsonArray>();
  if (flights.isNull() || flights.size() == 0) {
    Serial.println(F("Flight: no recent flights"));
    return false;
  }

  // Pick most recent flight by max firstSeen.
  JsonObject best;
  long best_first_seen = -1;
  for (JsonObject f : flights) {
    long fs = f["firstSeen"].as<long>();
    if (fs > best_first_seen) {
      best_first_seen = fs;
      best = f;
    }
  }
  if (best.isNull()) return false;

  const char* dep = best["estDepartureAirport"].as<const char*>();
  const char* arr = best["estArrivalAirport"].as<const char*>();
  copy_into(out->origin,      sizeof(out->origin),      dep);
  copy_into(out->destination, sizeof(out->destination), arr);

  Serial.printf("Flight: %s -> %s\n",
                out->origin[0]      ? out->origin      : "?",
                out->destination[0] ? out->destination : "?");
  return out->origin[0] || out->destination[0];
}

}  // namespace

void enrich(adsb::Plane* plane,
            const char* client_id,
            const char* client_secret) {
  if (!plane || plane->icao24[0] == 0) return;

  uint32_t now_ms = millis();

  // Cache hit (same aircraft, within TTL): reuse.
  if (cache.populated &&
      strcmp(plane->icao24, cache.icao24) == 0 &&
      (now_ms - cache.cached_at_ms) < kCacheTtlMs) {
    copy_into(plane->origin,      sizeof(plane->origin),      cache.origin);
    copy_into(plane->destination, sizeof(plane->destination), cache.destination);
    return;
  }

  // Refresh.
  copy_into(cache.icao24, sizeof(cache.icao24), plane->icao24);
  cache.origin[0]      = 0;
  cache.destination[0] = 0;
  cache.cached_at_ms   = now_ms;
  cache.populated      = true;

  fetch_recent_flight(plane->icao24, client_id, client_secret, &cache);

  copy_into(plane->origin,      sizeof(plane->origin),      cache.origin);
  copy_into(plane->destination, sizeof(plane->destination), cache.destination);
}

}  // namespace route_lookup

#endif  // NATIVE_BUILD

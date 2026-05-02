#include "route_lookup.h"

#ifdef NATIVE_BUILD

namespace route_lookup {
void enrich(adsb::Plane*) {}
}  // namespace route_lookup

#else

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <string.h>

#include "geo.h"

namespace route_lookup {
namespace {

constexpr size_t kMaxRouteBytes = 16 * 1024;
constexpr size_t kMaxTrackBytes = 8 * 1024;
constexpr double kMismatchKm = 150.0;
constexpr int kTrackShortSec = 3600;

struct RouteCache {
  char callsign[9];
  char origin[5];
  char destination[5];
  double origin_lat;
  double origin_lon;
  double dest_lat;
  double dest_lon;
  bool verified;
};

RouteCache cache = {};

void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) { dst[0] = 0; return; }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

double json_double(JsonVariant v, double fallback) {
  if (v.isNull()) return fallback;
  return v.as<double>();
}

bool fetch_route(const char* callsign, RouteCache* out) {
  char url[128];
  snprintf(url, sizeof(url), "https://api.adsbdb.com/v0/callsign/%s", callsign);
  Serial.print(F("Route GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, url)) return false;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("Route: HTTP %d\n", code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();
  if (body.length() == 0 || body.length() > kMaxRouteBytes) return false;

  JsonDocument doc;
  if (deserializeJson(doc, body)) return false;

  JsonVariant fr = doc["response"]["flightroute"];
  const char* oIata = fr["origin"]["iata_code"];
  const char* dIata = fr["destination"]["iata_code"];
  if (!oIata || !dIata) return false;

  copy_into(out->origin, sizeof(out->origin), oIata);
  copy_into(out->destination, sizeof(out->destination), dIata);
  out->origin_lat = json_double(fr["origin"]["latitude"], NAN);
  out->origin_lon = json_double(fr["origin"]["longitude"], NAN);
  out->dest_lat   = json_double(fr["destination"]["latitude"], NAN);
  out->dest_lon   = json_double(fr["destination"]["longitude"], NAN);

  Serial.printf("Route: %s -> %s (%.2f,%.2f -> %.2f,%.2f)\n",
                out->origin, out->destination,
                out->origin_lat, out->origin_lon,
                out->dest_lat, out->dest_lon);
  return true;
}

// Returns true if route should be trusted.
bool verify_route(const RouteCache* route, const char* icao24) {
  if (isnan(route->origin_lat) || isnan(route->origin_lon)) return true;

  char url[128];
  snprintf(url, sizeof(url),
           "https://opensky-network.org/api/tracks/all?icao24=%s&time=0",
           icao24);
  Serial.print(F("Track GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, url)) return true;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("Track: HTTP %d\n", code);
    http.end();
    return true;
  }

  String body = http.getString();
  http.end();
  if (body.length() == 0 || body.length() > kMaxTrackBytes) return true;

  JsonDocument doc;
  if (deserializeJson(doc, body)) return true;

  double startTime = doc["startTime"].as<double>();
  JsonArray path = doc["path"].as<JsonArray>();
  if (path.isNull() || path.size() == 0) return true;

  JsonArray first = path[0].as<JsonArray>();
  if (first.isNull() || first.size() < 3) return true;

  double trackLat = first[1].as<double>();
  double trackLon = first[2].as<double>();

  double originDist = geo::haversine_km(
      route->origin_lat, route->origin_lon, trackLat, trackLon);
  Serial.printf("Track verify: start=(%.2f,%.2f) origin_dist=%.0fkm\n",
                trackLat, trackLon, originDist);

  if (originDist <= kMismatchKm) return true;

  // Escape hatch 1: track start near destination (coverage gap).
  if (!isnan(route->dest_lat) && !isnan(route->dest_lon)) {
    double destDist = geo::haversine_km(
        route->dest_lat, route->dest_lon, trackLat, trackLon);
    if (destDist <= kMismatchKm) return true;
  }

  // Escape hatch 2: long-running track (>1hr) — first waypoint is stale.
  double nowSec = millis() / 1000.0;
  double trackAgeSec = nowSec;  // approximate — we don't have wall clock
  // Use startTime from OpenSky (Unix epoch seconds).
  // We can't compare to wall clock easily, so use endTime - startTime.
  double endTime = doc["endTime"].as<double>();
  if (endTime > startTime) {
    trackAgeSec = endTime - startTime;
  }
  if (trackAgeSec > kTrackShortSec) return true;

  Serial.println(F("Track verify: MISMATCH — dropping route"));
  return false;
}

}  // namespace

void enrich(adsb::Plane* plane) {
  if (!plane || plane->callsign[0] == 0) return;

  // Return cached result if same callsign.
  if (strcmp(plane->callsign, cache.callsign) == 0 && cache.verified) {
    copy_into(plane->origin, sizeof(plane->origin), cache.origin);
    copy_into(plane->destination, sizeof(plane->destination), cache.destination);
    return;
  }

  copy_into(cache.callsign, sizeof(cache.callsign), plane->callsign);
  cache.origin[0] = 0;
  cache.destination[0] = 0;
  cache.verified = false;

  if (!fetch_route(plane->callsign, &cache)) {
    cache.verified = true;
    return;
  }

  // Cross-check against actual ADS-B track.
  if (!verify_route(&cache, plane->icao24)) {
    cache.origin[0] = 0;
    cache.destination[0] = 0;
  }

  cache.verified = true;
  copy_into(plane->origin, sizeof(plane->origin), cache.origin);
  copy_into(plane->destination, sizeof(plane->destination), cache.destination);
}

}  // namespace route_lookup

#endif  // NATIVE_BUILD

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
#include "airports.h"
#include "geo.h"

namespace route_lookup {
namespace {

constexpr size_t   kMaxBodyBytes = 8 * 1024;
constexpr uint32_t kCacheTtlMs   = 5UL * 60 * 1000;       // 5 min
constexpr long     kLookbackSec  = 24L * 3600;            // 24 h
constexpr time_t   kMinValidUnix = 1700000000;            // 2023-11
// Detour budget for validating adsbdb's destination against the plane's
// current position. If origin->plane->dest exceeds origin->dest direct by
// more than this, the destination is implausible (plane is nowhere near
// the claimed route — e.g. AFR31UA showing CDG>BCN while approaching HAM).
constexpr double   kMaxDetourKm  = 200.0;

struct RouteCache {
  char     icao24[7];          // key (lowercase hex, 6 chars + null)
  uint32_t cached_at_ms;
  bool     populated;
  char     origin[5];          // displayed code (IATA preferred, ICAO fallback)
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

// Query OpenSky /flights/aircraft for the most recent flight of `icao24`.
// Writes ICAO codes (4-char) to out_dep / out_arr; either may end up empty.
void fetch_opensky(const char* icao24,
                   const char* client_id, const char* client_secret,
                   char* out_dep, size_t out_dep_size,
                   char* out_arr, size_t out_arr_size) {
  out_dep[0] = 0;
  out_arr[0] = 0;

  time_t now = time(nullptr);
  if (now < kMinValidUnix) {
    Serial.println(F("Flight: NTP not synced, skip OpenSky"));
    return;
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
  if (!http.begin(client, url)) return;
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
    return;
  }

  String body = http.getString();
  http.end();
  if (body.length() == 0 || body.length() > kMaxBodyBytes) return;

  JsonDocument doc;
  if (deserializeJson(doc, body)) return;

  JsonArray flights = doc.as<JsonArray>();
  if (flights.isNull() || flights.size() == 0) {
    Serial.println(F("Flight: no recent flights"));
    return;
  }

  JsonObject best;
  long best_first_seen = -1;
  for (JsonObject f : flights) {
    long fs = f["firstSeen"].as<long>();
    if (fs > best_first_seen) {
      best_first_seen = fs;
      best = f;
    }
  }
  if (best.isNull()) return;

  const char* dep = best["estDepartureAirport"].as<const char*>();
  const char* arr = best["estArrivalAirport"].as<const char*>();
  copy_into(out_dep, out_dep_size, dep);
  copy_into(out_arr, out_arr_size, arr);

  Serial.printf("Flight: %s -> %s\n",
                out_dep[0] ? out_dep : "?",
                out_arr[0] ? out_arr : "?");
}

struct AdsbdbRoute {
  char   origin_iata[5];
  char   origin_icao[5];
  char   dest_iata[5];
  char   dest_icao[5];
  double origin_lat;  // NaN if missing
  double origin_lon;
  double dest_lat;
  double dest_lon;
};

// Query adsbdb for the callsign's route. Fills `out` with IATA + ICAO codes
// and lat/lon for both endpoints. Lat/lon are NaN on missing data.
void fetch_adsbdb(const char* callsign, AdsbdbRoute* out) {
  out->origin_iata[0] = 0;
  out->origin_icao[0] = 0;
  out->dest_iata[0]   = 0;
  out->dest_icao[0]   = 0;
  out->origin_lat = NAN; out->origin_lon = NAN;
  out->dest_lat   = NAN; out->dest_lon   = NAN;

  if (!callsign || !callsign[0]) return;

  char url[128];
  snprintf(url, sizeof(url), "https://api.adsbdb.com/v0/callsign/%s", callsign);
  Serial.print(F("Route GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, url)) return;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("Route: HTTP %d\n", code);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();
  if (body.length() == 0 || body.length() > 4 * 1024) return;

  JsonDocument doc;
  if (deserializeJson(doc, body)) return;

  JsonVariant fr = doc["response"]["flightroute"];
  copy_into(out->origin_iata, sizeof(out->origin_iata),
            fr["origin"]["iata_code"].as<const char*>());
  copy_into(out->origin_icao, sizeof(out->origin_icao),
            fr["origin"]["icao_code"].as<const char*>());
  copy_into(out->dest_iata,   sizeof(out->dest_iata),
            fr["destination"]["iata_code"].as<const char*>());
  copy_into(out->dest_icao,   sizeof(out->dest_icao),
            fr["destination"]["icao_code"].as<const char*>());
  if (!fr["origin"]["latitude"].isNull())
    out->origin_lat = fr["origin"]["latitude"].as<double>();
  if (!fr["origin"]["longitude"].isNull())
    out->origin_lon = fr["origin"]["longitude"].as<double>();
  if (!fr["destination"]["latitude"].isNull())
    out->dest_lat = fr["destination"]["latitude"].as<double>();
  if (!fr["destination"]["longitude"].isNull())
    out->dest_lon = fr["destination"]["longitude"].as<double>();
  Serial.printf("Route(adsbdb): %s/%s -> %s/%s\n",
                out->origin_iata[0] ? out->origin_iata : "?",
                out->origin_icao[0] ? out->origin_icao : "?",
                out->dest_iata[0]   ? out->dest_iata   : "?",
                out->dest_icao[0]   ? out->dest_icao   : "?");
}

// True if the plane's current position is geographically consistent with
// flying on the route origin->destination (origin->plane->dest is not
// significantly longer than origin->dest direct).
bool destination_plausible(double plane_lat, double plane_lon,
                           double origin_lat, double origin_lon,
                           double dest_lat,   double dest_lon) {
  if (isnan(origin_lat) || isnan(origin_lon) ||
      isnan(dest_lat)   || isnan(dest_lon)   ||
      isnan(plane_lat)  || isnan(plane_lon)) return false;
  double route_km = geo::haversine_km(origin_lat, origin_lon, dest_lat, dest_lon);
  double leg_km   = geo::haversine_km(origin_lat, origin_lon, plane_lat, plane_lon)
                  + geo::haversine_km(plane_lat, plane_lon, dest_lat, dest_lon);
  double detour   = leg_km - route_km;
  Serial.printf("Detour check: route=%.0fkm leg=%.0fkm detour=%.0fkm\n",
                route_km, leg_km, detour);
  return detour <= kMaxDetourKm;
}

}  // namespace

void enrich(adsb::Plane* plane,
            const char* client_id,
            const char* client_secret) {
  if (!plane || plane->icao24[0] == 0) return;

  uint32_t now_ms = millis();

  if (cache.populated &&
      strcmp(plane->icao24, cache.icao24) == 0 &&
      (now_ms - cache.cached_at_ms) < kCacheTtlMs) {
    copy_into(plane->origin,      sizeof(plane->origin),      cache.origin);
    copy_into(plane->destination, sizeof(plane->destination), cache.destination);
    return;
  }

  copy_into(cache.icao24, sizeof(cache.icao24), plane->icao24);
  cache.origin[0]      = 0;
  cache.destination[0] = 0;
  cache.cached_at_ms   = now_ms;
  cache.populated      = true;

  // OpenSky: ground truth, ICAO codes. Arrival often empty for in-progress.
  char opensky_dep[5] = {}, opensky_arr[5] = {};
  fetch_opensky(plane->icao24, client_id, client_secret,
                opensky_dep, sizeof(opensky_dep),
                opensky_arr, sizeof(opensky_arr));

  // adsbdb: callsign-keyed, IATA + ICAO + coords. Sometimes stale.
  AdsbdbRoute adsbdb = {};
  fetch_adsbdb(plane->callsign, &adsbdb);

  // ── Origin ──
  // Prefer adsbdb's IATA when its origin ICAO matches OpenSky's departure
  // (or OpenSky has no data). Else fall back to OpenSky ICAO via the
  // airports table.
  bool origin_verified =
      adsbdb.origin_icao[0] &&
      (opensky_dep[0] == 0 ||
       strcmp(opensky_dep, adsbdb.origin_icao) == 0);
  if (origin_verified) {
    copy_into(cache.origin, sizeof(cache.origin), adsbdb.origin_iata);
  } else if (opensky_dep[0]) {
    const char* iata = airports::icao_to_iata(opensky_dep);
    copy_into(cache.origin, sizeof(cache.origin), iata ? iata : opensky_dep);
  }

  // ── Destination ──
  // Prefer OpenSky's arrival when present (ground truth). When OpenSky has
  // no arrival (in-progress flight), accept adsbdb's destination only if
  // (a) the origin verified and (b) the plane's current position is
  // geographically consistent with the claimed route. Otherwise leave
  // destination empty so the layout falls back to the callsign rather
  // than displaying a wrong destination.
  if (opensky_arr[0]) {
    // OpenSky tells us the actual arrival.
    bool adsbdb_dest_matches =
        adsbdb.dest_icao[0] && strcmp(opensky_arr, adsbdb.dest_icao) == 0;
    if (adsbdb_dest_matches) {
      copy_into(cache.destination, sizeof(cache.destination), adsbdb.dest_iata);
    } else {
      const char* iata = airports::icao_to_iata(opensky_arr);
      copy_into(cache.destination, sizeof(cache.destination),
                iata ? iata : opensky_arr);
    }
  } else if (origin_verified && adsbdb.dest_icao[0] &&
             destination_plausible(plane->lat, plane->lon,
                                   adsbdb.origin_lat, adsbdb.origin_lon,
                                   adsbdb.dest_lat,   adsbdb.dest_lon)) {
    copy_into(cache.destination, sizeof(cache.destination), adsbdb.dest_iata);
  } else if (adsbdb.dest_icao[0]) {
    Serial.println(F("Route: adsbdb destination off-route, dropping"));
  }

  Serial.printf("Route: cached origin='%s' destination='%s'\n",
                cache.origin[0]      ? cache.origin      : "",
                cache.destination[0] ? cache.destination : "");

  copy_into(plane->origin,      sizeof(plane->origin),      cache.origin);
  copy_into(plane->destination, sizeof(plane->destination), cache.destination);
}

}  // namespace route_lookup

#endif  // NATIVE_BUILD

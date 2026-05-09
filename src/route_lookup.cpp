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

// Query adsbdb for the callsign's route. Fills both IATA and ICAO codes for
// origin and destination. Empty strings on missing data.
void fetch_adsbdb(const char* callsign,
                  char* out_origin_iata, size_t oi_size,
                  char* out_origin_icao, size_t oc_size,
                  char* out_dest_iata,   size_t di_size,
                  char* out_dest_icao,   size_t dc_size) {
  out_origin_iata[0] = 0;
  out_origin_icao[0] = 0;
  out_dest_iata[0]   = 0;
  out_dest_icao[0]   = 0;

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
  copy_into(out_origin_iata, oi_size, fr["origin"]["iata_code"].as<const char*>());
  copy_into(out_origin_icao, oc_size, fr["origin"]["icao_code"].as<const char*>());
  copy_into(out_dest_iata,   di_size, fr["destination"]["iata_code"].as<const char*>());
  copy_into(out_dest_icao,   dc_size, fr["destination"]["icao_code"].as<const char*>());
  Serial.printf("Route(adsbdb): %s/%s -> %s/%s\n",
                out_origin_iata[0] ? out_origin_iata : "?",
                out_origin_icao[0] ? out_origin_icao : "?",
                out_dest_iata[0]   ? out_dest_iata   : "?",
                out_dest_icao[0]   ? out_dest_icao   : "?");
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

  // adsbdb: callsign-keyed, IATA + ICAO. Sometimes stale.
  char a_origin_iata[5] = {}, a_origin_icao[5] = {};
  char a_dest_iata[5]   = {}, a_dest_icao[5]   = {};
  fetch_adsbdb(plane->callsign,
               a_origin_iata, sizeof(a_origin_iata),
               a_origin_icao, sizeof(a_origin_icao),
               a_dest_iata,   sizeof(a_dest_iata),
               a_dest_icao,   sizeof(a_dest_icao));

  // Decide which source to display.
  // Trust adsbdb's IATA (better readability) iff it's verified by OpenSky:
  //   - OpenSky departure exists AND matches adsbdb origin ICAO, OR
  //   - OpenSky has nothing at all (best-effort)
  bool have_adsbdb = a_origin_icao[0] || a_dest_icao[0];
  bool adsbdb_verified =
      have_adsbdb &&
      (opensky_dep[0] == 0 ||
       strcmp(opensky_dep, a_origin_icao) == 0);

  if (adsbdb_verified) {
    Serial.println(F("Route: adsbdb verified, using IATA"));
    copy_into(cache.origin,      sizeof(cache.origin),      a_origin_iata);
    copy_into(cache.destination, sizeof(cache.destination), a_dest_iata);
  } else {
    Serial.println(F("Route: using OpenSky ICAO"));
    copy_into(cache.origin,      sizeof(cache.origin),      opensky_dep);
    copy_into(cache.destination, sizeof(cache.destination), opensky_arr);
  }

  copy_into(plane->origin,      sizeof(plane->origin),      cache.origin);
  copy_into(plane->destination, sizeof(plane->destination), cache.destination);
}

}  // namespace route_lookup

#endif  // NATIVE_BUILD

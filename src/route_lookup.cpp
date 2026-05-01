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

namespace route_lookup {
namespace {

constexpr size_t kMaxResponseBytes = 16 * 1024;

char cached_callsign[9] = {};
char cached_origin[5] = {};
char cached_destination[5] = {};

void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) { dst[0] = 0; return; }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

}  // namespace

void enrich(adsb::Plane* plane) {
  if (!plane || plane->callsign[0] == 0) return;

  // Return cached result if same callsign.
  if (strcmp(plane->callsign, cached_callsign) == 0) {
    copy_into(plane->origin, sizeof(plane->origin), cached_origin);
    copy_into(plane->destination, sizeof(plane->destination), cached_destination);
    return;
  }

  char url[128];
  snprintf(url, sizeof(url), "https://api.adsbdb.com/v0/callsign/%s",
           plane->callsign);
  Serial.print(F("Route GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println(F("Route: http.begin failed"));
    return;
  }
  http.setConnectTimeout(5000);
  http.setTimeout(10000);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("Route: HTTP %d\n", code);
    http.end();
    // Cache as empty so we don't re-ask.
    copy_into(cached_callsign, sizeof(cached_callsign), plane->callsign);
    cached_origin[0] = 0;
    cached_destination[0] = 0;
    return;
  }

  String body = http.getString();
  http.end();

  if (body.length() == 0 || body.length() > kMaxResponseBytes) {
    Serial.printf("Route: bad body len %u\n", body.length());
    return;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.print(F("Route: JSON parse error: "));
    Serial.println(err.c_str());
    return;
  }

  const char* oIata = doc["response"]["flightroute"]["origin"]["iata_code"];
  const char* dIata = doc["response"]["flightroute"]["destination"]["iata_code"];
  Serial.printf("Route parsed: origin=%s dest=%s\n",
                oIata ? oIata : "(null)", dIata ? dIata : "(null)");

  copy_into(cached_callsign, sizeof(cached_callsign), plane->callsign);

  if (oIata) {
    copy_into(cached_origin, sizeof(cached_origin), oIata);
    copy_into(plane->origin, sizeof(plane->origin), oIata);
  } else {
    cached_origin[0] = 0;
  }

  if (dIata) {
    copy_into(cached_destination, sizeof(cached_destination), dIata);
    copy_into(plane->destination, sizeof(plane->destination), dIata);
  } else {
    cached_destination[0] = 0;
  }

  Serial.printf("Route: %s -> %s\n", plane->origin, plane->destination);
}

}  // namespace route_lookup

#endif  // NATIVE_BUILD

#include "aircraft_type.h"

#ifdef NATIVE_BUILD

namespace aircraft_type {
void enrich(adsb::Plane*) {}
}  // namespace aircraft_type

#else

#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <string.h>

namespace aircraft_type {
namespace {

char cached_icao24[7] = {};
char cached_type[5] = {};

void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) { dst[0] = 0; return; }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

}  // namespace

void enrich(adsb::Plane* plane) {
  if (!plane || plane->icao24[0] == 0) return;

  if (strcmp(plane->icao24, cached_icao24) == 0) {
    copy_into(plane->aircraft_type, sizeof(plane->aircraft_type), cached_type);
    return;
  }

  char url[96];
  snprintf(url, sizeof(url),
           "https://opensky-network.org/api/metadata/aircraft/icao/%s",
           plane->icao24);
  Serial.print(F("AcType GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, url)) return;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("AcType: HTTP %d\n", code);
    http.end();
    copy_into(cached_icao24, sizeof(cached_icao24), plane->icao24);
    cached_type[0] = 0;
    return;
  }

  String body = http.getString();
  http.end();

  if (body.length() == 0 || body.length() > 4096) return;

  JsonDocument doc;
  if (deserializeJson(doc, body)) return;

  const char* tc = doc["typecode"];
  copy_into(cached_icao24, sizeof(cached_icao24), plane->icao24);
  if (tc && tc[0]) {
    copy_into(cached_type, sizeof(cached_type), tc);
    copy_into(plane->aircraft_type, sizeof(plane->aircraft_type), tc);
    Serial.printf("AcType: %s -> %s\n", plane->icao24, tc);
  } else {
    cached_type[0] = 0;
  }
}

}  // namespace aircraft_type

#endif

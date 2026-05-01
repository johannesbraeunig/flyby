#include "adsb_fetch.h"

#ifdef NATIVE_BUILD
// ── Native stub (host unit-test builds only) ─────────────────────────
#include <string.h>

namespace adsb {

bool fetch_nearest(double, double, double, Plane* out) {
  if (!out) return false;
  plane_clear(out);
  strncpy(out->icao24,   "abc123", sizeof(out->icao24)  - 1);
  strncpy(out->callsign, "DLH441", sizeof(out->callsign) - 1);
  out->lat         = 53.5511;
  out->lon         = 9.9937;
  out->alt_m       = 11000.0f;
  out->vel_mps     = 250.0f;
  out->hdg_deg     = 90.0f;
  out->on_ground   = false;
  out->distance_km = 0.4f;
  return true;
}

}  // namespace adsb

#else
// ── Real implementation (ESP32 / Arduino) ────────────────────────────
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include <stdio.h>

#include "adsb_parse.h"
#include "geo.h"

namespace adsb {
namespace {

constexpr size_t kMaxResponseBytes = 48 * 1024;

void build_url(char* buf, size_t buf_len, double obs_lat, double obs_lon,
               double radius_km) {
  geo::BBox bb = geo::bbox_for(obs_lat, obs_lon, radius_km);
  snprintf(buf, buf_len,
           "https://opensky-network.org/api/states/all"
           "?lamin=%.4f&lomin=%.4f&lamax=%.4f&lomax=%.4f",
           bb.lamin, bb.lomin, bb.lamax, bb.lomax);
}

}  // namespace

bool fetch_nearest(double obs_lat, double obs_lon, double radius_km,
                   Plane* out) {
  if (!out) return false;

  char url[256];
  build_url(url, sizeof(url), obs_lat, obs_lon, radius_km);
  Serial.print(F("ADS-B GET "));
  Serial.println(url);

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println(F("ADS-B: http.begin failed"));
    return false;
  }
  http.setConnectTimeout(10000);
  http.setTimeout(15000);
  http.addHeader("Accept", "application/json");

  int code = http.GET();
  if (code <= 0) {
    Serial.printf("ADS-B: GET error %d (%s)\n", code,
                  http.errorToString(code).c_str());
    http.end();
    return false;
  }

  if (code == 429) {
    Serial.println(F("ADS-B: rate-limited (429), backing off"));
    http.end();
    return false;
  }

  if (code != 200) {
    Serial.printf("ADS-B: HTTP %d\n", code);
    http.end();
    return false;
  }

  int len = http.getSize();
  if (len > static_cast<int>(kMaxResponseBytes)) {
    Serial.printf("ADS-B: response too large (%d bytes)\n", len);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  if (body.length() == 0) {
    Serial.println(F("ADS-B: empty response body"));
    return false;
  }

  Serial.printf("ADS-B: %u bytes, parsing...\n", body.length());

  bool ok = parse_states_find_nearest(body.c_str(), body.length(), obs_lat,
                                      obs_lon, out);
  if (!ok) {
    Serial.println(F("ADS-B: no planes found in response"));
  }
  return ok;
}

}  // namespace adsb

#endif  // NATIVE_BUILD

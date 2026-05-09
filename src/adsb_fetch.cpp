#include "adsb_fetch.h"

#ifdef NATIVE_BUILD
// ── Native stub (host unit-test builds only) ─────────────────────────
#include <string.h>

namespace adsb {

FetchStatus fetch_nearest(double, double, double, const char*, const char*,
                          Plane* out) {
  if (!out) return FetchStatus::NetworkError;
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
  return FetchStatus::Ok;
}

}  // namespace adsb

#else
// ── Real implementation (ESP32 / Arduino) ────────────────────────────
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include <stdio.h>
#include <string.h>

#include "adsb_parse.h"
#include "geo.h"

namespace adsb {
namespace {

constexpr size_t kMaxResponseBytes = 48 * 1024;

constexpr const char* kTokenUrl =
    "https://auth.opensky-network.org/auth/realms/opensky-network"
    "/protocol/openid-connect/token";

constexpr unsigned long kTokenSafetyMarginMs = 60UL * 1000;

char     cached_token[2048] = {};
uint32_t token_expires_at   = 0;
uint32_t token_retry_after  = 0;
constexpr uint32_t kTokenRetryCooldownMs = 5UL * 60 * 1000;

bool has_credentials(const char* id, const char* secret) {
  return id && id[0] && secret && secret[0];
}

bool fetch_token(const char* client_id, const char* client_secret) {
  Serial.println(F("OAuth2: fetching token..."));

  WiFiClientSecure tls;
  tls.setInsecure();

  HTTPClient http;
  if (!http.begin(tls, kTokenUrl)) {
    Serial.println(F("OAuth2: http.begin failed"));
    return false;
  }
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  char body[256];
  snprintf(body, sizeof(body),
           "grant_type=client_credentials&client_id=%s&client_secret=%s",
           client_id, client_secret);

  int code = http.POST(body);
  if (code <= 0) {
    Serial.printf("OAuth2: POST error %d\n", code);
    http.end();
    return false;
  }
  if (code != 200) {
    Serial.printf("OAuth2: HTTP %d\n", code);
    http.end();
    return false;
  }

  String resp = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, resp)) {
    Serial.println(F("OAuth2: JSON parse failed"));
    return false;
  }

  const char* token = doc["access_token"].as<const char*>();
  if (!token || token[0] == 0) {
    Serial.println(F("OAuth2: no access_token in response"));
    return false;
  }

  strncpy(cached_token, token, sizeof(cached_token) - 1);
  cached_token[sizeof(cached_token) - 1] = 0;

  int expires_in = doc["expires_in"] | (30 * 60);
  token_expires_at = millis() +
      static_cast<uint32_t>(expires_in) * 1000 - kTokenSafetyMarginMs;

  Serial.printf("OAuth2: token acquired (%d bytes), expires in %ds\n",
                strlen(cached_token), expires_in);
  return true;
}

bool ensure_token(const char* client_id, const char* client_secret) {
  if (!has_credentials(client_id, client_secret)) return false;
  if (cached_token[0] && millis() < token_expires_at) return true;
  if (millis() < token_retry_after) return false;
  bool ok = fetch_token(client_id, client_secret);
  if (!ok) {
    token_retry_after = millis() + kTokenRetryCooldownMs;
    Serial.println(F("OAuth2: will retry in 5 min"));
  }
  return ok;
}

void invalidate_token() {
  cached_token[0] = 0;
  token_expires_at = 0;
  token_retry_after = 0;
}

void build_url(char* buf, size_t buf_len, double obs_lat, double obs_lon,
               double radius_km) {
  geo::BBox bb = geo::bbox_for(obs_lat, obs_lon, radius_km);
  snprintf(buf, buf_len,
           "https://opensky-network.org/api/states/all"
           "?lamin=%.4f&lomin=%.4f&lamax=%.4f&lomax=%.4f",
           bb.lamin, bb.lomin, bb.lamax, bb.lomax);
}

int do_get(const char* url, const char* client_id, const char* client_secret,
           String& body_out) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println(F("ADS-B: http.begin failed"));
    return -1;
  }
  http.setConnectTimeout(10000);
  http.setTimeout(15000);
  http.addHeader("Accept", "application/json");

  if (ensure_token(client_id, client_secret)) {
    char auth[2100];
    snprintf(auth, sizeof(auth), "Bearer %s", cached_token);
    http.addHeader("Authorization", auth);
  }

  int code = http.GET();
  if (code <= 0) {
    Serial.printf("ADS-B: GET error %d (%s)\n", code,
                  http.errorToString(code).c_str());
    http.end();
    return code;
  }

  if (code == 200) {
    int len = http.getSize();
    if (len > static_cast<int>(kMaxResponseBytes)) {
      Serial.printf("ADS-B: response too large (%d bytes)\n", len);
      http.end();
      return -2;
    }
    body_out = http.getString();
  }

  http.end();
  return code;
}

}  // namespace

FetchStatus fetch_nearest(double obs_lat, double obs_lon, double radius_km,
                          const char* client_id, const char* client_secret,
                          Plane* out) {
  if (!out) return FetchStatus::NetworkError;

  char url[256];
  build_url(url, sizeof(url), obs_lat, obs_lon, radius_km);
  Serial.print(F("ADS-B GET "));
  Serial.println(url);

  String body;
  int code = do_get(url, client_id, client_secret, body);

  if (code == 401 && has_credentials(client_id, client_secret)) {
    Serial.println(F("ADS-B: 401, refreshing token and retrying"));
    invalidate_token();
    code = do_get(url, client_id, client_secret, body);
  }

  if (code == 429) {
    Serial.println(F("ADS-B: rate-limited (429), backing off"));
    return FetchStatus::RateLimited;
  }

  if (code == 401) {
    Serial.println(F("ADS-B: 401 after refresh — auth error"));
    return FetchStatus::AuthError;
  }

  if (code != 200) {
    Serial.printf("ADS-B: HTTP %d\n", code);
    return FetchStatus::NetworkError;
  }

  if (body.length() == 0) {
    Serial.println(F("ADS-B: empty response body"));
    return FetchStatus::NetworkError;
  }

  Serial.printf("ADS-B: %u bytes, parsing...\n", body.length());

  if (!parse_states_find_nearest(body.c_str(), body.length(), obs_lat,
                                 obs_lon, out)) {
    Serial.println(F("ADS-B: no planes found in response"));
    return FetchStatus::NoPlane;
  }
  return FetchStatus::Ok;
}

}  // namespace adsb

#endif  // NATIVE_BUILD

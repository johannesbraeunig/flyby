#include "config.h"

#include <Arduino.h>
#include <Preferences.h>
#include <WiFiManager.h>
#include <stdlib.h>
#include <string.h>

namespace config {
namespace {

constexpr const char* kNvsNamespace = "flyby";
constexpr const char* kKeyValid     = "valid";
constexpr const char* kKeySsid      = "ssid";
constexpr const char* kKeyPass      = "pass";
constexpr const char* kKeyLat       = "lat";
constexpr const char* kKeyLon       = "lon";
constexpr const char* kKeyRadius    = "radius";

constexpr double kDefaultLat    = 53.5511;
constexpr double kDefaultLon    = 9.9937;
constexpr double kDefaultRadius = 50.0;

Preferences prefs;

}  // namespace

bool load(Settings* out) {
  if (!out) return false;
  prefs.begin(kNvsNamespace, true);
  bool valid = prefs.getBool(kKeyValid, false);
  if (valid) {
    String s = prefs.getString(kKeySsid, "");
    String p = prefs.getString(kKeyPass, "");
    strncpy(out->ssid, s.c_str(), sizeof(out->ssid) - 1);
    out->ssid[sizeof(out->ssid) - 1] = 0;
    strncpy(out->password, p.c_str(), sizeof(out->password) - 1);
    out->password[sizeof(out->password) - 1] = 0;
    out->lat       = prefs.getDouble(kKeyLat, kDefaultLat);
    out->lon       = prefs.getDouble(kKeyLon, kDefaultLon);
    out->radius_km = prefs.getDouble(kKeyRadius, kDefaultRadius);
  }
  prefs.end();
  return valid;
}

void save(const Settings& s) {
  prefs.begin(kNvsNamespace, false);
  prefs.putString(kKeySsid, s.ssid);
  prefs.putString(kKeyPass, s.password);
  prefs.putDouble(kKeyLat, s.lat);
  prefs.putDouble(kKeyLon, s.lon);
  prefs.putDouble(kKeyRadius, s.radius_km);
  prefs.putBool(kKeyValid, true);
  prefs.end();
}

void erase() {
  prefs.begin(kNvsNamespace, false);
  prefs.clear();
  prefs.end();
}

bool run_portal(Settings* out) {
  if (!out) return false;

  WiFiManager wm;
  wm.setConfigPortalTimeout(300);
  wm.setTitle("FlyBy Setup");

  char lat_buf[16], lon_buf[16], rad_buf[8];
  snprintf(lat_buf, sizeof(lat_buf), "%.4f", kDefaultLat);
  snprintf(lon_buf, sizeof(lon_buf), "%.4f", kDefaultLon);
  snprintf(rad_buf, sizeof(rad_buf), "%.0f", kDefaultRadius);

  WiFiManagerParameter p_lat("lat", "Latitude", lat_buf, 15);
  WiFiManagerParameter p_lon("lon", "Longitude", lon_buf, 15);
  WiFiManagerParameter p_rad("radius", "Radius (km)", rad_buf, 7);

  wm.addParameter(&p_lat);
  wm.addParameter(&p_lon);
  wm.addParameter(&p_rad);

  bool connected = wm.startConfigPortal("FlyBy-Setup");
  if (!connected) return false;

  strncpy(out->ssid, wm.getWiFiSSID().c_str(), sizeof(out->ssid) - 1);
  out->ssid[sizeof(out->ssid) - 1] = 0;
  strncpy(out->password, wm.getWiFiPass().c_str(), sizeof(out->password) - 1);
  out->password[sizeof(out->password) - 1] = 0;

  out->lat       = atof(p_lat.getValue());
  out->lon       = atof(p_lon.getValue());
  out->radius_km = atof(p_rad.getValue());

  if (out->radius_km < 1.0)   out->radius_km = 1.0;
  if (out->radius_km > 500.0) out->radius_km = 500.0;

  save(*out);
  return true;
}

}  // namespace config

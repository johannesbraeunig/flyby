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
constexpr const char* kKeyOskyId    = "osky_id";
constexpr const char* kKeyOskySec   = "osky_sec";

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
    String oid = prefs.getString(kKeyOskyId, "");
    String osec = prefs.getString(kKeyOskySec, "");
    strncpy(out->opensky_client_id, oid.c_str(), sizeof(out->opensky_client_id) - 1);
    out->opensky_client_id[sizeof(out->opensky_client_id) - 1] = 0;
    strncpy(out->opensky_client_secret, osec.c_str(), sizeof(out->opensky_client_secret) - 1);
    out->opensky_client_secret[sizeof(out->opensky_client_secret) - 1] = 0;
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
  prefs.putString(kKeyOskyId, s.opensky_client_id);
  prefs.putString(kKeyOskySec, s.opensky_client_secret);
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

  const char* locate_btn =
      "<br><button type='button' onclick=\""
      "if(!navigator.geolocation){alert('Geolocation not supported');return;}"
      "this.innerText='Locating...';"
      "navigator.geolocation.getCurrentPosition("
      "function(p){"
      "document.getElementById('lat').value=p.coords.latitude.toFixed(4);"
      "document.getElementById('lon').value=p.coords.longitude.toFixed(4);"
      "document.querySelector('[type=button]').innerText='Located!';"
      "},"
      "function(e){alert('Location error: '+e.message);"
      "document.querySelector('[type=button]').innerText='Locate me';},"
      "{enableHighAccuracy:true,timeout:10000});"
      "\" style='width:100%;padding:10px;margin-top:5px;font-size:16px;"
      "background:#07f;color:#fff;border:none;border-radius:4px;cursor:pointer'>"
      "Locate me</button><br>";
  WiFiManagerParameter p_locate(locate_btn);

  WiFiManagerParameter p_osky_hdr(
      "<br><hr><p style='font-weight:bold'>OpenSky API (optional)</p>");
  WiFiManagerParameter p_osky_id("osky_id", "Client ID", "", 64);
  WiFiManagerParameter p_osky_sec("osky_sec", "Client Secret", "", 64);

  wm.addParameter(&p_lat);
  wm.addParameter(&p_lon);
  wm.addParameter(&p_locate);
  wm.addParameter(&p_rad);
  wm.addParameter(&p_osky_hdr);
  wm.addParameter(&p_osky_id);
  wm.addParameter(&p_osky_sec);

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

  strncpy(out->opensky_client_id, p_osky_id.getValue(),
          sizeof(out->opensky_client_id) - 1);
  out->opensky_client_id[sizeof(out->opensky_client_id) - 1] = 0;
  strncpy(out->opensky_client_secret, p_osky_sec.getValue(),
          sizeof(out->opensky_client_secret) - 1);
  out->opensky_client_secret[sizeof(out->opensky_client_secret) - 1] = 0;

  save(*out);
  return true;
}

}  // namespace config

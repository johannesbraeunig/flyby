#pragma once

namespace config {

struct Settings {
  char ssid[33];
  char password[65];
  double lat;
  double lon;
  double radius_km;
};

// Load settings from NVS. Returns true if valid settings exist.
bool load(Settings* out);

// Save settings to NVS.
void save(const Settings& s);

// Launch the WiFiManager captive portal. Blocks until the user submits
// credentials or the portal times out (300 s). Returns true if the user
// submitted valid config, which is then persisted to NVS and written to *out.
bool run_portal(Settings* out);

// Erase saved settings from NVS. Called on factory-reset (BOOT button held).
void erase();

}  // namespace config

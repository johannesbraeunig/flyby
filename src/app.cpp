#include "app.h"

#include <Arduino.h>
#include <WiFi.h>
#include <string.h>

#include "adsb_fetch.h"
#include "adsb_types.h"
#include "aircraft_type.h"
#include "airlines.h"
#include "config.h"
#include "display.h"
#include "layout.h"
#include "render.h"
#include "route_lookup.h"

constexpr int kBootPin = 0;

namespace app {
namespace {

config::Settings cfg{};

constexpr uint32_t kFetchIntervalMs   = 30000;
constexpr uint32_t kConnectTimeoutMs  = 30000;
constexpr uint32_t kRenderIntervalMs  = 33;

State          state             = State::BOOT;
uint32_t       last_fetch_ms     = 0;
uint32_t       connect_started   = 0;
uint32_t       last_render_ms    = 0;
layout::Frame  current_frame{};

void status_frame(const char* line1, const char* line2,
                   uint8_t r, uint8_t g, uint8_t b) {
  layout::compose_idle(&current_frame);
  size_t i = 0;
  for (; i < sizeof(current_frame.line1) - 1 && line1[i]; ++i)
    current_frame.line1[i] = line1[i];
  current_frame.line1[i] = 0;
  current_frame.l1_r = r;
  current_frame.l1_g = g;
  current_frame.l1_b = b;

  i = 0;
  for (; i < sizeof(current_frame.line2) - 1 && line2[i]; ++i)
    current_frame.line2[i] = line2[i];
  current_frame.line2[i] = 0;
  current_frame.l2_r = r;
  current_frame.l2_g = g;
  current_frame.l2_b = b;
}

void enter_connecting() {
  state = State::CONNECTING;
  connect_started = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfg.ssid, cfg.password);
  Serial.print(F("WiFi connecting to "));
  Serial.println(cfg.ssid);
  status_frame("FlyBy", "WiFi...", 0, 200, 255);
}

void enter_running() {
  state = State::RUNNING;
  Serial.println(F("WiFi connected"));
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  last_fetch_ms = millis() - kFetchIntervalMs;
  layout::compose_idle(&current_frame);
}

void enter_error_wifi() {
  state = State::ERROR_WIFI;
  Serial.println(F("WiFi connect FAILED"));
  status_frame("ERROR", "no WiFi", 255, 50, 50);
}

void tick_connecting() {
  if (WiFi.status() == WL_CONNECTED) {
    enter_running();
    return;
  }
  if (millis() - connect_started > kConnectTimeoutMs) {
    enter_error_wifi();
  }
}

void log_plane(const adsb::Plane& p) {
  Serial.printf("nearest: %s %s>%s %s %.0fm %.0fm/s %.1fkm\n",
                p.callsign[0] ? p.callsign : "----",
                p.origin[0] ? p.origin : "?",
                p.destination[0] ? p.destination : "?",
                p.aircraft_type[0] ? p.aircraft_type : "?",
                p.alt_m, p.vel_mps, p.distance_km);
}

void tick_running() {
  const uint32_t now = millis();
  if (now - last_fetch_ms < kFetchIntervalMs) return;
  last_fetch_ms = now;

  adsb::Plane plane;
  if (adsb::fetch_nearest(cfg.lat, cfg.lon, cfg.radius_km, &plane)) {
    route_lookup::enrich(&plane);
    aircraft_type::enrich(&plane);
    log_plane(plane);

    const auto* airline = airlines::lookup(plane.callsign);
    layout::compose(plane, airline, &current_frame);
  } else {
    Serial.println(F("no planes nearby"));
    layout::compose_idle(&current_frame);
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println(F("FlyBy boot"));

  if (!display::init()) {
    Serial.println(F("display init FAILED"));
    state = State::ERROR_WIFI;
    status_frame("ERROR", "no panel", 255, 50, 50);
    return;
  }
  Serial.println(F("display ready"));
  status_frame("FlyBy", "boot", 0, 200, 255);

  pinMode(kBootPin, INPUT_PULLUP);
  bool force_portal = (digitalRead(kBootPin) == LOW);
  if (force_portal) {
    Serial.println(F("BOOT held — erasing config, launching portal"));
    config::erase();
  }

  bool have_config = config::load(&cfg);

  if (!have_config || force_portal) {
    Serial.println(F("No config — starting captive portal"));
    status_frame("FlyBy", "Setup AP", 255, 200, 0);
    render::draw_frame(current_frame, millis());

    if (config::run_portal(&cfg)) {
      Serial.println(F("Config saved via portal"));
    } else {
      Serial.println(F("Portal timed out — using defaults"));
      strncpy(cfg.ssid, "FlyBy", sizeof(cfg.ssid));
      cfg.password[0] = 0;
      cfg.lat       = 53.5511;
      cfg.lon       = 9.9937;
      cfg.radius_km = 50.0;
    }
  }

  Serial.printf("Config: ssid=%s lat=%.4f lon=%.4f radius=%.0fkm\n",
                cfg.ssid, cfg.lat, cfg.lon, cfg.radius_km);

  enter_connecting();
}

void loop() {
  switch (state) {
    case State::BOOT:       break;
    case State::CONNECTING: tick_connecting(); break;
    case State::RUNNING:    tick_running(); break;
    case State::ERROR_WIFI: break;
  }

  const uint32_t now = millis();
  if (now - last_render_ms >= kRenderIntervalMs) {
    last_render_ms = now;
    render::draw_frame(current_frame, now);
  }

  delay(5);
}

State current_state() { return state; }

}  // namespace app

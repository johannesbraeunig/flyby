#include "app.h"

#include <Arduino.h>
#include <WiFi.h>
#include <string.h>

#include "adsb_fetch.h"
#include "adsb_types.h"
#include "airlines.h"
#include "display.h"
#include "layout.h"
#include "render.h"

#ifndef WIFI_SSID
#define WIFI_SSID "Wokwi-GUEST"
#endif
#ifndef WIFI_PASS
#define WIFI_PASS ""
#endif

namespace app {
namespace {

// Hamburg defaults — overridden later by the captive portal (flyby-66mb).
constexpr double kObsLat       = 53.5511;
constexpr double kObsLon       = 9.9937;
constexpr double kRadiusKm     = 50.0;

constexpr uint32_t kFetchIntervalMs   = 30000;
constexpr uint32_t kConnectTimeoutMs  = 30000;
constexpr uint32_t kRenderIntervalMs  = 33;     // ~30 FPS for smooth scroll

State          state             = State::BOOT;
uint32_t       last_fetch_ms     = 0;
uint32_t       connect_started   = 0;
uint32_t       last_render_ms    = 0;
layout::Frame  current_frame{};

// --- Frame helpers ---------------------------------------------------------

void status_frame(const char* line1, const char* line2,
                   uint8_t r, uint8_t g, uint8_t b) {
  layout::compose_idle(&current_frame);
  // Override line 1 text + color
  size_t i = 0;
  for (; i < sizeof(current_frame.line1.text) - 1 && line1[i]; ++i) {
    current_frame.line1.text[i] = line1[i];
  }
  current_frame.line1.text[i] = 0;
  current_frame.line1.r = r;
  current_frame.line1.g = g;
  current_frame.line1.b = b;
  current_frame.line1.scroll = false;

  i = 0;
  for (; i < sizeof(current_frame.line2.text) - 1 && line2[i]; ++i) {
    current_frame.line2.text[i] = line2[i];
  }
  current_frame.line2.text[i] = 0;
  current_frame.line2.scroll = false;

  current_frame.line3.text[0] = 0;
}

// --- State transitions -----------------------------------------------------

void enter_connecting() {
  state = State::CONNECTING;
  connect_started = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("WiFi connecting to "));
  Serial.println(F(WIFI_SSID));
  status_frame("FlyBy", "WiFi...", 0, 200, 255);
}

void enter_running() {
  state = State::RUNNING;
  Serial.println(F("WiFi connected"));
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  // Force the first fetch to happen immediately on entry.
  last_fetch_ms = millis() - kFetchIntervalMs;
  layout::compose_idle(&current_frame);
}

void enter_error_wifi() {
  state = State::ERROR_WIFI;
  Serial.println(F("WiFi connect FAILED"));
  status_frame("ERROR", "no WiFi", 255, 50, 50);
}

// --- Per-state ticks -------------------------------------------------------

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
  Serial.print(F("nearest: "));
  Serial.print(p.callsign[0] ? p.callsign : "----");
  Serial.print(F(" "));
  Serial.print(p.alt_m, 0);
  Serial.print(F("m "));
  Serial.print(p.vel_mps, 0);
  Serial.print(F("m/s "));
  Serial.print(p.distance_km, 1);
  Serial.println(F("km"));
}

void tick_running() {
  const uint32_t now = millis();
  if (now - last_fetch_ms < kFetchIntervalMs) return;
  last_fetch_ms = now;

  adsb::Plane plane;
  if (adsb::fetch_nearest(kObsLat, kObsLon, kRadiusKm, &plane)) {
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
#ifdef FLYBY_WOKWI
  Serial.println(F("Running in Wokwi simulator"));
#endif

  if (!display::init()) {
    Serial.println(F("display init FAILED"));
    state = State::ERROR_WIFI;  // benign reuse — render will show ERROR
    status_frame("ERROR", "no panel", 255, 50, 50);
    return;
  }
  Serial.println(F("display ready"));

  status_frame("FlyBy", "boot", 0, 200, 255);
  enter_connecting();
}

void loop() {
  switch (state) {
    case State::BOOT:
      // No-op; setup() should have transitioned away.
      break;
    case State::CONNECTING:
      tick_connecting();
      break;
    case State::RUNNING:
      tick_running();
      break;
    case State::ERROR_WIFI:
      // TODO: periodic retry. For now, stay put.
      break;
  }

  // Render every kRenderIntervalMs for smooth scroll without melting CPU.
  const uint32_t now = millis();
  if (now - last_render_ms >= kRenderIntervalMs) {
    last_render_ms = now;
    render::draw_frame(current_frame, now);
  }

  delay(5);  // yield to WiFi/RTOS background tasks
}

State current_state() { return state; }

}  // namespace app

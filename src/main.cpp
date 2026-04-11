// FlyBy — main entrypoint.
//
// Brings up the HUB75 panel (flyby-dieo) and shows a "FlyBy" greeting.
// WiFi, ADS-B fetch, and the real render loop are wired up by the
// other beans on the FlyBy epic (flyby-56fy).

#include <Arduino.h>

#include "display.h"

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
  } else {
    Serial.println(F("display ready"));

    // Smoke test: "FlyBy" centered, brand-ish cyan.
    // Default 5x7 font: each char ~6 px wide, 7 px tall.
    // NOTE: not visually verifiable in Wokwi — wokwi-hub75-matrix is a
    // non-functional placeholder part. Confirm on real hardware.
    // See docs/development.md for details.
    constexpr int kCharW = 6;
    constexpr int kCharH = 7;
    const char* greeting = "FlyBy";
    const int textW = static_cast<int>(strlen(greeting)) * kCharW;
    const int x = (display::kWidth  - textW) / 2;
    const int y = (display::kHeight - kCharH) / 2;
    display::drawText(x, y, greeting, display::rgb(0, 200, 255));
    display::flush();
  }
}

void loop() {
  static uint32_t last = 0;
  const uint32_t now = millis();
  if (now - last >= 1000) {
    last = now;
    Serial.printf("tick %lu\n", (unsigned long)(now / 1000));
  }
}

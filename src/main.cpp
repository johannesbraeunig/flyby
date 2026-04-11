// FlyBy — main entrypoint.
//
// Scaffold-only at this stage: boots, prints to serial, and yields.
// Real work (display init, WiFi, ADS-B fetch, render loop) is wired up
// by the other beans on the FlyBy epic (flyby-56fy).

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println(F("FlyBy boot"));
#ifdef FLYBY_WOKWI
  Serial.println(F("Running in Wokwi simulator"));
#endif
}

void loop() {
  static uint32_t last = 0;
  const uint32_t now = millis();
  if (now - last >= 1000) {
    last = now;
    Serial.printf("tick %lu\n", (unsigned long)(now / 1000));
  }
}

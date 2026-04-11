// FlyBy app — top-level state machine and tick loop.
//
// Owns the BOOT → CONNECTING → RUNNING / ERROR_WIFI lifecycle, the
// 30 s ADS-B fetch tick, and the per-frame render call. main.cpp is a
// thin wrapper that delegates setup() and loop() here.

#pragma once

namespace app {

enum class State {
  BOOT,
  CONNECTING,
  RUNNING,
  ERROR_WIFI,
};

void setup();
void loop();
State current_state();

}  // namespace app

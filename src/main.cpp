// FlyBy — main entrypoint.
//
// Thin wrapper that delegates to app::setup() / app::loop(), which own
// the BOOT → CONNECTING → RUNNING / ERROR state machine, the 30 s ADS-B
// fetch tick, and the per-frame render call.

#include "app.h"

void setup() { app::setup(); }
void loop()  { app::loop(); }

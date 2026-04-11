# Development workflow

The project ships with three PlatformIO envs so you can develop without ever touching the ESP32 hardware:

| Env | Purpose | Command |
|---|---|---|
| `esp32dev` | Real hardware | `pio run -e esp32dev [-t upload]` |
| `wokwi` | Wokwi simulator (visual HUB75 panel + real WiFi via Wokwi gateway) | `pio run -e wokwi` |
| `native` | Host-side unit tests | `pio test -e native` |

## Wokwi simulator

Two ways to run it:

### 1. Wokwi VS Code extension

- Install **Wokwi for VS Code** (`wokwi.wokwi-vscode`).
- `Cmd+Shift+P` → `Wokwi: Request a new License` (one-time, free Community tier).
- Build: `pio run -e wokwi`.
- Open `diagram.json`, then `Cmd+Shift+P` → `Wokwi: Start Simulator`.
- Serial output appears in the **Wokwi Terminal** tab in the integrated terminal panel — *not* in the Output panel.

### 2. Wokwi CLI (faster debugging loop)

The CLI runs the same simulation headlessly and is the fastest way to debug Wokwi-side issues — it surfaces lint warnings, missing pin connections, and serial output without VS Code in the way.

```bash
# install once
curl -sL https://wokwi.com/ci/install.sh | sh
# the installer puts wokwi-cli at ~/.wokwi/bin/wokwi-cli

# get a free token from https://wokwi.com/dashboard/ci
export WOKWI_CLI_TOKEN='wok_…'   # add to ~/.zshrc to persist

# build firmware first
pio run -e wokwi

# run the sim, fail-fast on a string we expect from setup()
wokwi-cli --expect-text "FlyBy boot" --timeout 15000 \
          --serial-log-file /tmp/flyby-serial.log .
```

Useful flags:
- `--expect-text "X"` — exits 0 as soon as `X` appears in serial; great for CI
- `--fail-text "X"` — exits non-zero if `X` ever appears (e.g. `"Guru Meditation"`)
- `--serial-log-file path` — full serial capture
- `--scenario yaml` — script button presses, simulated time, etc.

## Wokwi diagram.json gotchas (learned the hard way)

These cost us an hour the first time. Document them so they don't bite again:

1. **Use `wokwi-esp32-devkit-v1`, not `board-esp32-devkit-c-v4`.** The `board-*` family is undocumented; the `wokwi-*` parts are the canonical ones and surface clean lint errors.

2. **Serial output requires explicit wiring.** Wokwi does *not* auto-route UART0 to its serial monitor. Without these two connections in `diagram.json`, every `Serial.print` is silently dropped:
   ```json
   [ "esp:TX0", "$serialMonitor:RX", "", [] ],
   [ "esp:RX0", "$serialMonitor:TX", "", [] ]
   ```

3. **`wokwi-esp32-devkit-v1` doesn't break out GPIO 16/17.** Valid pins are listed in the lint error if you use them. We route HUB75 `D` and `CLK` via GPIO 21/22 instead — this is reflected in `docs/hardware.md` so the same pin map works on Wokwi *and* real hardware.

4. **Pin labels use `D<n>` not `<n>`.** `esp:D25`, not `esp:25`.

5. **Run `wokwi-cli` whenever you change `diagram.json`** — it lints in ~2 seconds and catches typos, invalid attributes, and wrong pin names without launching the full VS Code simulator.

6. **`wokwi-hub75-matrix` is a non-functional placeholder part.** Wokwi renders the panel as a black rectangle visually, and the part lints clean, but the simulator does **not** decode HUB75 signals — no firmware will ever light it up in Wokwi. Confirmed by:
   - The official wokwi-cli registry marks the part `"documented": false`
   - Zero `diagram.json` files on GitHub use it (`gh search code "wokwi-hub75-matrix"` → 0 hits)
   - `wokwi-cli --screenshot-part matrix` errors with *"Part does not have a valid framebuffer"*
   - `panel->fillScreen(red)` at brightness 255 with E→GND wiring matching every known example produces no visible output

   **Implication:** the HUB75 display code (`src/display.cpp`) cannot be visually verified in Wokwi. It must be confirmed on real hardware. Wokwi remains useful for everything else: WiFi, HTTPS, ADS-B parsing, state machine, serial logs.

   The diagram still includes the HUB75 part so the wiring is documented and the GPIO pins are reserved, but treat any visual change to the panel in Wokwi as untestable.

## Native unit tests

Pure-C++ logic (haversine, bbox, layout, airline lookup) goes in source files that don't `#include <Arduino.h>`, so they compile under the host toolchain. Add tests under `test/test_native/` and run:

```bash
pio test -e native
```

The native env uses `build_src_filter = -<*>` to exclude all `src/` from the host build by default — explicitly add Arduino-free files to the filter when you want them linked into native tests.

## Build / run pitfalls

- **Don't pipe `pio run` through `tail`** to inspect output — `tail` always exits 0, masking compile failures. Use `pio run -e foo > /tmp/log 2>&1; echo $?` if you need both the tail and the real exit code.
- **First `pio run -e esp32dev` is slow** (downloads the espressif32 platform + libraries — hundreds of MB). Subsequent builds are seconds.
- **`mrcodetastic` vs `mrfaptastic`** — the HUB75 library's GitHub repo is `mrcodetastic/ESP32-HUB75-MatrixPanel-DMA` but the PlatformIO registry namespace is still the old `mrfaptastic/ESP32 HUB75 LED MATRIX PANEL DMA Display`. Use the registry name in `lib_deps`.

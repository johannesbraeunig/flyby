// FlyBy display — HUB75 panel implementation.
//
// Pin map matches docs/hardware.md (and diagram.json for the Wokwi sim).
// GPIO 16/17 are intentionally avoided so the same map works on both
// real hardware and the wokwi-esp32-devkit-v1 part.

#include "display.h"

#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>

namespace display {
namespace {

// HUB75 → ESP32 pin map. Keep in sync with docs/hardware.md + diagram.json.
//
// Names are k-prefixed because Arduino's binary.h #defines B0..B11111111
// as macros for binary literals — a plain `B1` would collide.
constexpr int kR1 = 25, kG1 = 26, kB1 = 27;
constexpr int kR2 = 14, kG2 = 12, kB2 = 13;
constexpr int kA  = 23, kB = 19, kC = 5, kD = 21, kE = 18;
constexpr int kLAT = 4, kOE = 15, kCLK = 22;

constexpr int kChain = 1;           // single 64x32 panel
constexpr uint8_t kBrightness = 90; // 0..255 — modest for PSU headroom on real hardware

MatrixPanel_I2S_DMA* panel = nullptr;

}  // namespace

bool init() {
  HUB75_I2S_CFG::i2s_pins pins = {
      kR1, kG1, kB1, kR2, kG2, kB2,
      kA,  kB,  kC,  kD,  kE,
      kLAT, kOE, kCLK,
  };
  HUB75_I2S_CFG cfg(kWidth, kHeight, kChain, pins);

  panel = new MatrixPanel_I2S_DMA(cfg);
  if (!panel->begin()) {
    delete panel;
    panel = nullptr;
    return false;
  }
  panel->setBrightness8(kBrightness);
  panel->clearScreen();
  return true;
}

void clear() {
  if (panel) panel->clearScreen();
}

void fillSolid(uint16_t color) {
  if (panel) panel->fillScreen(color);
}

uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  // color565 is a static helper but easier to call through the instance
  // — when panel is null we still return a valid 565 value so callers
  // can stash colors at startup without crashing.
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

void drawText(int x, int y, const char* text, uint16_t color) {
  if (!panel || !text) return;
  panel->setTextColor(color);
  panel->setCursor(x, y);
  panel->print(text);
}

void flush() {
  // DMA continuously refreshes from the framebuffer — nothing to do here.
}

}  // namespace display

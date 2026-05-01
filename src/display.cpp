#include "display.h"

#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>

namespace display {
namespace {

constexpr int kR1 = 25, kG1 = 26, kB1 = 27;
constexpr int kR2 = 14, kG2 = 12, kB2 = 13;
constexpr int kA  = 23, kB = 19, kC = 5, kD = 21, kE = 18;
constexpr int kLAT = 4, kOE = 15, kCLK = 22;

constexpr int kChain = 1;
constexpr uint8_t kBrightness = 60;

MatrixPanel_I2S_DMA* panel = nullptr;

}  // namespace

bool init() {
  HUB75_I2S_CFG::i2s_pins pins = {
      kR1, kG1, kB1, kR2, kG2, kB2,
      kA,  kB,  kC,  kD,  kE,
      kLAT, kOE, kCLK,
  };
  HUB75_I2S_CFG cfg(kWidth, kHeight, kChain, pins);
  cfg.i2sspeed = HUB75_I2S_CFG::HZ_10M;
  cfg.clkphase = false;

  panel = new MatrixPanel_I2S_DMA(cfg);
  if (!panel->begin()) {
    delete panel;
    panel = nullptr;
    return false;
  }
  panel->setBrightness8(kBrightness);
  panel->setTextWrap(false);
  panel->clearScreen();
  return true;
}

void clear() {
  if (panel) panel->clearScreen();
}

uint16_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

void drawText(int x, int y, const char* text, uint16_t color) {
  if (!panel || !text) return;
  panel->setFont(nullptr);
  panel->setTextColor(color);
  panel->setCursor(x, y);
  panel->print(text);
}

void flush() {
}

}  // namespace display

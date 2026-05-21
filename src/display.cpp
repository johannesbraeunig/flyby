#include "display.h"

#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include <Fonts/FreeSansBold9pt7b.h>

namespace display {
namespace {

constexpr int kR1 = 27, kG1 = 26, kB1 = 25;
constexpr int kR2 = 13, kG2 = 12, kB2 = 14;
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
  cfg.double_buff = true;
  cfg.min_refresh_rate = 120;
  cfg.latch_blanking = 2;
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

void drawText(int x, int y, const char* text, uint16_t color, uint8_t size) {
  if (!panel || !text) return;
  panel->setFont(nullptr);
  panel->setTextSize(size);
  panel->setTextColor(color);
  panel->setCursor(x, y);
  panel->print(text);
}

void drawTextLarge(int x, int y, const char* text, uint16_t color) {
  if (!panel || !text) return;
  panel->setFont(&FreeSansBold9pt7b);
  panel->setTextSize(1);
  panel->setTextColor(color);
  panel->setCursor(x, y);
  panel->print(text);
  panel->setFont(nullptr);
}

int textWidthLarge(const char* text) {
  if (!panel || !text) return 0;
  int16_t x1, y1;
  uint16_t w, h;
  panel->setFont(&FreeSansBold9pt7b);
  panel->getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  panel->setFont(nullptr);
  return w;
}

void drawArrowUp(int x, int y, uint16_t color) {
  if (!panel) return;
  // 5px wide, 7px tall triangle pointing up
  panel->drawPixel(x + 2, y,     color);
  panel->drawPixel(x + 1, y + 1, color); panel->drawPixel(x + 2, y + 1, color); panel->drawPixel(x + 3, y + 1, color);
  panel->drawPixel(x,     y + 2, color); panel->drawPixel(x + 2, y + 2, color); panel->drawPixel(x + 4, y + 2, color);
  panel->drawPixel(x + 2, y + 3, color);
  panel->drawPixel(x + 2, y + 4, color);
  panel->drawPixel(x + 2, y + 5, color);
  panel->drawPixel(x + 2, y + 6, color);
}

void drawArrowDown(int x, int y, uint16_t color) {
  if (!panel) return;
  panel->drawPixel(x + 2, y,     color);
  panel->drawPixel(x + 2, y + 1, color);
  panel->drawPixel(x + 2, y + 2, color);
  panel->drawPixel(x + 2, y + 3, color);
  panel->drawPixel(x,     y + 4, color); panel->drawPixel(x + 2, y + 4, color); panel->drawPixel(x + 4, y + 4, color);
  panel->drawPixel(x + 1, y + 5, color); panel->drawPixel(x + 2, y + 5, color); panel->drawPixel(x + 3, y + 5, color);
  panel->drawPixel(x + 2, y + 6, color);
}

void drawArrowLevel(int x, int y, uint16_t color) {
  if (!panel) return;
  // horizontal arrow 5px wide, centered at y+3
  for (int i = 0; i < 5; ++i) panel->drawPixel(x + i, y + 3, color);
  panel->drawPixel(x + 3, y + 2, color);
  panel->drawPixel(x + 4, y + 3, color);
  panel->drawPixel(x + 3, y + 4, color);
}

void flush() {
  if (panel) panel->flipDMABuffer();
}

}  // namespace display

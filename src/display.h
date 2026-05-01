#pragma once

#include <stdint.h>

namespace display {

constexpr int kWidth  = 64;
constexpr int kHeight = 32;

bool init();
void clear();
void fillSolid(uint16_t color);
uint16_t rgb(uint8_t r, uint8_t g, uint8_t b);

// Draw text with the default 5x7 font (6x8 cell).
void drawText(int x, int y, const char* text, uint16_t color);

// Draw text with TomThumb 3x5 font (4x6 cell).
void drawTextSmall(int x, int y, const char* text, uint16_t color);

// Draw a single pixel.
void drawPixel(int x, int y, uint16_t color);

void flush();

}  // namespace display

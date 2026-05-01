#pragma once

#include <stdint.h>

namespace display {

constexpr int kWidth  = 64;
constexpr int kHeight = 32;

bool init();
void clear();
uint16_t rgb(uint8_t r, uint8_t g, uint8_t b);

void drawText(int x, int y, const char* text, uint16_t color);

void flush();

}  // namespace display

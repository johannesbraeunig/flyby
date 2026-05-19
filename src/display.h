#pragma once

#include <stdint.h>

namespace display {

constexpr int kWidth  = 128;
constexpr int kHeight = 64;

bool init();
void clear();
uint16_t rgb(uint8_t r, uint8_t g, uint8_t b);

void drawText(int x, int y, const char* text, uint16_t color, uint8_t size = 1);
void drawTextLarge(int x, int y, const char* text, uint16_t color);
int textWidthLarge(const char* text);

void drawArrowUp(int x, int y, uint16_t color);
void drawArrowDown(int x, int y, uint16_t color);
void drawArrowLevel(int x, int y, uint16_t color);

void flush();

}  // namespace display

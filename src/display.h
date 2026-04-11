// FlyBy display — HUB75 panel wrapper.
//
// Thin facade over MatrixPanel_I2S_DMA so the rest of the firmware
// doesn't need to know about the underlying library or pin map.
// Pin map and panel geometry live in display.cpp.

#pragma once

#include <stdint.h>

namespace display {

// Panel geometry. Public so layout/render code can compute positions
// against it without dragging the matrix headers in.
constexpr int kWidth  = 64;
constexpr int kHeight = 32;

// Initialize the HUB75 driver. Returns true on success.
// Call once from setup(). Safe to skip drawing calls if this returns false.
bool init();

// Wipe the panel to black.
void clear();

// Fill the entire panel with a single color. Used for debug + idle states.
void fillSolid(uint16_t color);

// Convert 8-bit RGB to the panel's native 16-bit color.
uint16_t rgb(uint8_t r, uint8_t g, uint8_t b);

// Draw a string at (x, y) in the given color, using the default 5x7 font.
// (x, y) is the top-left of the first glyph (Adafruit_GFX convention).
void drawText(int x, int y, const char* text, uint16_t color);

// Push pending writes to the panel. No-op for now (DMA is continuous),
// kept for symmetry with double-buffered backends we may swap in later.
void flush();

}  // namespace display

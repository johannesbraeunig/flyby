// FlyBy layout — pure-C++ layout, formatting, and scroll math.
//
// Builds the 3-line frame the renderer should draw, and provides the
// formatting helpers for individual fields. No Arduino dependencies, so
// every behavior here is verifiable with native unit tests.

#pragma once

#include <stddef.h>
#include <stdint.h>

#include "adsb_types.h"
#include "airlines.h"

namespace layout {

// Panel + font geometry. Default Adafruit GFX font is 5×7 with 1px
// kerning, so each glyph occupies a 6×8 cell.
constexpr int kPanelWidth  = 64;
constexpr int kPanelHeight = 32;
constexpr int kCharWidth   = 6;
constexpr int kCharHeight  = 8;

// Y baseline (top of glyph) for each of the three lines.
constexpr int kLine1Y = 0;
constexpr int kLine2Y = 11;
constexpr int kLine3Y = 22;

// Default scroll speed in pixels per second.
constexpr int kScrollSpeedPxPerSec = 20;

// One line of the rendered frame.
struct Line {
  char    text[32];   // null-terminated; longer text triggers scroll
  uint8_t r;
  uint8_t g;
  uint8_t b;
  bool    scroll;     // true if text overflows panel width
};

// The three composed lines.
struct Frame {
  Line line1;
  Line line2;
  Line line3;
};

// Build the frame for a tracked plane. `airline` may be null when the
// callsign doesn't match any entry in airlines::table().
void compose(const adsb::Plane& plane,
             const airlines::Entry* airline,
             Frame* out);

// Build the idle "no planes nearby" frame.
void compose_idle(Frame* out);

// Field formatters. All are NaN-safe and bounds-safe; they always
// null-terminate the output buffer.
void format_flight_level(float alt_m, char* out, size_t out_size);
void format_speed_kt(float vel_mps, char* out, size_t out_size);
void format_distance_km(float dist_km, char* out, size_t out_size);
void format_stats_line(float alt_m, float vel_mps, float dist_km,
                       char* out, size_t out_size);

// Marquee scroll: linear ping-pong between x = 0 and x = -(text_w - panel_w).
// Returns 0 if the text fits or the speed is non-positive.
int scroll_x_offset(int text_width_px,
                    int panel_width_px,
                    uint32_t elapsed_ms,
                    int speed_px_per_sec);

// Convenience: text width in pixels for the default 5×7 font.
inline int text_width_px(const char* text) {
  if (!text) return 0;
  int n = 0;
  while (text[n]) ++n;
  return n * kCharWidth;
}

}  // namespace layout

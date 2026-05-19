#pragma once

#include <stddef.h>
#include <stdint.h>

#include "adsb_types.h"
#include "airlines.h"

namespace layout {

// ── Tunable constants ──────────────────────────────────────────────

constexpr int kPanelWidth  = 128;
constexpr int kPanelHeight = 64;

// Default font: 5x7, cell 6x8. Line 1 uses FreeSansBold9pt (~13px ascent).
constexpr int kCharWidth  = 6;
constexpr int kCharHeight = 8;

// Line 1 (FreeSansBold9pt): ~17px, lines 2–4 (default 1x): 8px each.
// 5px inter-line gaps, 4px top/bottom margins → centered in 64px.
// Line 1 y is the font baseline (ascent ~13px, so top ≈ y-13).
constexpr int kLine1Y = 17;  // baseline → top of glyphs at ~4px
constexpr int kLine2Y = 24;  // callsign + aircraft type
constexpr int kLine3Y = 37;  // route
constexpr int kLine4Y = 50;  // distance + direction

// Distance color thresholds.
constexpr float kDistGreenKm  = 5.0f;
constexpr float kDistYellowKm = 20.0f;

// ── Types ──────────────────────────────────────────────────────────

struct Frame {
  // Line 1: airline name, 2x font (e.g. "Lufthansa").
  char    line1[20];
  uint8_t l1_r, l1_g, l1_b;

  // Line 2: callsign + aircraft type (e.g. "DLH441 B748").
  char    line2[20];
  uint8_t l2_r, l2_g, l2_b;

  // Line 3: route with city names, stored as two halves for pixel-precise spacing.
  char    line3_from[16];
  char    line3_to[16];
  uint8_t l3_r, l3_g, l3_b;

  // Line 4: distance + direction + altitude (e.g. "12km NE FL350").
  char    line4[24];
  uint8_t l4_r, l4_g, l4_b;
  int8_t  vrate_dir;  // 1=climbing, -1=descending, 0=level

  bool is_idle;
};

void compose(const adsb::Plane& plane,
             const airlines::Entry* airline,
             Frame* out);

void compose_idle(Frame* out);

void format_distance_km(float dist_km, char* out, size_t out_size);

inline int text_width_px(const char* text) {
  if (!text) return 0;
  int n = 0;
  while (text[n]) ++n;
  return n * kCharWidth;
}

}  // namespace layout

#pragma once

#include <stddef.h>
#include <stdint.h>

#include "adsb_types.h"
#include "airlines.h"

namespace layout {

// ── Tunable constants ──────────────────────────────────────────────

constexpr int kPanelWidth  = 64;
constexpr int kPanelHeight = 32;

// Default font: 5x7, cell 6x8.
constexpr int kCharWidth  = 6;
constexpr int kCharHeight = 8;

// Progress bar at Y=0, then 3 lines × 8px = 24px in remaining 31px.
constexpr int kLine1Y = 2;
constexpr int kLine2Y = 13;
constexpr int kLine3Y = 24;

// Distance color thresholds.
constexpr float kDistGreenKm  = 5.0f;
constexpr float kDistYellowKm = 20.0f;

// ── Types ──────────────────────────────────────────────────────────

struct Frame {
  // Line 1: callsign + aircraft type (e.g. "DLH441 B748").
  char    line1[20];
  uint8_t l1_r, l1_g, l1_b;

  // Line 2: route (e.g. "FRA > JFK").
  char    line2[16];
  uint8_t l2_r, l2_g, l2_b;

  // Line 3: speed, distance, direction.
  char    line3[24];
  uint8_t l3_r, l3_g, l3_b;

  bool is_idle;
  float progress;  // 0.0 (just fetched) → 1.0 (about to fetch)
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

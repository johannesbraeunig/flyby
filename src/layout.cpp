#include "layout.h"

#include <cmath>
#include <cstdio>
#include <cstring>

namespace layout {
namespace {

// Safe copy into a fixed-size, always-null-terminated buffer.
void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) {
    dst[0] = 0;
    return;
  }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

bool overflows_panel(const char* text) {
  return text_width_px(text) > kPanelWidth;
}

}  // namespace

void format_flight_level(float alt_m, char* out, size_t out_size) {
  if (!out || out_size == 0) return;
  if (std::isnan(alt_m) || alt_m < 0.0f) {
    std::snprintf(out, out_size, "FL---");
    return;
  }
  // 1 m = 3.28084 ft. Flight level = altitude (ft) / 100, rounded.
  const int fl = static_cast<int>(std::round(alt_m * 3.28084f / 100.0f));
  std::snprintf(out, out_size, "FL%03d", fl);
}

void format_speed_kt(float vel_mps, char* out, size_t out_size) {
  if (!out || out_size == 0) return;
  if (std::isnan(vel_mps) || vel_mps < 0.0f) {
    std::snprintf(out, out_size, "---kt");
    return;
  }
  const int kt = static_cast<int>(std::round(vel_mps * 1.94384f));
  std::snprintf(out, out_size, "%dkt", kt);
}

void format_distance_km(float dist_km, char* out, size_t out_size) {
  if (!out || out_size == 0) return;
  if (std::isnan(dist_km) || dist_km < 0.0f) {
    std::snprintf(out, out_size, "--km");
    return;
  }
  if (dist_km < 10.0f) {
    std::snprintf(out, out_size, "%.1fkm", dist_km);
  } else {
    std::snprintf(out, out_size, "%dkm", static_cast<int>(std::round(dist_km)));
  }
}

void format_stats_line(float alt_m, float vel_mps, float dist_km,
                       char* out, size_t out_size) {
  if (!out || out_size == 0) return;
  char fl[8], kt[8], km[8];
  format_flight_level(alt_m, fl, sizeof(fl));
  format_speed_kt(vel_mps, kt, sizeof(kt));
  format_distance_km(dist_km, km, sizeof(km));
  std::snprintf(out, out_size, "%s %s %s", fl, kt, km);
}

void compose(const adsb::Plane& plane,
             const airlines::Entry* airline,
             Frame* out) {
  if (!out) return;

  // Line 1: airline name in brand color, or ICAO prefix in white if unknown.
  if (airline) {
    copy_into(out->line1.text, sizeof(out->line1.text), airline->name);
    out->line1.r = airline->r;
    out->line1.g = airline->g;
    out->line1.b = airline->b;
  } else {
    char prefix[4] = {0};
    if (plane.callsign[0] && plane.callsign[1] && plane.callsign[2]) {
      prefix[0] = plane.callsign[0];
      prefix[1] = plane.callsign[1];
      prefix[2] = plane.callsign[2];
      prefix[3] = 0;
      copy_into(out->line1.text, sizeof(out->line1.text), prefix);
    } else {
      copy_into(out->line1.text, sizeof(out->line1.text), "?");
    }
    out->line1.r = 255;
    out->line1.g = 255;
    out->line1.b = 255;
  }
  out->line1.scroll = overflows_panel(out->line1.text);

  // Line 2: full callsign (route + aircraft type to be added later when
  // we have a callsign-to-route data source — OpenSky doesn't provide it).
  copy_into(out->line2.text, sizeof(out->line2.text),
            plane.callsign[0] ? plane.callsign : "----");
  out->line2.r = 200;
  out->line2.g = 200;
  out->line2.b = 200;
  out->line2.scroll = overflows_panel(out->line2.text);

  // Line 3: compact stats — "FL361 486kt 4.2km".
  format_stats_line(plane.alt_m, plane.vel_mps, plane.distance_km,
                    out->line3.text, sizeof(out->line3.text));
  out->line3.r = 150;
  out->line3.g = 150;
  out->line3.b = 150;
  out->line3.scroll = overflows_panel(out->line3.text);
}

void compose_idle(Frame* out) {
  if (!out) return;

  copy_into(out->line1.text, sizeof(out->line1.text), "FlyBy");
  out->line1.r = 0;
  out->line1.g = 200;
  out->line1.b = 255;
  out->line1.scroll = false;

  copy_into(out->line2.text, sizeof(out->line2.text), "no planes");
  out->line2.r = 100;
  out->line2.g = 100;
  out->line2.b = 100;
  out->line2.scroll = false;

  out->line3.text[0] = 0;
  out->line3.r = 0;
  out->line3.g = 0;
  out->line3.b = 0;
  out->line3.scroll = false;
}

int scroll_x_offset(int text_width,
                    int panel_width,
                    uint32_t elapsed_ms,
                    int speed_px_per_sec) {
  if (text_width <= panel_width) return 0;
  if (speed_px_per_sec <= 0) return 0;

  const int range = text_width - panel_width;  // positive
  const uint32_t half_period_ms =
      static_cast<uint32_t>(range) * 1000u /
      static_cast<uint32_t>(speed_px_per_sec);
  if (half_period_ms == 0) return 0;
  const uint32_t full_period_ms = half_period_ms * 2u;
  const uint32_t t = elapsed_ms % full_period_ms;

  if (t < half_period_ms) {
    // Scroll left: x goes from 0 down to -range.
    const int delta = static_cast<int>(t * static_cast<uint32_t>(speed_px_per_sec) / 1000u);
    return -delta;
  } else {
    // Scroll right: x climbs from -range back to 0.
    const uint32_t back = t - half_period_ms;
    const int delta = static_cast<int>(back * static_cast<uint32_t>(speed_px_per_sec) / 1000u);
    return -range + delta;
  }
}

}  // namespace layout

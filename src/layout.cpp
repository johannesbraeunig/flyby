#include "layout.h"

#include <cmath>
#include <cstdio>
#include <cstring>

#include "geo.h"

namespace layout {
namespace {

void copy_into(char* dst, size_t dst_size, const char* src) {
  if (!dst || dst_size == 0) return;
  if (!src) { dst[0] = 0; return; }
  size_t i = 0;
  for (; i < dst_size - 1 && src[i]; ++i) dst[i] = src[i];
  dst[i] = 0;
}

}  // namespace

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

void compose(const adsb::Plane& plane,
             const airlines::Entry* airline,
             Frame* out) {
  if (!out) return;

  // Line 1: airline name in brand color, or 3-letter ICAO prefix as fallback.
  if (airline) {
    copy_into(out->line1, sizeof(out->line1), airline->name);
    out->l1_r = airline->r; out->l1_g = airline->g; out->l1_b = airline->b;
  } else if (plane.callsign[0] && plane.callsign[1] && plane.callsign[2]) {
    out->line1[0] = plane.callsign[0];
    out->line1[1] = plane.callsign[1];
    out->line1[2] = plane.callsign[2];
    out->line1[3] = 0;
    out->l1_r = 255; out->l1_g = 255; out->l1_b = 255;
  } else {
    copy_into(out->line1, sizeof(out->line1), "----");
    out->l1_r = 255; out->l1_g = 255; out->l1_b = 255;
  }

  // Line 2: route, or callsign as fallback. Both sides must be populated
  // — partial routes ("CDG>?") are uglier than the callsign and usually
  // mean we couldn't verify the missing side, so the callsign is the more
  // honest fallback. Use " > " when it fits (max 10 chars at 6 px = 60 px
  // on a 64 px panel), otherwise fall back to compact ">" so 4-char ICAO
  // codes still render without clipping.
  if (plane.origin[0] && plane.destination[0]) {
    size_t total = std::strlen(plane.origin) + 3 + std::strlen(plane.destination);
    const char* sep = total <= 10 ? " > " : ">";
    std::snprintf(out->line2, sizeof(out->line2), "%s%s%s",
                  plane.origin, sep, plane.destination);
  } else {
    copy_into(out->line2, sizeof(out->line2),
              plane.callsign[0] ? plane.callsign : "");
  }
  out->l2_r = 200; out->l2_g = 200; out->l2_b = 200;

  // Line 3: direction + distance.
  char km[8];
  format_distance_km(plane.distance_km, km, sizeof(km));

  if (!std::isnan(plane.bearing_deg)) {
    const char* dir = geo::bearing_to_compass(plane.bearing_deg);
    std::snprintf(out->line3, sizeof(out->line3), "%s %s", dir, km);
  } else {
    copy_into(out->line3, sizeof(out->line3), km);
  }

  if (!std::isnan(plane.distance_km) && plane.distance_km < kDistGreenKm) {
    out->l3_r = 0; out->l3_g = 255; out->l3_b = 0;
  } else if (!std::isnan(plane.distance_km) && plane.distance_km < kDistYellowKm) {
    out->l3_r = 255; out->l3_g = 200; out->l3_b = 0;
  } else {
    out->l3_r = 80; out->l3_g = 140; out->l3_b = 255;
  }

  out->is_idle = false;
}

void compose_idle(Frame* out) {
  if (!out) return;
  copy_into(out->line1, sizeof(out->line1), "No Plane");
  out->l1_r = 255; out->l1_g = 220; out->l1_b = 0;

  out->line2[0] = 0;
  out->l2_r = 0; out->l2_g = 0; out->l2_b = 0;

  out->line3[0] = 0;
  out->l3_r = 0; out->l3_g = 0; out->l3_b = 0;

  out->is_idle = true;
}

}  // namespace layout

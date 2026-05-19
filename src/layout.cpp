#include "layout.h"

#include <cmath>
#include <cstdio>
#include <cstring>

#include "airports.h"
#include "geo.h"

namespace layout {
namespace {

struct TypeName { const char* icao; const char* name; };
const TypeName kTypeNames[] = {
    {"A20N", "A320neo"}, {"A21N", "A321neo"},
    {"A19N", "A319neo"}, {"A318", "A318"},
    {"A319", "A319"},    {"A320", "A320"},
    {"A321", "A321"},    {"A332", "A330"},
    {"A333", "A330"},    {"A339", "A330neo"},
    {"A342", "A340"},    {"A343", "A340"},
    {"A345", "A340"},    {"A346", "A340"},
    {"A359", "A350"},    {"A35K", "A350"},
    {"A388", "A380"},
    {"B732", "B737"},    {"B733", "B737"},
    {"B734", "B737"},    {"B735", "B737"},
    {"B736", "B737"},    {"B737", "B737"},
    {"B738", "B737-800"},{"B739", "B737-900"},
    {"B37M", "B737MAX"}, {"B38M", "B737MAX8"},
    {"B39M", "B737MAX9"},
    {"B748", "B747-8"},  {"B744", "B747"},
    {"B752", "B757"},    {"B753", "B757"},
    {"B762", "B767"},    {"B763", "B767"},
    {"B764", "B767"},
    {"B772", "B777"},    {"B773", "B777"},
    {"B77L", "B777"},    {"B77W", "B777"},
    {"B788", "B787"},    {"B789", "B787"},
    {"B78X", "B787-10"},
    {"BCS1", "A220"},    {"BCS3", "A220"},
    {"C172", "Cessna172"},
    {"CRJ7", "CRJ700"}, {"CRJ9", "CRJ900"},
    {"DH8D", "Dash8"},
    {"E170", "E170"},    {"E190", "E190"},
    {"E195", "E195"},    {"E75L", "E175"},
    {"E290", "E190-E2"}, {"E295", "E195-E2"},
};
constexpr int kTypeCount = sizeof(kTypeNames) / sizeof(kTypeNames[0]);

const char* display_type(const char* icao_type) {
  if (!icao_type || !icao_type[0]) return nullptr;
  for (int i = 0; i < kTypeCount; ++i) {
    if (std::strcmp(kTypeNames[i].icao, icao_type) == 0)
      return kTypeNames[i].name;
  }
  return icao_type;
}

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

  // Line 1: airline name in brand color (2x font).
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

  // Line 2: callsign + aircraft type.
  const char* type = display_type(plane.aircraft_type);
  if (plane.callsign[0] && type) {
    std::snprintf(out->line2, sizeof(out->line2), "%s %s",
                  plane.callsign, type);
  } else if (plane.callsign[0]) {
    copy_into(out->line2, sizeof(out->line2), plane.callsign);
  } else if (type) {
    copy_into(out->line2, sizeof(out->line2), type);
  } else {
    out->line2[0] = 0;
  }
  out->l2_r = 180; out->l2_g = 180; out->l2_b = 180;

  // Line 3: route with city names (stored as two halves).
  if (plane.origin[0] && plane.destination[0]) {
    const char* from = airports::code_to_city(plane.origin);
    const char* to   = airports::code_to_city(plane.destination);
    copy_into(out->line3_from, sizeof(out->line3_from), from ? from : plane.origin);
    copy_into(out->line3_to,   sizeof(out->line3_to),   to   ? to   : plane.destination);
  } else {
    out->line3_from[0] = 0;
    out->line3_to[0]   = 0;
  }
  out->l3_r = 200; out->l3_g = 200; out->l3_b = 200;

  // Line 4: distance + direction + altitude.
  char km[8];
  format_distance_km(plane.distance_km, km, sizeof(km));

  const char* dir = "";
  if (!std::isnan(plane.bearing_deg))
    dir = geo::bearing_to_compass(plane.bearing_deg);

  char alt[8] = "";
  if (!std::isnan(plane.alt_m) && plane.alt_m > 0.0f) {
    int fl = static_cast<int>(std::round(plane.alt_m * 3.28084f / 100.0f));
    std::snprintf(alt, sizeof(alt), "FL%d", fl);
  }

  // Vertical rate: 1 = climbing, -1 = descending, 0 = level.
  out->vrate_dir = 0;
  if (!std::isnan(plane.vrate_mps)) {
    if (plane.vrate_mps > 0.5f)       out->vrate_dir = 1;
    else if (plane.vrate_mps < -0.5f) out->vrate_dir = -1;
  }

  int pos = 0;
  pos += std::snprintf(out->line4 + pos, sizeof(out->line4) - pos, "%s", km);
  if (dir[0])
    pos += std::snprintf(out->line4 + pos, sizeof(out->line4) - pos, " %s", dir);
  if (alt[0])
    std::snprintf(out->line4 + pos, sizeof(out->line4) - pos, " %s", alt);

  if (!std::isnan(plane.distance_km) && plane.distance_km < kDistGreenKm) {
    out->l4_r = 0; out->l4_g = 255; out->l4_b = 0;
  } else if (!std::isnan(plane.distance_km) && plane.distance_km < kDistYellowKm) {
    out->l4_r = 255; out->l4_g = 200; out->l4_b = 0;
  } else {
    out->l4_r = 80; out->l4_g = 140; out->l4_b = 255;
  }

  out->is_idle = false;
}

void compose_idle(Frame* out) {
  if (!out) return;
  copy_into(out->line1, sizeof(out->line1), "No Plane");
  out->l1_r = 255; out->l1_g = 220; out->l1_b = 0;

  out->line2[0] = 0;
  out->l2_r = 0; out->l2_g = 0; out->l2_b = 0;

  out->line3_from[0] = 0;
  out->line3_to[0]   = 0;
  out->l3_r = 0; out->l3_g = 0; out->l3_b = 0;

  out->line4[0] = 0;
  out->l4_r = 0; out->l4_g = 0; out->l4_b = 0;
  out->vrate_dir = 0;

  out->is_idle = true;
}

}  // namespace layout

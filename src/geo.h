// FlyBy geo — great-circle distance + bbox helpers.
//
// Pure C++, Arduino-free, host-testable.

#pragma once

namespace geo {

struct BBox {
  double lamin;  // min latitude
  double lomin;  // min longitude
  double lamax;  // max latitude
  double lomax;  // max longitude
};

// Great-circle distance between two (lat, lon) points in kilometers.
// Uses the haversine formula with WGS-84 mean Earth radius.
double haversine_km(double lat1, double lon1, double lat2, double lon2);

// Approximate lat/lon bounding box around (lat, lon) covering the given
// radius. The box is over-inclusive (a square in lat/lon space, not a true
// circle), which is exactly what OpenSky's /api/states/all bbox query needs.
BBox bbox_for(double lat, double lon, double radius_km);

// Initial bearing from (lat1, lon1) to (lat2, lon2) in degrees [0, 360).
double bearing_deg(double lat1, double lon1, double lat2, double lon2);

// Convert a bearing in degrees to a German compass label (N, NO, O, SO, S, SW, W, NW).
const char* bearing_to_compass(double bearing);

}  // namespace geo

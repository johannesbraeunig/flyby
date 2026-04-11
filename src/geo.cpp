#include "geo.h"

#include <cmath>

namespace geo {
namespace {

constexpr double kEarthRadiusKm = 6371.0088;  // WGS-84 mean radius
constexpr double kPi = 3.14159265358979323846;
constexpr double kDegToRad = kPi / 180.0;

// 1 degree of latitude ≈ this many km (constant globally).
constexpr double kKmPerDegLat = 111.32;

}  // namespace

double haversine_km(double lat1, double lon1, double lat2, double lon2) {
  const double dLat = (lat2 - lat1) * kDegToRad;
  const double dLon = (lon2 - lon1) * kDegToRad;
  const double s1 = std::sin(dLat / 2.0);
  const double s2 = std::sin(dLon / 2.0);
  const double a = s1 * s1 +
                   std::cos(lat1 * kDegToRad) * std::cos(lat2 * kDegToRad) *
                       s2 * s2;
  return 2.0 * kEarthRadiusKm * std::asin(std::sqrt(a));
}

BBox bbox_for(double lat, double lon, double radius_km) {
  // Latitude is uniform; longitude shrinks toward the poles.
  const double dLat = radius_km / kKmPerDegLat;
  const double cosLat = std::cos(lat * kDegToRad);
  // Guard against division-by-zero at the poles. cos(90°) is ~6e-17, not 0,
  // but we still want a sensible bbox if someone tests with lat = 90.
  const double dLon = (cosLat > 1e-9)
                          ? (radius_km / (kKmPerDegLat * cosLat))
                          : 180.0;
  return {lat - dLat, lon - dLon, lat + dLat, lon + dLon};
}

}  // namespace geo

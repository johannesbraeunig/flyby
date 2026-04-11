// Native unit tests for geo:: haversine + bbox.

#include <unity.h>

#include <cmath>

#include "geo.h"

void setUp(void) {}
void tearDown(void) {}

// Hamburg ↔ London city center ≈ 720 km (great circle).
// Reference: standard online distance calculators agree on ~720 km
// city-to-city; haversine vs WGS-84 ellipsoid differ by < 0.5%.
constexpr double kHamburgLat = 53.5511;
constexpr double kHamburgLon = 9.9937;
constexpr double kLondonLat  = 51.5074;
constexpr double kLondonLon  = -0.1278;

void test_haversine_zero_distance_to_self(void) {
  TEST_ASSERT_DOUBLE_WITHIN(1e-9, 0.0,
      geo::haversine_km(kHamburgLat, kHamburgLon, kHamburgLat, kHamburgLon));
}

void test_haversine_hamburg_to_london(void) {
  const double d = geo::haversine_km(kHamburgLat, kHamburgLon,
                                      kLondonLat, kLondonLon);
  TEST_ASSERT_DOUBLE_WITHIN(5.0, 720.0, d);
}

void test_haversine_symmetric(void) {
  const double a = geo::haversine_km(kHamburgLat, kHamburgLon,
                                      kLondonLat, kLondonLon);
  const double b = geo::haversine_km(kLondonLat, kLondonLon,
                                      kHamburgLat, kHamburgLon);
  TEST_ASSERT_DOUBLE_WITHIN(1e-9, a, b);
}

void test_bbox_centered_on_origin(void) {
  geo::BBox bb = geo::bbox_for(kHamburgLat, kHamburgLon, 50.0);
  // Center of bbox should be the origin.
  TEST_ASSERT_DOUBLE_WITHIN(1e-6, kHamburgLat, (bb.lamin + bb.lamax) / 2.0);
  TEST_ASSERT_DOUBLE_WITHIN(1e-6, kHamburgLon, (bb.lomin + bb.lomax) / 2.0);
}

void test_bbox_lat_span_matches_radius(void) {
  // 50 km radius → ~0.449° lat span on each side, ~0.898° total.
  geo::BBox bb = geo::bbox_for(kHamburgLat, kHamburgLon, 50.0);
  const double lat_span = bb.lamax - bb.lamin;
  TEST_ASSERT_DOUBLE_WITHIN(0.01, 0.898, lat_span);
}

void test_bbox_lon_span_widens_at_equator(void) {
  geo::BBox at_eq    = geo::bbox_for(0.0,  0.0, 50.0);
  geo::BBox at_polar = geo::bbox_for(80.0, 0.0, 50.0);
  const double eq_lon_span    = at_eq.lomax - at_eq.lomin;
  const double polar_lon_span = at_polar.lomax - at_polar.lomin;
  // Polar bbox should be much wider in longitude than equatorial bbox.
  TEST_ASSERT_TRUE(polar_lon_span > eq_lon_span * 4);
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_haversine_zero_distance_to_self);
  RUN_TEST(test_haversine_hamburg_to_london);
  RUN_TEST(test_haversine_symmetric);
  RUN_TEST(test_bbox_centered_on_origin);
  RUN_TEST(test_bbox_lat_span_matches_radius);
  RUN_TEST(test_bbox_lon_span_widens_at_equator);
  return UNITY_END();
}

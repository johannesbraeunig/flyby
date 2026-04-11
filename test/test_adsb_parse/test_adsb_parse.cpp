// Native unit tests for adsb::parse_states_find_nearest.

#include <unity.h>

#include <cmath>
#include <cstring>

#include "adsb_parse.h"
#include "adsb_types.h"

void setUp(void) {}
void tearDown(void) {}

// Hamburg observer position used by all tests.
constexpr double kObsLat = 53.5511;
constexpr double kObsLon = 9.9937;

// One airborne plane right over Hamburg → trivially the nearest.
const char* const kFixtureSinglePlane = R"({
  "time": 1712830000,
  "states": [
    ["abc123","DLH441  ","Germany",1712830000,1712830000,9.99,53.55,11000.0,false,250.0,90.0,0,null,11200,"1000",false,0]
  ]
})";

// Two airborne planes: one over Hamburg, one over London. Hamburg wins.
const char* const kFixtureTwoPlanes = R"({
  "time": 1712830000,
  "states": [
    ["bbb222","BAW117  ","United Kingdom",1712830000,1712830000,-0.4543,51.47,12000.0,false,260.0,270.0,0,null,12100,"2000",false,0],
    ["aaa111","DLH441  ","Germany",1712830000,1712830000,9.99,53.55,11000.0,false,250.0,90.0,0,null,11200,"1000",false,0]
  ]
})";

// Mixed bag: one on-ground (skipped), one with null position (skipped),
// one airborne over Hamburg.
const char* const kFixtureFiltering = R"({
  "time": 1712830000,
  "states": [
    ["ggg333","DLHGND  ","Germany",1712830000,1712830000,9.98,53.54,null,true,0,0,0,null,null,"1111",false,0],
    ["nnn444","NULPOS  ","Germany",1712830000,1712830000,null,null,null,false,null,null,null,null,null,null,false,0],
    ["ccc555","DLH900  ","Germany",1712830000,1712830000,9.99,53.55,9000.0,false,200.0,180.0,0,null,9100,"3000",false,0]
  ]
})";

// Empty states array.
const char* const kFixtureEmpty = R"({"time":1712830000,"states":[]})";

// Only on-ground / null-position planes — nothing to return.
const char* const kFixtureOnlyFiltered = R"({
  "time": 1712830000,
  "states": [
    ["ggg333","GROUND  ","Germany",1712830000,1712830000,9.98,53.54,null,true,0,0,0,null,null,"1111",false,0],
    ["nnn444","NULPOS  ","Germany",1712830000,1712830000,null,null,null,false,null,null,null,null,null,null,false,0]
  ]
})";

void test_parse_single_airborne_plane(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      kFixtureSinglePlane, 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_TRUE(ok);
  TEST_ASSERT_EQUAL_STRING("abc123", out.icao24);
  TEST_ASSERT_EQUAL_STRING("DLH441", out.callsign);  // trailing spaces trimmed
  TEST_ASSERT_DOUBLE_WITHIN(0.001, 53.55, out.lat);
  TEST_ASSERT_DOUBLE_WITHIN(0.001, 9.99,  out.lon);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 11000.0f, out.alt_m);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 250.0f,   out.vel_mps);
  TEST_ASSERT_FALSE(out.on_ground);
  TEST_ASSERT_TRUE(out.distance_km < 1.0f);  // basically on top of us
}

void test_parse_picks_nearest_of_two(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      kFixtureTwoPlanes, 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_TRUE(ok);
  TEST_ASSERT_EQUAL_STRING("aaa111", out.icao24);
  TEST_ASSERT_TRUE(out.distance_km < 1.0f);
}

void test_parse_skips_on_ground_and_null_position(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      kFixtureFiltering, 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_TRUE(ok);
  TEST_ASSERT_EQUAL_STRING("ccc555", out.icao24);
  TEST_ASSERT_FALSE(out.on_ground);
}

void test_parse_empty_states_returns_false(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      kFixtureEmpty, 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_FALSE(ok);
}

void test_parse_only_filtered_returns_false(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      kFixtureOnlyFiltered, 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_FALSE(ok);
}

void test_parse_invalid_json_returns_false(void) {
  adsb::Plane out;
  bool ok = adsb::parse_states_find_nearest(
      "{not json", 0, kObsLat, kObsLon, &out);
  TEST_ASSERT_FALSE(ok);
}

void test_parse_null_inputs_return_false(void) {
  adsb::Plane out;
  TEST_ASSERT_FALSE(
      adsb::parse_states_find_nearest(nullptr, 0, kObsLat, kObsLon, &out));
  TEST_ASSERT_FALSE(
      adsb::parse_states_find_nearest("{}", 0, kObsLat, kObsLon, nullptr));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_parse_single_airborne_plane);
  RUN_TEST(test_parse_picks_nearest_of_two);
  RUN_TEST(test_parse_skips_on_ground_and_null_position);
  RUN_TEST(test_parse_empty_states_returns_false);
  RUN_TEST(test_parse_only_filtered_returns_false);
  RUN_TEST(test_parse_invalid_json_returns_false);
  RUN_TEST(test_parse_null_inputs_return_false);
  return UNITY_END();
}

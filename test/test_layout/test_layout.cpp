#include <unity.h>

#include <cmath>
#include <cstring>

#include "adsb_types.h"
#include "airlines.h"
#include "layout.h"

void setUp(void) {}
void tearDown(void) {}

// ---- format_distance_km --------------------------------------------------

void test_format_distance_km_close(void) {
  char buf[16];
  layout::format_distance_km(4.234f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("4.2km", buf);
}

void test_format_distance_km_far(void) {
  char buf[16];
  layout::format_distance_km(42.7f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("43km", buf);
}

void test_format_distance_km_nan(void) {
  char buf[16];
  layout::format_distance_km(NAN, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("--km", buf);
}

// ---- compose -------------------------------------------------------------

void test_compose_with_known_airline(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "DLH441");
  p.distance_km = 4.2f;

  const auto* airline = airlines::lookup(p.callsign);
  TEST_ASSERT_NOT_NULL(airline);

  layout::Frame f;
  layout::compose(p, airline, &f);

  TEST_ASSERT_EQUAL_STRING("Lufthansa", f.line1);
  TEST_ASSERT_EQUAL_UINT8(airline->r, f.l1_r);
  TEST_ASSERT_EQUAL_UINT8(airline->g, f.l1_g);
  TEST_ASSERT_EQUAL_UINT8(airline->b, f.l1_b);
  TEST_ASSERT_FALSE(f.is_idle);
}

void test_compose_with_unknown_airline(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "ZZZ999");
  p.distance_km = 12.0f;

  layout::Frame f;
  layout::compose(p, nullptr, &f);

  TEST_ASSERT_EQUAL_STRING("ZZZ", f.line1);
  TEST_ASSERT_EQUAL_UINT8(255, f.l1_r);
}

void test_compose_with_route(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "AFR123");
  std::strcpy(p.origin, "CDG");
  std::strcpy(p.destination, "HAM");
  p.distance_km = 3.0f;

  layout::Frame f;
  layout::compose(p, nullptr, &f);

  TEST_ASSERT_EQUAL_STRING("CDG>HAM", f.line2);
  // Green because < 5km.
  TEST_ASSERT_EQUAL_UINT8(0, f.l3_r);
  TEST_ASSERT_EQUAL_UINT8(255, f.l3_g);
}

void test_compose_idle(void) {
  layout::Frame f;
  layout::compose_idle(&f);
  TEST_ASSERT_EQUAL_STRING("No Plane", f.line1);
  TEST_ASSERT_TRUE(f.is_idle);
}

// ---- text_width_px -------------------------------------------------------

void test_text_width_px(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::text_width_px(""));
  TEST_ASSERT_EQUAL_INT(0, layout::text_width_px(nullptr));
  TEST_ASSERT_EQUAL_INT(30, layout::text_width_px("FlyBy"));
  TEST_ASSERT_EQUAL_INT(54, layout::text_width_px("Lufthansa"));
}

int main(int, char**) {
  UNITY_BEGIN();

  RUN_TEST(test_format_distance_km_close);
  RUN_TEST(test_format_distance_km_far);
  RUN_TEST(test_format_distance_km_nan);

  RUN_TEST(test_compose_with_known_airline);
  RUN_TEST(test_compose_with_unknown_airline);
  RUN_TEST(test_compose_with_route);
  RUN_TEST(test_compose_idle);

  RUN_TEST(test_text_width_px);

  return UNITY_END();
}

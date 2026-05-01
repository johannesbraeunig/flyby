#include <unity.h>

#include <cmath>
#include <cstring>

#include "adsb_types.h"
#include "airlines.h"
#include "layout.h"

void setUp(void) {}
void tearDown(void) {}

// ---- format_flight_level -------------------------------------------------

void test_format_flight_level_typical(void) {
  char buf[16];
  layout::format_flight_level(11000.0f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL361", buf);
}

void test_format_flight_level_zero(void) {
  char buf[16];
  layout::format_flight_level(0.0f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL000", buf);
}

void test_format_flight_level_nan(void) {
  char buf[16];
  layout::format_flight_level(NAN, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL---", buf);
}

void test_format_flight_level_negative(void) {
  char buf[16];
  layout::format_flight_level(-100.0f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL---", buf);
}

// ---- format_speed_kt -----------------------------------------------------

void test_format_speed_kt_typical(void) {
  char buf[16];
  layout::format_speed_kt(257.0f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("500kt", buf);
}

void test_format_speed_kt_zero(void) {
  char buf[16];
  layout::format_speed_kt(0.0f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("0kt", buf);
}

void test_format_speed_kt_nan(void) {
  char buf[16];
  layout::format_speed_kt(NAN, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("---kt", buf);
}

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

// ---- vrate_trend ---------------------------------------------------------

void test_vrate_trend_climbing(void) {
  TEST_ASSERT_EQUAL_CHAR('^', layout::vrate_trend(5.0f));
}

void test_vrate_trend_descending(void) {
  TEST_ASSERT_EQUAL_CHAR('v', layout::vrate_trend(-5.0f));
}

void test_vrate_trend_level(void) {
  TEST_ASSERT_EQUAL_CHAR('=', layout::vrate_trend(0.5f));
  TEST_ASSERT_EQUAL_CHAR('=', layout::vrate_trend(NAN));
}

// ---- compose -------------------------------------------------------------

void test_compose_with_known_airline(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "DLH441");
  p.alt_m = 11000.0f;
  p.vel_mps = 250.0f;
  p.distance_km = 4.2f;

  const auto* airline = airlines::lookup(p.callsign);
  TEST_ASSERT_NOT_NULL(airline);

  layout::Frame f;
  layout::compose(p, airline, &f, 1000);

  TEST_ASSERT_EQUAL_STRING("DLH441", f.callsign);
  TEST_ASSERT_EQUAL_UINT8(airline->r, f.cs_r);
  TEST_ASSERT_EQUAL_UINT8(airline->g, f.cs_g);
  TEST_ASSERT_EQUAL_UINT8(airline->b, f.cs_b);
  TEST_ASSERT_EQUAL_STRING("", f.route);
  TEST_ASSERT_EQUAL_STRING("4.2km", f.distance);
  TEST_ASSERT_FALSE(f.is_idle);
}

void test_compose_with_unknown_airline(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "ZZZ999");
  p.distance_km = 12.0f;

  layout::Frame f;
  layout::compose(p, nullptr, &f, 1000);

  TEST_ASSERT_EQUAL_STRING("ZZZ999", f.callsign);
  TEST_ASSERT_EQUAL_UINT8(255, f.cs_r);
}

void test_compose_with_route(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "AFR123");
  std::strcpy(p.origin, "CDG");
  std::strcpy(p.destination, "HAM");
  p.distance_km = 3.0f;

  layout::Frame f;
  layout::compose(p, nullptr, &f, 1000);

  TEST_ASSERT_EQUAL_STRING("CDG>HAM", f.route);
  // Green because < 5km
  TEST_ASSERT_EQUAL_UINT8(0, f.dist_r);
  TEST_ASSERT_EQUAL_UINT8(255, f.dist_g);
}

void test_compose_idle(void) {
  layout::Frame f;
  layout::compose_idle(&f);
  TEST_ASSERT_EQUAL_STRING("FlyBy", f.callsign);
  TEST_ASSERT_TRUE(f.is_idle);
}

// ---- scroll_x_offset -----------------------------------------------------

void test_scroll_short_text_no_scroll(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset("ABC", 5000, 0));
}

void test_scroll_pause_at_start(void) {
  // Long text but within pause window.
  const char* long_text = "B748 : FL361= : 486kt : Lufthansa : Extra padding text here!!";
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(long_text, 500, 0));
}

void test_scroll_moves_after_pause(void) {
  const char* long_text = "B748 : FL361= : 486kt : Lufthansa : Extra padding text here!!";
  int offset = layout::scroll_x_offset(long_text, 2000, 0);
  TEST_ASSERT_TRUE(offset < 0);
}

// ---- text_width_px -------------------------------------------------------

void test_text_width_px(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::text_width_px(""));
  TEST_ASSERT_EQUAL_INT(0, layout::text_width_px(nullptr));
  TEST_ASSERT_EQUAL_INT(30, layout::text_width_px("FlyBy"));
  TEST_ASSERT_EQUAL_INT(54, layout::text_width_px("Lufthansa"));
}

void test_text_width_small_px(void) {
  TEST_ASSERT_EQUAL_INT(20, layout::text_width_small_px("FlyBy"));
}

int main(int, char**) {
  UNITY_BEGIN();

  RUN_TEST(test_format_flight_level_typical);
  RUN_TEST(test_format_flight_level_zero);
  RUN_TEST(test_format_flight_level_nan);
  RUN_TEST(test_format_flight_level_negative);

  RUN_TEST(test_format_speed_kt_typical);
  RUN_TEST(test_format_speed_kt_zero);
  RUN_TEST(test_format_speed_kt_nan);

  RUN_TEST(test_format_distance_km_close);
  RUN_TEST(test_format_distance_km_far);
  RUN_TEST(test_format_distance_km_nan);

  RUN_TEST(test_vrate_trend_climbing);
  RUN_TEST(test_vrate_trend_descending);
  RUN_TEST(test_vrate_trend_level);

  RUN_TEST(test_compose_with_known_airline);
  RUN_TEST(test_compose_with_unknown_airline);
  RUN_TEST(test_compose_with_route);
  RUN_TEST(test_compose_idle);

  RUN_TEST(test_scroll_short_text_no_scroll);
  RUN_TEST(test_scroll_pause_at_start);
  RUN_TEST(test_scroll_moves_after_pause);

  RUN_TEST(test_text_width_px);
  RUN_TEST(test_text_width_small_px);

  return UNITY_END();
}

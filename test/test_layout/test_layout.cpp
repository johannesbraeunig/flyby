// Native unit tests for layout:: formatting, composition, and scroll.

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
  // 11000 m × 3.28084 / 100 = 360.89 → FL361
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
  // 257 × 1.94384 ≈ 499.6 → 500
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

// ---- format_stats_line ---------------------------------------------------

void test_format_stats_line_combines_fields(void) {
  char buf[64];
  layout::format_stats_line(11000.0f, 257.0f, 4.234f, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL361 500kt 4.2km", buf);
}

void test_format_stats_line_handles_nans(void) {
  char buf[64];
  layout::format_stats_line(NAN, NAN, NAN, buf, sizeof(buf));
  TEST_ASSERT_EQUAL_STRING("FL--- ---kt --km", buf);
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
  layout::compose(p, airline, &f);

  TEST_ASSERT_EQUAL_STRING("Lufthansa", f.line1.text);
  // Brand color matches the table entry.
  TEST_ASSERT_EQUAL_UINT8(airline->r, f.line1.r);
  TEST_ASSERT_EQUAL_UINT8(airline->g, f.line1.g);
  TEST_ASSERT_EQUAL_UINT8(airline->b, f.line1.b);

  TEST_ASSERT_EQUAL_STRING("DLH441", f.line2.text);
  TEST_ASSERT_EQUAL_STRING("FL361 486kt 4.2km", f.line3.text);
}

void test_compose_with_unknown_airline_uses_icao_prefix(void) {
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "ZZZ999");
  p.alt_m = 5000.0f;
  p.vel_mps = 200.0f;
  p.distance_km = 12.0f;

  layout::Frame f;
  layout::compose(p, /*airline=*/nullptr, &f);

  TEST_ASSERT_EQUAL_STRING("ZZZ", f.line1.text);
  TEST_ASSERT_EQUAL_UINT8(255, f.line1.r);
  TEST_ASSERT_EQUAL_UINT8(255, f.line1.g);
  TEST_ASSERT_EQUAL_UINT8(255, f.line1.b);
  TEST_ASSERT_EQUAL_STRING("ZZZ999", f.line2.text);
}

void test_compose_marks_long_text_for_scroll(void) {
  // Stats line at FL361 486kt 4.2km is 17 chars × 6 px = 102 px > 64,
  // so line3 should be flagged for scrolling.
  adsb::Plane p;
  adsb::plane_clear(&p);
  std::strcpy(p.callsign, "DLH441");
  p.alt_m = 11000.0f;
  p.vel_mps = 250.0f;
  p.distance_km = 4.2f;

  layout::Frame f;
  layout::compose(p, airlines::lookup("DLH441"), &f);
  TEST_ASSERT_TRUE(f.line3.scroll);
  TEST_ASSERT_FALSE(f.line1.scroll);  // "Lufthansa" is 9 chars × 6 = 54 px
}

void test_compose_idle(void) {
  layout::Frame f;
  layout::compose_idle(&f);
  TEST_ASSERT_EQUAL_STRING("FlyBy", f.line1.text);
  TEST_ASSERT_EQUAL_STRING("no planes", f.line2.text);
  TEST_ASSERT_EQUAL_STRING("", f.line3.text);
  TEST_ASSERT_FALSE(f.line1.scroll);
  TEST_ASSERT_FALSE(f.line2.scroll);
}

// ---- scroll_x_offset -----------------------------------------------------

void test_scroll_no_overflow_returns_zero(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(50, 64, 1000, 20));
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(64, 64, 1000, 20));
}

void test_scroll_at_t0_starts_at_zero(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(128, 64, 0, 64));
}

void test_scroll_progresses_left(void) {
  // text 128, panel 64, range = 64. speed 64 px/s → half period 1000 ms.
  TEST_ASSERT_EQUAL_INT(-32, layout::scroll_x_offset(128, 64, 500, 64));
}

void test_scroll_at_full_left(void) {
  // After exactly half period the offset is back to -range / +0 boundary.
  // Implementation: at t == half_period_ms we enter the "right" branch
  // with back == 0, returning -range.
  TEST_ASSERT_EQUAL_INT(-64, layout::scroll_x_offset(128, 64, 1000, 64));
}

void test_scroll_returns_toward_zero(void) {
  // 1500 ms is mid-way through the right-bound half: -64 + 32 = -32.
  TEST_ASSERT_EQUAL_INT(-32, layout::scroll_x_offset(128, 64, 1500, 64));
}

void test_scroll_period_loops(void) {
  // Full period is 2000 ms; at exactly that boundary we're back to t = 0.
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(128, 64, 2000, 64));
}

void test_scroll_zero_or_negative_speed_returns_zero(void) {
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(128, 64, 1000, 0));
  TEST_ASSERT_EQUAL_INT(0, layout::scroll_x_offset(128, 64, 1000, -10));
}

// ---- text_width_px (header inline) ---------------------------------------

void test_text_width_px(void) {
  TEST_ASSERT_EQUAL_INT(0,  layout::text_width_px(""));
  TEST_ASSERT_EQUAL_INT(0,  layout::text_width_px(nullptr));
  TEST_ASSERT_EQUAL_INT(30, layout::text_width_px("FlyBy"));   // 5 × 6
  TEST_ASSERT_EQUAL_INT(54, layout::text_width_px("Lufthansa")); // 9 × 6
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

  RUN_TEST(test_format_stats_line_combines_fields);
  RUN_TEST(test_format_stats_line_handles_nans);

  RUN_TEST(test_compose_with_known_airline);
  RUN_TEST(test_compose_with_unknown_airline_uses_icao_prefix);
  RUN_TEST(test_compose_marks_long_text_for_scroll);
  RUN_TEST(test_compose_idle);

  RUN_TEST(test_scroll_no_overflow_returns_zero);
  RUN_TEST(test_scroll_at_t0_starts_at_zero);
  RUN_TEST(test_scroll_progresses_left);
  RUN_TEST(test_scroll_at_full_left);
  RUN_TEST(test_scroll_returns_toward_zero);
  RUN_TEST(test_scroll_period_loops);
  RUN_TEST(test_scroll_zero_or_negative_speed_returns_zero);

  RUN_TEST(test_text_width_px);

  return UNITY_END();
}

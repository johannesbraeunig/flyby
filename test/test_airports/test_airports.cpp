// Native unit tests for airports:: ICAO -> IATA lookup.

#include <unity.h>

#include <cstring>

#include "airports.h"

void setUp(void) {}
void tearDown(void) {}

void test_lookup_german_airports(void) {
  TEST_ASSERT_EQUAL_STRING("HAM", airports::icao_to_iata("EDDH"));
  TEST_ASSERT_EQUAL_STRING("FRA", airports::icao_to_iata("EDDF"));
  TEST_ASSERT_EQUAL_STRING("MUC", airports::icao_to_iata("EDDM"));
  TEST_ASSERT_EQUAL_STRING("BER", airports::icao_to_iata("EDDB"));
}

void test_lookup_european_hubs(void) {
  TEST_ASSERT_EQUAL_STRING("LIS", airports::icao_to_iata("LPPT"));
  TEST_ASSERT_EQUAL_STRING("LHR", airports::icao_to_iata("EGLL"));
  TEST_ASSERT_EQUAL_STRING("CDG", airports::icao_to_iata("LFPG"));
  TEST_ASSERT_EQUAL_STRING("AMS", airports::icao_to_iata("EHAM"));
}

void test_lookup_intercontinental(void) {
  TEST_ASSERT_EQUAL_STRING("JFK", airports::icao_to_iata("KJFK"));
  TEST_ASSERT_EQUAL_STRING("DXB", airports::icao_to_iata("OMDB"));
  TEST_ASSERT_EQUAL_STRING("SIN", airports::icao_to_iata("WSSS"));
}

void test_lookup_unknown_returns_null(void) {
  TEST_ASSERT_NULL(airports::icao_to_iata("ZZZZ"));
  TEST_ASSERT_NULL(airports::icao_to_iata("XXXX"));
}

void test_lookup_handles_empty_and_null(void) {
  TEST_ASSERT_NULL(airports::icao_to_iata(nullptr));
  TEST_ASSERT_NULL(airports::icao_to_iata(""));
}

void test_lookup_is_case_sensitive(void) {
  // Table stores uppercase; lowercase should miss. (Callers always
  // uppercase ICAO before lookup; this is a contract test.)
  TEST_ASSERT_NULL(airports::icao_to_iata("eddh"));
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_lookup_german_airports);
  RUN_TEST(test_lookup_european_hubs);
  RUN_TEST(test_lookup_intercontinental);
  RUN_TEST(test_lookup_unknown_returns_null);
  RUN_TEST(test_lookup_handles_empty_and_null);
  RUN_TEST(test_lookup_is_case_sensitive);
  return UNITY_END();
}

// Native unit tests for the airlines:: ICAO lookup table.

#include <unity.h>

#include <cstdio>
#include <cstring>

#include "airlines.h"

void setUp(void) {}
void tearDown(void) {}

void test_lookup_known_carrier(void) {
  const auto* e = airlines::lookup("DLH441");
  TEST_ASSERT_NOT_NULL(e);
  TEST_ASSERT_EQUAL_STRING("DLH", e->icao);
  TEST_ASSERT_EQUAL_STRING("Lufthansa", e->name);
}

void test_lookup_is_case_insensitive(void) {
  const auto* upper = airlines::lookup("BAW117");
  const auto* lower = airlines::lookup("baw117");
  const auto* mixed = airlines::lookup("BaW117");
  TEST_ASSERT_NOT_NULL(upper);
  TEST_ASSERT_NOT_NULL(lower);
  TEST_ASSERT_NOT_NULL(mixed);
  TEST_ASSERT_EQUAL_PTR(upper, lower);
  TEST_ASSERT_EQUAL_PTR(upper, mixed);
}

void test_lookup_unknown_carrier_returns_null(void) {
  TEST_ASSERT_NULL(airlines::lookup("ZZZ999"));
  TEST_ASSERT_NULL(airlines::lookup("XYZ001"));
}

void test_lookup_short_callsign_returns_null(void) {
  TEST_ASSERT_NULL(airlines::lookup(""));
  TEST_ASSERT_NULL(airlines::lookup("D"));
  TEST_ASSERT_NULL(airlines::lookup("DL"));
}

void test_lookup_null_callsign_returns_null(void) {
  TEST_ASSERT_NULL(airlines::lookup(nullptr));
}

void test_lookup_callsign_with_no_flight_number(void) {
  // OpenSky sometimes serves trimmed callsigns ("DLH" with no number).
  // First three chars are still a valid ICAO; the lookup should match.
  const auto* e = airlines::lookup("DLH");
  TEST_ASSERT_NOT_NULL(e);
  TEST_ASSERT_EQUAL_STRING("Lufthansa", e->name);
}

void test_table_entries_are_unique(void) {
  // Catch accidental duplicate ICAO rows when the table is hand-edited.
  const auto* t = airlines::table();
  const size_t n = airlines::table_size();
  TEST_ASSERT_TRUE(n > 0);
  for (size_t i = 0; i < n; ++i) {
    for (size_t j = i + 1; j < n; ++j) {
      if (std::memcmp(t[i].icao, t[j].icao, 3) == 0) {
        char msg[64];
        std::snprintf(msg, sizeof(msg),
                      "duplicate ICAO at indices %zu and %zu: %.3s",
                      i, j, t[i].icao);
        TEST_FAIL_MESSAGE(msg);
      }
    }
  }
}

void test_table_entries_have_uppercase_icao(void) {
  const auto* t = airlines::table();
  const size_t n = airlines::table_size();
  for (size_t i = 0; i < n; ++i) {
    for (int k = 0; k < 3; ++k) {
      const char c = t[i].icao[k];
      TEST_ASSERT_TRUE_MESSAGE(c >= 'A' && c <= 'Z',
          "ICAO codes must be uppercase ASCII letters");
    }
  }
}

void test_table_entries_have_nonempty_name(void) {
  const auto* t = airlines::table();
  const size_t n = airlines::table_size();
  for (size_t i = 0; i < n; ++i) {
    TEST_ASSERT_NOT_NULL(t[i].name);
    TEST_ASSERT_TRUE(t[i].name[0] != 0);
  }
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_lookup_known_carrier);
  RUN_TEST(test_lookup_is_case_insensitive);
  RUN_TEST(test_lookup_unknown_carrier_returns_null);
  RUN_TEST(test_lookup_short_callsign_returns_null);
  RUN_TEST(test_lookup_null_callsign_returns_null);
  RUN_TEST(test_lookup_callsign_with_no_flight_number);
  RUN_TEST(test_table_entries_are_unique);
  RUN_TEST(test_table_entries_have_uppercase_icao);
  RUN_TEST(test_table_entries_have_nonempty_name);
  return UNITY_END();
}

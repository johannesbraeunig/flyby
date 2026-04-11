// Native sanity test — proves the host toolchain + Unity wiring works.
// Real logic tests (haversine, bbox, layout, airline lookup) get added
// alongside the modules they cover.

#include <unity.h>

void setUp(void) {}
void tearDown(void) {}

void test_one_plus_one(void) {
  TEST_ASSERT_EQUAL_INT(2, 1 + 1);
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_one_plus_one);
  return UNITY_END();
}

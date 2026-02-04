#include "doctest.h"
#include "date_range.h"

TEST_CASE("dateRange - smart date range formatting") {
    CHECK(dateRange(1705276800, 1705276800) == "January 15, 2024");
    CHECK(dateRange(1705276800, 1705320000) == "January 15, 2024");
    CHECK(dateRange(1705276800, 1705363200) == "January 15\u201316, 2024");
    CHECK(dateRange(1705276800, 1705881600) == "January 15\u201322, 2024");
    CHECK(dateRange(1705276800, 1707955200) == "January 15 \u2013 February 15, 2024");
    CHECK(dateRange(1703721600, 1705276800) == "December 28, 2023 \u2013 January 15, 2024");
    CHECK(dateRange(1704067200, 1735603200) == "January 1 \u2013 December 31, 2024");
    CHECK(dateRange(1705881600, 1705276800) == "January 15\u201322, 2024"); // swapped
    CHECK(dateRange(1672531200, 1735689600) == "January 1, 2023 \u2013 January 1, 2025");
}

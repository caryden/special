#include "doctest.h"
#include "human_date.h"

TEST_CASE("humanDate - contextual date labels") {
    const int64_t ref = 1705276800; // 2024-01-15 Monday 00:00 UTC

    CHECK(humanDate(1705276800, ref) == "Today");
    CHECK(humanDate(1705320000, ref) == "Today");
    CHECK(humanDate(1705190400, ref) == "Yesterday");
    CHECK(humanDate(1705363200, ref) == "Tomorrow");
    CHECK(humanDate(1705104000, ref) == "Last Saturday");
    CHECK(humanDate(1705017600, ref) == "Last Friday");
    CHECK(humanDate(1704931200, ref) == "Last Thursday");
    CHECK(humanDate(1704844800, ref) == "Last Wednesday");
    CHECK(humanDate(1704758400, ref) == "Last Tuesday");
    CHECK(humanDate(1704672000, ref) == "January 8");
    CHECK(humanDate(1705449600, ref) == "This Wednesday");
    CHECK(humanDate(1705536000, ref) == "This Thursday");
    CHECK(humanDate(1705795200, ref) == "This Sunday");
    CHECK(humanDate(1705881600, ref) == "January 22");
    CHECK(humanDate(1709251200, ref) == "March 1");
    CHECK(humanDate(1735603200, ref) == "December 31");
    CHECK(humanDate(1672531200, ref) == "January 1, 2023");
    CHECK(humanDate(1736121600, ref) == "January 6, 2025");
}

#include "doctest.h"
#include "time_ago.h"

TEST_CASE("timeAgo - past events") {
    const int64_t ref = 1704067200; // 2024-01-01 00:00:00 UTC

    CHECK(timeAgo(1704067200, ref) == "just now");
    CHECK(timeAgo(1704067170, ref) == "just now");
    CHECK(timeAgo(1704067156, ref) == "just now");
    CHECK(timeAgo(1704067155, ref) == "1 minute ago");
    CHECK(timeAgo(1704067111, ref) == "1 minute ago");
    CHECK(timeAgo(1704067110, ref) == "2 minutes ago");
    CHECK(timeAgo(1704065400, ref) == "30 minutes ago");
    CHECK(timeAgo(1704064560, ref) == "44 minutes ago");
    CHECK(timeAgo(1704064500, ref) == "1 hour ago");
    CHECK(timeAgo(1704061860, ref) == "1 hour ago");
    CHECK(timeAgo(1704061800, ref) == "2 hours ago");
    CHECK(timeAgo(1704049200, ref) == "5 hours ago");
    CHECK(timeAgo(1703991600, ref) == "21 hours ago");
    CHECK(timeAgo(1703988000, ref) == "1 day ago");
    CHECK(timeAgo(1703941200, ref) == "1 day ago");
    CHECK(timeAgo(1703937600, ref) == "2 days ago");
    CHECK(timeAgo(1703462400, ref) == "7 days ago");
    CHECK(timeAgo(1701907200, ref) == "25 days ago");
    CHECK(timeAgo(1701820800, ref) == "1 month ago");
    CHECK(timeAgo(1700179200, ref) == "1 month ago");
    CHECK(timeAgo(1700092800, ref) == "2 months ago");
    CHECK(timeAgo(1688169600, ref) == "6 months ago");
    CHECK(timeAgo(1676505600, ref) == "11 months ago");
    CHECK(timeAgo(1676419200, ref) == "1 year ago");
    CHECK(timeAgo(1656806400, ref) == "1 year ago");
    CHECK(timeAgo(1656720000, ref) == "2 years ago");
    CHECK(timeAgo(1546300800, ref) == "5 years ago");
}

TEST_CASE("timeAgo - future events") {
    const int64_t ref = 1704067200; // 2024-01-01 00:00:00 UTC

    CHECK(timeAgo(1704067230, ref) == "just now");
    CHECK(timeAgo(1704067260, ref) == "in 1 minute");
    CHECK(timeAgo(1704067500, ref) == "in 5 minutes");
    CHECK(timeAgo(1704070200, ref) == "in 1 hour");
    CHECK(timeAgo(1704078000, ref) == "in 3 hours");
    CHECK(timeAgo(1704150000, ref) == "in 1 day");
    CHECK(timeAgo(1704240000, ref) == "in 2 days");
    CHECK(timeAgo(1706745600, ref) == "in 1 month");
    CHECK(timeAgo(1735689600, ref) == "in 1 year");
}

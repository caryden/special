#include "doctest.h"
#include "parse_duration.h"
#include <stdexcept>

TEST_CASE("parseDuration - compact format") {
    CHECK(parseDuration("2h30m") == 9000);
    CHECK(parseDuration("2h 30m") == 9000);
    CHECK(parseDuration("2h, 30m") == 9000);
    CHECK(parseDuration("1.5h") == 5400);
    CHECK(parseDuration("90m") == 5400);
    CHECK(parseDuration("90min") == 5400);
    CHECK(parseDuration("45s") == 45);
    CHECK(parseDuration("45sec") == 45);
    CHECK(parseDuration("2d") == 172800);
    CHECK(parseDuration("1w") == 604800);
    CHECK(parseDuration("1d 2h 30m") == 95400);
    CHECK(parseDuration("2hr") == 7200);
    CHECK(parseDuration("2hrs") == 7200);
    CHECK(parseDuration("30mins") == 1800);
}

TEST_CASE("parseDuration - verbose format") {
    CHECK(parseDuration("2 hours 30 minutes") == 9000);
    CHECK(parseDuration("2 hours and 30 minutes") == 9000);
    CHECK(parseDuration("2 hours, and 30 minutes") == 9000);
    CHECK(parseDuration("2.5 hours") == 9000);
    CHECK(parseDuration("90 minutes") == 5400);
    CHECK(parseDuration("2 days") == 172800);
    CHECK(parseDuration("1 week") == 604800);
    CHECK(parseDuration("1 day, 2 hours, and 30 minutes") == 95400);
    CHECK(parseDuration("45 seconds") == 45);
}

TEST_CASE("parseDuration - colon notation") {
    CHECK(parseDuration("2:30") == 9000);
    CHECK(parseDuration("1:30:00") == 5400);
    CHECK(parseDuration("0:05:30") == 330);
}

TEST_CASE("parseDuration - case and whitespace tolerance") {
    CHECK(parseDuration("2H 30M") == 9000);
    CHECK(parseDuration("  2 hours   30 minutes  ") == 9000);
}

TEST_CASE("parseDuration - error cases") {
    CHECK_THROWS_AS(parseDuration(""), std::invalid_argument);
    CHECK_THROWS_AS(parseDuration("hello world"), std::invalid_argument);
    CHECK_THROWS_AS(parseDuration("-5 hours"), std::invalid_argument);
    CHECK_THROWS_AS(parseDuration("42"), std::invalid_argument);
    CHECK_THROWS_AS(parseDuration("5 foos"), std::invalid_argument);
}

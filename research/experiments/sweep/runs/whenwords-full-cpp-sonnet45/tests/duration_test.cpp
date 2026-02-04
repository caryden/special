#include "doctest.h"
#include "duration.h"
#include <stdexcept>

TEST_CASE("duration - normal mode (default)") {
    CHECK(duration(0) == "0 seconds");
    CHECK(duration(1) == "1 second");
    CHECK(duration(45) == "45 seconds");
    CHECK(duration(60) == "1 minute");
    CHECK(duration(90) == "1 minute, 30 seconds");
    CHECK(duration(120) == "2 minutes");
    CHECK(duration(3600) == "1 hour");
    CHECK(duration(3661) == "1 hour, 1 minute");
    CHECK(duration(5400) == "1 hour, 30 minutes");
    CHECK(duration(9000) == "2 hours, 30 minutes");
    CHECK(duration(86400) == "1 day");
    CHECK(duration(93600) == "1 day, 2 hours");
    CHECK(duration(604800) == "7 days");
    CHECK(duration(2592000) == "1 month");
    CHECK(duration(31536000) == "1 year");
    CHECK(duration(36720000) == "1 year, 2 months");
}

TEST_CASE("duration - compact mode") {
    DurationOptions opts;
    opts.compact = true;

    CHECK(duration(0, opts) == "0s");
    CHECK(duration(45, opts) == "45s");
    CHECK(duration(3661, opts) == "1h 1m");
    CHECK(duration(9000, opts) == "2h 30m");
    CHECK(duration(93600, opts) == "1d 2h");
}

TEST_CASE("duration - max_units option") {
    DurationOptions opts1;
    opts1.maxUnits = 1;
    CHECK(duration(3661, opts1) == "1 hour");
    CHECK(duration(93600, opts1) == "1 day");

    DurationOptions opts3;
    opts3.maxUnits = 3;
    CHECK(duration(93661, opts3) == "1 day, 2 hours, 1 minute");
}

TEST_CASE("duration - combined compact + max_units") {
    DurationOptions opts;
    opts.compact = true;
    opts.maxUnits = 1;

    CHECK(duration(9000, opts) == "3h"); // 2.5 hours rounds to 3
}

TEST_CASE("duration - error cases") {
    CHECK_THROWS_AS(duration(-100), std::invalid_argument);
}

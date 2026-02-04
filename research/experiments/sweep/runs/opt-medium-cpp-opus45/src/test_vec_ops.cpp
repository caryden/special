#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "vec_ops.hpp"

using namespace opt;

TEST_CASE("dot product") {
    CHECK(dot({1, 2, 3}, {4, 5, 6}) == doctest::Approx(32));
    CHECK(dot({0, 0}, {1, 1}) == doctest::Approx(0));
}

TEST_CASE("norm") {
    CHECK(norm({3, 4}) == doctest::Approx(5));
    CHECK(norm({0, 0, 0}) == doctest::Approx(0));
}

TEST_CASE("normInf") {
    CHECK(normInf({1, -3, 2}) == doctest::Approx(3));
    CHECK(normInf({0, 0}) == doctest::Approx(0));
}

TEST_CASE("scale") {
    auto r = scale({1, 2}, 3);
    CHECK(r[0] == doctest::Approx(3));
    CHECK(r[1] == doctest::Approx(6));

    auto r2 = scale({1, 2}, 0);
    CHECK(r2[0] == doctest::Approx(0));
    CHECK(r2[1] == doctest::Approx(0));
}

TEST_CASE("add") {
    auto r = add({1, 2}, {3, 4});
    CHECK(r[0] == doctest::Approx(4));
    CHECK(r[1] == doctest::Approx(6));
}

TEST_CASE("sub") {
    auto r = sub({3, 4}, {1, 2});
    CHECK(r[0] == doctest::Approx(2));
    CHECK(r[1] == doctest::Approx(2));
}

TEST_CASE("negate") {
    auto r = negate({1, -2});
    CHECK(r[0] == doctest::Approx(-1));
    CHECK(r[1] == doctest::Approx(2));
}

TEST_CASE("clone produces a distinct copy") {
    std::vector<double> v = {1, 2};
    auto c = clone(v);
    CHECK(c[0] == doctest::Approx(1));
    CHECK(c[1] == doctest::Approx(2));
    c[0] = 99;
    CHECK(v[0] == doctest::Approx(1));  // original unchanged
}

TEST_CASE("zeros") {
    auto r = zeros(3);
    CHECK(r.size() == 3);
    CHECK(r[0] == doctest::Approx(0));
    CHECK(r[1] == doctest::Approx(0));
    CHECK(r[2] == doctest::Approx(0));
}

TEST_CASE("addScaled") {
    auto r = addScaled({1, 2}, {3, 4}, 2);
    CHECK(r[0] == doctest::Approx(7));
    CHECK(r[1] == doctest::Approx(10));
}

TEST_CASE("purity: add does not modify inputs") {
    std::vector<double> a = {1, 2};
    std::vector<double> b = {3, 4};
    auto r = add(a, b);
    CHECK(a[0] == doctest::Approx(1));
    CHECK(a[1] == doctest::Approx(2));
    CHECK(b[0] == doctest::Approx(3));
    CHECK(b[1] == doctest::Approx(4));
}

TEST_CASE("purity: scale does not modify input") {
    std::vector<double> v = {1, 2};
    auto r = scale(v, 5);
    CHECK(v[0] == doctest::Approx(1));
    CHECK(v[1] == doctest::Approx(2));
}

#include "doctest.h"
#include "vec_ops.h"
#include <cmath>

using namespace optimization;

TEST_CASE("vec-ops: dot product") {
    CHECK(dot({1, 2, 3}, {4, 5, 6}) == doctest::Approx(32));
    CHECK(dot({0, 0}, {1, 1}) == doctest::Approx(0));
}

TEST_CASE("vec-ops: norm") {
    CHECK(norm({3, 4}) == doctest::Approx(5));
    CHECK(norm({0, 0, 0}) == doctest::Approx(0));
}

TEST_CASE("vec-ops: normInf") {
    CHECK(normInf({1, -3, 2}) == doctest::Approx(3));
    CHECK(normInf({0, 0}) == doctest::Approx(0));
}

TEST_CASE("vec-ops: scale") {
    Vector result = scale({1, 2}, 3);
    CHECK(result[0] == doctest::Approx(3));
    CHECK(result[1] == doctest::Approx(6));

    result = scale({1, 2}, 0);
    CHECK(result[0] == doctest::Approx(0));
    CHECK(result[1] == doctest::Approx(0));
}

TEST_CASE("vec-ops: add") {
    Vector result = add({1, 2}, {3, 4});
    CHECK(result[0] == doctest::Approx(4));
    CHECK(result[1] == doctest::Approx(6));
}

TEST_CASE("vec-ops: sub") {
    Vector result = sub({3, 4}, {1, 2});
    CHECK(result[0] == doctest::Approx(2));
    CHECK(result[1] == doctest::Approx(2));
}

TEST_CASE("vec-ops: negate") {
    Vector result = negate({1, -2});
    CHECK(result[0] == doctest::Approx(-1));
    CHECK(result[1] == doctest::Approx(2));
}

TEST_CASE("vec-ops: clone") {
    Vector original = {1, 2};
    Vector cloned = clone(original);
    CHECK(cloned[0] == doctest::Approx(1));
    CHECK(cloned[1] == doctest::Approx(2));

    // Verify it's a distinct array
    cloned[0] = 99;
    CHECK(original[0] == doctest::Approx(1));
}

TEST_CASE("vec-ops: zeros") {
    Vector result = zeros(3);
    CHECK(result.size() == 3);
    CHECK(result[0] == doctest::Approx(0));
    CHECK(result[1] == doctest::Approx(0));
    CHECK(result[2] == doctest::Approx(0));
}

TEST_CASE("vec-ops: addScaled") {
    Vector result = addScaled({1, 2}, {3, 4}, 2);
    CHECK(result[0] == doctest::Approx(7));
    CHECK(result[1] == doctest::Approx(10));
}

TEST_CASE("vec-ops: purity checks") {
    Vector a = {1, 2};
    Vector b = {3, 4};

    // add should not modify inputs
    Vector result = add(a, b);
    CHECK(a[0] == doctest::Approx(1));
    CHECK(b[0] == doctest::Approx(3));

    // scale should not modify input
    Vector v = {1, 2};
    result = scale(v, 3);
    CHECK(v[0] == doctest::Approx(1));
}

#include "doctest.h"
#include "vec_ops.h"

using namespace optimization;

TEST_CASE("vec-ops: dot product") {
    CHECK(dot({1, 2, 3}, {4, 5, 6}) == 32);
    CHECK(dot({0, 0}, {1, 1}) == 0);
}

TEST_CASE("vec-ops: norm") {
    CHECK(norm({3, 4}) == 5);
    CHECK(norm({0, 0, 0}) == 0);
}

TEST_CASE("vec-ops: normInf") {
    CHECK(normInf({1, -3, 2}) == 3);
    CHECK(normInf({0, 0}) == 0);
}

TEST_CASE("vec-ops: scale") {
    auto result1 = scale({1, 2}, 3);
    CHECK(result1.size() == 2);
    CHECK(result1[0] == 3);
    CHECK(result1[1] == 6);

    auto result2 = scale({1, 2}, 0);
    CHECK(result2[0] == 0);
    CHECK(result2[1] == 0);
}

TEST_CASE("vec-ops: add") {
    auto result = add({1, 2}, {3, 4});
    CHECK(result.size() == 2);
    CHECK(result[0] == 4);
    CHECK(result[1] == 6);
}

TEST_CASE("vec-ops: sub") {
    auto result = sub({3, 4}, {1, 2});
    CHECK(result.size() == 2);
    CHECK(result[0] == 2);
    CHECK(result[1] == 2);
}

TEST_CASE("vec-ops: negate") {
    auto result = negate({1, -2});
    CHECK(result.size() == 2);
    CHECK(result[0] == -1);
    CHECK(result[1] == 2);
}

TEST_CASE("vec-ops: clone") {
    Vector original = {1, 2};
    Vector cloned = clone(original);

    CHECK(cloned.size() == 2);
    CHECK(cloned[0] == 1);
    CHECK(cloned[1] == 2);

    // Verify it's a distinct array
    cloned[0] = 999;
    CHECK(original[0] == 1);  // Original unchanged
}

TEST_CASE("vec-ops: zeros") {
    auto result = zeros(3);
    CHECK(result.size() == 3);
    CHECK(result[0] == 0);
    CHECK(result[1] == 0);
    CHECK(result[2] == 0);
}

TEST_CASE("vec-ops: addScaled") {
    auto result = addScaled({1, 2}, {3, 4}, 2);
    CHECK(result.size() == 2);
    CHECK(result[0] == 7);
    CHECK(result[1] == 10);
}

TEST_CASE("vec-ops: purity checks") {
    SUBCASE("add does not modify inputs") {
        Vector a = {1, 2};
        Vector b = {3, 4};
        auto result = add(a, b);
        CHECK(a[0] == 1);
        CHECK(a[1] == 2);
        CHECK(b[0] == 3);
        CHECK(b[1] == 4);
    }

    SUBCASE("scale does not modify input") {
        Vector v = {1, 2};
        auto result = scale(v, 3);
        CHECK(v[0] == 1);
        CHECK(v[1] == 2);
    }
}

#include "doctest.h"
#include "line_search.h"
#include <cmath>

using namespace optimization;

// Test functions
static double sphere(const Vector& x) {
    double sum = 0.0;
    for (double xi : x) {
        sum += xi * xi;
    }
    return sum;
}

static Vector sphereGrad(const Vector& x) {
    Vector grad(x.size());
    for (size_t i = 0; i < x.size(); ++i) {
        grad[i] = 2.0 * x[i];
    }
    return grad;
}

static double rosenbrock(const Vector& x) {
    double a = 1.0 - x[0];
    double b = x[1] - x[0] * x[0];
    return a * a + 100.0 * b * b;
}

static Vector rosenbrockGrad(const Vector& x) {
    double a = 1.0 - x[0];
    double b = x[1] - x[0] * x[0];
    return {
        -2.0 * a - 400.0 * b * x[0],
        200.0 * b
    };
}

TEST_CASE("line-search: backtracking on sphere") {
    Vector x = {10, 10};
    double fx = sphere(x);
    Vector gx = sphereGrad(x);
    Vector d = negate(gx);  // descent direction

    BacktrackingOptions opts;
    opts.initialAlpha = 1.0;

    auto result = backtrackingLineSearch(sphere, x, d, fx, gx, opts);
    CHECK(result.success == true);
    CHECK(result.alpha == doctest::Approx(0.5));
    CHECK(result.fNew == doctest::Approx(0.0).epsilon(1e-10));
}

TEST_CASE("line-search: backtracking on Rosenbrock") {
    Vector x = {-1.2, 1.0};
    double fx = rosenbrock(x);
    Vector gx = rosenbrockGrad(x);
    Vector d = negate(gx);

    auto result = backtrackingLineSearch(rosenbrock, x, d, fx, gx);
    CHECK(result.success == true);
    CHECK(result.fNew < fx);
}

TEST_CASE("line-search: backtracking with ascending direction fails") {
    Vector x = {10, 10};
    double fx = sphere(x);
    Vector gx = sphereGrad(x);
    Vector d = gx;  // ascending direction (not descent)

    auto result = backtrackingLineSearch(sphere, x, d, fx, gx);
    CHECK(result.success == false);
}

TEST_CASE("line-search: Wolfe on sphere") {
    Vector x = {10, 10};
    double fx = sphere(x);
    Vector gx = sphereGrad(x);
    Vector d = negate(gx);

    auto result = wolfeLineSearch(sphere, sphereGrad, x, d, fx, gx);
    CHECK(result.success == true);
    REQUIRE(result.gNew.has_value());
    CHECK(result.gNew->size() == 2);

    // Verify Wolfe conditions
    double c1 = 1e-4;
    double c2 = 0.9;
    double gxd = dot(gx, d);

    // Armijo condition
    CHECK(result.fNew <= fx + c1 * result.alpha * gxd);

    // Curvature condition
    double gNewDotD = dot(result.gNew.value(), d);
    CHECK(std::abs(gNewDotD) <= c2 * std::abs(gxd));
}

TEST_CASE("line-search: Wolfe on Rosenbrock") {
    Vector x = {-1.2, 1.0};
    double fx = rosenbrock(x);
    Vector gx = rosenbrockGrad(x);
    Vector d = negate(gx);

    auto result = wolfeLineSearch(rosenbrock, rosenbrockGrad, x, d, fx, gx);
    CHECK(result.success == true);
    CHECK(result.fNew < fx);
}

TEST_CASE("line-search: Wolfe returns gradient") {
    Vector x = {10, 10};
    double fx = sphere(x);
    Vector gx = sphereGrad(x);
    Vector d = negate(gx);

    auto result = wolfeLineSearch(sphere, sphereGrad, x, d, fx, gx);
    REQUIRE(result.gNew.has_value());
    CHECK(result.gNew->size() == 2);
}

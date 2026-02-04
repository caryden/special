#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "line_search.hpp"
#include <cmath>

using namespace opt;

// Test functions
static double sphere(const std::vector<double>& x) {
    double s = 0;
    for (auto v : x) s += v * v;
    return s;
}

static std::vector<double> sphereGrad(const std::vector<double>& x) {
    std::vector<double> g(x.size());
    for (size_t i = 0; i < x.size(); ++i) g[i] = 2.0 * x[i];
    return g;
}

static double rosenbrock(const std::vector<double>& x) {
    double a = 1.0 - x[0];
    double b = x[1] - x[0] * x[0];
    return a * a + 100.0 * b * b;
}

static std::vector<double> rosenbrockGrad(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    return {
        -2.0 * (1.0 - x0) + 200.0 * (x1 - x0 * x0) * (-2.0 * x0),
        200.0 * (x1 - x0 * x0)
    };
}

TEST_CASE("backtracking: sphere from [10,10]") {
    std::vector<double> x = {10, 10};
    auto gx = sphereGrad(x);
    auto d = negate(gx);  // steepest descent direction
    double fx = sphere(x);

    auto result = backtrackingLineSearch(sphere, x, d, fx, gx);
    CHECK(result.success == true);
    CHECK(result.alpha == doctest::Approx(0.5));
    CHECK(result.fNew == doctest::Approx(0.0));
}

TEST_CASE("backtracking: rosenbrock from [-1.2, 1.0]") {
    std::vector<double> x = {-1.2, 1.0};
    auto gx = rosenbrockGrad(x);
    auto d = negate(gx);
    double fx = rosenbrock(x);

    auto result = backtrackingLineSearch(sphere, x, d, fx, gx);
    // Just check that it succeeded and found a decrease
    // Note: using rosenbrock for the actual function call
    auto result2 = backtrackingLineSearch(rosenbrock, x, d, fx, gx);
    CHECK(result2.success == true);
    CHECK(result2.fNew < fx);
}

TEST_CASE("backtracking: ascending direction fails") {
    std::vector<double> x = {10, 10};
    auto gx = sphereGrad(x);
    auto d = gx;  // ascending direction (positive gradient)
    double fx = sphere(x);

    auto result = backtrackingLineSearch(sphere, x, d, fx, gx);
    CHECK(result.success == false);
}

TEST_CASE("wolfe: sphere from [10,10]") {
    std::vector<double> x = {10, 10};
    auto gx = sphereGrad(x);
    auto d = negate(gx);
    double fx = sphere(x);

    auto result = wolfeLineSearch(sphere, sphereGrad, x, d, fx, gx);
    CHECK(result.success == true);

    // Verify Armijo condition
    double c1 = 1e-4;
    double dg = dot(gx, d);
    CHECK(result.fNew <= fx + c1 * result.alpha * dg);

    // Verify curvature condition
    double c2 = 0.9;
    if (result.hasGradient()) {
        double dgNew = dot(result.gNew, d);
        CHECK(std::abs(dgNew) <= c2 * std::abs(dg));
    }
}

TEST_CASE("wolfe: rosenbrock from [-1.2, 1.0]") {
    std::vector<double> x = {-1.2, 1.0};
    auto gx = rosenbrockGrad(x);
    auto d = negate(gx);
    double fx = rosenbrock(x);

    auto result = wolfeLineSearch(rosenbrock, rosenbrockGrad, x, d, fx, gx);
    CHECK(result.success == true);
    CHECK(result.fNew < fx);
}

TEST_CASE("wolfe: returns gradient") {
    std::vector<double> x = {10, 10};
    auto gx = sphereGrad(x);
    auto d = negate(gx);
    double fx = sphere(x);

    auto result = wolfeLineSearch(sphere, sphereGrad, x, d, fx, gx);
    CHECK(result.hasGradient());
    CHECK(result.gNew.size() == 2);
}

TEST_CASE("wolfe: post-hoc Wolfe conditions verified") {
    std::vector<double> x = {10, 10};
    auto gx = sphereGrad(x);
    auto d = negate(gx);
    double fx = sphere(x);

    auto result = wolfeLineSearch(sphere, sphereGrad, x, d, fx, gx);
    REQUIRE(result.success);
    REQUIRE(result.hasGradient());

    double c1 = 1e-4;
    double c2 = 0.9;
    double dg0 = dot(gx, d);

    // Armijo
    CHECK(result.fNew <= fx + c1 * result.alpha * dg0);

    // Curvature
    double dgNew = dot(result.gNew, d);
    CHECK(std::abs(dgNew) <= c2 * std::abs(dg0));
}

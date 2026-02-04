#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "finite_diff.hpp"
#include <cmath>

using namespace opt;

// Test functions
static double sphere(const std::vector<double>& x) {
    double s = 0;
    for (auto v : x) s += v * v;
    return s;
}

static double rosenbrock(const std::vector<double>& x) {
    double a = 1.0 - x[0];
    double b = x[1] - x[0] * x[0];
    return a * a + 100.0 * b * b;
}

static std::vector<double> rosenbrockAnalyticGrad(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    return {
        -2.0 * (1.0 - x0) + 200.0 * (x1 - x0 * x0) * (-2.0 * x0),
        200.0 * (x1 - x0 * x0)
    };
}

static double beale(const std::vector<double>& x) {
    double x1 = x[0], x2 = x[1];
    double t1 = 1.5 - x1 + x1 * x2;
    double t2 = 2.25 - x1 + x1 * x2 * x2;
    double t3 = 2.625 - x1 + x1 * x2 * x2 * x2;
    return t1 * t1 + t2 * t2 + t3 * t3;
}

static std::vector<double> bealeAnalyticGrad(const std::vector<double>& x) {
    double x1 = x[0], x2 = x[1];
    double t1 = 1.5 - x1 + x1 * x2;
    double t2 = 2.25 - x1 + x1 * x2 * x2;
    double t3 = 2.625 - x1 + x1 * x2 * x2 * x2;
    return {
        2.0 * t1 * (-1 + x2) + 2.0 * t2 * (-1 + x2 * x2) + 2.0 * t3 * (-1 + x2 * x2 * x2),
        2.0 * t1 * x1 + 2.0 * t2 * (2.0 * x1 * x2) + 2.0 * t3 * (3.0 * x1 * x2 * x2)
    };
}

TEST_CASE("forward diff: sphere at [3,4]") {
    auto g = forwardDiffGradient(sphere, {3, 4});
    CHECK(g[0] == doctest::Approx(6.0).epsilon(1e-5));
    CHECK(g[1] == doctest::Approx(8.0).epsilon(1e-5));
}

TEST_CASE("forward diff: sphere at [0,0]") {
    auto g = forwardDiffGradient(sphere, {0, 0});
    CHECK(std::abs(g[0]) < 1e-7);
    CHECK(std::abs(g[1]) < 1e-7);
}

TEST_CASE("forward diff: rosenbrock at [-1.2, 1.0]") {
    auto g = forwardDiffGradient(rosenbrock, {-1.2, 1.0});
    auto analytic = rosenbrockAnalyticGrad({-1.2, 1.0});
    CHECK(g[0] == doctest::Approx(analytic[0]).epsilon(1e-3));
    CHECK(g[1] == doctest::Approx(analytic[1]).epsilon(1e-3));
}

TEST_CASE("forward diff: beale at [1, 0.25] matches analytic") {
    auto numeric = forwardDiffGradient(beale, {1, 0.25});
    auto analytic = bealeAnalyticGrad({1, 0.25});
    CHECK(numeric[0] == doctest::Approx(analytic[0]).epsilon(1e-3));
    CHECK(numeric[1] == doctest::Approx(analytic[1]).epsilon(1e-3));
}

TEST_CASE("forward diff: does not mutate input") {
    std::vector<double> x = {3, 4};
    forwardDiffGradient(sphere, x);
    CHECK(x[0] == doctest::Approx(3));
    CHECK(x[1] == doctest::Approx(4));
}

TEST_CASE("central diff: sphere at [3,4] higher accuracy") {
    auto g = centralDiffGradient(sphere, {3, 4});
    CHECK(g[0] == doctest::Approx(6.0).epsilon(1e-8));
    CHECK(g[1] == doctest::Approx(8.0).epsilon(1e-8));
}

TEST_CASE("central diff: rosenbrock at [-1.2, 1.0] higher accuracy") {
    auto g = centralDiffGradient(rosenbrock, {-1.2, 1.0});
    auto analytic = rosenbrockAnalyticGrad({-1.2, 1.0});
    CHECK(g[0] == doctest::Approx(analytic[0]).epsilon(1e-5));
    CHECK(g[1] == doctest::Approx(analytic[1]).epsilon(1e-5));
}

TEST_CASE("central diff: beale at minimum [3, 0.5] is near-zero") {
    auto g = centralDiffGradient(beale, {3, 0.5});
    CHECK(std::abs(g[0]) < 1e-8);
    CHECK(std::abs(g[1]) < 1e-8);
}

TEST_CASE("central diff: does not mutate input") {
    std::vector<double> x = {3, 4};
    centralDiffGradient(sphere, x);
    CHECK(x[0] == doctest::Approx(3));
    CHECK(x[1] == doctest::Approx(4));
}

TEST_CASE("makeGradient: default is forward") {
    auto gf = makeGradient(sphere);
    auto g = gf({3, 4});
    auto gRef = forwardDiffGradient(sphere, {3, 4});
    CHECK(g[0] == doctest::Approx(gRef[0]));
    CHECK(g[1] == doctest::Approx(gRef[1]));
}

TEST_CASE("makeGradient: central method") {
    auto gf = makeGradient(sphere, "central");
    auto g = gf({3, 4});
    auto gRef = centralDiffGradient(sphere, {3, 4});
    CHECK(g[0] == doctest::Approx(gRef[0]));
    CHECK(g[1] == doctest::Approx(gRef[1]));
}

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "bfgs.hpp"
#include <cmath>
#include <functional>

using namespace opt;

// --- Test functions ---

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

static double booth(const std::vector<double>& x) {
    double t1 = x[0] + 2 * x[1] - 7;
    double t2 = 2 * x[0] + x[1] - 5;
    return t1 * t1 + t2 * t2;
}

static std::vector<double> boothGrad(const std::vector<double>& x) {
    return {
        2.0 * (x[0] + 2 * x[1] - 7) + 4.0 * (2 * x[0] + x[1] - 5),
        4.0 * (x[0] + 2 * x[1] - 7) + 2.0 * (2 * x[0] + x[1] - 5)
    };
}

static double beale(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    double t1 = 1.5 - x0 + x0 * x1;
    double t2 = 2.25 - x0 + x0 * x1 * x1;
    double t3 = 2.625 - x0 + x0 * x1 * x1 * x1;
    return t1 * t1 + t2 * t2 + t3 * t3;
}

static std::vector<double> bealeGrad(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    double t1 = 1.5 - x0 + x0 * x1;
    double t2 = 2.25 - x0 + x0 * x1 * x1;
    double t3 = 2.625 - x0 + x0 * x1 * x1 * x1;
    double dx0 = 2.0 * t1 * (-1 + x1) + 2.0 * t2 * (-1 + x1 * x1) + 2.0 * t3 * (-1 + x1 * x1 * x1);
    double dx1 = 2.0 * t1 * x0 + 2.0 * t2 * 2 * x0 * x1 + 2.0 * t3 * 3 * x0 * x1 * x1;
    return {dx0, dx1};
}

static double himmelblau(const std::vector<double>& x) {
    double t1 = x[0] * x[0] + x[1] - 11;
    double t2 = x[0] + x[1] * x[1] - 7;
    return t1 * t1 + t2 * t2;
}

static std::vector<double> himmelblauGrad(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    double t1 = x0 * x0 + x1 - 11;
    double t2 = x0 + x1 * x1 - 7;
    return {
        4.0 * x0 * t1 + 2.0 * t2,
        2.0 * t1 + 4.0 * x1 * t2
    };
}

static double goldsteinPrice(const std::vector<double>& x) {
    double x0 = x[0], x1 = x[1];
    double a = 1.0 + (x0 + x1 + 1) * (x0 + x1 + 1) * (19 - 14 * x0 + 3 * x0 * x0 - 14 * x1 + 6 * x0 * x1 + 3 * x1 * x1);
    double b = 30.0 + (2 * x0 - 3 * x1) * (2 * x0 - 3 * x1) * (18 - 32 * x0 + 12 * x0 * x0 + 48 * x1 - 36 * x0 * x1 + 27 * x1 * x1);
    return a * b;
}

static std::vector<double> goldsteinPriceGrad(const std::vector<double>& x) {
    // Use central differences for this complex function
    return centralDiffGradient(goldsteinPrice, x);
}

// --- Tests ---

TEST_CASE("bfgs: sphere with analytic gradient") {
    auto result = bfgs(sphere, {5, 5},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(sphereGrad));
    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-8));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(1e-4));
    CHECK(result.x[1] == doctest::Approx(0.0).epsilon(1e-4));
    CHECK(result.iterations < 20);
}

TEST_CASE("bfgs: booth with analytic gradient") {
    auto result = bfgs(booth, {0, 0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(boothGrad));
    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-8));
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-4));
    CHECK(result.x[1] == doctest::Approx(3.0).epsilon(1e-4));
}

TEST_CASE("bfgs: sphere with finite differences") {
    auto result = bfgs(sphere, {5, 5});
    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-6));
}

TEST_CASE("bfgs: rosenbrock with analytic gradient") {
    auto result = bfgs(rosenbrock, {-1.2, 1.0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(rosenbrockGrad));
    CHECK(result.converged == true);
    CHECK(result.fun < 1e-10);
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-4));
    CHECK(result.x[1] == doctest::Approx(1.0).epsilon(1e-4));
}

TEST_CASE("bfgs: beale") {
    auto result = bfgs(beale, {0, 0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(bealeGrad));
    CHECK(result.converged == true);
    CHECK(result.fun < 1e-8);
    CHECK(result.x[0] == doctest::Approx(3.0).epsilon(1e-3));
    CHECK(result.x[1] == doctest::Approx(0.5).epsilon(1e-3));
}

TEST_CASE("bfgs: himmelblau") {
    auto result = bfgs(himmelblau, {0, 0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(himmelblauGrad));
    CHECK(result.converged == true);
    CHECK(result.fun < 1e-8);
    // Should converge to one of the four known minima
    // (3,2), (-2.805, 3.131), (-3.779, -3.283), (3.584, -1.848)
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-6));
}

TEST_CASE("bfgs: goldstein-price") {
    auto result = bfgs(goldsteinPrice, {0, -0.5},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(goldsteinPriceGrad));
    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(3.0).epsilon(1e-4));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(1e-2));
    CHECK(result.x[1] == doctest::Approx(-1.0).epsilon(1e-2));
}

TEST_CASE("bfgs: rosenbrock with finite differences") {
    auto result = bfgs(rosenbrock, {-1.2, 1.0});
    CHECK(result.fun < 1e-6);
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-3));
    CHECK(result.x[1] == doctest::Approx(1.0).epsilon(1e-3));
}

TEST_CASE("bfgs: returns gradient at solution") {
    auto result = bfgs(sphere, {5, 5},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(sphereGrad));
    CHECK(!result.gradient.empty());
    CHECK(std::abs(result.gradient[0]) < 1e-6);
    CHECK(std::abs(result.gradient[1]) < 1e-6);
}

TEST_CASE("bfgs: maxIterations=3 on rosenbrock") {
    OptimizeOptions opts;
    opts.maxIterations = 3;
    auto result = bfgs(rosenbrock, {-1.2, 1.0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(rosenbrockGrad),
        opts);
    CHECK(result.iterations <= 3);
}

TEST_CASE("bfgs: already at minimum") {
    auto result = bfgs(sphere, {0, 0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(sphereGrad));
    CHECK(result.converged == true);
    CHECK(result.iterations == 0);
}

TEST_CASE("bfgs: maxIterations=2 impossible tolerance") {
    OptimizeOptions opts;
    opts.maxIterations = 2;
    opts.gradTol = 1e-100;
    opts.stepTol = 1e-100;
    opts.funcTol = 1e-100;
    auto result = bfgs(rosenbrock, {-1.2, 1.0},
        std::optional<std::function<std::vector<double>(const std::vector<double>&)>>(rosenbrockGrad),
        opts);
    CHECK(result.converged == false);
    CHECK(result.message.find("maximum iterations") != std::string::npos);
}

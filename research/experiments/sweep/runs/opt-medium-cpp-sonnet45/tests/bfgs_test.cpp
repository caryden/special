#include "doctest.h"
#include "bfgs.h"
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

static double booth(const Vector& x) {
    double a = x[0] + 2.0 * x[1] - 7.0;
    double b = 2.0 * x[0] + x[1] - 5.0;
    return a * a + b * b;
}

static Vector boothGrad(const Vector& x) {
    double a = x[0] + 2.0 * x[1] - 7.0;
    double b = 2.0 * x[0] + x[1] - 5.0;
    return {
        2.0 * a + 4.0 * b,
        4.0 * a + 2.0 * b
    };
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

static double beale(const Vector& x) {
    double t1 = 1.5 - x[0] + x[0] * x[1];
    double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
    double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];
    return t1 * t1 + t2 * t2 + t3 * t3;
}

static Vector bealeGrad(const Vector& x) {
    double t1 = 1.5 - x[0] + x[0] * x[1];
    double t2 = 2.25 - x[0] + x[0] * x[1] * x[1];
    double t3 = 2.625 - x[0] + x[0] * x[1] * x[1] * x[1];

    double dx = 2.0 * t1 * (-1.0 + x[1]) +
                2.0 * t2 * (-1.0 + x[1] * x[1]) +
                2.0 * t3 * (-1.0 + x[1] * x[1] * x[1]);

    double dy = 2.0 * t1 * x[0] +
                2.0 * t2 * 2.0 * x[0] * x[1] +
                2.0 * t3 * 3.0 * x[0] * x[1] * x[1];

    return {dx, dy};
}

static double himmelblau(const Vector& x) {
    double a = x[0] * x[0] + x[1] - 11.0;
    double b = x[0] + x[1] * x[1] - 7.0;
    return a * a + b * b;
}

static Vector himmelblauGrad(const Vector& x) {
    double a = x[0] * x[0] + x[1] - 11.0;
    double b = x[0] + x[1] * x[1] - 7.0;
    return {
        4.0 * a * x[0] + 2.0 * b,
        2.0 * a + 4.0 * b * x[1]
    };
}

static double goldsteinPrice(const Vector& x) {
    double a = x[0] + x[1] + 1.0;
    double b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1];
    double c = 2.0 * x[0] - 3.0 * x[1];
    double d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1];
    return (1.0 + a * a * b) * (30.0 + c * c * d);
}

static Vector goldsteinPriceGrad(const Vector& x) {
    double a = x[0] + x[1] + 1.0;
    double b = 19.0 - 14.0 * x[0] + 3.0 * x[0] * x[0] - 14.0 * x[1] + 6.0 * x[0] * x[1] + 3.0 * x[1] * x[1];
    double c = 2.0 * x[0] - 3.0 * x[1];
    double d = 18.0 - 32.0 * x[0] + 12.0 * x[0] * x[0] + 48.0 * x[1] - 36.0 * x[0] * x[1] + 27.0 * x[1] * x[1];

    double da_dx = 1.0;
    double db_dx = -14.0 + 6.0 * x[0] + 6.0 * x[1];
    double da_dy = 1.0;
    double db_dy = -14.0 + 6.0 * x[0] + 6.0 * x[1];
    double dc_dx = 2.0;
    double dd_dx = -32.0 + 24.0 * x[0] - 36.0 * x[1];
    double dc_dy = -3.0;
    double dd_dy = 48.0 - 36.0 * x[0] + 54.0 * x[1];

    double term1 = 1.0 + a * a * b;
    double term2 = 30.0 + c * c * d;

    double dx = (2.0 * a * da_dx * b + a * a * db_dx) * term2 +
                term1 * (2.0 * c * dc_dx * d + c * c * dd_dx);

    double dy = (2.0 * a * da_dy * b + a * a * db_dy) * term2 +
                term1 * (2.0 * c * dc_dy * d + c * c * dd_dy);

    return {dx, dy};
}

TEST_CASE("bfgs: sphere from [5,5] with analytic gradient") {
    Vector x0 = {5, 5};
    auto result = bfgs(sphere, x0, sphereGrad);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-8));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(1e-6));
    CHECK(result.x[1] == doctest::Approx(0.0).epsilon(1e-6));
    CHECK(result.iterations < 20);
}

TEST_CASE("bfgs: booth from [0,0] with analytic gradient") {
    Vector x0 = {0, 0};
    auto result = bfgs(booth, x0, boothGrad);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-8));
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-6));
    CHECK(result.x[1] == doctest::Approx(3.0).epsilon(1e-6));
}

TEST_CASE("bfgs: sphere from [5,5] with finite differences") {
    Vector x0 = {5, 5};
    auto result = bfgs(sphere, x0);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-6));
}

TEST_CASE("bfgs: Rosenbrock from [-1.2,1.0]") {
    Vector x0 = {-1.2, 1.0};
    auto result = bfgs(rosenbrock, x0, rosenbrockGrad);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-10);
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-5));
    CHECK(result.x[1] == doctest::Approx(1.0).epsilon(1e-5));
}

TEST_CASE("bfgs: Beale from [0,0]") {
    Vector x0 = {0, 0};
    auto result = bfgs(beale, x0, bealeGrad);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-8);
    CHECK(result.x[0] == doctest::Approx(3.0).epsilon(1e-4));
    CHECK(result.x[1] == doctest::Approx(0.5).epsilon(1e-4));
}

TEST_CASE("bfgs: Himmelblau from [0,0]") {
    Vector x0 = {0, 0};
    auto result = bfgs(himmelblau, x0, himmelblauGrad);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-8);

    // Should converge to one of four minima
    // Check distance to closest minimum
    double dist1 = std::sqrt(std::pow(result.x[0] - 3.0, 2) + std::pow(result.x[1] - 2.0, 2));
    double dist2 = std::sqrt(std::pow(result.x[0] + 2.805118, 2) + std::pow(result.x[1] - 3.131312, 2));
    double dist3 = std::sqrt(std::pow(result.x[0] + 3.779310, 2) + std::pow(result.x[1] + 3.283186, 2));
    double dist4 = std::sqrt(std::pow(result.x[0] - 3.584428, 2) + std::pow(result.x[1] + 1.848126, 2));

    double minDist = std::min({dist1, dist2, dist3, dist4});
    CHECK(minDist < 0.1);
}

TEST_CASE("bfgs: Goldstein-Price from [-0.1,-0.9]") {
    Vector x0 = {-0.1, -0.9};  // Using adjusted starting point per instructions
    auto result = bfgs(goldsteinPrice, x0, goldsteinPriceGrad);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(3.0).epsilon(1e-4));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(1e-3));
    CHECK(result.x[1] == doctest::Approx(-1.0).epsilon(1e-3));
}

TEST_CASE("bfgs: Rosenbrock with finite differences") {
    Vector x0 = {-1.2, 1.0};
    auto result = bfgs(rosenbrock, x0);

    // May not formally converge due to FD noise, but should get close
    CHECK(result.fun < 1e-6);
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(0.01));
    CHECK(result.x[1] == doctest::Approx(1.0).epsilon(0.01));
}

TEST_CASE("bfgs: returns gradient at solution") {
    Vector x0 = {5, 5};
    auto result = bfgs(sphere, x0, sphereGrad);

    REQUIRE(result.gradient.has_value());
    CHECK(std::abs(result.gradient.value()[0]) < 1e-6);
    CHECK(std::abs(result.gradient.value()[1]) < 1e-6);
}

TEST_CASE("bfgs: maxIterations limit") {
    Vector x0 = {-1.2, 1.0};
    OptimizeOptions opts;
    opts.maxIterations = 3;

    auto result = bfgs(rosenbrock, x0, rosenbrockGrad, opts);
    CHECK(result.iterations <= 3);
}

TEST_CASE("bfgs: already at minimum") {
    Vector x0 = {0, 0};
    auto result = bfgs(sphere, x0, sphereGrad);

    CHECK(result.converged == true);
    CHECK(result.iterations == 0);
}

TEST_CASE("bfgs: maxIterations with impossible tolerance") {
    Vector x0 = {-1.2, 1.0};
    OptimizeOptions opts;
    opts.maxIterations = 2;

    auto result = bfgs(rosenbrock, x0, rosenbrockGrad, opts);
    CHECK(result.converged == false);
    CHECK(result.message.find("maximum iterations") != std::string::npos);
}

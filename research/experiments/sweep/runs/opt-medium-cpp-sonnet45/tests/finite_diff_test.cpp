#include "doctest.h"
#include "finite_diff.h"
#include <cmath>

using namespace optimization;

// Test functions with analytic gradients
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

TEST_CASE("finite-diff: forward difference on sphere at [3,4]") {
    Vector x = {3, 4};
    Vector grad = forwardDiffGradient(sphere, x);
    Vector expected = sphereGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-7));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-7));
}

TEST_CASE("finite-diff: forward difference on sphere at [0,0]") {
    Vector x = {0, 0};
    Vector grad = forwardDiffGradient(sphere, x);
    Vector expected = sphereGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-7));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-7));
}

TEST_CASE("finite-diff: forward difference on Rosenbrock") {
    Vector x = {-1.2, 1.0};
    Vector grad = forwardDiffGradient(rosenbrock, x);
    Vector expected = rosenbrockGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-4));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-4));
}

TEST_CASE("finite-diff: forward difference on Beale") {
    Vector x = {1, 1};
    Vector grad = forwardDiffGradient(beale, x);
    Vector expected = bealeGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-5));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-5));
}

TEST_CASE("finite-diff: central difference on sphere at [3,4]") {
    Vector x = {3, 4};
    Vector grad = centralDiffGradient(sphere, x);
    Vector expected = sphereGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-10));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-10));
}

TEST_CASE("finite-diff: central difference on sphere at [0,0]") {
    Vector x = {0, 0};
    Vector grad = centralDiffGradient(sphere, x);
    Vector expected = sphereGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-10));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-10));
}

TEST_CASE("finite-diff: central difference on Rosenbrock") {
    Vector x = {-1.2, 1.0};
    Vector grad = centralDiffGradient(rosenbrock, x);
    Vector expected = rosenbrockGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-7));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-7));
}

TEST_CASE("finite-diff: central difference on Beale") {
    Vector x = {1, 1};
    Vector grad = centralDiffGradient(beale, x);
    Vector expected = bealeGrad(x);

    CHECK(grad[0] == doctest::Approx(expected[0]).epsilon(1e-8));
    CHECK(grad[1] == doctest::Approx(expected[1]).epsilon(1e-8));
}

TEST_CASE("finite-diff: makeGradient factory - forward") {
    auto gradFunc = makeGradient(sphere);
    Vector x = {3, 4};
    Vector grad = gradFunc(x);
    Vector expected = forwardDiffGradient(sphere, x);

    CHECK(grad[0] == doctest::Approx(expected[0]));
    CHECK(grad[1] == doctest::Approx(expected[1]));
}

TEST_CASE("finite-diff: makeGradient factory - central") {
    auto gradFunc = makeGradient(sphere, "central");
    Vector x = {3, 4};
    Vector grad = gradFunc(x);
    Vector expected = centralDiffGradient(sphere, x);

    CHECK(grad[0] == doctest::Approx(expected[0]));
    CHECK(grad[1] == doctest::Approx(expected[1]));
}

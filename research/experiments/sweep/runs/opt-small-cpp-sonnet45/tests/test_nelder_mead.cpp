#include "doctest.h"
#include "nelder_mead.h"
#include <cmath>

using namespace optimization;

// Test functions
namespace {
    // Sphere: f(x) = sum(x_i^2)
    double sphere(const Vector& x) {
        double sum = 0.0;
        for (double xi : x) {
            sum += xi * xi;
        }
        return sum;
    }

    // Booth: f(x,y) = (x + 2y - 7)^2 + (2x + y - 5)^2
    // Global minimum at (1, 3) with f = 0
    double booth(const Vector& x) {
        double term1 = x[0] + 2*x[1] - 7;
        double term2 = 2*x[0] + x[1] - 5;
        return term1*term1 + term2*term2;
    }

    // Beale: f(x,y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2
    // Global minimum at (3, 0.5) with f = 0
    double beale(const Vector& x) {
        double term1 = 1.5 - x[0] + x[0]*x[1];
        double term2 = 2.25 - x[0] + x[0]*x[1]*x[1];
        double term3 = 2.625 - x[0] + x[0]*x[1]*x[1]*x[1];
        return term1*term1 + term2*term2 + term3*term3;
    }

    // Rosenbrock: f(x,y) = (1-x)^2 + 100(y-x^2)^2
    // Global minimum at (1, 1) with f = 0
    double rosenbrock(const Vector& x) {
        double term1 = 1 - x[0];
        double term2 = x[1] - x[0]*x[0];
        return term1*term1 + 100*term2*term2;
    }

    // Himmelblau: f(x,y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2
    // Four global minima, one at (3, 2) with f = 0
    double himmelblau(const Vector& x) {
        double term1 = x[0]*x[0] + x[1] - 11;
        double term2 = x[0] + x[1]*x[1] - 7;
        return term1*term1 + term2*term2;
    }

    // Goldstein-Price function
    // Global minimum at (0, -1) with f = 3
    double goldsteinPrice(const Vector& x) {
        double x0 = x[0];
        double y0 = x[1];
        double term1 = 1 + std::pow(x0 + y0 + 1, 2) *
                       (19 - 14*x0 + 3*x0*x0 - 14*y0 + 6*x0*y0 + 3*y0*y0);
        double term2 = 30 + std::pow(2*x0 - 3*y0, 2) *
                       (18 - 32*x0 + 12*x0*x0 + 48*y0 - 36*x0*y0 + 27*y0*y0);
        return term1 * term2;
    }
}

TEST_CASE("nelder-mead: sphere") {
    Vector x0 = {5, 5};
    auto result = nelderMead(sphere, x0);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-6));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(1e-3));
    CHECK(result.x[1] == doctest::Approx(0.0).epsilon(1e-3));
    CHECK(result.gradientCalls == 0);
    CHECK_EQ(result.gradient.has_value(), false);
}

TEST_CASE("nelder-mead: booth") {
    Vector x0 = {0, 0};
    auto result = nelderMead(booth, x0);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(0.0).epsilon(1e-6));
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-3));
    CHECK(result.x[1] == doctest::Approx(3.0).epsilon(1e-3));
    CHECK(result.gradientCalls == 0);
}

TEST_CASE("nelder-mead: beale") {
    Vector x0 = {0, 0};
    OptimizeOptions opts;
    opts.maxIterations = 5000;
    auto result = nelderMead(beale, x0, opts);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-6);
    CHECK(result.gradientCalls == 0);
}

TEST_CASE("nelder-mead: rosenbrock") {
    Vector x0 = {-1.2, 1.0};
    OptimizeOptions opts;
    opts.maxIterations = 5000;
    opts.funcTol = 1e-12;
    opts.stepTol = 1e-8;
    auto result = nelderMead(rosenbrock, x0, opts);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-6);
    CHECK(result.x[0] == doctest::Approx(1.0).epsilon(1e-2));
    CHECK(result.x[1] == doctest::Approx(1.0).epsilon(1e-2));
    CHECK(result.gradientCalls == 0);
}

TEST_CASE("nelder-mead: himmelblau") {
    Vector x0 = {0, 0};
    auto result = nelderMead(himmelblau, x0);

    CHECK(result.converged == true);
    CHECK(result.fun < 1e-6);
    CHECK(result.gradientCalls == 0);

    // Should converge to one of the four minima
    // Common one from (0,0) is (3, 2)
    bool nearMinimum =
        (std::abs(result.x[0] - 3.0) < 0.1 && std::abs(result.x[1] - 2.0) < 0.1) ||
        (std::abs(result.x[0] - (-2.805118)) < 0.1 && std::abs(result.x[1] - 3.131312) < 0.1) ||
        (std::abs(result.x[0] - (-3.779310)) < 0.1 && std::abs(result.x[1] - (-3.283186)) < 0.1) ||
        (std::abs(result.x[0] - 3.584428) < 0.1 && std::abs(result.x[1] - (-1.848126)) < 0.1);
    CHECK(nearMinimum);
}

TEST_CASE("nelder-mead: goldstein-price") {
    Vector x0 = {-0.1, -0.9};
    auto result = nelderMead(goldsteinPrice, x0);

    CHECK(result.converged == true);
    CHECK(result.fun == doctest::Approx(3.0).epsilon(1e-3));
    CHECK(result.x[0] == doctest::Approx(0.0).epsilon(0.1));
    CHECK(result.x[1] == doctest::Approx(-1.0).epsilon(0.1));
    CHECK(result.gradientCalls == 0);
}

TEST_CASE("nelder-mead: respects maxIterations") {
    Vector x0 = {-1.2, 1.0};
    OptimizeOptions opts;
    opts.maxIterations = 5;
    auto result = nelderMead(rosenbrock, x0, opts);

    CHECK(result.iterations <= 5);
    CHECK(result.converged == false);
    CHECK(result.gradientCalls == 0);
}

TEST_CASE("nelder-mead: gradientCalls always 0") {
    Vector x0 = {5, 5};
    auto result = nelderMead(sphere, x0);
    CHECK(result.gradientCalls == 0);
}

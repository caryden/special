#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "result_types.hpp"

using namespace opt;

TEST_CASE("defaultOptions returns correct defaults") {
    auto opts = defaultOptions();
    CHECK(opts.gradTol == doctest::Approx(1e-8));
    CHECK(opts.stepTol == doctest::Approx(1e-8));
    CHECK(opts.funcTol == doctest::Approx(1e-12));
    CHECK(opts.maxIterations == 1000);
}

TEST_CASE("defaultOptions with overrides") {
    OptimizeOptions custom;
    custom.gradTol = 1e-4;
    auto opts = defaultOptions(custom);
    CHECK(opts.gradTol == doctest::Approx(1e-4));
    CHECK(opts.stepTol == doctest::Approx(1e-8));
}

TEST_CASE("checkConvergence: gradient criterion") {
    auto opts = defaultOptions();
    auto r = checkConvergence(1e-9, 0.1, 0.1, 5, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::Gradient);
}

TEST_CASE("checkConvergence: step criterion") {
    auto opts = defaultOptions();
    auto r = checkConvergence(0.1, 1e-9, 0.1, 5, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::Step);
}

TEST_CASE("checkConvergence: function criterion") {
    auto opts = defaultOptions();
    auto r = checkConvergence(0.1, 0.1, 1e-13, 5, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::Function);
}

TEST_CASE("checkConvergence: maxIterations") {
    auto opts = defaultOptions();
    auto r = checkConvergence(0.1, 0.1, 0.1, 1000, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::MaxIterations);
}

TEST_CASE("checkConvergence: no criterion met") {
    auto opts = defaultOptions();
    auto r = checkConvergence(0.1, 0.1, 0.1, 5, opts);
    CHECK(!r.has_value());
}

TEST_CASE("isConverged: gradient is true") {
    CHECK(isConverged({ConvergenceKind::Gradient}) == true);
}

TEST_CASE("isConverged: step is true") {
    CHECK(isConverged({ConvergenceKind::Step}) == true);
}

TEST_CASE("isConverged: function is true") {
    CHECK(isConverged({ConvergenceKind::Function}) == true);
}

TEST_CASE("isConverged: maxIterations is false") {
    CHECK(isConverged({ConvergenceKind::MaxIterations}) == false);
}

TEST_CASE("isConverged: lineSearchFailed is false") {
    CHECK(isConverged({ConvergenceKind::LineSearchFailed}) == false);
}

TEST_CASE("convergenceMessage returns non-empty strings") {
    CHECK(!convergenceMessage({ConvergenceKind::Gradient}).empty());
    CHECK(!convergenceMessage({ConvergenceKind::Step}).empty());
    CHECK(!convergenceMessage({ConvergenceKind::Function}).empty());
    CHECK(!convergenceMessage({ConvergenceKind::MaxIterations}).empty());
    CHECK(!convergenceMessage({ConvergenceKind::LineSearchFailed}).empty());
}

TEST_CASE("priority: gradient takes precedence over step") {
    auto opts = defaultOptions();
    // Both gradient and step criteria met
    auto r = checkConvergence(1e-9, 1e-9, 0.1, 5, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::Gradient);
}

TEST_CASE("priority: step takes precedence over function") {
    auto opts = defaultOptions();
    auto r = checkConvergence(0.1, 1e-9, 1e-13, 5, opts);
    REQUIRE(r.has_value());
    CHECK(r->kind == ConvergenceKind::Step);
}

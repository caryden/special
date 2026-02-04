#include "doctest.h"
#include "result_types.h"

using namespace optimization;

TEST_CASE("result-types: defaultOptions") {
    auto opts = defaultOptions();
    CHECK(opts.gradTol == doctest::Approx(1e-8));
    CHECK(opts.stepTol == doctest::Approx(1e-8));
    CHECK(opts.funcTol == doctest::Approx(1e-12));
    CHECK(opts.maxIterations == 1000);
}

TEST_CASE("result-types: defaultOptions with overrides") {
    OptimizeOptions overrides;
    overrides.gradTol = 1e-4;
    overrides.stepTol = 1e-8;
    overrides.funcTol = 1e-12;
    overrides.maxIterations = 1000;

    auto opts = defaultOptions(overrides);
    CHECK(opts.gradTol == doctest::Approx(1e-4));
    CHECK(opts.stepTol == doctest::Approx(1e-8));
}

TEST_CASE("result-types: checkConvergence - gradient") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(1e-9, 0.1, 0.1, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Gradient);
}

TEST_CASE("result-types: checkConvergence - step") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 1e-9, 0.1, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Step);
}

TEST_CASE("result-types: checkConvergence - function") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 1e-13, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Function);
}

TEST_CASE("result-types: checkConvergence - maxIterations") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 0.1, 1000, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::MaxIterations);
}

TEST_CASE("result-types: checkConvergence - no criterion met") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 0.1, 5, opts);
    CHECK(!reason.has_value());
}

TEST_CASE("result-types: isConverged") {
    CHECK(isConverged({ConvergenceReason::Kind::Gradient}) == true);
    CHECK(isConverged({ConvergenceReason::Kind::Step}) == true);
    CHECK(isConverged({ConvergenceReason::Kind::Function}) == true);
    CHECK(isConverged({ConvergenceReason::Kind::MaxIterations}) == false);
    CHECK(isConverged({ConvergenceReason::Kind::LineSearchFailed}) == false);
}

TEST_CASE("result-types: convergence priority") {
    auto opts = defaultOptions();

    // When multiple criteria are met, gradient takes priority
    auto reason = checkConvergence(1e-9, 1e-9, 1e-13, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Gradient);

    // When gradient is not met but step and function are, step takes priority
    reason = checkConvergence(0.1, 1e-9, 1e-13, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Step);
}

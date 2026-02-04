#include "doctest.h"
#include "result_types.h"

using namespace optimization;

TEST_CASE("result-types: defaultOptions") {
    auto opts = defaultOptions();
    CHECK(opts.gradTol == 1e-8);
    CHECK(opts.stepTol == 1e-8);
    CHECK(opts.funcTol == 1e-12);
    CHECK(opts.maxIterations == 1000);
}

TEST_CASE("result-types: defaultOptions with overrides") {
    OptimizeOptions overrides;
    overrides.gradTol = 1e-4;
    overrides.stepTol = 1e-8;
    overrides.funcTol = 1e-12;
    overrides.maxIterations = 1000;

    auto opts = defaultOptions(&overrides);
    CHECK(opts.gradTol == 1e-4);
    CHECK(opts.stepTol == 1e-8);
    CHECK(opts.funcTol == 1e-12);
    CHECK(opts.maxIterations == 1000);
}

TEST_CASE("result-types: checkConvergence gradient") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(1e-9, 0.1, 0.1, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Gradient);
}

TEST_CASE("result-types: checkConvergence step") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 1e-9, 0.1, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Step);
}

TEST_CASE("result-types: checkConvergence function") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 1e-13, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Function);
}

TEST_CASE("result-types: checkConvergence maxIterations") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 0.1, 1000, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::MaxIterations);
}

TEST_CASE("result-types: checkConvergence no criterion met") {
    auto opts = defaultOptions();
    auto reason = checkConvergence(0.1, 0.1, 0.1, 5, opts);
    CHECK_EQ(reason.has_value(), false);
}

TEST_CASE("result-types: isConverged") {
    CHECK(isConverged(ConvergenceReason::gradient()) == true);
    CHECK(isConverged(ConvergenceReason::step()) == true);
    CHECK(isConverged(ConvergenceReason::function()) == true);
    CHECK(isConverged(ConvergenceReason::maxIterations()) == false);
    CHECK(isConverged(ConvergenceReason::lineSearchFailed()) == false);
}

TEST_CASE("result-types: convergenceMessage") {
    CHECK(convergenceMessage(ConvergenceReason::gradient()) == "Converged: gradient norm below tolerance");
    CHECK(convergenceMessage(ConvergenceReason::step()) == "Converged: step size below tolerance");
    CHECK(convergenceMessage(ConvergenceReason::function()) == "Converged: function change below tolerance");
    CHECK(convergenceMessage(ConvergenceReason::maxIterations()) == "Maximum iterations reached");
    CHECK(convergenceMessage(ConvergenceReason::lineSearchFailed()) == "Line search failed");
}

TEST_CASE("result-types: priority test - gradient first") {
    auto opts = defaultOptions();
    // Both gradient and step are met, should return gradient
    auto reason = checkConvergence(1e-9, 1e-9, 0.1, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Gradient);
}

TEST_CASE("result-types: priority test - step second") {
    auto opts = defaultOptions();
    // Both step and function are met, should return step
    auto reason = checkConvergence(0.1, 1e-9, 1e-13, 5, opts);
    REQUIRE(reason.has_value());
    CHECK(reason->kind == ConvergenceReason::Kind::Step);
}

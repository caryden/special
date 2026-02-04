#include "result_types.h"
#include <cmath>

namespace optimization {

OptimizeOptions defaultOptions(const OptimizeOptions* overrides) {
    OptimizeOptions opts;
    if (overrides) {
        opts.gradTol = overrides->gradTol;
        opts.stepTol = overrides->stepTol;
        opts.funcTol = overrides->funcTol;
        opts.maxIterations = overrides->maxIterations;
    }
    return opts;
}

std::optional<ConvergenceReason> checkConvergence(
    double gradNorm,
    double stepNorm,
    double funcChange,
    int iteration,
    const OptimizeOptions& opts
) {
    // Check in priority order: gradient -> step -> function -> maxIterations
    if (gradNorm < opts.gradTol) {
        return ConvergenceReason::gradient();
    }
    if (stepNorm < opts.stepTol) {
        return ConvergenceReason::step();
    }
    if (std::abs(funcChange) < opts.funcTol) {
        return ConvergenceReason::function();
    }
    if (iteration >= opts.maxIterations) {
        return ConvergenceReason::maxIterations();
    }
    return std::nullopt;
}

bool isConverged(const ConvergenceReason& reason) {
    switch (reason.kind) {
        case ConvergenceReason::Kind::Gradient:
        case ConvergenceReason::Kind::Step:
        case ConvergenceReason::Kind::Function:
            return true;
        case ConvergenceReason::Kind::MaxIterations:
        case ConvergenceReason::Kind::LineSearchFailed:
            return false;
    }
    return false;
}

std::string convergenceMessage(const ConvergenceReason& reason) {
    switch (reason.kind) {
        case ConvergenceReason::Kind::Gradient:
            return "Converged: gradient norm below tolerance";
        case ConvergenceReason::Kind::Step:
            return "Converged: step size below tolerance";
        case ConvergenceReason::Kind::Function:
            return "Converged: function change below tolerance";
        case ConvergenceReason::Kind::MaxIterations:
            return "Maximum iterations reached";
        case ConvergenceReason::Kind::LineSearchFailed:
            return "Line search failed";
    }
    return "Unknown";
}

} // namespace optimization

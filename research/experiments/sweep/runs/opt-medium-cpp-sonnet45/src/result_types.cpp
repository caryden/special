#include "result_types.h"

namespace optimization {

OptimizeOptions defaultOptions(const OptimizeOptions& overrides) {
    OptimizeOptions opts;
    opts.gradTol = overrides.gradTol;
    opts.stepTol = overrides.stepTol;
    opts.funcTol = overrides.funcTol;
    opts.maxIterations = overrides.maxIterations;
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
        return ConvergenceReason{ConvergenceReason::Kind::Gradient};
    }
    if (stepNorm < opts.stepTol) {
        return ConvergenceReason{ConvergenceReason::Kind::Step};
    }
    if (funcChange < opts.funcTol) {
        return ConvergenceReason{ConvergenceReason::Kind::Function};
    }
    if (iteration >= opts.maxIterations) {
        return ConvergenceReason{ConvergenceReason::Kind::MaxIterations};
    }
    return std::nullopt;
}

bool isConverged(const ConvergenceReason& reason) {
    return reason.kind == ConvergenceReason::Kind::Gradient ||
           reason.kind == ConvergenceReason::Kind::Step ||
           reason.kind == ConvergenceReason::Kind::Function;
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
            return "Reached maximum iterations without convergence";
        case ConvergenceReason::Kind::LineSearchFailed:
            return "Line search failed to find acceptable step";
        default:
            return "Unknown convergence reason";
    }
}

} // namespace optimization

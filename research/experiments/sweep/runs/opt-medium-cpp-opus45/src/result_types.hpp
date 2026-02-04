#pragma once

#include <vector>
#include <string>
#include <optional>
#include <cmath>
#include <sstream>

namespace opt {

/// Convergence reason kinds.
enum class ConvergenceKind {
    Gradient,
    Step,
    Function,
    MaxIterations,
    LineSearchFailed
};

/// Tagged convergence reason.
struct ConvergenceReason {
    ConvergenceKind kind;
};

/// Optimization options with defaults matching Optim.jl conventions.
struct OptimizeOptions {
    double gradTol = 1e-8;
    double stepTol = 1e-8;
    double funcTol = 1e-12;
    int maxIterations = 1000;
};

/// Result returned by all optimizers.
struct OptimizeResult {
    std::vector<double> x;
    double fun;
    std::vector<double> gradient;  // empty if derivative-free
    int iterations;
    int functionCalls;
    int gradientCalls;
    bool converged;
    std::string message;
};

/// Create default options with optional overrides applied via a lambda or direct modification.
inline OptimizeOptions defaultOptions() {
    return OptimizeOptions{};
}

inline OptimizeOptions defaultOptions(const OptimizeOptions& overrides) {
    return overrides;
}

/// Check convergence criteria in priority order: gradient -> step -> function -> maxIterations.
/// Returns nullopt if no criterion is met.
inline std::optional<ConvergenceReason> checkConvergence(
    double gradNorm, double stepNorm, double funcChange,
    int iteration, const OptimizeOptions& opts)
{
    if (gradNorm < opts.gradTol) {
        return ConvergenceReason{ConvergenceKind::Gradient};
    }
    if (stepNorm < opts.stepTol) {
        return ConvergenceReason{ConvergenceKind::Step};
    }
    if (funcChange < opts.funcTol) {
        return ConvergenceReason{ConvergenceKind::Function};
    }
    if (iteration >= opts.maxIterations) {
        return ConvergenceReason{ConvergenceKind::MaxIterations};
    }
    return std::nullopt;
}

/// Returns true for gradient/step/function convergence; false for maxIterations/lineSearchFailed.
inline bool isConverged(const ConvergenceReason& reason) {
    switch (reason.kind) {
        case ConvergenceKind::Gradient:
        case ConvergenceKind::Step:
        case ConvergenceKind::Function:
            return true;
        case ConvergenceKind::MaxIterations:
        case ConvergenceKind::LineSearchFailed:
            return false;
    }
    return false;
}

/// Human-readable convergence message.
inline std::string convergenceMessage(const ConvergenceReason& reason) {
    switch (reason.kind) {
        case ConvergenceKind::Gradient:
            return "Converged: gradient norm below tolerance";
        case ConvergenceKind::Step:
            return "Converged: step size below tolerance";
        case ConvergenceKind::Function:
            return "Converged: function change below tolerance";
        case ConvergenceKind::MaxIterations:
            return "Stopped: reached maximum iterations";
        case ConvergenceKind::LineSearchFailed:
            return "Stopped: line search failed to find acceptable step";
    }
    return "Unknown";
}

} // namespace opt

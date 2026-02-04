#pragma once
#include <string>
#include <optional>
#include "vec_ops.h"

namespace optimization {

struct OptimizeOptions {
    double gradTol = 1e-8;
    double stepTol = 1e-8;
    double funcTol = 1e-12;
    int maxIterations = 1000;
};

struct OptimizeResult {
    Vector x;
    double fun;
    std::optional<Vector> gradient;
    int iterations;
    int functionCalls;
    int gradientCalls;
    bool converged;
    std::string message;
};

struct ConvergenceReason {
    enum class Kind {
        Gradient,
        Step,
        Function,
        MaxIterations,
        LineSearchFailed
    };

    Kind kind;
};

// Create default options with optional overrides
OptimizeOptions defaultOptions(const OptimizeOptions& overrides = OptimizeOptions{});

// Check convergence criteria
std::optional<ConvergenceReason> checkConvergence(
    double gradNorm,
    double stepNorm,
    double funcChange,
    int iteration,
    const OptimizeOptions& opts
);

// Check if reason represents successful convergence
bool isConverged(const ConvergenceReason& reason);

// Get human-readable message
std::string convergenceMessage(const ConvergenceReason& reason);

} // namespace optimization

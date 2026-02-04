#pragma once

#include <vector>
#include <string>
#include <optional>

namespace optimization {

// Optimization options with defaults
struct OptimizeOptions {
    double gradTol = 1e-8;
    double stepTol = 1e-8;
    double funcTol = 1e-12;
    int maxIterations = 1000;
};

// Convergence reason (tagged union)
struct ConvergenceReason {
    enum class Kind {
        Gradient,
        Step,
        Function,
        MaxIterations,
        LineSearchFailed
    };

    Kind kind;

    static ConvergenceReason gradient() {
        return {Kind::Gradient};
    }

    static ConvergenceReason step() {
        return {Kind::Step};
    }

    static ConvergenceReason function() {
        return {Kind::Function};
    }

    static ConvergenceReason maxIterations() {
        return {Kind::MaxIterations};
    }

    static ConvergenceReason lineSearchFailed() {
        return {Kind::LineSearchFailed};
    }
};

// Optimization result
struct OptimizeResult {
    std::vector<double> x;              // Solution vector
    double fun;                          // Objective value at solution
    std::optional<std::vector<double>> gradient;  // Gradient at solution (null for derivative-free)
    int iterations;                      // Iterations performed
    int functionCalls;                   // Objective function evaluations
    int gradientCalls;                   // Gradient evaluations
    bool converged;                      // Whether converged
    std::string message;                 // Human-readable termination reason
};

// Create default options with optional overrides
OptimizeOptions defaultOptions(const OptimizeOptions* overrides = nullptr);

// Check convergence criteria in order: gradient -> step -> function -> maxIterations
std::optional<ConvergenceReason> checkConvergence(
    double gradNorm,
    double stepNorm,
    double funcChange,
    int iteration,
    const OptimizeOptions& opts
);

// True for gradient/step/function; false for maxIterations/lineSearchFailed
bool isConverged(const ConvergenceReason& reason);

// Human-readable message
std::string convergenceMessage(const ConvergenceReason& reason);

} // namespace optimization

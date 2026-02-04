#pragma once
#include <functional>
#include <optional>
#include "vec_ops.h"

namespace optimization {

struct LineSearchResult {
    double alpha;
    double fNew;
    std::optional<Vector> gNew;
    int functionCalls;
    int gradientCalls;
    bool success;
};

struct BacktrackingOptions {
    double initialAlpha = 1.0;
    double c1 = 1e-4;
    double rho = 0.5;
    int maxIter = 20;
};

struct WolfeOptions {
    double c1 = 1e-4;
    double c2 = 0.9;
    double alphaMax = 1e6;
    int maxIter = 25;
};

using ObjectiveFunction = std::function<double(const Vector&)>;
using GradientFunction = std::function<Vector(const Vector&)>;

// Backtracking line search (Armijo condition)
LineSearchResult backtrackingLineSearch(
    ObjectiveFunction f,
    const Vector& x,
    const Vector& d,
    double fx,
    const Vector& gx,
    const BacktrackingOptions& options = BacktrackingOptions{}
);

// Strong Wolfe line search
LineSearchResult wolfeLineSearch(
    ObjectiveFunction f,
    GradientFunction grad,
    const Vector& x,
    const Vector& d,
    double fx,
    const Vector& gx,
    const WolfeOptions& options = WolfeOptions{}
);

} // namespace optimization

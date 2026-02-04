#pragma once

#include <vector>
#include <cmath>
#include <functional>
#include <limits>
#include <string>

namespace opt {

namespace {
    const double SQRT_EPS = std::sqrt(std::numeric_limits<double>::epsilon()); // ~1.49e-8
    const double CBRT_EPS = std::cbrt(std::numeric_limits<double>::epsilon()); // ~6.06e-6
}

/// Estimate gradient using forward finite differences.
/// Cost: n+1 function evaluations. Accuracy: O(sqrt(eps)).
/// @provenance step-size formula matches MATLAB fminunc
inline std::vector<double> forwardDiffGradient(
    const std::function<double(const std::vector<double>&)>& f,
    const std::vector<double>& x)
{
    size_t n = x.size();
    double fx = f(x);
    std::vector<double> grad(n);

    for (size_t i = 0; i < n; ++i) {
        double h = SQRT_EPS * std::max(std::abs(x[i]), 1.0);
        std::vector<double> xp(x);
        xp[i] += h;
        grad[i] = (f(xp) - fx) / h;
    }

    return grad;
}

/// Estimate gradient using central finite differences.
/// Cost: 2n function evaluations. Accuracy: O(eps^(2/3)).
/// @provenance step-size uses cbrt(eps) for optimal O(h^2) error balance
inline std::vector<double> centralDiffGradient(
    const std::function<double(const std::vector<double>&)>& f,
    const std::vector<double>& x)
{
    size_t n = x.size();
    std::vector<double> grad(n);

    for (size_t i = 0; i < n; ++i) {
        double h = CBRT_EPS * std::max(std::abs(x[i]), 1.0);
        std::vector<double> xPlus(x);
        std::vector<double> xMinus(x);
        xPlus[i] += h;
        xMinus[i] -= h;
        grad[i] = (f(xPlus) - f(xMinus)) / (2.0 * h);
    }

    return grad;
}

/// Factory: returns a gradient function using the specified method.
inline std::function<std::vector<double>(const std::vector<double>&)> makeGradient(
    const std::function<double(const std::vector<double>&)>& f,
    const std::string& method = "forward")
{
    if (method == "central") {
        return [f](const std::vector<double>& x) { return centralDiffGradient(f, x); };
    }
    return [f](const std::vector<double>& x) { return forwardDiffGradient(f, x); };
}

} // namespace opt

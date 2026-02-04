#pragma once

#include <vector>
#include <cmath>
#include <functional>
#include <optional>
#include <limits>
#include <sstream>
#include "vec_ops.hpp"
#include "result_types.hpp"
#include "line_search.hpp"
#include "finite_diff.hpp"

namespace opt {

namespace detail {

/// Create an n x n identity matrix as vector of rows.
inline std::vector<std::vector<double>> identityMatrix(size_t n) {
    std::vector<std::vector<double>> m(n, std::vector<double>(n, 0.0));
    for (size_t i = 0; i < n; ++i) {
        m[i][i] = 1.0;
    }
    return m;
}

/// Matrix-vector multiply: result = M * v.
inline std::vector<double> matVecMul(const std::vector<std::vector<double>>& M,
                                      const std::vector<double>& v) {
    size_t n = v.size();
    std::vector<double> result(n, 0.0);
    for (size_t i = 0; i < n; ++i) {
        double s = 0.0;
        for (size_t j = 0; j < n; ++j) {
            s += M[i][j] * v[j];
        }
        result[i] = s;
    }
    return result;
}

/// BFGS inverse Hessian update.
/// H_{k+1} = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
/// @provenance Nocedal & Wright, Eq. 6.17
inline std::vector<std::vector<double>> bfgsUpdate(
    const std::vector<std::vector<double>>& H,
    const std::vector<double>& s,
    const std::vector<double>& y,
    double rho)
{
    size_t n = s.size();
    auto Hy = matVecMul(H, y);
    double yHy = dot(y, Hy);

    std::vector<std::vector<double>> Hnew(n, std::vector<double>(n));
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            Hnew[i][j] = H[i][j]
                - rho * (s[i] * Hy[j] + Hy[i] * s[j])
                + rho * (1.0 + rho * yHy) * s[i] * s[j];
        }
    }
    return Hnew;
}

} // namespace detail

/// Minimize a function using the BFGS quasi-Newton method.
/// If no gradient function is provided, forward finite differences are used.
/// @provenance Algorithm from Nocedal & Wright, Numerical Optimization, Chapter 6
inline OptimizeResult bfgs(
    const std::function<double(const std::vector<double>&)>& f,
    const std::vector<double>& x0,
    std::optional<std::function<std::vector<double>(const std::vector<double>&)>> grad = std::nullopt,
    const OptimizeOptions& options = {})
{
    OptimizeOptions opts = options;
    size_t n = x0.size();

    // Gradient function: analytic or finite differences
    auto gradFn = grad.has_value()
        ? grad.value()
        : std::function<std::vector<double>(const std::vector<double>&)>(
              [&f](const std::vector<double>& x) { return forwardDiffGradient(f, x); });

    // State
    std::vector<double> x(x0);
    double fx = f(x);
    auto gx = gradFn(x);
    int functionCalls = 1;
    int gradientCalls = 1;

    // Initialize inverse Hessian as identity
    auto H = detail::identityMatrix(n);

    // Check if already at minimum
    double gradNorm = normInf(gx);
    auto initialCheck = checkConvergence(gradNorm,
        std::numeric_limits<double>::infinity(),
        std::numeric_limits<double>::infinity(), 0, opts);
    if (initialCheck && isConverged(*initialCheck)) {
        return {x, fx, std::vector<double>(gx), 0, functionCalls, gradientCalls,
                true, convergenceMessage(*initialCheck)};
    }

    for (int iteration = 1; iteration <= opts.maxIterations; ++iteration) {
        // Search direction: d = -H * g
        auto d = opt::negate(detail::matVecMul(H, gx));

        // Line search (Strong Wolfe)
        auto ls = wolfeLineSearch(f, gradFn, x, d, fx, gx);
        functionCalls += ls.functionCalls;
        gradientCalls += ls.gradientCalls;

        if (!ls.success) {
            return {x, fx, std::vector<double>(gx), iteration, functionCalls, gradientCalls,
                    false, "Stopped: line search failed to find acceptable step"};
        }

        // Step and gradient difference
        auto xNew = addScaled(x, d, ls.alpha);
        double fNew = ls.fNew;
        std::vector<double> gNew;
        if (ls.hasGradient()) {
            gNew = ls.gNew;
        } else {
            gNew = gradFn(xNew);
            gradientCalls++;
        }

        auto sk = sub(xNew, x);
        auto yk = sub(gNew, gx);

        double stepNorm = normInf(sk);
        double funcChange = std::abs(fNew - fx);
        gradNorm = normInf(gNew);

        // Update state
        x = xNew;
        fx = fNew;
        gx = gNew;

        // Check convergence
        auto reason = checkConvergence(gradNorm, stepNorm, funcChange, iteration, opts);
        if (reason) {
            return {std::vector<double>(x), fx, std::vector<double>(gx),
                    iteration, functionCalls, gradientCalls,
                    isConverged(*reason), convergenceMessage(*reason)};
        }

        // BFGS inverse Hessian update
        double ys = dot(yk, sk);
        if (ys <= 1e-10) {
            continue; // Curvature guard
        }

        double rho = 1.0 / ys;
        H = detail::bfgsUpdate(H, sk, yk, rho);
    }

    std::ostringstream msg;
    msg << "Stopped: reached maximum iterations (" << opts.maxIterations << ")";
    return {std::vector<double>(x), fx, std::vector<double>(gx),
            opts.maxIterations, functionCalls, gradientCalls,
            false, msg.str()};
}

} // namespace opt

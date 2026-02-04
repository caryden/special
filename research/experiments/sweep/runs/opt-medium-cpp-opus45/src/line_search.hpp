#pragma once

#include <vector>
#include <cmath>
#include <functional>
#include <optional>
#include "vec_ops.hpp"

namespace opt {

/// Result of a line search.
struct LineSearchResult {
    double alpha;
    double fNew;
    std::vector<double> gNew;  // empty if not computed
    int functionCalls;
    int gradientCalls;
    bool success;

    bool hasGradient() const { return !gNew.empty(); }
};

/// Options for backtracking line search.
struct BacktrackingOptions {
    double initialAlpha = 1.0;
    double c1 = 1e-4;
    double rho = 0.5;
    int maxIter = 20;
};

/// Options for Wolfe line search.
struct WolfeOptions {
    double c1 = 1e-4;
    double c2 = 0.9;
    double alphaMax = 1e6;
    int maxIter = 25;
};

using ObjFn = std::function<double(const std::vector<double>&)>;
using GradFn = std::function<std::vector<double>(const std::vector<double>&)>;

namespace detail {

/// Zoom phase of the Wolfe line search (Nocedal & Wright, Algorithm 3.6).
inline LineSearchResult zoom(
    const ObjFn& f, const GradFn& grad,
    const std::vector<double>& x, const std::vector<double>& d,
    double fx, double dg0, double c1, double c2,
    double alphaLo, double alphaHi, double fLo, double fHi,
    int functionCalls, int gradientCalls)
{
    const int maxZoomIter = 20;

    for (int j = 0; j < maxZoomIter; ++j) {
        double alpha = (alphaLo + alphaHi) / 2.0;
        auto xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        if (fNew > fx + c1 * alpha * dg0 || fNew >= fLo) {
            alphaHi = alpha;
            fHi = fNew;
        } else {
            auto gNew = grad(xNew);
            gradientCalls++;
            double dgNew = dot(gNew, d);

            if (std::abs(dgNew) <= c2 * std::abs(dg0)) {
                return {alpha, fNew, gNew, functionCalls, gradientCalls, true};
            }

            if (dgNew * (alphaHi - alphaLo) >= 0) {
                alphaHi = alphaLo;
                fHi = fLo;
            }

            alphaLo = alpha;
            fLo = fNew;
        }

        if (std::abs(alphaHi - alphaLo) < 1e-14) {
            break;
        }
    }

    // Return best found (alphaLo is usually the better end)
    auto xFinal = addScaled(x, d, alphaLo);
    return {
        alphaLo,
        f(xFinal),
        grad(xFinal),
        functionCalls + 1,
        gradientCalls + 1,
        false
    };
}

} // namespace detail

/// Backtracking line search with Armijo (sufficient decrease) condition.
/// @provenance Nocedal & Wright, Algorithm 3.1
inline LineSearchResult backtrackingLineSearch(
    const ObjFn& f,
    const std::vector<double>& x,
    const std::vector<double>& d,
    double fx,
    const std::vector<double>& gx,
    const BacktrackingOptions& options = {})
{
    double alpha = options.initialAlpha;
    double c1 = options.c1;
    double rho = options.rho;
    int maxIter = options.maxIter;

    double dg = dot(gx, d);
    int functionCalls = 0;

    for (int i = 0; i < maxIter; ++i) {
        auto xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        if (fNew <= fx + c1 * alpha * dg) {
            return {alpha, fNew, {}, functionCalls, 0, true};
        }

        alpha *= rho;
    }

    // Failed
    auto xFinal = addScaled(x, d, alpha);
    return {alpha, f(xFinal), {}, functionCalls + 1, 0, false};
}

/// Strong Wolfe line search.
/// @provenance Nocedal & Wright, Algorithms 3.5 + 3.6
inline LineSearchResult wolfeLineSearch(
    const ObjFn& f,
    const GradFn& grad,
    const std::vector<double>& x,
    const std::vector<double>& d,
    double fx,
    const std::vector<double>& gx,
    const WolfeOptions& options = {})
{
    double c1 = options.c1;
    double c2 = options.c2;
    double alphaMax = options.alphaMax;
    int maxIter = options.maxIter;

    double dg0 = dot(gx, d);
    int functionCalls = 0;
    int gradientCalls = 0;

    double alphaPrev = 0.0;
    double fPrev = fx;
    double alpha = 1.0;

    for (int i = 0; i < maxIter; ++i) {
        auto xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        if (fNew > fx + c1 * alpha * dg0 || (i > 0 && fNew >= fPrev)) {
            return detail::zoom(f, grad, x, d, fx, dg0, c1, c2,
                alphaPrev, alpha, fPrev, fNew, functionCalls, gradientCalls);
        }

        auto gNew = grad(xNew);
        gradientCalls++;
        double dgNew = dot(gNew, d);

        if (std::abs(dgNew) <= c2 * std::abs(dg0)) {
            return {alpha, fNew, gNew, functionCalls, gradientCalls, true};
        }

        if (dgNew >= 0) {
            return detail::zoom(f, grad, x, d, fx, dg0, c1, c2,
                alpha, alphaPrev, fNew, fPrev, functionCalls, gradientCalls);
        }

        alphaPrev = alpha;
        fPrev = fNew;
        alpha = std::min(2.0 * alpha, alphaMax);
    }

    // Failed
    auto xFinal = addScaled(x, d, alpha);
    return {
        alpha,
        f(xFinal),
        grad(xFinal),
        functionCalls + 1,
        gradientCalls + 1,
        false
    };
}

} // namespace opt

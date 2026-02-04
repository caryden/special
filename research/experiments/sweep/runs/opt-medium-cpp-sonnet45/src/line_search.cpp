#include "line_search.h"
#include <cmath>
#include <algorithm>

namespace optimization {

LineSearchResult backtrackingLineSearch(
    ObjectiveFunction f,
    const Vector& x,
    const Vector& d,
    double fx,
    const Vector& gx,
    const BacktrackingOptions& options
) {
    double alpha = options.initialAlpha;
    double gxd = dot(gx, d);
    int functionCalls = 0;

    for (int iter = 0; iter < options.maxIter; ++iter) {
        Vector xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        // Check Armijo condition
        if (fNew <= fx + options.c1 * alpha * gxd) {
            return LineSearchResult{alpha, fNew, std::nullopt, functionCalls, 0, true};
        }

        alpha *= options.rho;
    }

    // Failed to find acceptable step
    Vector xNew = addScaled(x, d, alpha);
    double fNew = f(xNew);
    functionCalls++;
    return LineSearchResult{alpha, fNew, std::nullopt, functionCalls, 0, false};
}

// Helper function for zoom phase of Wolfe line search
static LineSearchResult zoom(
    ObjectiveFunction f,
    GradientFunction grad,
    const Vector& x,
    const Vector& d,
    double fx,
    double gxd,
    double alphaLo,
    double fLo,
    double gLoDotD,
    double alphaHi,
    double fHi,
    double c1,
    double c2,
    int maxIter,
    int& functionCalls,
    int& gradientCalls
) {
    for (int iter = 0; iter < maxIter; ++iter) {
        // Bisection
        double alpha = 0.5 * (alphaLo + alphaHi);
        Vector xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        // Check Armijo condition
        if (fNew > fx + c1 * alpha * gxd || fNew >= fLo) {
            alphaHi = alpha;
            fHi = fNew;
        } else {
            Vector gNew = grad(xNew);
            gradientCalls++;
            double gNewDotD = dot(gNew, d);

            // Check curvature condition
            if (std::abs(gNewDotD) <= c2 * std::abs(gxd)) {
                return LineSearchResult{alpha, fNew, gNew, functionCalls, gradientCalls, true};
            }

            if (gNewDotD * (alphaHi - alphaLo) >= 0) {
                alphaHi = alphaLo;
                fHi = fLo;
            }

            alphaLo = alpha;
            fLo = fNew;
            gLoDotD = gNewDotD;
        }
    }

    // Failed
    Vector xNew = addScaled(x, d, alphaLo);
    double fNew = f(xNew);
    functionCalls++;
    return LineSearchResult{alphaLo, fNew, std::nullopt, functionCalls, gradientCalls, false};
}

LineSearchResult wolfeLineSearch(
    ObjectiveFunction f,
    GradientFunction grad,
    const Vector& x,
    const Vector& d,
    double fx,
    const Vector& gx,
    const WolfeOptions& options
) {
    double gxd = dot(gx, d);
    int functionCalls = 0;
    int gradientCalls = 0;

    double alphaPrev = 0.0;
    double fPrev = fx;
    double alpha = 1.0;

    for (int iter = 0; iter < options.maxIter; ++iter) {
        Vector xNew = addScaled(x, d, alpha);
        double fNew = f(xNew);
        functionCalls++;

        // Check Armijo condition
        if (fNew > fx + options.c1 * alpha * gxd || (iter > 0 && fNew >= fPrev)) {
            return zoom(f, grad, x, d, fx, gxd, alphaPrev, fPrev,
                       dot(gx, d), alpha, fNew, options.c1, options.c2,
                       options.maxIter - iter, functionCalls, gradientCalls);
        }

        Vector gNew = grad(xNew);
        gradientCalls++;
        double gNewDotD = dot(gNew, d);

        // Check curvature condition
        if (std::abs(gNewDotD) <= options.c2 * std::abs(gxd)) {
            return LineSearchResult{alpha, fNew, gNew, functionCalls, gradientCalls, true};
        }

        if (gNewDotD >= 0) {
            return zoom(f, grad, x, d, fx, gxd, alpha, fNew, gNewDotD,
                       alphaPrev, fPrev, options.c1, options.c2,
                       options.maxIter - iter, functionCalls, gradientCalls);
        }

        alphaPrev = alpha;
        fPrev = fNew;
        alpha = std::min(2.0 * alpha, options.alphaMax);
    }

    // Failed
    Vector xNew = addScaled(x, d, alpha);
    double fNew = f(xNew);
    functionCalls++;
    return LineSearchResult{alpha, fNew, std::nullopt, functionCalls, gradientCalls, false};
}

} // namespace optimization

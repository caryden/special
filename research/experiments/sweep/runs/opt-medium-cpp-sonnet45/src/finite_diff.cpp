#include "finite_diff.h"
#include <cmath>
#include <algorithm>
#include <limits>

namespace optimization {

Vector forwardDiffGradient(ObjectiveFunction f, const Vector& x) {
    const double eps = std::sqrt(std::numeric_limits<double>::epsilon());
    const double fx = f(x);
    Vector grad(x.size());

    for (size_t i = 0; i < x.size(); ++i) {
        double h = eps * std::max(std::abs(x[i]), 1.0);
        Vector xh = x;
        xh[i] += h;
        double fxh = f(xh);
        grad[i] = (fxh - fx) / h;
    }

    return grad;
}

Vector centralDiffGradient(ObjectiveFunction f, const Vector& x) {
    const double eps = std::cbrt(std::numeric_limits<double>::epsilon());
    Vector grad(x.size());

    for (size_t i = 0; i < x.size(); ++i) {
        double h = eps * std::max(std::abs(x[i]), 1.0);
        Vector xPlus = x;
        Vector xMinus = x;
        xPlus[i] += h;
        xMinus[i] -= h;
        double fPlus = f(xPlus);
        double fMinus = f(xMinus);
        grad[i] = (fPlus - fMinus) / (2.0 * h);
    }

    return grad;
}

GradientFunction makeGradient(ObjectiveFunction f, const std::string& method) {
    if (method == "central") {
        return [f](const Vector& x) { return centralDiffGradient(f, x); };
    }
    return [f](const Vector& x) { return forwardDiffGradient(f, x); };
}

} // namespace optimization

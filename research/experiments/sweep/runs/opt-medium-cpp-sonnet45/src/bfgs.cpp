#include "bfgs.h"
#include "line_search.h"
#include "finite_diff.h"
#include <cmath>

namespace optimization {

Matrix identityMatrix(size_t n) {
    Matrix I(n, Vector(n, 0.0));
    for (size_t i = 0; i < n; ++i) {
        I[i][i] = 1.0;
    }
    return I;
}

Vector matVecMul(const Matrix& M, const Vector& v) {
    Vector result(M.size(), 0.0);
    for (size_t i = 0; i < M.size(); ++i) {
        for (size_t j = 0; j < v.size(); ++j) {
            result[i] += M[i][j] * v[j];
        }
    }
    return result;
}

Matrix bfgsUpdate(const Matrix& H, const Vector& s, const Vector& y, double rho) {
    size_t n = H.size();
    Matrix result = H;

    // Compute I - rho * s * y^T
    Matrix A = identityMatrix(n);
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            A[i][j] -= rho * s[i] * y[j];
        }
    }

    // Compute (I - rho * s * y^T) * H
    Matrix temp(n, Vector(n, 0.0));
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            for (size_t k = 0; k < n; ++k) {
                temp[i][j] += A[i][k] * H[k][j];
            }
        }
    }

    // Compute temp * (I - rho * y * s^T)
    Matrix B = identityMatrix(n);
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            B[i][j] -= rho * y[i] * s[j];
        }
    }

    result = Matrix(n, Vector(n, 0.0));
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            for (size_t k = 0; k < n; ++k) {
                result[i][j] += temp[i][k] * B[k][j];
            }
        }
    }

    // Add rho * s * s^T
    for (size_t i = 0; i < n; ++i) {
        for (size_t j = 0; j < n; ++j) {
            result[i][j] += rho * s[i] * s[j];
        }
    }

    return result;
}

OptimizeResult bfgs(
    ObjectiveFunction f,
    const Vector& x0,
    std::optional<GradientFunction> grad,
    const OptimizeOptions& options
) {
    // Use finite differences if no gradient provided
    GradientFunction gradFunc = grad.value_or(
        [f](const Vector& x) { return forwardDiffGradient(f, x); }
    );

    Vector x = clone(x0);
    Matrix H = identityMatrix(x.size());
    int functionCalls = 0;
    int gradientCalls = 0;

    // Initial evaluation
    double fx = f(x);
    functionCalls++;
    Vector gx = gradFunc(x);
    gradientCalls++;

    // Check if already at minimum
    double gradNorm = norm(gx);
    if (gradNorm < options.gradTol) {
        auto reason = ConvergenceReason{ConvergenceReason::Kind::Gradient};
        return OptimizeResult{
            x, fx, gx, 0, functionCalls, gradientCalls,
            true,
            convergenceMessage(reason)
        };
    }

    for (int iter = 1; iter <= options.maxIterations; ++iter) {
        // Compute descent direction
        Vector d = negate(matVecMul(H, gx));

        // Wolfe line search
        WolfeOptions wolfeOpts;
        LineSearchResult lsResult = wolfeLineSearch(f, gradFunc, x, d, fx, gx, wolfeOpts);
        functionCalls += lsResult.functionCalls;
        gradientCalls += lsResult.gradientCalls;

        if (!lsResult.success) {
            return OptimizeResult{
                x, fx, gx, iter, functionCalls, gradientCalls,
                false,
                convergenceMessage(ConvergenceReason{ConvergenceReason::Kind::LineSearchFailed})
            };
        }

        // Update position
        Vector xNew = addScaled(x, d, lsResult.alpha);
        double fNew = lsResult.fNew;
        Vector gNew = lsResult.gNew.value();

        // Compute step and gradient change
        Vector s = sub(xNew, x);
        Vector y = sub(gNew, gx);

        double stepNorm = norm(s);
        double funcChange = std::abs(fNew - fx);

        // Update state
        x = xNew;
        fx = fNew;
        gx = gNew;
        gradNorm = norm(gx);

        // Check convergence
        auto convReason = checkConvergence(gradNorm, stepNorm, funcChange, iter, options);
        if (convReason.has_value()) {
            return OptimizeResult{
                x, fx, gx, iter, functionCalls, gradientCalls,
                isConverged(convReason.value()),
                convergenceMessage(convReason.value())
            };
        }

        // BFGS update with curvature guard
        double yTs = dot(y, s);
        if (yTs > 1e-10) {
            double rho = 1.0 / yTs;
            H = bfgsUpdate(H, s, y, rho);
        }
    }

    // Should not reach here, but handle gracefully
    return OptimizeResult{
        x, fx, gx, options.maxIterations, functionCalls, gradientCalls,
        false,
        convergenceMessage(ConvergenceReason{ConvergenceReason::Kind::MaxIterations})
    };
}

} // namespace optimization

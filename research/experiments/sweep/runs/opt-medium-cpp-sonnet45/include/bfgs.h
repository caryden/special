#pragma once
#include <functional>
#include <optional>
#include "vec_ops.h"
#include "result_types.h"

namespace optimization {

using ObjectiveFunction = std::function<double(const Vector&)>;
using GradientFunction = std::function<Vector(const Vector&)>;
using Matrix = std::vector<Vector>;

// Create n×n identity matrix
Matrix identityMatrix(size_t n);

// Matrix-vector multiplication
Vector matVecMul(const Matrix& M, const Vector& v);

// BFGS inverse Hessian update
Matrix bfgsUpdate(const Matrix& H, const Vector& s, const Vector& y, double rho);

// BFGS optimizer
OptimizeResult bfgs(
    ObjectiveFunction f,
    const Vector& x0,
    std::optional<GradientFunction> grad = std::nullopt,
    const OptimizeOptions& options = OptimizeOptions{}
);

} // namespace optimization

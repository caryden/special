#pragma once
#include <functional>
#include <string>
#include "vec_ops.h"

namespace optimization {

using ObjectiveFunction = std::function<double(const Vector&)>;
using GradientFunction = std::function<Vector(const Vector&)>;

// Forward difference gradient
Vector forwardDiffGradient(ObjectiveFunction f, const Vector& x);

// Central difference gradient
Vector centralDiffGradient(ObjectiveFunction f, const Vector& x);

// Factory for gradient functions
GradientFunction makeGradient(ObjectiveFunction f, const std::string& method = "forward");

} // namespace optimization

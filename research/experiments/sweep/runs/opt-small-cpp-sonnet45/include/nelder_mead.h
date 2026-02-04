#pragma once

#include "vec_ops.h"
#include "result_types.h"
#include <functional>

namespace optimization {

using ObjectiveFunction = std::function<double(const Vector&)>;

// Nelder-Mead derivative-free simplex optimizer
OptimizeResult nelderMead(
    const ObjectiveFunction& f,
    const Vector& x0,
    const OptimizeOptions& options = OptimizeOptions()
);

} // namespace optimization

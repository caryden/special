# Task: C++ Cross-Validation (Ceres, dlib, LBFGSPP)

**Environment required:** C++ build environment with CMake, Ceres Solver 2.2.0, dlib 19.7+, LBFGSPP 0.3.0
**Estimated scope:** Build projects, run validation, compare results
**Blocked by:** C++ build environment not configured

## Context

Three C++ optimization libraries are relevant for cross-validation:
1. **Ceres Solver** — Nonlinear least squares + general unconstrained (Google)
2. **dlib** — BFGS, L-BFGS implementations
3. **LBFGSPP** — Header-only L-BFGS with MoreThuente line search

These would expand our cross-validation beyond Python/Julia to compiled-language implementations.

## Steps

### 1. Set up build environment

```bash
# Install Ceres
sudo apt-get install libceres-dev
# Or build from source: https://github.com/ceres-solver/ceres-solver

# dlib
git clone https://github.com/davisking/dlib.git
cd dlib && mkdir build && cd build && cmake .. && make -j4

# LBFGSPP (header-only)
git clone https://github.com/yixuan/LBFGSpp.git
```

### 2. Ceres validation

Run all 6 test functions through Ceres GradientProblem solver:

```cpp
#include <ceres/ceres.h>

// Example: Rosenbrock via GradientProblem
class RosenbrockFunction : public ceres::FirstOrderFunction {
public:
    bool Evaluate(const double* x, double* cost, double* gradient) const override {
        cost[0] = 100.0 * pow(x[1] - x[0]*x[0], 2) + pow(1.0 - x[0], 2);
        if (gradient) {
            gradient[0] = -400.0 * x[0] * (x[1] - x[0]*x[0]) - 2.0 * (1.0 - x[0]);
            gradient[1] = 200.0 * (x[1] - x[0]*x[0]);
        }
        return true;
    }
    int NumParameters() const override { return 2; }
};

// Solve with BFGS and L-BFGS line search types
```

### 3. dlib validation

```cpp
#include <dlib/optimization.h>

// Run BFGS and L-BFGS on all test functions
// dlib::find_min(dlib::bfgs_search_strategy(), ...)
// dlib::find_min(dlib::lbfgs_search_strategy(10), ...)
```

### 4. LBFGSPP validation

```cpp
#include <LBFGSPP/LBFGS.h>

// Run L-BFGS with default parameters (memory=6, epsilon=1e-5)
// Compare against our L-BFGS (memory=10, gradTol=1e-8)
```

### 5. Update artifacts

- Save results to `reference/optimize/ceres-validation.json`, `dlib-validation.json`, `lbfgspp-validation.json`
- Update cross-validation tables
- Document any algorithmic differences discovered

## Key Differences to Investigate

- Ceres line search: Wolfe with cubic interpolation (vs our zoom-based Strong Wolfe)
- dlib BFGS: Uses Polak-Ribiere conjugate gradient as fallback
- LBFGSPP: Default memory=6 (vs our 10), MoreThuente line search, epsilon=1e-5

## Acceptance Criteria

- [ ] At least one C++ library (preferably dlib, easiest to set up) validated
- [ ] All 6 test functions run with BFGS and/or L-BFGS
- [ ] Results compared against our reference and scipy
- [ ] Cross-validation tables updated

# Task: NLopt Cross-Validation

**Environment required:** NLopt 2.10.0 (C library with Python bindings available)
**Estimated scope:** Run derivative-free and gradient-based methods, compare results
**Blocked by:** NLopt not installed

## Context

NLopt provides a unified interface to many optimization algorithms from different authors.
It is particularly strong in derivative-free methods (COBYLA, BOBYQA, NEWUOA, Sbplx, DIRECT)
and has unique algorithms not found in scipy or Optim.jl.

Relevant for validating:
- Nelder-Mead (NLopt's LN_NELDERMEAD)
- L-BFGS (NLopt's LD_LBFGS)
- Additional derivative-free methods for future algorithm expansion

## Steps

### 1. Install NLopt

```bash
pip install nlopt
# or: sudo apt-get install libnlopt-dev && pip install nlopt
```

### 2. Run validation

```python
import nlopt
import json
import numpy as np

def run_nlopt(func, grad_func, x0, algorithm, maxeval=1000):
    n = len(x0)
    opt = nlopt.opt(algorithm, n)
    evals = [0]

    def objective(x, grad):
        evals[0] += 1
        if grad.size > 0 and grad_func:
            g = grad_func(x)
            for i in range(n):
                grad[i] = g[i]
        return func(x)

    opt.set_min_objective(objective)
    opt.set_maxeval(maxeval)
    opt.set_ftol_abs(1e-12)
    opt.set_xtol_abs(1e-8)

    x = opt.optimize(x0)
    return {
        "x": x.tolist(),
        "fun": opt.last_optimum_value(),
        "evals": evals[0],
        "result_code": opt.last_optimize_result(),
    }

# Test functions (same as scipy validation)
functions = {
    "sphere": {
        "f": lambda x: x[0]**2 + x[1]**2,
        "grad": lambda x: [2*x[0], 2*x[1]],
        "x0": [5.0, 5.0],
    },
    # ... (all 6 test functions)
}

algorithms = {
    "nelder_mead": nlopt.LN_NELDERMEAD,
    "lbfgs": nlopt.LD_LBFGS,
    "cobyla": nlopt.LN_COBYLA,
    "bobyqa": nlopt.LN_BOBYQA,
    "sbplx": nlopt.LN_SBPLX,
}

results = {}
for fname, fdata in functions.items():
    results[fname] = {}
    for mname, algo in algorithms.items():
        needs_grad = mname == "lbfgs"
        grad = fdata["grad"] if needs_grad else None
        try:
            r = run_nlopt(fdata["f"], grad, fdata["x0"], algo)
            results[fname][mname] = r
        except Exception as e:
            results[fname][mname] = {"error": str(e)}

with open("reference/optimize/nlopt-validation.json", "w") as f:
    json.dump(results, f, indent=2)
```

### 3. Update artifacts

- Save results to `reference/optimize/nlopt-validation.json`
- Update `docs/optimization-library-survey.md` cross-validation status
- Document which NLopt algorithms match our results and which diverge

## Key Algorithms to Compare

| NLopt Algorithm | Comparable To | Notes |
|-----------------|---------------|-------|
| LN_NELDERMEAD | Our Nelder-Mead | Same algorithm, different implementation |
| LD_LBFGS | Our L-BFGS | NLopt wraps nocedal's original Fortran |
| LN_COBYLA | (future) | Constrained, derivative-free |
| LN_BOBYQA | (future) | Bounded, derivative-free |
| LN_SBPLX | (future) | Subplex, derivative-free |

## Acceptance Criteria

- [ ] NLopt installed and working
- [ ] At least Nelder-Mead and L-BFGS validated against our reference
- [ ] Additional derivative-free methods documented for future expansion
- [ ] Results saved and tables updated

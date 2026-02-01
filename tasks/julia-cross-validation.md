# Task: Julia/Optim.jl Cross-Validation

**Environment required:** Julia 1.10+ with Optim.jl v2.0.0, OptimTestProblems.jl
**Estimated scope:** Run validation scripts, compare results, update spec files
**Blocked by:** Julia not available in current environment

## Context

Our optimization reference library implements 4 algorithms (NelderMead, GradientDescent, BFGS, L-BFGS)
with cross-validation against scipy v1.17.0 (30 empirical runs). Optim.jl is the second most relevant
comparison library but has only been documented from source — never empirically validated.

Key differences to verify:
- Optim.jl uses HagerZhang line search (we use Strong Wolfe)
- Optim.jl defaults to L-BFGS for gradient problems (we default to BFGS)
- Optim.jl's g_abstol=1e-8 matches ours
- Optim.jl's NelderMead uses AffineSimplexer (a=0.025, b=0.5), different from our simplex construction

## Steps

### 1. Set up Julia environment

```bash
julia -e 'using Pkg; Pkg.add(["Optim", "OptimTestProblems", "JSON"])'
```

### 2. Run validation script

Create and run `scripts/julia-validation.jl`:

```julia
using Optim, JSON

# Test functions (must match our reference implementations exactly)
sphere(x) = x[1]^2 + x[2]^2
sphere_g!(G, x) = (G[1] = 2x[1]; G[2] = 2x[2])

booth(x) = (x[1] + 2x[2] - 7)^2 + (2x[1] + x[2] - 5)^2
booth_g!(G, x) = (G[1] = 2(x[1] + 2x[2] - 7) + 4(2x[1] + x[2] - 5);
                  G[2] = 4(x[1] + 2x[2] - 7) + 2(2x[1] + x[2] - 5))

rosenbrock(x) = 100(x[2] - x[1]^2)^2 + (1 - x[1])^2
rosenbrock_g!(G, x) = (G[1] = -400x[1]*(x[2] - x[1]^2) - 2(1 - x[1]);
                       G[2] = 200(x[2] - x[1]^2))

beale(x) = (1.5 - x[1] + x[1]*x[2])^2 + (2.25 - x[1] + x[1]*x[2]^2)^2 + (2.625 - x[1] + x[1]*x[2]^3)^2
# beale gradient is complex — use autodiff or finite diff

himmelblau(x) = (x[1]^2 + x[2] - 11)^2 + (x[1] + x[2]^2 - 7)^2
himmelblau_g!(G, x) = (G[1] = 4x[1]*(x[1]^2 + x[2] - 11) + 2(x[1] + x[2]^2 - 7);
                       G[2] = 2(x[1]^2 + x[2] - 11) + 4x[2]*(x[1] + x[2]^2 - 7))

goldstein_price(x) = begin
    a = 1 + (x[1] + x[2] + 1)^2 * (19 - 14x[1] + 3x[1]^2 - 14x[2] + 6x[1]*x[2] + 3x[2]^2)
    b = 30 + (2x[1] - 3x[2])^2 * (18 - 32x[1] + 12x[1]^2 + 48x[2] - 36x[1]*x[2] + 27x[2]^2)
    a * b
end

functions = [
    ("sphere", sphere, sphere_g!, [5.0, 5.0]),
    ("booth", booth, booth_g!, [0.0, 0.0]),
    ("rosenbrock", rosenbrock, rosenbrock_g!, [-1.2, 1.0]),
    ("beale", beale, nothing, [0.0, 0.0]),
    ("himmelblau", himmelblau, himmelblau_g!, [0.0, 0.0]),
    ("goldstein_price", goldstein_price, nothing, [0.0, -0.5]),
]

methods_with_grad = [BFGS(), LBFGS(), ConjugateGradient(), GradientDescent()]
methods_no_grad = [NelderMead()]

results = Dict()

for (name, f, g!, x0) in functions
    results[name] = Dict()

    # Methods requiring gradient
    if g! !== nothing
        for m in methods_with_grad
            mname = string(typeof(m).name.name)
            try
                res = optimize(f, g!, x0, m, Optim.Options(iterations=1000, g_tol=1e-8))
                results[name][mname] = Dict(
                    "x" => Optim.minimizer(res),
                    "fun" => Optim.minimum(res),
                    "iterations" => Optim.iterations(res),
                    "converged" => Optim.converged(res),
                    "f_calls" => Optim.f_calls(res),
                    "g_calls" => Optim.g_calls(res),
                )
            catch e
                results[name][mname] = Dict("error" => string(e))
            end
        end
    end

    # Nelder-Mead (no gradient needed)
    for m in methods_no_grad
        mname = string(typeof(m).name.name)
        try
            res = optimize(f, x0, m, Optim.Options(iterations=5000))
            results[name][mname] = Dict(
                "x" => Optim.minimizer(res),
                "fun" => Optim.minimum(res),
                "iterations" => Optim.iterations(res),
                "converged" => Optim.converged(res),
                "f_calls" => Optim.f_calls(res),
            )
        catch e
            results[name][mname] = Dict("error" => string(e))
        end
    end
end

open("reference/optimize/julia-validation.json", "w") do io
    JSON.print(io, results, 2)
end

println("Results written to reference/optimize/julia-validation.json")
```

### 3. Compare results

For each function × method combination, compare:
- **Final minimum value** (f): should agree to within 1e-6 or better
- **Minimizer location** (x): should agree to within 1e-4
- **Iteration count**: expect ±50% difference due to line search differences
- **Convergence status**: note any cases where one converges but the other doesn't

### 4. Update artifacts

- Save raw results to `reference/optimize/julia-validation.json`
- Add Optim.jl comparison rows to cross-validation tables in:
  - `reference/optimize/CROSS-VALIDATION.md`
  - `experiments/optimize-skill/nodes/bfgs/spec.md`
  - `experiments/optimize-skill/nodes/l-bfgs/spec.md`
  - `experiments/optimize-skill/nodes/nelder-mead/spec.md`
  - `experiments/optimize-skill/nodes/minimize/spec.md`
- Update `docs/optimization-library-survey.md` cross-validation status from "Documented from source" to "Empirically validated"

### 5. Run OptimTestProblems.jl suite

```julia
using OptimTestProblems
# Get the full list of 20 test problems
# Compare against our 6 test functions
# Identify which additional test functions to add to our reference
```

### 6. Add cross-validation tests

Add Optim.jl-sourced test vectors to `reference/optimize/src/cross-validation.test.ts`:
- New describe block "cross-validation: optim.jl v2.0.0"
- Include exact Optim.jl output values as constants
- Verify our results match or exceed quality

## Expected Findings

Based on source analysis:
- BFGS: Similar results, ±5 iterations (different line search)
- L-BFGS: Optim.jl may converge slightly faster (HagerZhang vs Strong Wolfe)
- NelderMead: Significant iteration count differences (different simplex construction)
- GradientDescent: Optim.jl uses backtracking by default (matches us)
- ConjugateGradient: We don't implement this yet — document as gap

## Acceptance Criteria

- [ ] Julia environment set up with Optim.jl v2.0.0
- [ ] All 6 test functions × 5 methods validated (30 runs)
- [ ] Raw results saved as JSON
- [ ] Comparison tables updated in spec files and CROSS-VALIDATION.md
- [ ] Cross-validation tests added to test suite
- [ ] All existing tests still pass at 100% coverage

# Optimization Skill — Help Guide

This guide helps you choose the right optimization algorithm(s) and target
language for your use case.

## Quick Start

If you already know what you need:
- **Simplest (no derivatives)**: `nelder-mead --lang <language>`
- **Best general-purpose**: `bfgs --lang <language>`
- **Constrained optimization**: `ip-newton --lang <language>`
- **Full library**: `all --lang <language>`

## Decision Tree

### 1. Can you compute derivatives of your objective function?

| Derivatives Available | Best Starting Point |
|-----------------------|-------------------|
| No derivatives at all | Go to §2a (Derivative-free) |
| Gradient only (first-order) | Go to §2b (First-order) |
| Gradient + Hessian (second-order) | Go to §2c (Second-order) |
| Unsure / can use finite differences | Go to §2b — all gradient methods auto-compute via finite differences if you omit the gradient argument |

### 2a. Derivative-free: What kind of problem?

| Problem | Algorithm | Nodes | Characteristics |
|---------|-----------|-------|-----------------|
| General n-D minimization | Nelder-Mead | `nelder-mead` | Robust, no tuning, ~100-1000 evals. Works on noisy/non-smooth functions. |
| 1D minimization on [a,b] | Brent | `brent-1d` | Superlinear convergence, zero dependencies. Standalone node. |
| Global search (many local minima) | Simulated Annealing | `simulated-annealing` | Stochastic, escapes local minima. Needs many evaluations. |
| General n-D, want best result | Nelder-Mead + SA | `nelder-mead simulated-annealing` | Use SA for global search, NM to polish the result. |

### 2b. First-order (gradient available or via finite differences)

| Problem | Algorithm | Nodes | Characteristics |
|---------|-----------|-------|-----------------|
| General unconstrained, n < 1000 | BFGS | `bfgs` | Best default. Dense Hessian approx, superlinear convergence. |
| Large-scale, n > 1000 | L-BFGS | `l-bfgs` | O(mn) memory instead of O(n²). Nearly as fast as BFGS. |
| Want a simple, predictable method | Gradient Descent | `gradient-descent` | Slow but easy to understand. Useful as a baseline. |
| Want fastest CG convergence | Conjugate Gradient | `conjugate-gradient` | Hager-Zhang formula. Good for large n where L-BFGS memory is tight. |
| Box constraints (l ≤ x ≤ u) | Fminbox | `fminbox` | Log-barrier wrapping any first-order method. Default inner: L-BFGS. |
| General constraints | IPNewton | `ip-newton` | Handles equality, inequality, and box constraints. Uses finite-diff Hessian if not provided. |

### 2c. Second-order (gradient + Hessian available)

| Problem | Algorithm | Nodes | Characteristics |
|---------|-----------|-------|-----------------|
| General unconstrained, n < 200 | Newton | `newton` | Quadratic convergence near optimum. Dense Hessian. |
| Prefer robustness over speed | Newton Trust Region | `newton-trust-region` | Dogleg trust region. More robust than line-search Newton on hard problems. |
| Large-scale, Hessian is expensive | Krylov Trust Region | `krylov-trust-region` | Only needs Hessian-vector products (via finite differences). Good for n > 200. |
| General constraints | IPNewton | `ip-newton` | Interior-point Newton. Best choice when you have Hessian and constraints. |

### 3. Do you have constraints?

| Constraint Type | Algorithm | Nodes |
|----------------|-----------|-------|
| None | Any unconstrained method above | (see §2a/2b/2c) |
| Box only (l ≤ x ≤ u) | Fminbox | `fminbox` (+ inner method) |
| Equality (c(x) = 0) | IPNewton | `ip-newton` |
| Inequality (c(x) ≥ 0) | IPNewton | `ip-newton` |
| Mixed (box + equality + inequality) | IPNewton | `ip-newton` |

### 4. What language / platform?

| Language | Notes |
|----------|-------|
| Python | NumPy-style arrays. Translation hints available for Tier 1 nodes. Idiomatic: use `numpy.ndarray` for vectors, `@dataclass` for result types. |
| Rust | `Vec<f64>` for vectors, `struct` for result types. Consider `nalgebra` for matrix ops in Newton/IPNewton but the skill generates dependency-free code. |
| Go | `[]float64` slices for vectors. Idiomatic: return `(result, error)` pairs. No generics needed. |
| TypeScript | Direct copy of reference — no translation needed unless you want a different module structure. |
| Swift | No translation hints yet. Use spec.md + reference source. `[Double]` for vectors, `struct` for types. |
| C# | Translation hints available. `double[]` for vectors, xUnit for tests. **Critical:** `double.Epsilon` is NOT machine epsilon — see `finite-diff/to-csharp.md`. |
| Other | The spec.md files are language-agnostic. Any language with floating-point arrays can implement them. |

## Node Recipes

Pre-computed dependency sets for common subsets. Copy-paste these directly.

### Minimal derivative-free optimizer

```
nelder-mead --lang <language>
```

3 nodes total: `vec-ops`, `result-types`, `nelder-mead`.
Use when you just need a simple optimizer that works on any function.

### Best general-purpose optimizer

```
bfgs --lang <language>
```

5 nodes total: `vec-ops`, `result-types`, `line-search`, `finite-diff`, `bfgs`.
BFGS is the default recommendation for most smooth optimization problems.

### Large-scale optimizer

```
l-bfgs --lang <language>
```

5 nodes total: `vec-ops`, `result-types`, `line-search`, `finite-diff`, `l-bfgs`.
Same interface as BFGS but O(mn) memory instead of O(n²).

### Box-constrained with L-BFGS

```
fminbox --lang <language>
```

6 nodes total: `vec-ops`, `result-types`, `line-search`, `finite-diff`, `l-bfgs`, `fminbox`.
Minimizes f(x) subject to lower ≤ x ≤ upper.

### General constrained optimizer

```
ip-newton --lang <language>
```

5 nodes total: `vec-ops`, `result-types`, `finite-diff`, `finite-hessian`, `ip-newton`.
Handles equality, inequality, and box constraints via interior-point method.

### Second-order with trust region

```
newton-trust-region --lang <language>
```

5 nodes total: `vec-ops`, `result-types`, `finite-diff`, `finite-hessian`, `newton-trust-region`.
Robust Newton method for when you have (or can approximate) the Hessian.

### 1D optimizer (standalone)

```
brent-1d --lang <language>
```

1 node total: `brent-1d`. Zero dependencies. Finds a minimum of f(x) on [a, b].

### Multi-algorithm dispatcher

```
minimize --lang <language>
```

Up to 14 nodes depending on which algorithms you include. The `minimize` function
auto-selects an algorithm based on whether a gradient is provided. Include only the
algorithms you want available at dispatch time.

### Full library

```
all --lang <language>
```

All 21 nodes. Everything included.

## Frequently Asked Questions

**Q: Which algorithm should I use if I don't know anything about my problem?**
A: Start with BFGS. It works well on most smooth problems and auto-computes
gradients via finite differences if you don't provide them.

**Q: My function is noisy / non-smooth. What should I use?**
A: Nelder-Mead. It doesn't use derivatives, so it handles noise and discontinuities.
For global search on noisy landscapes, use Simulated Annealing.

**Q: Do I need `test-functions`?**
A: Only for validation. The test-functions node provides Sphere, Rosenbrock, etc.
for testing your generated code. You don't need it in production.

**Q: Can I add more algorithms later?**
A: Yes. Each node is self-contained with explicit dependencies. Generate additional
nodes at any time — just include their dependencies.

**Q: What's the difference between Fminbox and IPNewton for box constraints?**
A: Fminbox uses a log-barrier wrapping a first-order method (L-BFGS by default) —
simpler and often faster for pure box constraints. IPNewton is a full interior-point
Newton method that also handles equality and inequality constraints — more powerful
but heavier machinery. Use Fminbox for box-only, IPNewton for general constraints.

**Q: What if my language isn't listed?**
A: The `nodes/<name>/spec.md` files are language-agnostic behavioral specifications
with test vectors. Any language can implement them. The `to-<lang>.md` hints just
accelerate translation for listed languages.

**Q: How do I know if it's working correctly?**
A: Generate the `test-functions` node alongside your algorithms. Each spec.md
includes test vectors with expected results. The reference test suite has 529 tests
that define the behavioral contract.

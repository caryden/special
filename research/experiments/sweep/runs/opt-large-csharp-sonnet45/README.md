# Optimization Library - C# Translation (Large Subset)

This is a C# translation of 9 nodes from the optimization skill, including support for box-constrained optimization via the fminbox logarithmic barrier method.

## Translated Nodes (in dependency order)

1. **vec-ops** - Pure vector arithmetic (dot, norm, scale, add, sub, etc.)
2. **result-types** - OptimizeResult, OptimizeOptions, convergence checking
3. **line-search** - Backtracking (Armijo) and Strong Wolfe line search
4. **finite-diff** - Forward and central difference gradient approximation
5. **finite-hessian** - Hessian matrix and Hessian-vector product estimation
6. **hager-zhang** - Hager-Zhang line search with approximate Wolfe conditions
7. **l-bfgs** - Limited-memory BFGS with two-loop recursion
8. **bfgs** - Full-memory BFGS quasi-Newton optimizer
9. **conjugate-gradient** - Nonlinear CG with Hager-Zhang beta and line search

### Additional Components

- **fminbox** - Box-constrained optimization via logarithmic barrier method
  - Supports l-bfgs, bfgs, and conjugate-gradient as inner optimizers
  - Handles infinite bounds correctly
  - Uses projected gradient norm for convergence

## Test Results

- **Total Tests**: 41
- **Passed**: 41
- **Failed**: 0
- **Duration**: 0.38 seconds

### Test Coverage

- All 9 core nodes fully tested
- Test functions: Sphere, Booth, Rosenbrock, Beale, Himmelblau, Goldstein-Price
- Goldstein-Price starting point: [-0.1, -0.9] (as specified)
- Edge cases: boundary conditions, infinite bounds, projected gradients

## Implementation Details

- **Language**: C# (.NET 8.0)
- **Test Framework**: xUnit
- **Dependencies**: None (only .NET BCL)
- **Namespace**: Optimization
- **Code Style**: Modern C# with nullable reference types

### Key Features

- Pure vector operations (immutable)
- Convergence checking with priority ordering (gradient → step → function → maxIterations)
- Strong Wolfe line search for BFGS/L-BFGS
- Hager-Zhang line search for conjugate gradient
- Logarithmic barrier method for box constraints
- Proper handling of infinite bounds in fminbox

## Algorithm Parameters

All default parameters match the specification:

- Gradient tolerance: 1e-8
- Step tolerance: 1e-8
- Function tolerance: 1e-12
- Max iterations: 1000
- Wolfe c1: 1e-4
- Wolfe c2: 0.9
- L-BFGS memory: 10
- CG eta: 0.4
- Fminbox mu factor: 0.001

## Translation Notes

- No C# translation hints were available for this translation
- All specs were followed directly from the markdown specification files
- TypeScript reference was consulted only for implementation clarification
- All test vectors from the specs are implemented and passing

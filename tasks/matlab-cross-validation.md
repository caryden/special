# Task: MATLAB Cross-Validation

**Environment required:** MATLAB R2024+ with Optimization Toolbox
**Estimated scope:** Run validation scripts, compare results, update spec files
**Blocked by:** MATLAB not available in current environment

## Context

Our optimization reference library has been validated against scipy v1.17.0 (empirically) and
Optim.jl v2.0.0 (from source documentation). MATLAB's `fminunc` and `fminsearch` are widely
used reference implementations that would strengthen our cross-validation coverage.

Key differences to verify:
- MATLAB uses quasi-Newton (BFGS) by default for `fminunc`
- MATLAB uses Nelder-Mead for `fminsearch`
- Default gradient tolerance: 1e-6 (vs our 1e-8)
- MATLAB uses cubic interpolation line search (vs our Strong Wolfe)
- Default max iterations: 400 (vs our 1000)

## Steps

### 1. Run validation script

Create and run `scripts/matlab_validation.m`:

```matlab
% Test functions
sphere = @(x) x(1)^2 + x(2)^2;
sphere_grad = @(x) [2*x(1); 2*x(2)];

booth = @(x) (x(1) + 2*x(2) - 7)^2 + (2*x(1) + x(2) - 5)^2;
rosenbrock = @(x) 100*(x(2) - x(1)^2)^2 + (1 - x(1))^2;
beale = @(x) (1.5 - x(1) + x(1)*x(2))^2 + (2.25 - x(1) + x(1)*x(2)^2)^2 + (2.625 - x(1) + x(1)*x(2)^3)^2;
himmelblau = @(x) (x(1)^2 + x(2) - 11)^2 + (x(1) + x(2)^2 - 7)^2;
goldstein_price = @(x) (1 + (x(1)+x(2)+1)^2 * (19-14*x(1)+3*x(1)^2-14*x(2)+6*x(1)*x(2)+3*x(2)^2)) * ...
    (30 + (2*x(1)-3*x(2))^2 * (18-32*x(1)+12*x(1)^2+48*x(2)-36*x(1)*x(2)+27*x(2)^2));

functions = {
    'sphere', sphere, [5, 5];
    'booth', booth, [0, 0];
    'rosenbrock', rosenbrock, [-1.2, 1.0];
    'beale', beale, [0, 0];
    'himmelblau', himmelblau, [0, 0];
    'goldstein_price', goldstein_price, [0, -0.5];
};

% Run fminunc (BFGS) with gradient tolerance matching ours
opts_bfgs = optimoptions('fminunc', 'Algorithm', 'quasi-newton', ...
    'OptimalityTolerance', 1e-8, 'MaxIterations', 1000, 'Display', 'final');

% Run fminsearch (Nelder-Mead)
opts_nm = optimset('MaxIter', 5000, 'TolFun', 1e-12, 'TolX', 1e-8, 'Display', 'final');

results = struct();
for i = 1:size(functions, 1)
    name = functions{i, 1};
    f = functions{i, 2};
    x0 = functions{i, 3};

    % BFGS via fminunc
    [x, fval, exitflag, output] = fminunc(f, x0, opts_bfgs);
    results.(name).bfgs.x = x;
    results.(name).bfgs.fun = fval;
    results.(name).bfgs.iterations = output.iterations;
    results.(name).bfgs.funcCount = output.funcCount;
    results.(name).bfgs.converged = (exitflag > 0);

    % Nelder-Mead via fminsearch
    [x, fval, exitflag, output] = fminsearch(f, x0, opts_nm);
    results.(name).nelder_mead.x = x;
    results.(name).nelder_mead.fun = fval;
    results.(name).nelder_mead.iterations = output.iterations;
    results.(name).nelder_mead.funcCount = output.funcCount;
    results.(name).nelder_mead.converged = (exitflag > 0);
end

% Save as JSON
jsonStr = jsonencode(results, 'PrettyPrint', true);
fid = fopen('reference/optimize/matlab-validation.json', 'w');
fprintf(fid, '%s', jsonStr);
fclose(fid);
disp('Results written to reference/optimize/matlab-validation.json');
```

### 2. Compare results

For each function × method, compare:
- Final minimum value and minimizer location
- Iteration counts (expect differences due to cubic interpolation line search)
- Convergence status

### 3. Update artifacts

- Save raw results to `reference/optimize/matlab-validation.json`
- Add MATLAB comparison rows to `reference/optimize/CROSS-VALIDATION.md`
- Update `docs/optimization-library-survey.md` cross-validation status

## Acceptance Criteria

- [ ] All 6 test functions validated with fminunc (BFGS) and fminsearch (Nelder-Mead)
- [ ] Raw results saved as JSON
- [ ] Comparison tables updated
- [ ] Notable differences documented
